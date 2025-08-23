-- Self-Documenting Handler Interface System
-- Automatically generates usage examples and interactive documentation
local json = require('json')
-- Documentation Templates
local DOC_TEMPLATES = {
    handler_usage = [[
## Handler: {handler_name}
**Action:** `{action}`
**Description:** {description}
### Usage
Send a message with the following structure:
```json
{
  "Target": "{process_id}",
  "Tags": {
    "Action": "{action}",
    "ADP-Version": "1.0",
    "Content-Type": "application/json"
    {required_tags}
  }
  {data_field}
}
```
### Response
```json
{
  "Action": "{response_action}",
  "Tags": {
    "ADP-Version": "1.0",
    "Content-Type": "application/json"
  },
  "Data": {response_example}
}
```
]],
    process_overview = [[
# {process_type} Process Documentation
**Process ID:** {process_id}
**ADP Version:** 1.0
**Generated:** {timestamp}
## Available Actions
{action_list}
## Quick Start
To interact with this process, send messages with the required ADP v1.0 headers:
- `ADP-Version`: "1.0"
- `Content-Type`: "application/json" (for data messages)
- `Action`: One of the supported actions listed above
## Error Handling
This process uses standardized error codes:
{error_codes}
]]
}
-- Self-Documenting Module
local SelfDocumenting = {}
-- Generate usage example for a handler
function SelfDocumenting.generate_usage_example(handler_metadata)
    local HandlerMetadata = require('shared.utils.handler-metadata')
    local capabilities = HandlerMetadata.get_capabilities()
    local example = {
        Target = capabilities.process_id or "PROCESS_ID",
        Tags = {
            Action = handler_metadata.action,
            ["ADP-Version"] = "1.0",
            ["Content-Type"] = "application/json"
        }
    }
    -- Add required tags from input schema
    if handler_metadata.input_schema and handler_metadata.input_schema.required_tags then
        for _, tag in ipairs(handler_metadata.input_schema.required_tags) do
            if tag ~= "Action" then
                example.Tags[tag] = handler_metadata.input_schema.tag_examples and
                                  handler_metadata.input_schema.tag_examples[tag] or
                                  "EXAMPLE_VALUE"
            end
        end
    end
    -- Add data field if specified
    if handler_metadata.input_schema and handler_metadata.input_schema.data_example then
        example.Data = json.encode(handler_metadata.input_schema.data_example)
    end
    return example
end
-- Generate response example for a handler
function SelfDocumenting.generate_response_example(handler_metadata)
    local response = {
        Action = handler_metadata.output_schema and
                handler_metadata.output_schema.response_action or
                (handler_metadata.action .. "-Response"),
        Tags = {
            ["ADP-Version"] = "1.0",
            ["Content-Type"] = "application/json"
        }
    }
    -- Add response data example
    if handler_metadata.output_schema and handler_metadata.output_schema.data_example then
        response.Data = json.encode(handler_metadata.output_schema.data_example)
    end
    return response
end
-- Generate formatted documentation for a handler
function SelfDocumenting.generate_handler_documentation(handler_name)
    local HandlerMetadata = require('shared.utils.handler-metadata')
    local handler = HandlerMetadata.get_handler(handler_name)
    local capabilities = HandlerMetadata.get_capabilities()
    if not handler then
        return "Handler not found: " .. handler_name
    end
    -- Build required tags string
    local required_tags = ""
    if handler.input_schema and handler.input_schema.required_tags then
        for _, tag in ipairs(handler.input_schema.required_tags) do
            if tag ~= "Action" then
                local example_value = handler.input_schema.tag_examples and
                                    handler.input_schema.tag_examples[tag] or
                                    "EXAMPLE_VALUE"
                required_tags = required_tags .. ',\n    "' .. tag .. '": "' .. example_value .. '"'
            end
        end
    end
    -- Build data field string
    local data_field = ""
    if handler.input_schema and handler.input_schema.data_example then
        data_field = ',\n  "Data": ' .. json.encode(json.encode(handler.input_schema.data_example))
    end
    -- Build response example
    local response_example = "{}"
    if handler.output_schema and handler.output_schema.data_example then
        response_example = json.encode(handler.output_schema.data_example)
    end
    -- Generate documentation using template
    local doc = DOC_TEMPLATES.handler_usage
    doc = string.gsub(doc, "{handler_name}", handler.name)
    doc = string.gsub(doc, "{action}", handler.action)
    doc = string.gsub(doc, "{description}", handler.description)
    doc = string.gsub(doc, "{process_id}", capabilities.process_id or "PROCESS_ID")
    doc = string.gsub(doc, "{required_tags}", required_tags)
    doc = string.gsub(doc, "{data_field}", data_field)
    doc = string.gsub(doc, "{response_action}", handler.output_schema and handler.output_schema.response_action or (handler.action .. "-Response"))
    doc = string.gsub(doc, "{response_example}", response_example)
    return doc
