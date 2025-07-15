-- AO Monster Process - Single Autonomous Monster with Persistent State
-- This process maintains persistent monster state and makes autonomous decisions

local json = require('json')

-- Monster State Variables (Data Model Specifications)
monster_id = monster_id or ""
species = species or ""
created_at = created_at or ""

-- Monster Stats
stats = stats or {
    health = 100,
    hunger = 0,
    energy = 100,
    position = {
        x = 0,
        y = 0,
        route = ""
    }
}

-- AI Personality (Numerical values for decision-making)
ai_personality = ai_personality or {
    aggression = 0.5,
    intelligence = 0.5,
    pack_tendency = 0.5
}

-- Environmental Awareness
environmental_awareness = environmental_awareness or {
    detected_structures = {},
    resource_memory = {},
    weather_adaptation = 0.5
}

-- Influence Resistance (Learning and adaptation)
influence_resistance = influence_resistance or {
    learned_patterns = {},
    adaptation_history = {}
}

-- Current State and Decision Tracking
state = state or "exploring"
last_decision = last_decision or {}
next_decision_at = next_decision_at or 0

-- Decision interval (60 seconds)
DECISION_INTERVAL = 60000
MAX_HEALTH = 100
MAX_HUNGER = 100
MAX_ENERGY = 100

-- Process Health Monitoring
process_health = process_health or {
    status = "healthy",
    last_heartbeat = 0,
    error_count = 0,
    restart_count = 0
}

-- State History for Debugging
state_history = state_history or {}

-- Utility Functions
local function log_debug(message)
    print("[DEBUG] " .. os.date("%Y-%m-%d %H:%M:%S") .. " - " .. message)
end

local function log_error(message)
    print("[ERROR] " .. os.date("%Y-%m-%d %H:%M:%S") .. " - " .. message)
    process_health.error_count = process_health.error_count + 1
end

local function validate_state()
    local valid = true
    
    if stats.health < 0 or stats.health > MAX_HEALTH then
        stats.health = math.max(0, math.min(MAX_HEALTH, stats.health))
        valid = false
    end
    
    if stats.hunger < 0 or stats.hunger > MAX_HUNGER then
        stats.hunger = math.max(0, math.min(MAX_HUNGER, stats.hunger))
        valid = false
    end
    
    if stats.energy < 0 or stats.energy > MAX_ENERGY then
        stats.energy = math.max(0, math.min(MAX_ENERGY, stats.energy))
        valid = false
    end
    
    if not valid then
        log_debug("State validation corrected invalid values")
    end
    
    return valid
end

local function save_state_to_history()
    local history_entry = {
        timestamp = os.time(),
        state = state,
        stats = {
            health = stats.health,
            hunger = stats.hunger,
            energy = stats.energy,
            position = {
                x = stats.position.x,
                y = stats.position.y,
                route = stats.position.route
            }
        },
        last_decision = last_decision
    }
    
    table.insert(state_history, history_entry)
    
    -- Keep only last 100 entries
    if #state_history > 100 then
        table.remove(state_history, 1)
    end
    
    -- Save to persistent storage
    local monster_data = {
        monster_id = monster_id,
        species = species,
        created_at = created_at,
        stats = stats,
        ai_personality = ai_personality,
        environmental_awareness = environmental_awareness,
        influence_resistance = influence_resistance,
        state = state,
        last_decision = last_decision,
        next_decision_at = next_decision_at,
        process_health = process_health
    }
    
    persistence.save_to_memory(monster_data)
    persistence.auto_backup(monster_data)
end

