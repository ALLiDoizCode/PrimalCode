-- Health-Check Message Handler
-- Handles process monitoring and health status verification

local types = require('types.monster')
local state_manager = require('utils.state-manager')
local json = require('utils.json')

local health_handler = {}

-- Handle Health-Check message
function health_handler.handle(msg: types.AOMessage): string
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    local health = process_state.health
    
    -- Perform comprehensive health check
    local current_time = os.time()
    local uptime = current_time - monster.created_at
    local memory_usage = collectgarbage("count")
    
    -- Check for various health indicators
    local health_issues = {}
    local is_healthy = true
    
    -- Check state validity
    local state_valid, state_error = state_manager.validate_state(monster)
    if not state_valid then
        table.insert(health_issues, "Invalid monster state: " .. state_error)
        is_healthy = false
    end
    
    -- Check decision cycle timing
    local time_since_decision = current_time - monster.last_decision
    if time_since_decision > 300 then -- 5 minutes without a decision is concerning
        table.insert(health_issues, "Decision cycle stalled: " .. time_since_decision .. " seconds")
        is_healthy = false
    end
    
    -- Check memory usage (warn if over 10MB)
    if memory_usage > 10240 then
        table.insert(health_issues, "High memory usage: " .. math.floor(memory_usage) .. "KB")
        is_healthy = false
    end
    
    -- Check for impossible stat values
    if monster.stats.health > 100 or monster.stats.health < 0 then
        table.insert(health_issues, "Health stat out of bounds: " .. monster.stats.health)
        is_healthy = false
    end
    
    -- Update health status
    health.is_healthy = is_healthy
    health.last_heartbeat = current_time
    health.uptime = uptime
    health.memory_usage = memory_usage
    
    if not is_healthy then
        health.error_count = health.error_count + 1
    end
    
    -- Save updated health status
    state_manager.save_state(monster)
    
    -- Prepare response
    local response = {
        success = true,
        data = {
            monster_id = monster.id,
            health_status = {
                is_healthy = is_healthy,
                uptime_seconds = uptime,
                uptime_hours = math.floor(uptime / 3600),
                last_heartbeat = current_time,
                memory_usage_kb = math.floor(memory_usage),
                error_count = health.error_count,
                last_decision_ago = time_since_decision,
                next_decision_in = math.max(0, monster.next_decision_at - current_time)
            },
            issues = health_issues,
            performance_metrics = {
                decision_frequency = "60 seconds",
                state_persistence = "enabled",
                backup_frequency = "on_change",
                process_version = process_state.version
            },
            monster_vitals = {
                current_state = monster.state,
                health = monster.stats.health,
                hunger = monster.stats.hunger,
                energy = monster.stats.energy,
                last_state_update = monster.stats.last_updated
            }
        },
        timestamp = current_time
    }
    
    return json.encode(response)
end

-- Handle Process-Restart message (triggers graceful restart)
function health_handler.handle_restart(msg: types.AOMessage): string
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    
    -- Perform backup before restart
    state_manager.backup_to_arweave(monster)
    
    -- Reset health counters
    process_state.health.error_count = 0
    process_state.health.last_heartbeat = os.time()
    
    -- Save final state
    state_manager.save_state(monster)
    
    local response = {
        success = true,
        data = {
            message = "Process restart initiated",
            monster_id = monster.id,
            backup_completed = true,
            restart_timestamp = os.time()
        },
        timestamp = os.time()
    }
    
    return json.encode(response)
end

-- Handle Emergency-Stop message (immediate shutdown)
function health_handler.handle_emergency_stop(msg: types.AOMessage): string
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    
    -- Emergency backup
    state_manager.backup_to_arweave(monster)
    
    local response = {
        success = true,
        data = {
            message = "Emergency stop initiated",
            monster_id = monster.id,
            final_state = monster.state,
            backup_completed = true,
            stop_timestamp = os.time()
        },
        timestamp = os.time()
    }
    
    return json.encode(response)
end

-- Automatic health monitoring (called periodically)
function health_handler.perform_self_check(): boolean
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    local current_time = os.time()
    
    -- Perform automated checks
    local state_valid, _ = state_manager.validate_state(monster)
    local memory_ok = collectgarbage("count") < 15360 -- 15MB limit
    local decision_cycle_ok = (current_time - monster.last_decision) < 180 -- 3 minute limit
    
    local all_checks_pass = state_valid and memory_ok and decision_cycle_ok
    
    -- Update health status
    process_state.health.is_healthy = all_checks_pass
    process_state.health.last_heartbeat = current_time
    
    if not all_checks_pass then
        process_state.health.error_count = process_state.health.error_count + 1
        
        -- Trigger automatic recovery if too many errors
        if process_state.health.error_count > 10 then
            health_handler.attempt_auto_recovery(monster)
        end
    end
    
    state_manager.save_state(monster)
    return all_checks_pass
end

-- Attempt automatic recovery from errors
function health_handler.attempt_auto_recovery(monster: types.MonsterState)
    print("Attempting automatic recovery for monster: " .. monster.id)
    
    -- Reset to safe state
    monster.state = "resting"
    monster.stats.last_updated = os.time()
    monster.next_decision_at = os.time() + 60
    
    -- Force garbage collection
    collectgarbage("collect")
    
    -- Validate recovered state
    local state_valid, error_msg = state_manager.validate_state(monster)
    if state_valid then
        print("Auto-recovery successful")
    else
        print("Auto-recovery failed: " .. error_msg)
    end
end

return health_handler