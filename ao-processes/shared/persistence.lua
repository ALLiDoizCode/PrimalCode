-- Persistence Management for AO Processes
-- Handles state persistence through AO process memory and Arweave backup

local json = require('json')
local utils = require('.utils')

local persistence = {}

-- State backup configuration
local BACKUP_INTERVAL = 300 -- 5 minutes in seconds
local MAX_BACKUP_HISTORY = 100
local BACKUP_COMPRESSION_THRESHOLD = 1024 -- bytes

-- Backup state tracking
local backup_state = {
    last_backup = 0,
    backup_count = 0,
    backup_history = {},
    backup_errors = {},
    arweave_enabled = true
}

-- Create state snapshot
function persistence.create_snapshot(monster_data)
    local snapshot = {
        version = "1.0",
        timestamp = os.time(),
        monster_id = monster_data.monster_id,
        species = monster_data.species,
        created_at = monster_data.created_at,
        stats = {
            health = monster_data.stats.health,
            hunger = monster_data.stats.hunger,
            energy = monster_data.stats.energy,
            position = {
                x = monster_data.stats.position.x,
                y = monster_data.stats.position.y,
                route = monster_data.stats.position.route
            }
        },
        ai_personality = {
            aggression = monster_data.ai_personality.aggression,
            intelligence = monster_data.ai_personality.intelligence,
            pack_tendency = monster_data.ai_personality.pack_tendency
        },
        environmental_awareness = {
            detected_structures = monster_data.environmental_awareness.detected_structures,
            resource_memory = monster_data.environmental_awareness.resource_memory,
            weather_adaptation = monster_data.environmental_awareness.weather_adaptation
        },
        influence_resistance = {
            learned_patterns = monster_data.influence_resistance.learned_patterns,
            adaptation_history = monster_data.influence_resistance.adaptation_history
        },
        state = monster_data.state,
        last_decision = monster_data.last_decision,
        next_decision_at = monster_data.next_decision_at,
        process_health = monster_data.process_health
    }
    
    return snapshot
end

-- Save state to AO process memory
function persistence.save_to_memory(monster_data)
    local snapshot = persistence.create_snapshot(monster_data)
    
    -- Store in AO process memory
    State = snapshot
    
    utils.log_debug("State saved to AO process memory")
    return true
end

-- Load state from AO process memory
function persistence.load_from_memory()
    if State then
        utils.log_debug("State loaded from AO process memory")
        return State
    end
    
    utils.log_debug("No state found in AO process memory")
    return nil
end

-- Validate state integrity
function persistence.validate_state(state_data)
    if not state_data then
        return false, "No state data provided"
    end
    
    local required_fields = {
        "version", "timestamp", "monster_id", "species", "stats", 
        "ai_personality", "environmental_awareness", "influence_resistance", 
        "state", "last_decision"
    }
    
    for _, field in ipairs(required_fields) do
        if not state_data[field] then
            return false, "Missing required field: " .. field
        end
    end
    
    -- Validate stats
    if not state_data.stats.health or not state_data.stats.hunger or not state_data.stats.energy then
        return false, "Invalid stats structure"
    end
    
    -- Validate position
    if not state_data.stats.position or not state_data.stats.position.x or not state_data.stats.position.y then
        return false, "Invalid position structure"
    end
    
    -- Validate personality
    if not state_data.ai_personality.aggression or not state_data.ai_personality.intelligence or not state_data.ai_personality.pack_tendency then
        return false, "Invalid AI personality structure"
    end
    
    return true, nil
end

-- Prepare state for Arweave backup
function persistence.prepare_arweave_backup(monster_data)
    local snapshot = persistence.create_snapshot(monster_data)
    
    -- Add backup metadata
    snapshot.backup_metadata = {
        backup_id = "backup_" .. snapshot.monster_id .. "_" .. snapshot.timestamp,
        backup_type = "full_state",
        compression_used = false,
        original_size = 0,
        ao_process_id = ao.id or "unknown"
    }
    
    local json_data, error = utils.safe_json_encode(snapshot)
    if not json_data then
        return nil, error
    end
    
    -- Check if compression is needed
    if #json_data > BACKUP_COMPRESSION_THRESHOLD then
        snapshot.backup_metadata.compression_used = true
        utils.log_debug("Backup data exceeds compression threshold, compression recommended")
    end
    
    snapshot.backup_metadata.original_size = #json_data
    
    return snapshot, nil
end