local function make_decision()
    log_debug("Making autonomous decision for monster " .. monster_id)
    
    -- Basic decision logic based on monster personality and state
    local decision = {
        action = "explore",
        target = nil,
        reasoning = "Default exploration behavior",
        timestamp = os.time()
    }
    
    -- Decision based on hunger level
    if stats.hunger > 70 then
        decision.action = "hunt"
        decision.reasoning = "High hunger level requires hunting"
        if ai_personality.aggression > 0.6 then
            decision.target = "large_prey"
        else
            decision.target = "small_prey"
        end
    elseif stats.energy < 30 then
        decision.action = "rest"
        decision.reasoning = "Low energy requires rest"
        state = "resting"
    elseif stats.health < 50 then
        decision.action = "seek_healing"
        decision.reasoning = "Low health requires healing"
        state = "seeking_healing"
    else
        -- Personality-based decisions
        if ai_personality.pack_tendency > 0.7 then
            decision.action = "seek_pack"
            decision.reasoning = "High pack tendency drives social behavior"
            state = "seeking_pack"
        elseif ai_personality.intelligence > 0.7 then
            decision.action = "patrol_territory"
            decision.reasoning = "High intelligence drives territorial behavior"
            state = "patrolling"
        else
            decision.action = "explore"
            decision.reasoning = "Normal exploration behavior"
            state = "exploring"
        end
    end
    
    -- Update environmental awareness
    environmental_awareness.detected_structures = environmental_awareness.detected_structures or {}
    environmental_awareness.resource_memory = environmental_awareness.resource_memory or {}
    
    -- Log decision for debugging
    log_debug("Decision made: " .. decision.action .. " - " .. decision.reasoning)
    
    last_decision = decision
    next_decision_at = os.time() + DECISION_INTERVAL / 1000
    
    -- Save state to history
    save_state_to_history()
    
    return decision
end

local function update_monster_state()
    -- Natural state progression over time
    stats.hunger = math.min(MAX_HUNGER, stats.hunger + 1)
    
    if state == "resting" then
        stats.energy = math.min(MAX_ENERGY, stats.energy + 5)
        if stats.energy > 80 then
            state = "exploring"
        end
    else
        stats.energy = math.max(0, stats.energy - 1)
    end
    
    -- Validate state after updates
    validate_state()
end

-- Initialize process if not already initialized
local function initialize_process()
    if monster_id == "" then
        -- Try to recover from persistent storage first
        local recovered_state, recovery_source = persistence.recover_state()
        
        if recovered_state then
            log_debug("Recovering monster state from " .. recovery_source)
            
            -- Restore state from recovery
            monster_id = recovered_state.monster_id
            species = recovered_state.species
            created_at = recovered_state.created_at
            stats = recovered_state.stats
            ai_personality = recovered_state.ai_personality
            environmental_awareness = recovered_state.environmental_awareness
            influence_resistance = recovered_state.influence_resistance
            state = recovered_state.state
            last_decision = recovered_state.last_decision
            next_decision_at = recovered_state.next_decision_at
            process_health = recovered_state.process_health
            
            log_debug("Monster process recovered with ID: " .. monster_id)
        else
            -- Initialize new monster
            monster_id = "monster_" .. tostring(os.time())
            species = "basic_monster"
            created_at = os.date("%Y-%m-%d %H:%M:%S")
            next_decision_at = os.time() + DECISION_INTERVAL / 1000
            
            log_debug("New monster process initialized with ID: " .. monster_id)
        end
        
        save_state_to_history()
    end
end

-- Message Handlers for External Communication

-- Get-State Message Handler
Handlers.add("Get-State", Handlers.utils.hasMatchingTag("Action", "Get-State"), function(msg)
    local current_state = {
        monster_id = monster_id,
        species = species,
        created_at = created_at,
        stats = stats,
        ai_personality = ai_personality,
        environmental_awareness = environmental_awareness,
        influence_resistance = influence_resistance,
        state = state,
        last_decision = last_decision,
        next_decision_at = next_decision_at,
        process_health = process_health
    }
    
    ao.send({
        Target = msg.From,
        Action = "State-Response",
        Data = json.encode(current_state)
    })
    
    log_debug("State query responded to " .. msg.From)
end)

-- Update-State Message Handler
Handlers.add("Update-State", Handlers.utils.hasMatchingTag("Action", "Update-State"), function(msg)
    local success = false
    local error_message = ""
    
    if msg.Data then
        local ok, update_data = pcall(json.decode, msg.Data)
        if ok and update_data then
            -- Validate and apply state updates
            if update_data.stats then
                if update_data.stats.health then
                    stats.health = math.max(0, math.min(MAX_HEALTH, update_data.stats.health))
                end
                if update_data.stats.hunger then
                    stats.hunger = math.max(0, math.min(MAX_HUNGER, update_data.stats.hunger))
                end
                if update_data.stats.energy then
                    stats.energy = math.max(0, math.min(MAX_ENERGY, update_data.stats.energy))
                end
                if update_data.stats.position then
                    stats.position = update_data.stats.position
                end
            end
            
            if update_data.state then
                state = update_data.state
            end
            
            success = true
            save_state_to_history()
            log_debug("State updated by external request from " .. msg.From)
        else
            error_message = "Invalid JSON data"
            log_error("Invalid JSON in Update-State message from " .. msg.From)
        end
    else
        error_message = "No data provided"
        log_error("No data in Update-State message from " .. msg.From)
    end
    
    ao.send({
        Target = msg.From,
        Action = "Update-State-Response",
        Success = tostring(success),
        Error = error_message
    })
end)

