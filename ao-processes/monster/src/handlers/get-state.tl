-- Get-State Message Handler
-- Handles queries for current monster state from MCP tools

local types = require('types.monster')
local state_manager = require('utils.state-manager')
local json = require('utils.json')

local get_state_handler = {}

-- Handle Get-State message
function get_state_handler.handle(msg: types.AOMessage): string
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    
    -- Validate state before returning
    local is_valid, error_msg = state_manager.validate_state(monster)
    if not is_valid then
        return json.encode({
            success = false,
            error = "Invalid monster state: " .. error_msg,
            timestamp = os.time()
        })
    end
    
    -- Return comprehensive state information
    local response = {
        success = true,
        data = {
            monster_id = monster.id,
            species = monster.species,
            stats = {
                health = monster.stats.health,
                hunger = monster.stats.hunger,
                energy = monster.stats.energy,
                position = {
                    x = monster.stats.position.x,
                    y = monster.stats.position.y,
                    route = monster.stats.position.route
                }
            },
            personality = {
                aggression = monster.ai_personality.aggression,
                intelligence = monster.ai_personality.intelligence,
                pack_tendency = monster.ai_personality.pack_tendency,
                adaptation_rate = monster.ai_personality.adaptation_rate
            },
            current_state = monster.state,
            last_decision = monster.last_decision,
            next_decision_at = monster.next_decision_at,
            environmental_awareness = {
                detected_structures = monster.environmental_awareness.detected_structures,
                weather_adaptation = monster.environmental_awareness.weather_adaptation
            },
            health_status = {
                is_healthy = process_state.health.is_healthy,
                uptime = process_state.health.uptime,
                last_heartbeat = process_state.health.last_heartbeat
            }
        },
        timestamp = os.time(),
        version = process_state.version
    }
    
    -- Update last heartbeat
    process_state.health.last_heartbeat = os.time()
    state_manager.save_state(monster)
    
    return json.encode(response)
end

-- Handle Get-Stats message (lighter version)
function get_state_handler.handle_stats_only(msg: types.AOMessage): string
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    
    local response = {
        success = true,
        data = {
            monster_id = monster.id,
            stats = {
                health = monster.stats.health,
                hunger = monster.stats.hunger,
                energy = monster.stats.energy
            },
            current_state = monster.state,
            last_decision = monster.last_decision
        },
        timestamp = os.time()
    }
    
    return json.encode(response)
end

-- Handle Get-Personality message
function get_state_handler.handle_personality(msg: types.AOMessage): string
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    
    local response = {
        success = true,
        data = {
            monster_id = monster.id,
            species = monster.species,
            personality = {
                aggression = monster.ai_personality.aggression,
                intelligence = monster.ai_personality.intelligence,
                pack_tendency = monster.ai_personality.pack_tendency,
                adaptation_rate = monster.ai_personality.adaptation_rate
            },
            learning_patterns = monster.influence_resistance.learned_patterns,
            created_at = monster.created_at
        },
        timestamp = os.time()
    }
    
    return json.encode(response)
end

return get_state_handler