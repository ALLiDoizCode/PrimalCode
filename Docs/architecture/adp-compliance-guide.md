# ADP v1.0 Compliance Guide

This document provides comprehensive guidelines for maintaining AO Documentation Protocol v1.0 compliance across all processes in the Tuxemon platform.

## Overview

ADP v1.0 is the AO Documentation Protocol that ensures all processes are self-documenting and support intelligent tool integration. This standard eliminates the need for separate API documentation by making processes introspectable through standardized message interfaces.

## Mandatory Requirements

### Required Handlers

Every AO process MUST implement these four handlers:

1. **Info Handler (`Action: "Info"`)** - Core ADP compliance endpoint
2. **Help Handler (`Action: "Help"`)** - Interactive documentation
3. **Get-Metadata Handler (`Action: "Get-Metadata"`)** - Handler registry information  
4. **Get-Schema Handler (`Action: "Get-Schema"`)** - OpenAPI-style schema export

### Info Handler Structure

The Info handler is the cornerstone of ADP compliance. It MUST return this structure:

```lua
local adp_info = {
    -- Standard AO process fields
    Name = "Process Display Name",
    Process = State.process_id,
    
    -- ADP-specific fields  
    protocolVersion = "1.0",
    lastUpdated = current_time,
    
    -- Handler definitions with full metadata
    handlers = {
        {
            action = "Handler-Action-Name",
            pattern = "Action",
            description = "Clear description of handler purpose",
            category = "core", -- or "utility" or "custom"
            version = "1.0",
            tags = {
                {
                    name = "TagName",
                    type = "string", -- string|number|boolean|address|json
                    required = true, -- or false
                    description = "Purpose and usage of this tag",
                    examples = {"example1", "example2"}
                }
                -- ... more tags
            }
        }
        -- ... more handlers
    },
    
    -- Process capabilities
    capabilities = {
        "capability_1",
        "capability_2"
    },
    
    -- Current state information
    state = {
        status = "healthy",
        uptime = uptime,
        timestamp = current_time,
        statistics = {
            -- Process-specific metrics
        }
    }
}
```

## Implementation Checklist

### ✅ Setup Phase
- [ ] Import required shared utilities: `ProcessBase`, `HandlerMetadata`, `SelfDocumenting`, `ADPValidator`
- [ ] Initialize metadata system with `HandlerMetadata.init(process_type, process_id)`
- [ ] Add Info handler implementation following the required structure

### ✅ Handler Registration
- [ ] Use `HandlerMetadata.create_handler()` for metadata-enabled handlers
- [ ] Register basic handlers: `Handlers.add("help", "Action", "Help", SelfDocumenting.create_help_handler())`
- [ ] Register metadata handler: `Handlers.add("metadata", "Action", "Get-Metadata", HandlerMetadata.create_metadata_handler())`
- [ ] Register schema handler: `Handlers.add("schema", "Action", "Get-Schema", SelfDocumenting.create_schema_handler())`

### ✅ Handler Metadata
For each handler, provide:
- [ ] Descriptive action name using kebab-case
- [ ] Clear, concise description of handler purpose
- [ ] Appropriate category (core/utility/custom)
- [ ] Complete tag definitions with types and examples
- [ ] Required/optional field specifications

### ✅ Response Format
- [ ] All responses use `ProcessBase.create_adp_response()`
- [ ] Include proper ADP headers: `ADP-Version: "1.0"`, `Content-Type: "application/json"`
- [ ] Use consistent error format via `ProcessBase.create_error_response()`

### ✅ Validation
- [ ] Apply input validation using `ADPValidator.validate_message()`
- [ ] Implement proper error handling with standardized error codes
- [ ] Validate all external message inputs before processing

## Code Templates

### Basic Info Handler Template
```lua
-- ADP v1.0 compliant Info handler
Handlers.add("info", "Action", "Info",
    function(msg)
        local current_time = msg.Timestamp or os.time()
        local uptime = current_time - (State.uptime_start or current_time)
        
        local adp_info = {
            Name = "Your Process Name",
            Process = State.process_id,
            protocolVersion = "1.0", 
            lastUpdated = current_time,
            handlers = {
                -- Define your handlers here
            },
            capabilities = {
                -- List your process capabilities
            },
            state = {
                status = "healthy",
                uptime = uptime,
                timestamp = current_time,
                statistics = {
                    -- Your process statistics
                }
            }
        }
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Info-Response",
            adp_info
        )
        ao.send(response)
    end
)
```