-- Environment-Change Message Handler
Handlers.add("Environment-Change", Handlers.utils.hasMatchingTag("Action", "Environment-Change"), function(msg)
    local success = false
    local error_message = ""
    
    if msg.Data then
        local ok, change_data = pcall(json.decode, msg.Data)
        if ok and change_data then
            -- Process environmental changes
            if change_data.route_id and change_data.route_id == stats.position.route then
                -- Monster is in affected area
                log_debug("Environmental change detected in current route: " .. change_data.route_id)
                
                -- Update environmental awareness
                if change_data.modification_type == "food_placed" then
                    table.insert(environmental_awareness.resource_memory, {
                        type = "food",
                        location = change_data.location,
                        timestamp = os.time()
                    })
                elseif change_data.modification_type == "shelter_built" then
                    table.insert(environmental_awareness.detected_structures, {
                        type = "shelter",
                        location = change_data.location,
                        timestamp = os.time()
                    })
                elseif change_data.modification_type == "weather_changed" then
                    -- Adapt to weather changes
                    environmental_awareness.weather_adaptation = change_data.weather_severity or 0.5
                end
                
                -- Record pattern for learning
                table.insert(influence_resistance.adaptation_history, {
                    modification_type = change_data.modification_type,
                    timestamp = os.time(),
                    response = "adapted"
                })
            end
            
            success = true
            save_state_to_history()
        else
            error_message = "Invalid JSON data"
            log_error("Invalid JSON in Environment-Change message from " .. msg.From)
        end
    else
        error_message = "No data provided"
        log_error("No data in Environment-Change message from " .. msg.From)
    end
    
    ao.send({
        Target = msg.From,
        Action = "Environment-Change-Response",
        Success = tostring(success),
        Error = error_message
    })
end)

-- Monster-Communication Message Handler
Handlers.add("Monster-Communication", Handlers.utils.hasMatchingTag("Action", "Monster-Communication"), function(msg)
    local success = false
    local error_message = ""
    
    if msg.Data then
        local ok, comm_data = pcall(json.decode, msg.Data)
        if ok and comm_data then
            log_debug("Received communication from " .. (comm_data.sender_id or "unknown"))
            
            -- Process different types of monster communication
            if comm_data.message_type == "territory_warning" then
                -- Adjust behavior based on aggression level
                if ai_personality.aggression < 0.3 then
                    state = "retreating"
                    log_debug("Retreating due to territory warning")
                end
            elseif comm_data.message_type == "pack_invitation" then
                -- Consider pack invitation based on pack tendency
                if ai_personality.pack_tendency > 0.6 then
                    state = "joining_pack"
                    log_debug("Accepting pack invitation")
                end
            elseif comm_data.message_type == "resource_sharing" then
                -- Update resource memory
                if comm_data.resource_location then
                    table.insert(environmental_awareness.resource_memory, {
                        type = comm_data.resource_type or "unknown",
                        location = comm_data.resource_location,
                        timestamp = os.time(),
                        source = "communication"
                    })
                end
            end
            
            success = true
            save_state_to_history()
        else
            error_message = "Invalid JSON data"
            log_error("Invalid JSON in Monster-Communication message from " .. msg.From)
        end
    else
        error_message = "No data provided"
        log_error("No data in Monster-Communication message from " .. msg.From)
    end
    
    ao.send({
        Target = msg.From,
        Action = "Monster-Communication-Response",
        Success = tostring(success),
        Error = error_message
    })
end)

-- Health Check Message Handler
Handlers.add("Health-Check", Handlers.utils.hasMatchingTag("Action", "Health-Check"), function(msg)
    process_health.last_heartbeat = os.time()
    process_health.status = "healthy"
    
    ao.send({
        Target = msg.From,
        Action = "Health-Check-Response",
        Status = process_health.status,
        Uptime = tostring(os.time() - (tonumber(created_at) or 0)),
        ErrorCount = tostring(process_health.error_count),
        RestartCount = tostring(process_health.restart_count)
    })
    
    log_debug("Health check responded to " .. msg.From)
end)

