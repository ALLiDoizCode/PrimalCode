-- Shared Utility Functions for AO Processes

local utils = {}

-- Logging utilities
function utils.log_debug(message)
    print("[DEBUG] " .. os.date("%Y-%m-%d %H:%M:%S") .. " - " .. message)
end

function utils.log_error(message)
    print("[ERROR] " .. os.date("%Y-%m-%d %H:%M:%S") .. " - " .. message)
end

function utils.log_info(message)
    print("[INFO] " .. os.date("%Y-%m-%d %H:%M:%S") .. " - " .. message)
end

-- State validation utilities
function utils.validate_number_range(value, min, max, default)
    if type(value) ~= "number" then
        return default
    end
    return math.max(min, math.min(max, value))
end

function utils.validate_stats(stats)
    return {
        health = utils.validate_number_range(stats.health, 0, 100, 100),
        hunger = utils.validate_number_range(stats.hunger, 0, 100, 0),
        energy = utils.validate_number_range(stats.energy, 0, 100, 100),
        position = stats.position or { x = 0, y = 0, route = "" }
    }
end

function utils.validate_personality(personality)
    return {
        aggression = utils.validate_number_range(personality.aggression, 0, 1, 0.5),
        intelligence = utils.validate_number_range(personality.intelligence, 0, 1, 0.5),
        pack_tendency = utils.validate_number_range(personality.pack_tendency, 0, 1, 0.5)
    }
end

-- JSON utilities with error handling
function utils.safe_json_decode(data)
    local json = require('json')
    local success, result = pcall(json.decode, data)
    if success then
        return result, nil
    else
        return nil, "Invalid JSON: " .. tostring(result)
    end
end

function utils.safe_json_encode(data)
    local json = require('json')
    local success, result = pcall(json.encode, data)
    if success then
        return result, nil
    else
        return nil, "JSON encoding failed: " .. tostring(result)
    end
end

-- State history management
function utils.add_to_history(history, entry, max_size)
    max_size = max_size or 100
    table.insert(history, entry)
    
    while #history > max_size do
        table.remove(history, 1)
    end
end

-- Time utilities
function utils.get_timestamp()
    return os.time()
end

function utils.format_timestamp(timestamp)
    return os.date("%Y-%m-%d %H:%M:%S", timestamp)
end

function utils.time_since(timestamp)
    return os.time() - timestamp
end

-- Distance calculations
function utils.calculate_distance(pos1, pos2)
    local dx = pos1.x - pos2.x
    local dy = pos1.y - pos2.y
    return math.sqrt(dx * dx + dy * dy)
end

-- Random utilities with seeding
function utils.seed_random()
    math.randomseed(os.time())
end

function utils.random_float(min, max)
    return min + math.random() * (max - min)
end

function utils.random_choice(choices)
    if #choices == 0 then
        return nil
    end
    return choices[math.random(#choices)]
end

-- Array utilities
function utils.array_contains(array, value)
    for _, v in ipairs(array) do
        if v == value then
            return true
        end
    end
    return false
end

function utils.array_remove(array, value)
    for i, v in ipairs(array) do
        if v == value then
            table.remove(array, i)
            return true
        end
    end
    return false
end

-- Message response utilities
function utils.send_success_response(target, action, data)
    local response = {
        Target = target,
        Action = action .. "-Response",
        Success = "true"
    }
    
    if data then
        local json_data, error = utils.safe_json_encode(data)
        if json_data then
            response.Data = json_data
        else
            response.Error = error
            response.Success = "false"
        end
    end
    
    ao.send(response)
end

function utils.send_error_response(target, action, error_message)
    ao.send({
        Target = target,
        Action = action .. "-Response",
        Success = "false",
        Error = error_message
    })
end

-- Health monitoring utilities
function utils.create_health_status(status, error_count, restart_count)
    return {
        status = status or "healthy",
        last_heartbeat = os.time(),
        error_count = error_count or 0,
        restart_count = restart_count or 0
    }
end

function utils.update_health_status(health_status, status, increment_errors)
    health_status.status = status or health_status.status
    health_status.last_heartbeat = os.time()
    
    if increment_errors then
        health_status.error_count = health_status.error_count + 1
    end
    
    return health_status
end

-- Decision-making utilities
function utils.weighted_choice(choices)
    local total_weight = 0
    for _, choice in ipairs(choices) do
        total_weight = total_weight + choice.weight
    end
    
    local random_value = math.random() * total_weight
    local current_weight = 0
    
    for _, choice in ipairs(choices) do
        current_weight = current_weight + choice.weight
        if random_value <= current_weight then
            return choice
        end
    end
    
    return choices[1] -- Fallback
end

function utils.calculate_decision_urgency(stats, personality)
    local urgency = 0
    
    -- Health-based urgency
    if stats.health < 25 then
        urgency = urgency + 0.8
    elseif stats.health < 50 then
        urgency = urgency + 0.4
    end
    
    -- Hunger-based urgency
    if stats.hunger > 80 then
        urgency = urgency + 0.6
    elseif stats.hunger > 60 then
        urgency = urgency + 0.3
    end
    
    -- Energy-based urgency
    if stats.energy < 20 then
        urgency = urgency + 0.5
    elseif stats.energy < 40 then
        urgency = urgency + 0.2
    end
    
    -- Personality modifiers
    urgency = urgency * (1 + personality.aggression * 0.3)
    urgency = urgency * (1 + personality.intelligence * 0.2)
    
    return math.min(1, urgency)
end

return utils