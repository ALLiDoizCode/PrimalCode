-- Monster-Communication Message Handler
-- Handles inter-monster messaging and coordination

local types = require('types.monster')
local state_manager = require('utils.state-manager')
local json = require('utils.json')

local communication_handler = {}

-- Handle Monster-Communication message
function communication_handler.handle(msg: types.AOMessage): string
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    
    local data = msg.Data
    if not data or not data.message_type then
        return json.encode({
            success = false,
            error = "Invalid communication data",
            timestamp = os.time()
        })
    end
    
    local message_type = data.message_type
    local sender_id = data.sender_id
    local content = data.content or {}
    local urgency = data.urgency or "low"
    
    local response_data = {
        monster_id = monster.id,
        received_from = sender_id,
        message_type = message_type,
        response = "acknowledged",
        behavior_change = false,
        new_state = monster.state
    }
    
    -- Process different types of monster communication
    if message_type == "territory_claim" then
        response_data = communication_handler.handle_territory_claim(monster, sender_id, content, urgency)
    elseif message_type == "threat_warning" then
        response_data = communication_handler.handle_threat_warning(monster, sender_id, content, urgency)
    elseif message_type == "resource_share" then
        response_data = communication_handler.handle_resource_share(monster, sender_id, content, urgency)
    elseif message_type == "pack_coordination" then
        response_data = communication_handler.handle_pack_coordination(monster, sender_id, content, urgency)
    else
        response_data.response = "unknown_message_type"
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

-- Handle territory claim messages
function communication_handler.handle_territory_claim(monster: types.MonsterState, sender_id: string, content: {string: any}, urgency: string): {string: any}
    local aggression = monster.ai_personality.aggression
    local pack_tendency = monster.ai_personality.pack_tendency
    
    local response = {
        monster_id = monster.id,
        received_from = sender_id,
        message_type = "territory_claim",
        response = "neutral",
        behavior_change = false,
        new_state = monster.state
    }
    
    -- Highly aggressive monsters challenge territory claims
    if aggression > 0.7 then
        response.response = "challenge"
        response.behavior_change = true
        response.new_state = "aggressive_patrol"
        
        -- Record territorial conflict
        if not monster.influence_resistance.learned_patterns.territorial_conflicts then
            monster.influence_resistance.learned_patterns.territorial_conflicts = 0
        end
        monster.influence_resistance.learned_patterns.territorial_conflicts = 
            monster.influence_resistance.learned_patterns.territorial_conflicts + 1
            
    -- Pack-oriented monsters might negotiate
    elseif pack_tendency > 0.6 and aggression < 0.5 then
        response.response = "negotiate"
        response.behavior_change = true
        response.new_state = "socializing"
        
    -- Low aggression monsters yield territory
    elseif aggression < 0.3 then
        response.response = "yield"
        response.behavior_change = true
        response.new_state = "relocating"
        
    else
        response.response = "ignore"
    end
    
    return response
end

-- Handle threat warning messages
function communication_handler.handle_threat_warning(monster: types.MonsterState, sender_id: string, content: {string: any}, urgency: string): {string: any}
    local intelligence = monster.ai_personality.intelligence
    local pack_tendency = monster.ai_personality.pack_tendency
    
    local response = {
        monster_id = monster.id,
        received_from = sender_id,
        message_type = "threat_warning",
        response = "alert",
        behavior_change = false,
        new_state = monster.state
    }
    
    -- Intelligent monsters take warnings seriously
    if intelligence > 0.6 then
        response.response = "heightened_alert"
        response.behavior_change = true
        response.new_state = "cautious_patrol"
        
        -- Store threat information
        monster.environmental_awareness.resource_memory.threat_warning = {
            source = sender_id,
            timestamp = os.time(),
            urgency = urgency
        }
        
    -- Pack-oriented monsters coordinate defensive response
    elseif pack_tendency > 0.7 then
        response.response = "coordinate_defense"
        response.behavior_change = true
        response.new_state = "pack_defense"
        
    -- Low intelligence monsters might ignore or panic
    elseif intelligence < 0.4 then
        if urgency == "high" then
            response.response = "panic"
            response.behavior_change = true
            response.new_state = "flee"
        else
            response.response = "ignore"
        end
    end
    
    return response