-- Simulate Arweave backup (in real implementation, this would use Arweave SDK)
function persistence.backup_to_arweave(monster_data)
    if not backup_state.arweave_enabled then
        utils.log_debug("Arweave backup disabled")
        return false, "Arweave backup disabled"
    end
    
    local backup_data, error = persistence.prepare_arweave_backup(monster_data)
    if not backup_data then
        return false, error
    end
    
    -- Simulate Arweave transaction
    local transaction_id = "tx_" .. backup_data.backup_metadata.backup_id
    
    -- Record backup in history
    local backup_record = {
        timestamp = os.time(),
        transaction_id = transaction_id,
        backup_id = backup_data.backup_metadata.backup_id,
        size = backup_data.backup_metadata.original_size,
        compression_used = backup_data.backup_metadata.compression_used,
        status = "success"
    }
    
    table.insert(backup_state.backup_history, backup_record)
    
    -- Maintain backup history limit
    while #backup_state.backup_history > MAX_BACKUP_HISTORY do
        table.remove(backup_state.backup_history, 1)
    end
    
    backup_state.last_backup = os.time()
    backup_state.backup_count = backup_state.backup_count + 1
    
    utils.log_debug("State backed up to Arweave with transaction ID: " .. transaction_id)
    return true, transaction_id
end

-- Automatic backup based on time interval
function persistence.should_backup()
    local current_time = os.time()
    return (current_time - backup_state.last_backup) >= BACKUP_INTERVAL
end

-- Perform automatic backup if needed
function persistence.auto_backup(monster_data)
    if persistence.should_backup() then
        local success, result = persistence.backup_to_arweave(monster_data)
        if success then
            utils.log_debug("Automatic backup completed: " .. result)
        else
            utils.log_error("Automatic backup failed: " .. result)
            table.insert(backup_state.backup_errors, {
                timestamp = os.time(),
                error = result
            })
        end
        return success
    end
    return false
end

-- State recovery procedures
function persistence.recover_state()
    utils.log_debug("Starting state recovery procedure")
    
    -- Try to recover from AO process memory first
    local memory_state = persistence.load_from_memory()
    if memory_state then
        local valid, error = persistence.validate_state(memory_state)
        if valid then
            utils.log_debug("State successfully recovered from AO process memory")
            return memory_state, "memory"
        else
            utils.log_error("State in memory is invalid: " .. error)
        end
    end
    
    -- If memory recovery fails, try to recover from latest backup
    if #backup_state.backup_history > 0 then
        local latest_backup = backup_state.backup_history[#backup_state.backup_history]
        utils.log_debug("Attempting recovery from backup: " .. latest_backup.backup_id)
        
        -- In real implementation, this would retrieve from Arweave
        -- For now, we'll simulate recovery failure
        utils.log_error("Backup recovery not implemented - would retrieve from Arweave")
        return nil, "backup_recovery_not_implemented"
    end
    
    utils.log_error("No valid state found for recovery")
    return nil, "no_valid_state"
end

-- Get backup statistics
function persistence.get_backup_stats()
    return {
        total_backups = backup_state.backup_count,
        last_backup = backup_state.last_backup,
        backup_history_count = #backup_state.backup_history,
        error_count = #backup_state.backup_errors,
        arweave_enabled = backup_state.arweave_enabled,
        next_backup_due = backup_state.last_backup + BACKUP_INTERVAL
    }
end

-- Enable/disable Arweave backup
function persistence.set_arweave_enabled(enabled)
    backup_state.arweave_enabled = enabled
    utils.log_debug("Arweave backup " .. (enabled and "enabled" or "disabled"))
end

-- Clear backup history (for testing/cleanup)
function persistence.clear_backup_history()
    backup_state.backup_history = {}
    backup_state.backup_errors = {}
    backup_state.backup_count = 0
    utils.log_debug("Backup history cleared")
end

-- Force backup (ignores interval)
function persistence.force_backup(monster_data)
    local success, result = persistence.backup_to_arweave(monster_data)
    if success then
        utils.log_debug("Force backup completed: " .. result)
    else
        utils.log_error("Force backup failed: " .. result)
    end
    return success, result
end

-- Get recent backup history
function persistence.get_backup_history(limit)
    limit = limit or 10
    local history = {}
    local start_index = math.max(1, #backup_state.backup_history - limit + 1)
    
    for i = start_index, #backup_state.backup_history do
        table.insert(history, backup_state.backup_history[i])
    end
    
    return history
end

return persistence