### Handler Metadata Template
```lua
{
    action = "Your-Action-Name",
    pattern = "Action",
    description = "What this handler does and when to use it",
    category = "core", -- or "utility" or "custom"
    version = "1.0",
    tags = {
        {
            name = "RequiredParameter",
            type = "string",
            required = true,
            description = "Purpose of this parameter",
            examples = {"example1", "example2"}
        },
        {
            name = "OptionalParameter", 
            type = "number",
            required = false,
            description = "Optional parameter description",
            examples = {42, 100}
        }
    }
}
```

## Common Patterns

### Tag Type Guidelines
- **string**: Text data, IDs, names
- **number**: Numeric values, coordinates, timestamps  
- **boolean**: True/false flags
- **address**: AO process IDs, agent identifiers
- **json**: Complex structured data (use sparingly)

### Category Guidelines
- **core**: Essential handlers for primary process functionality
- **utility**: Support handlers (info, help, health checks)
- **custom**: Process-specific handlers that don't fit other categories

### Error Handling Pattern
```lua
if not valid_input then
    local response = ProcessBase.create_error_response(
        msg.From,
        "VALIDATION_FAILED", 
        "Descriptive error message",
        { field: "problematic_field", value: input_value }
    )
    ao.send(response)
    return
end
```

## Testing Compliance

### Manual Testing
Send an Info message to your process and verify the response contains all required fields:
```json
{
  "Target": "your_process_id",
  "Tags": {
    "Action": "Info"
  }
}
```

### Automated Testing
Run the compliance test suite:
```bash
node tests/integration/info-handler-compliance.test.js
```

### Continuous Integration
Add ADP compliance checks to your CI pipeline to catch regressions early.

## Common Mistakes to Avoid

1. **Missing Protocol Version**: Always include `protocolVersion = "1.0"`
2. **Incomplete Handler Metadata**: Every handler needs description, category, and tag definitions
3. **Wrong Response Format**: Use `ProcessBase.create_adp_response()` not manual JSON construction
4. **Missing Required Handlers**: All four handlers (Info, Help, Get-Metadata, Get-Schema) are mandatory
5. **Inconsistent Tag Types**: Use the five standard types only (string, number, boolean, address, json)
6. **Missing Examples**: Always provide examples for tag usage
7. **Poor Descriptions**: Make descriptions clear and actionable, not just technical jargon

## Troubleshooting

### Handler Not Found Errors
- Verify handler is registered with `Handlers.add()`
- Check action name matches exactly (case-sensitive)
- Ensure metadata system is initialized

### Schema Validation Failures  
- Confirm all required fields are present in Info response
- Check protocolVersion is exactly "1.0"
- Validate JSON structure with external tools

### Tool Integration Issues
- Verify response format matches ADP v1.0 specification exactly
- Check that handler metadata includes all required fields
- Test with automated compliance validation

## Migration Guide

### From Legacy Processes
1. Add shared utility imports
2. Initialize metadata system
3. Convert existing handlers to use metadata registration
4. Implement the four required ADP handlers
5. Update all responses to use ProcessBase wrappers
6. Run compliance tests

### From Previous ADP Versions
- Update protocolVersion to "1.0"
- Ensure Info handler includes new required fields
- Add missing handler categories and tag examples
- Update error response format

## Resources

- **Implementation Reference**: See existing compliant processes in `ao-processes/*/src/main.lua`
- **Testing Framework**: `tests/integration/info-handler-compliance.test.js`
- **Shared Utilities**: `shared/utils/adp-validation.tl`, `shared/utils/handler-metadata.tl`
- **Architecture Documentation**: `docs/architecture.md` ADP compliance section

Following these guidelines ensures your processes are discoverable, testable, and can integrate with intelligent development tools automatically.