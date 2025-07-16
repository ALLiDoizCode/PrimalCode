-- Environment-Update Message Handler
-- Handles environmental modification notifications from MCP tools

local types = require('types.monster')
local state_manager = require('utils.state-manager')
local json = require('utils.json')

local environment_handler = {}

-- Handle Environment-Change message
function environment_handler.handle(msg: types.AOMessage): string
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    
    local data = msg.Data
    if not data or not data.modification then
        return json.encode({
            success = false,
            error = "Invalid environment change data",
            timestamp = os.time()
        })
    end
    
    local modification = data.modification
    local response_data = {
        monster_id = monster.id,
        reaction = "no_reaction",
        behavior_change = false,
        new_state = monster.state
    }
    
    -- Process different types of environmental modifications
    local mod_type = modification.type
    
    if mod_type == "food_placement" then
        response_data = environment_handler.handle_food_placement(monster, modification)
    elseif mod_type == "weather_change" then
        response_data = environment_handler.handle_weather_change(monster, modification)
    elseif mod_type == "shelter_construction" then
        response_data = environment_handler.handle_shelter_construction(monster, modification)
    else
        response_data.reaction = "unknown_modification"
    end
    
    -- Update monster state if behavior changed
    if response_data.behavior_change then
        monster.state = response_data.new_state
        monster.stats.last_updated = os.time()
        state_manager.save_state(monster)
    end
    
    local response = {
        success = true,
        data = response_data,
        timestamp = os.time()
    }
    
    return json.encode(response)
end

-- Handle food placement in environment
function environment_handler.handle_food_placement(monster: types.MonsterState, modification: {string: any}): {string: any}
    local location = modification.location
    local monster_pos = monster.stats.position
    
    -- Calculate distance to food
    local distance = math.sqrt((location.x - monster_pos.x)^2 + (location.y - monster_pos.y)^2)
    local detection_range = 50 + (monster.ai_personality.intelligence * 30) -- Intelligence affects detection
    
    local response = {
        monster_id = monster.id,
        reaction = "no_reaction",
        behavior_change = false,
        new_state = monster.state,
        distance_to_food = distance,
        detected = distance <= detection_range
    }
    
    if distance <= detection_range then
        -- Monster detected the food
        response.detected = true
        
        -- Add to environmental awareness
        table.insert(monster.environmental_awareness.detected_structures, "food_source")
        
        -- Decide if monster should investigate based on hunger and personality
        local hunger_motivation = monster.stats.hunger / 100
        local curiosity = monster.ai_personality.intelligence
        local motivation = hunger_motivation * 0.7 + curiosity * 0.3
        
        if motivation > 0.4 then
            response.reaction = "interested"
            response.behavior_change = true
            response.new_state = "investigating_food"
            
            -- Reduce hunger slightly due to anticipation
            if monster.stats.hunger > 10 then
                state_manager.update_stats(monster, "hunger", monster.stats.hunger - 5)
            end
        else
            response.reaction = "aware_but_uninterested"
        end
    end
    
    return response
end

-- Handle weather changes
function environment_handler.handle_weather_change(monster: types.MonsterState, modification: {string: any}): {string: any}
    local weather_type = modification.parameters.weather_type or "unknown"
    local intensity = modification.parameters.intensity or 0.5
    
    local response = {
        monster_id = monster.id,
        reaction = "adapting",
        behavior_change = false,
        new_state = monster.state,
        weather_type = weather_type,
        adaptation_level = monster.environmental_awareness.weather_adaptation
    }
    
    -- Monsters adapt to weather based on their adaptation level
    local adaptation = monster.environmental_awareness.weather_adaptation
    
    if weather_type == "storm" and intensity > 0.7 then
        -- Severe weather requires shelter-seeking behavior
        if adaptation < 0.5 then
            response.reaction = "seeking_shelter"
            response.behavior_change = true
            response.new_state = "seek_shelter"
        else
            response.reaction = "weathering_storm"
        end
    elseif weather_type == "rain" then
        -- Rain affects different personalities differently
        if monster.ai_personality.aggression > 0.7 then
            response.reaction = "irritated"
        else
            response.reaction = "calm"
        end
    elseif weather_type == "clear" then
        response.reaction = "content"
        
        -- Good weather might encourage exploration
        if monster.ai_personality.intelligence > 0.6 and monster.stats.energy > 50 then
            response.behavior_change = true
            response.new_state = "explore"
        end
    end
    
    -- Improve weather adaptation over time
    monster.environmental_awareness.weather_adaptation = math.min(1.0, adaptation + 0.05)
    
    return response
end

-- Handle shelter construction
function environment_handler.handle_shelter_construction(monster: types.MonsterState, modification: {string: any}): {string: any}
    local location = modification.location
    local monster_pos = monster.stats.position
    
    local distance = math.sqrt((location.x - monster_pos.x)^2 + (location.y - monster_pos.y)^2)
    local awareness_range = 40 + (monster.ai_personality.intelligence * 25)
    
    local response = {
        monster_id = monster.id,
        reaction = "no_reaction",
        behavior_change = false,
        new_state = monster.state,
        distance_to_shelter = distance,
        detected = distance <= awareness_range
    }
    
    if distance <= awareness_range then
        response.detected = true
        
        -- Add to detected structures
        table.insert(monster.environmental_awareness.detected_structures, "shelter")
        
        -- Territorial monsters might be more concerned about structures
        if monster.ai_personality.aggression > 0.6 then
            response.reaction = "territorial_concern"
            
            if distance < 20 then -- Very close to territory
                response.behavior_change = true
                response.new_state = "patrol_territory"
            end
        else
            response.reaction = "curious"
            
            -- Intelligent monsters investigate new structures
            if monster.ai_personality.intelligence > 0.7 then
                response.behavior_change = true
                response.new_state = "investigating_structure"
            end
        end
    end
    
    return response
end

return environment_handler