-- Load timer system and persistence
local timer = require('.shared.timer')
local persistence = require('.shared.persistence')

-- Autonomous Decision Cycle Handler
Handlers.add("Decision-Cycle", Handlers.utils.hasMatchingTag("Action", "Decision-Cycle"), function(msg)
    local current_time = os.time()
    
    if current_time >= next_decision_at then
        update_monster_state()
        make_decision()
        
        -- Broadcast decision to interested parties
        ao.send({
            Target = ao.id,
            Action = "Decision-Made",
            Data = json.encode({
                monster_id = monster_id,
                decision = last_decision,
                state = state,
                stats = stats
            })
        })
        
        log_debug("Decision cycle completed")
    end
end)

-- Autonomous decision cycle callback
local function autonomous_decision_cycle()
    update_monster_state()
    local decision = make_decision()
    
    -- Broadcast decision to interested parties
    ao.send({
        Target = ao.id,
        Action = "Decision-Made",
        Data = json.encode({
            monster_id = monster_id,
            decision = decision,
            state = state,
            stats = stats,
            timestamp = os.time()
        })
    })
    
    log_debug("Autonomous decision cycle completed - Next decision in " .. DECISION_INTERVAL / 1000 .. " seconds")
end

-- Timer processing handler
Handlers.add("Timer-Process", Handlers.utils.hasMatchingTag("Action", "Timer-Process"), function(msg)
    timer.process_all()
end)

-- Automatic decision cycle timer (triggers every 60 seconds)
local function start_decision_timer()
    local decision_interval_seconds = DECISION_INTERVAL / 1000
    
    -- Start the autonomous decision timer
    timer.start("decision_cycle", decision_interval_seconds, autonomous_decision_cycle)
    
    log_debug("Decision timer started - will trigger every " .. decision_interval_seconds .. " seconds")
    
    -- Also start a timer processing handler to ensure timers are processed
    timer.start("timer_processor", 5, function()
        timer.process_all()
    end)
end

-- Backup Status Handler
Handlers.add("Backup-Status", Handlers.utils.hasMatchingTag("Action", "Backup-Status"), function(msg)
    local backup_stats = persistence.get_backup_stats()
    local backup_history = persistence.get_backup_history(5) -- Last 5 backups
    
    local response_data = {
        backup_stats = backup_stats,
        backup_history = backup_history
    }
    
    ao.send({
        Target = msg.From,
        Action = "Backup-Status-Response",
        Data = json.encode(response_data)
    })
    
    log_debug("Backup status responded to " .. msg.From)
end)

-- Force Backup Handler
Handlers.add("Force-Backup", Handlers.utils.hasMatchingTag("Action", "Force-Backup"), function(msg)
    local monster_data = {
        monster_id = monster_id,
        species = species,
        created_at = created_at,
        stats = stats,
        ai_personality = ai_personality,
        environmental_awareness = environmental_awareness,
        influence_resistance = influence_resistance,
        state = state,
        last_decision = last_decision,
        next_decision_at = next_decision_at,
        process_health = process_health
    }
    
    local success, result = persistence.force_backup(monster_data)
    
    ao.send({
        Target = msg.From,
        Action = "Force-Backup-Response",
        Success = tostring(success),
        Result = result or "",
        BackupStats = json.encode(persistence.get_backup_stats())
    })
    
    log_debug("Force backup request processed for " .. msg.From)
end)

-- Process Recovery Handler
Handlers.add("Process-Recovery", Handlers.utils.hasMatchingTag("Action", "Process-Recovery"), function(msg)
    log_debug("Process recovery initiated")
    
    -- Validate and recover state
    validate_state()
    
    -- Reset health monitoring
    process_health.restart_count = process_health.restart_count + 1
    process_health.error_count = 0
    process_health.status = "recovering"
    
    -- Re-initialize if needed
    initialize_process()
    
    ao.send({
        Target = msg.From,
        Action = "Process-Recovery-Response",
        Success = "true",
        RestartCount = tostring(process_health.restart_count)
    })
    
    log_debug("Process recovery completed")
end)

-- Initialize the process
initialize_process()
start_decision_timer()

log_debug("Monster process fully initialized and ready")