end
-- Generate complete process documentation
function SelfDocumenting.generate_process_documentation()
    local HandlerMetadata = require('shared.utils.handler-metadata')
    local capabilities = HandlerMetadata.get_capabilities()
    local ErrorHandler = require('shared.utils.error-handling')
    -- Build action list
    local action_list = ""
    for i, action in ipairs(capabilities.actions) do
        local handler = HandlerMetadata.get_handler_by_action(action)
        if handler then
            action_list = action_list .. "- `" .. action .. "`: " .. handler.description .. "\n"
        end
    end
    -- Build error codes list
    local error_codes = ""
    local process_codes = ErrorHandler.get_codes(capabilities.process_type)
    if process_codes then
        for error_name, error_code in pairs(process_codes) do
            error_codes = error_codes .. "- `" .. error_code .. "`: " .. error_name .. "\n"
        end
    end
    -- Generate documentation using template
    local doc = DOC_TEMPLATES.process_overview
    doc = string.gsub(doc, "{process_type}", capabilities.process_type or "Unknown")
    doc = string.gsub(doc, "{process_id}", capabilities.process_id or "UNKNOWN_ID")
    doc = string.gsub(doc, "{timestamp}", os.date("%Y-%m-%d %H:%M:%S", os.time()))
    doc = string.gsub(doc, "{action_list}", action_list)
    doc = string.gsub(doc, "{error_codes}", error_codes)
    return doc
end
-- Create interactive help handler
function SelfDocumenting.create_help_handler()
    return function(msg)
        local help_type = msg.Tags and msg.Tags.HelpType or "overview"
        local response_data = {}
        if help_type == "overview" then
            response_data = {
                documentation = SelfDocumenting.generate_process_documentation(),
                format = "markdown"
            }
        elseif help_type == "handler" then
            local handler_name = msg.Tags and msg.Tags.HandlerName
            if handler_name then
                response_data = {
                    documentation = SelfDocumenting.generate_handler_documentation(handler_name),
                    format = "markdown"
                }
            else
                response_data = {
                    error = "HandlerName tag required for handler help",
                    available_handlers = require('shared.utils.handler-metadata').get_capabilities().actions
                }
            end
        elseif help_type == "examples" then
            local handler_name = msg.Tags and msg.Tags.HandlerName
            if handler_name then
                local HandlerMetadata = require('shared.utils.handler-metadata')
                local handler = HandlerMetadata.get_handler(handler_name)
                if handler then
                    response_data = {
                        usage_example = SelfDocumenting.generate_usage_example(handler),
                        response_example = SelfDocumenting.generate_response_example(handler)
                    }
                else
                    response_data = { error = "Handler not found: " .. handler_name }
                end
            else
                response_data = { error = "HandlerName tag required for examples" }
            end
        else
            response_data = {
                error = "Invalid HelpType. Valid types: overview, handler, examples",
                help_types = {"overview", "handler", "examples"}
            }
        end
        local ProcessBase = require('shared.utils.process-base')
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Help-Response",
            response_data
        )
        ao.send(response)
    end
end
-- Generate OpenAPI-style schema for handlers
function SelfDocumenting.generate_openapi_schema()
    local HandlerMetadata = require('shared.utils.handler-metadata')
    local all_handlers = HandlerMetadata.get_all_handlers()
    local capabilities = HandlerMetadata.get_capabilities()
    local schema = {
        openapi = "3.0.0",
        info = {
            title = capabilities.process_type .. " Process API",
            description = "ADP v1.0 compliant " .. capabilities.process_type .. " process",
            version = "1.0.0"
        },
        paths = {}
    }
    -- Generate path for each handler
    for name, handler in pairs(all_handlers) do
        local path_name = "/" .. string.lower(string.gsub(handler.action, "-", "_"))
        schema.paths[path_name] = {
            post = {
                summary = handler.description,
                requestBody = {
                    content = {
                        ["application/json"] = {
                            schema = handler.input_schema or {},
                            example = SelfDocumenting.generate_usage_example(handler)
                        }
                    }
                },
                responses = {
                    ["200"] = {
                        description = "Successful response",
                        content = {
                            ["application/json"] = {
                                schema = handler.output_schema or {},
                                example = SelfDocumenting.generate_response_example(handler)
                            }
                        }
                    }
                }
            }
        }
    end
    return schema
end
-- Create schema handler for external documentation tools
function SelfDocumenting.create_schema_handler()
    return function(msg)
        local schema_type = msg.Tags and msg.Tags.SchemaType or "openapi"
        local response_data = {}
        if schema_type == "openapi" then
            response_data = SelfDocumenting.generate_openapi_schema()
        else
            response_data = {
                error = "Invalid SchemaType. Valid types: openapi",
                supported_types = {"openapi"}
            }
        end
        local ProcessBase = require('shared.utils.process-base')
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Schema-Response",
            response_data
        )
        ao.send(response)
    end
end
return SelfDocumenting