-- Handler Metadata System
-- Provides dynamic handler registration and metadata management
local json = require('json')
-- Handler Metadata Registry
local HandlerRegistry = {
    handlers = {},
    process_type = nil,
    process_id = nil
}
-- Handler Metadata Module
local HandlerMetadata = {}
-- Initialize metadata system for a process
function HandlerMetadata.init(process_type, process_id)
    HandlerRegistry.process_type = process_type
    HandlerRegistry.process_id = process_id
    print("Handler metadata system initialized for " .. process_type .. " process: " .. process_id)
end
-- Register a handler with metadata
function HandlerMetadata.register_handler(name, metadata)
    -- Validate required metadata fields
    if not metadata.action then
        error("Handler metadata must include 'action' field")
    end
    if not metadata.description then
        error("Handler metadata must include 'description' field")
    end
    -- Store handler metadata
    HandlerRegistry.handlers[name] = {
        name = name,
        action = metadata.action,
        description = metadata.description,
        routing_pattern = metadata.routing_pattern or "Action",
        validation_rules = metadata.validation_rules or {},
        input_schema = metadata.input_schema or {},
        output_schema = metadata.output_schema or {},
        examples = metadata.examples or {},
        tags = metadata.tags or {},
        version = metadata.version or "1.0",
        registered_at = os.time()
    }
    print("Registered handler: " .. name .. " with action: " .. metadata.action)
end
-- Get handler metadata by name
function HandlerMetadata.get_handler(name)
    return HandlerRegistry.handlers[name]
end
-- Get all registered handlers
function HandlerMetadata.get_all_handlers()
    return HandlerRegistry.handlers
end
-- Get handlers by action pattern
function HandlerMetadata.get_handlers_by_action(action_pattern)
    local matching_handlers = {}
    for name, handler in pairs(HandlerRegistry.handlers) do
        if string.match(handler.action, action_pattern) then
            matching_handlers[name] = handler
        end
    end
    return matching_handlers
end
-- Get handler by exact action
function HandlerMetadata.get_handler_by_action(action)
    for name, handler in pairs(HandlerRegistry.handlers) do
        if handler.action == action then
            return handler
        end
    end
    return nil
end
-- Generate handler documentation
function HandlerMetadata.generate_documentation()
    local documentation = {
        process = {
            type = HandlerRegistry.process_type,
            id = HandlerRegistry.process_id,
            adp_version = "1.0",
            generated_at = os.time()
        },
        handlers = {}
    }
    for name, handler in pairs(HandlerRegistry.handlers) do
        table.insert(documentation.handlers, {
            name = handler.name,
            action = handler.action,
            description = handler.description,
            routing_pattern = handler.routing_pattern,
            input_schema = handler.input_schema,
            output_schema = handler.output_schema,
            examples = handler.examples,
            tags = handler.tags,
            version = handler.version
        })
    end
    -- Sort handlers by action name for consistency
    table.sort(documentation.handlers, function(a, b)
        return a.action < b.action
    end)
    return documentation
end
-- Get process capability summary
function HandlerMetadata.get_capabilities()
    local capabilities = {
        process_type = HandlerRegistry.process_type,
        process_id = HandlerRegistry.process_id,
        total_handlers = 0,
        actions = {},
        tags = {}
    }
    for name, handler in pairs(HandlerRegistry.handlers) do
        capabilities.total_handlers = capabilities.total_handlers + 1
        table.insert(capabilities.actions, handler.action)
        -- Collect unique tags
        if handler.tags then
            for _, tag in ipairs(handler.tags) do
                if not capabilities.tags[tag] then
                    capabilities.tags[tag] = 0
                end
                capabilities.tags[tag] = capabilities.tags[tag] + 1
            end
        end
    end
    -- Sort actions for consistency
    table.sort(capabilities.actions)
    return capabilities
end
-- Validate handler configuration
function HandlerMetadata.validate_handler_config(name, metadata)
    local errors = {}
    -- Check required fields
    if not metadata.action then
        table.insert(errors, "Missing required field: action")
    end
    if not metadata.description then
        table.insert(errors, "Missing required field: description")
    end
    -- Validate action format
    if metadata.action and not string.match(metadata.action, "^[%w%-]+$") then
        table.insert(errors, "Invalid action format: " .. metadata.action)
    end
    -- Check for duplicate actions
    for existing_name, existing_handler in pairs(HandlerRegistry.handlers) do
        if existing_name ~= name and existing_handler.action == metadata.action then
            table.insert(errors, "Duplicate action: " .. metadata.action .. " (already used by " .. existing_name .. ")")
        end
    end
    return #errors == 0, errors
end
-- Create metadata query handler
function HandlerMetadata.create_metadata_handler()
    return function(msg)
        local query_type = msg.Tags and msg.Tags.QueryType or "all"
        local response_data = {}
        if query_type == "capabilities" then
            response_data = HandlerMetadata.get_capabilities()
        elseif query_type == "documentation" then
            response_data = HandlerMetadata.generate_documentation()
        elseif query_type == "handler" then
            local handler_name = msg.Tags and msg.Tags.HandlerName
            if handler_name then
                response_data = HandlerMetadata.get_handler(handler_name) or {
                    error = "Handler not found: " .. handler_name
                }
            else
                response_data = { error = "HandlerName tag required for handler query" }
            end
        else
            response_data = {
                all_handlers = HandlerRegistry.handlers,
                capabilities = HandlerMetadata.get_capabilities()
            }
        end
        local ProcessBase = require('shared.utils.process-base')
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Metadata-Response",
            response_data
        )
        ao.send(response)
    end
end
-- Create standardized handler factory
function HandlerMetadata.create_handler(name, metadata, handler_func)
    -- Validate metadata
    local valid, errors = HandlerMetadata.validate_handler_config(name, metadata)
    if not valid then
        error("Handler validation failed: " .. table.concat(errors, ", "))
    end
    -- Register metadata
    HandlerMetadata.register_handler(name, metadata)
    -- Wrap handler with metadata and validation
    local wrapped_handler = function(msg)
        -- Apply validation rules if specified
        if metadata.validation_rules and #metadata.validation_rules > 0 then
            local ADPValidator = require('shared.utils.adp-validation')
            local validation_result = ADPValidator.validate_message(msg, metadata.validation_rules)
            if not validation_result.valid then
                local ErrorHandler = require('shared.utils.error-handling')
                local error_response = ErrorHandler.create_error(
                    "VALIDATION_FAILED",
                    "Input validation failed",
                    validation_result.validation_errors,
                    msg.From
                )
                local ProcessBase = require('shared.utils.process-base')
                local response = ProcessBase.create_error_response(
                    msg.From,
                    error_response.error.code,
                    error_response.error.message,
                    error_response.error.details
                )
                ao.send(response)
                return
            end
        end
        -- Call the actual handler
        handler_func(msg)
    end
    return wrapped_handler
end
-- Export handler statistics
function HandlerMetadata.get_statistics()
    return {
        process_type = HandlerRegistry.process_type,
        process_id = HandlerRegistry.process_id,
        total_handlers = #HandlerRegistry.handlers,
        timestamp = os.time()
    }
end
return HandlerMetadata