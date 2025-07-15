-- Shared Message Handlers for AO Processes

local json = require('json')
local utils = require('.utils')

local handlers = {}

-- Common message validation
function handlers.validate_message(msg, required_fields)
    if not msg.From then
        return false, "Missing From field"
    end
    
    if not msg.Action then
        return false, "Missing Action field"
    end
    
    if required_fields then
        for _, field in ipairs(required_fields) do
            if not msg[field] then
                return false, "Missing required field: " .. field
            end
        end
    end
    
    return true, nil
end

-- Parse message data with error handling
function handlers.parse_message_data(msg)
    if not msg.Data then
        return nil, "No data provided"
    end
    
    local data, error = utils.safe_json_decode(msg.Data)
    if not data then
        return nil, error
    end
    
    return data, nil
end

-- Generic state response handler
function handlers.send_state_response(msg, state_data)
    local json_data, error = utils.safe_json_encode(state_data)
    if json_data then
        ao.send({
            Target = msg.From,
            Action = "State-Response",
            Data = json_data
        })
        utils.log_debug("State response sent to " .. msg.From)
    else
        utils.send_error_response(msg.From, "State", error)
    end
end

-- Generic update response handler
function handlers.send_update_response(msg, success, error_message)
    ao.send({
        Target = msg.From,
        Action = "Update-State-Response",
        Success = tostring(success),
        Error = error_message or ""
    })
end

-- Generic environment change response handler
function handlers.send_environment_response(msg, success, error_message)
    ao.send({
        Target = msg.From,
        Action = "Environment-Change-Response",
        Success = tostring(success),
        Error = error_message or ""
    })
end

-- Generic communication response handler
function handlers.send_communication_response(msg, success, error_message)
    ao.send({
        Target = msg.From,
        Action = "Monster-Communication-Response",
        Success = tostring(success),
        Error = error_message or ""
    })
end

-- Health check response handler
function handlers.send_health_response(msg, health_status, uptime_seconds)
    ao.send({
        Target = msg.From,
        Action = "Health-Check-Response",
        Status = health_status.status,
        Uptime = tostring(uptime_seconds),
        ErrorCount = tostring(health_status.error_count),
        RestartCount = tostring(health_status.restart_count),
        LastHeartbeat = tostring(health_status.last_heartbeat)
    })
    utils.log_debug("Health check response sent to " .. msg.From)
end

-- Decision broadcast handler
function handlers.broadcast_decision(decision_data)
    ao.send({
        Target = ao.id,
        Action = "Decision-Made",
        Data = utils.safe_json_encode(decision_data)
    })
    utils.log_debug("Decision broadcast sent")
end

-- Error handling wrapper for message handlers
function handlers.safe_handler(handler_name, handler_func)
    return function(msg)
        local success, result = pcall(handler_func, msg)
        if not success then
            utils.log_error("Handler " .. handler_name .. " failed: " .. tostring(result))
            utils.send_error_response(msg.From, handler_name, "Internal handler error")
        end
    end
end

-- Message validation helpers
function handlers.validate_stats_update(stats_data)
    if not stats_data then
        return false, "No stats data provided"
    end
    
    local errors = {}
    
    if stats_data.health and (type(stats_data.health) ~= "number" or stats_data.health < 0 or stats_data.health > 100) then
        table.insert(errors, "Invalid health value")
    end
    
    if stats_data.hunger and (type(stats_data.hunger) ~= "number" or stats_data.hunger < 0 or stats_data.hunger > 100) then
        table.insert(errors, "Invalid hunger value")
    end
    
    if stats_data.energy and (type(stats_data.energy) ~= "number" or stats_data.energy < 0 or stats_data.energy > 100) then
        table.insert(errors, "Invalid energy value")
    end
    
    if stats_data.position then
        if type(stats_data.position) ~= "table" then
            table.insert(errors, "Invalid position format")
        elseif type(stats_data.position.x) ~= "number" or type(stats_data.position.y) ~= "number" then
            table.insert(errors, "Invalid position coordinates")
        end
    end
    
    if #errors > 0 then
        return false, table.concat(errors, ", ")
    end
    
    return true, nil
end

function handlers.validate_environment_change(change_data)
    if not change_data then
        return false, "No change data provided"
    end
    
    if not change_data.route_id then
        return false, "Missing route_id"
    end
    
    if not change_data.modification_type then
        return false, "Missing modification_type"
    end
    
    local valid_types = {
        "food_placed", "shelter_built", "weather_changed", 
        "resource_depleted", "terrain_modified"
    }
    
    local is_valid_type = false
    for _, valid_type in ipairs(valid_types) do
        if change_data.modification_type == valid_type then
            is_valid_type = true
            break
        end
    end
    
    if not is_valid_type then
        return false, "Invalid modification_type"
    end
    
    return true, nil
end

function handlers.validate_communication(comm_data)
    if not comm_data then
        return false, "No communication data provided"
    end
    
    if not comm_data.message_type then
        return false, "Missing message_type"
    end
    
    if not comm_data.sender_id then
        return false, "Missing sender_id"
    end
    
    local valid_types = {
        "territory_warning", "pack_invitation", "resource_sharing",
        "threat_alert", "mating_call", "distress_signal"
    }
    
    local is_valid_type = false
    for _, valid_type in ipairs(valid_types) do
        if comm_data.message_type == valid_type then
            is_valid_type = true
            break
        end
    end
    
    if not is_valid_type then
        return false, "Invalid message_type"
    end
    
    return true, nil
end

-- Rate limiting helpers
handlers.rate_limits = {}

function handlers.check_rate_limit(msg, limit_per_minute)
    local key = msg.From .. ":" .. msg.Action
    local current_time = os.time()
    
    if not handlers.rate_limits[key] then
        handlers.rate_limits[key] = { count = 0, reset_time = current_time + 60 }
    end
    
    local limit_data = handlers.rate_limits[key]
    
    if current_time >= limit_data.reset_time then
        limit_data.count = 0
        limit_data.reset_time = current_time + 60
    end
    
    if limit_data.count >= limit_per_minute then
        return false, "Rate limit exceeded"
    end
    
    limit_data.count = limit_data.count + 1
    return true, nil
end

-- Message logging helper
function handlers.log_message(msg, action_type)
    local log_data = {
        from = msg.From,
        action = msg.Action,
        timestamp = utils.get_timestamp(),
        type = action_type
    }
    
    utils.log_debug("Message " .. action_type .. " from " .. msg.From .. " for action " .. msg.Action)
end

return handlers