-- State Manager for Monster AO Process
-- Handles state persistence, backup, and validation

local types = require('types.monster')
local json = require('utils.json')

local state_manager = {}

-- Global process state
state_manager.current_state = nil

-- Initialize monster state with default values
function state_manager.initialize_monster(monster_id: string, species: string): types.MonsterState
    local monster: types.MonsterState = {
        -- Core identity
        id = monster_id,
        species = species,
        created_at = os.time(),
        
        -- Dynamic stats
        stats = {
            health = 100,
            hunger = 50,
            energy = 80,
            position = {
                x = 150,
                y = 200,
                route = "forest_path"
            },
            last_updated = os.time()
        },
        
        -- AI personality (stable traits)
        ai_personality = {
            aggression = math.random() * 0.5 + 0.3,  -- 0.3 to 0.8
            intelligence = math.random() * 0.5 + 0.4, -- 0.4 to 0.9
            pack_tendency = math.random() * 0.6 + 0.2, -- 0.2 to 0.8
            adaptation_rate = math.random() * 0.4 + 0.3 -- 0.3 to 0.7
        },
        
        -- Environmental awareness (starts empty)
        environmental_awareness = {
            detected_structures = {},
            resource_memory = {},
            weather_adaptation = 0.3,
            scent_trail_following = nil
        },
        
        -- Learning and adaptation (starts empty)
        influence_resistance = {
            learned_patterns = {},
            adaptation_history = {},
            counter_strategies = {}
        },
        
        -- Current state
        state = "wandering",
        last_decision = os.time(),
        next_decision_at = os.time() + 60
    }
    
    return monster
end

-- Save current state to AO process memory
function state_manager.save_state(monster: types.MonsterState): boolean
    local process_state: types.ProcessState = {
        monster = monster,
        health = {
            is_healthy = true,
            last_heartbeat = os.time(),
            error_count = 0,
            uptime = os.time() - (monster.created_at or os.time()),
            memory_usage = collectgarbage("count")
        },
        version = "1.0.0",
        last_backup = os.time()
    }
    
    -- Store in AO process memory
    local success, err = pcall(function()
        _G.PROCESS_STATE = process_state
        state_manager.current_state = process_state
    end)
    
    if not success then
        print("Error saving state: " .. tostring(err))
        return false
    end
    
    return true
end

-- Load state from AO process memory
function state_manager.load_state(): types.ProcessState
    local process_state = _G.PROCESS_STATE
    
    if process_state then
        state_manager.current_state = process_state
        return process_state
    end
    
    -- Initialize new state if none exists
    local monster = state_manager.initialize_monster("monster_" .. tostring(os.time()), "hunter_wolf")
    local new_state: types.ProcessState = {
        monster = monster,
        health = {
            is_healthy = true,
            last_heartbeat = os.time(),
            error_count = 0,
            uptime = 0,
            memory_usage = collectgarbage("count")
        },
        version = "1.0.0",
        last_backup = os.time()
    }
    
    state_manager.save_state(monster)
    return new_state
end

-- Validate monster state integrity
function state_manager.validate_state(monster: types.MonsterState): boolean, string
    -- Check required fields
    if not monster.id or monster.id == "" then
        return false, "Missing monster ID"
    end
    
    if not monster.species or monster.species == "" then
        return false, "Missing monster species"
    end
    
    -- Validate stats ranges
    if monster.stats.health < 0 or monster.stats.health > 100 then
        return false, "Invalid health value: " .. tostring(monster.stats.health)
    end
    
    if monster.stats.hunger < 0 or monster.stats.hunger > 100 then
        return false, "Invalid hunger value: " .. tostring(monster.stats.hunger)
    end
    
    if monster.stats.energy < 0 or monster.stats.energy > 100 then
        return false, "Invalid energy value: " .. tostring(monster.stats.energy)
    end
    
    -- Validate personality traits (0.0 to 1.0)
    local personality = monster.ai_personality
    if personality.aggression < 0 or personality.aggression > 1 then
        return false, "Invalid aggression value: " .. tostring(personality.aggression)
    end
    
    if personality.intelligence < 0 or personality.intelligence > 1 then
        return false, "Invalid intelligence value: " .. tostring(personality.intelligence)
    end
    
    if personality.pack_tendency < 0 or personality.pack_tendency > 1 then
        return false, "Invalid pack_tendency value: " .. tostring(personality.pack_tendency)
    end
    
    return true, "State is valid"
end

-- Update monster stats with bounds checking
function state_manager.update_stats(monster: types.MonsterState, stat_name: string, value: number): boolean
    local function clamp(val: number, min: number, max: number): number
        return math.max(min, math.min(max, val))
    end
    
    if stat_name == "health" then
        monster.stats.health = clamp(value, 0, 100)
    elseif stat_name == "hunger" then
        monster.stats.hunger = clamp(value, 0, 100)
    elseif stat_name == "energy" then
        monster.stats.energy = clamp(value, 0, 100)
    else
        return false
    end
    
    monster.stats.last_updated = os.time()
    return state_manager.save_state(monster)
end

-- Backup state to Arweave (placeholder for future implementation)
function state_manager.backup_to_arweave(monster: types.MonsterState): boolean
    -- This would integrate with Arweave backup mechanisms
    -- For now, just log the backup attempt
    print("Backing up monster state to Arweave: " .. monster.id)
    return true
end

return state_manager