end

-- Handle resource sharing messages
function communication_handler.handle_resource_share(monster: types.MonsterState, sender_id: string, content: {string: any}, urgency: string): {string: any}
    local pack_tendency = monster.ai_personality.pack_tendency
    local hunger = monster.stats.hunger
    local intelligence = monster.ai_personality.intelligence
    
    local response = {
        monster_id = monster.id,
        received_from = sender_id,
        message_type = "resource_share",
        response = "neutral",
        behavior_change = false,
        new_state = monster.state
    }
    
    -- High pack tendency monsters share resources
    if pack_tendency > 0.6 then
        if hunger < 30 then -- Well-fed monsters are more generous
            response.response = "share_resources"
            response.behavior_change = true
            response.new_state = "sharing"
        else
            response.response = "willing_but_hungry"
        end
        
    -- Intelligent monsters might trade strategically
    elseif intelligence > 0.7 then
        response.response = "negotiate_trade"
        response.behavior_change = true
        response.new_state = "trading"
        
    -- Hungry monsters might be more interested
    elseif hunger > 70 then
        response.response = "interested"
        response.behavior_change = true
        response.new_state = "seeking_resources"
        
    else
        response.response = "not_interested"
    end
    
    return response
end

-- Handle pack coordination messages
function communication_handler.handle_pack_coordination(monster: types.MonsterState, sender_id: string, content: {string: any}, urgency: string): {string: any}
    local pack_tendency = monster.ai_personality.pack_tendency
    local aggression = monster.ai_personality.aggression
    
    local response = {
        monster_id = monster.id,
        received_from = sender_id,
        message_type = "pack_coordination",
        response = "neutral",
        behavior_change = false,
        new_state = monster.state
    }
    
    -- Pack-oriented monsters respond to coordination
    if pack_tendency > 0.5 then
        local coordination_type = content.coordination_type or "general"
        
        if coordination_type == "hunt" then
            if aggression > 0.4 and monster.stats.energy > 40 then
                response.response = "join_hunt"
                response.behavior_change = true
                response.new_state = "pack_hunting"
            else
                response.response = "unable_to_join"
            end
            
        elseif coordination_type == "patrol" then
            response.response = "join_patrol"
            response.behavior_change = true
            response.new_state = "pack_patrol"
            
        elseif coordination_type == "migration" then
            if monster.stats.energy > 60 then
                response.response = "follow_migration"
                response.behavior_change = true
                response.new_state = "migrating"
            else
                response.response = "too_tired"
            end
        else
            response.response = "acknowledge"
        end
        
    else
        response.response = "not_pack_oriented"
    end
    
    return response
end

-- Send communication to other monsters (outbound communication)
function communication_handler.send_message(monster: types.MonsterState, message_type: string, target_id: string, content: {string: any}, urgency: string): boolean
    -- This would integrate with AO's message passing system
    -- For now, just log the outbound communication
    
    local message = {
        Action = "Monster-Communication",
        Data = {
            message_type = message_type,
            sender_id = monster.id,
            target_id = target_id,
            content = content,
            urgency = urgency
        }
    }
    
    print("Sending message from " .. monster.id .. " to " .. target_id .. ": " .. message_type)
    
    -- Record outbound communication in monster's memory
    if not monster.environmental_awareness.resource_memory.communications_sent then
        monster.environmental_awareness.resource_memory.communications_sent = {}
    end
    
    table.insert(monster.environmental_awareness.resource_memory.communications_sent, {
        timestamp = os.time(),
        message_type = message_type,
        target = target_id,
        urgency = urgency
    })
    
    return true
end

return communication_handler