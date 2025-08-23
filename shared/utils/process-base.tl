-- Process Base Template with ADP v1.0 Compliance
-- Provides standardized ADP-compliant message handling for AO processes
local json = require('json')
-- ADP v1.0 Constants
local ADP_VERSION = "1.0"
local ADP_CONTENT_TYPE = "application/json"
-- Process Base Module
local ProcessBase = {}
-- Validate ADP v1.0 message headers
function ProcessBase.validate_adp_headers(msg)
    local headers = msg.Tags or {}
    -- Check ADP version
    if headers["ADP-Version"] ~= ADP_VERSION then
        return false, "INVALID_ADP_VERSION", "ADP version must be " .. ADP_VERSION
    end
    -- Check content type for data messages
    if msg.Data and headers["Content-Type"] ~= ADP_CONTENT_TYPE then
        return false, "INVALID_CONTENT_TYPE", "Content-Type must be " .. ADP_CONTENT_TYPE
    end
    -- Check required Action header
    if not headers.Action then
        return false, "MISSING_ACTION", "Action header is required"
    end
    return true, nil, nil
end
-- Create ADP-compliant response wrapper
function ProcessBase.create_adp_response(target, action, data, extra_tags)
    local response = {
        Target = target,
        Action = action,
        Tags = {
            ["ADP-Version"] = ADP_VERSION,
            ["Content-Type"] = ADP_CONTENT_TYPE
        }
    }
    -- Add extra tags if provided
    if extra_tags then
        for key, value in pairs(extra_tags) do
            response.Tags[key] = value
        end
    end
    -- Add data if provided
    if data then
        response.Data = type(data) == "string" and data or json.encode(data)
    end
    return response
end
-- Create ADP-compliant error response
function ProcessBase.create_error_response(target, error_code, error_message, details)
    local error_data = {
        error = {
            code = error_code,
            message = error_message,
            timestamp = os.time()
        }
    }
    if details then
        error_data.error.details = details
    end
    return ProcessBase.create_adp_response(target, "Error", error_data)
end
-- Middleware function to wrap handlers with ADP validation
function ProcessBase.wrap_handler(handler_func, handler_name)
    return function(msg)
        -- Validate ADP headers
        local valid, error_code, error_message = ProcessBase.validate_adp_headers(msg)
        if not valid then
            -- Send error response
            local error_response = ProcessBase.create_error_response(
                msg.From,
                error_code,
                error_message,
                { handler = handler_name }
            )
            ao.send(error_response)
            return
        end
        -- Call the actual handler
        local success, result = pcall(handler_func, msg)
        if not success then
            -- Handle internal errors
            local error_response = ProcessBase.create_error_response(
                msg.From,
                "INTERNAL_ERROR",
                "Handler execution failed",
                {
                    handler = handler_name,
                    error = tostring(result)
                }
            )
            ao.send(error_response)
        end
    end
end
-- Helper function to register ADP-compliant handlers
function ProcessBase.register_handler(name, pattern, action, handler_func)
    Handlers.add(name, pattern, action, ProcessBase.wrap_handler(handler_func, name))
end
-- Validate protocol version in incoming messages
function ProcessBase.check_protocol_version(msg)
    local version = msg.Tags and msg.Tags["ADP-Version"]
    return version == ADP_VERSION
end
-- Get standardized process info for health checks
function ProcessBase.get_process_info(process_type, process_id)
    return {
        process_type = process_type,
        process_id = process_id,
        adp_version = ADP_VERSION,
        status = "healthy",
        timestamp = os.time()
    }
end
return ProcessBase