# ADP v1.0 Compliance Checklist

Use this checklist when creating or modifying AO processes to ensure ADP v1.0 compliance.

## Pre-Development Setup

### ✅ Project Structure
- [ ] Shared utilities exist: `shared/utils/adp-validation.tl`
- [ ] Shared utilities exist: `shared/utils/handler-metadata.tl`  
- [ ] Shared utilities exist: `shared/utils/process-base.tl`
- [ ] Shared utilities exist: `shared/utils/self-documenting.tl`
- [ ] Testing framework exists: `tests/integration/info-handler-compliance.test.js`

### ✅ Process Initialization
- [ ] Import ProcessBase: `local ProcessBase = require('shared.utils.process-base')`
- [ ] Import HandlerMetadata: `local HandlerMetadata = require('shared.utils.handler-metadata')`
- [ ] Import SelfDocumenting: `local SelfDocumenting = require('shared.utils.self-documenting')`
- [ ] Import ADPValidator: `local ADPValidator = require('shared.utils.adp-validation')`
- [ ] Initialize metadata system: `HandlerMetadata.init(process_type, process_id)`

## Required Handlers Implementation

### ✅ Info Handler (MANDATORY)
- [ ] Handler registered: `Handlers.add("info", "Action", "Info", function(msg) ... end)`
- [ ] Response includes: `Name = "Process Name"`
- [ ] Response includes: `Process = State.process_id`
- [ ] Response includes: `protocolVersion = "1.0"`
- [ ] Response includes: `lastUpdated = current_time`
- [ ] Response includes: `handlers = {...}` array
- [ ] Response includes: `capabilities = {...}` array
- [ ] Response includes: `state = {...}` object
- [ ] Uses: `ProcessBase.create_adp_response()` for response
- [ ] Handler definitions include: action, pattern, description, category, version, tags

### ✅ Help Handler (MANDATORY)
- [ ] Handler registered: `Handlers.add("help", "Action", "Help", SelfDocumenting.create_help_handler())`

### ✅ Get-Metadata Handler (MANDATORY)  
- [ ] Handler registered: `Handlers.add("metadata", "Action", "Get-Metadata", HandlerMetadata.create_metadata_handler())`

### ✅ Get-Schema Handler (MANDATORY)
- [ ] Handler registered: `Handlers.add("schema", "Action", "Get-Schema", SelfDocumenting.create_schema_handler())`

## Handler Metadata Quality

### ✅ For Each Handler Definition
- [ ] Action name uses kebab-case: `"Action-Name"`
- [ ] Pattern specified: typically `"Action"`
- [ ] Description is clear and actionable
- [ ] Category specified: `"core"`, `"utility"`, or `"custom"`
- [ ] Version specified: `"1.0"`

### ✅ For Each Tag Definition
- [ ] Name is descriptive: `"ParameterName"`
- [ ] Type is valid: `"string"`, `"number"`, `"boolean"`, `"address"`, or `"json"`
- [ ] Required field specified: `true` or `false`
- [ ] Description explains purpose and usage
- [ ] Examples provided: `["example1", "example2"]` or `[42, 100]`

## Response Format Standards

### ✅ All Message Responses
- [ ] Use: `ProcessBase.create_adp_response(target, action, data)`
- [ ] Never manually create: `{Target: ..., Action: ..., Tags: {...}}`
- [ ] Response action follows pattern: `"Original-Action-Response"`

### ✅ Error Responses
- [ ] Use: `ProcessBase.create_error_response(target, code, message, details)`
- [ ] Error codes are descriptive: `"VALIDATION_FAILED"`, `"MISSING_PARAMETER"`
- [ ] Error messages are helpful to developers
- [ ] Details include problematic field/value when relevant

## Input Validation

### ✅ External Message Handlers
- [ ] Validate using: `ADPValidator.validate_message(msg, validation_rules)`
- [ ] Check required tags exist
- [ ] Validate tag types and formats
- [ ] Range check numeric inputs
- [ ] Length check string inputs
- [ ] Handle validation errors gracefully

### ✅ Validation Error Handling
- [ ] Return proper error response on validation failure
- [ ] Include specific validation error details
- [ ] Log validation failures for debugging
- [ ] Never process invalid input

## Testing and Quality Assurance

### ✅ Compliance Testing
- [ ] Run: `node tests/integration/info-handler-compliance.test.js`
- [ ] All tests pass: Info handler presence
- [ ] All tests pass: Response format validation  
- [ ] All tests pass: Required field verification
- [ ] All tests pass: Protocol version compliance

### ✅ Manual Verification
- [ ] Send Info message to process manually
- [ ] Verify response contains all required fields
- [ ] Check that handler definitions are complete
- [ ] Validate JSON structure with external tools

### ✅ Integration Testing
- [ ] Test with intelligent development tools
- [ ] Verify schema export functionality
- [ ] Check help documentation generation
- [ ] Validate metadata query responses

## Code Quality Standards

### ✅ File Organization
- [ ] Info handler placement: after self-documenting handlers
- [ ] Imports at top of file in standard order
- [ ] No trailing spaces (run linting script)
- [ ] No unused imports (comment out or remove)
- [ ] Proper error handling throughout

### ✅ Documentation
- [ ] Process name clearly identifies purpose
- [ ] Handler descriptions are developer-friendly
- [ ] Tag descriptions explain business purpose
- [ ] Examples demonstrate real usage patterns

## Deployment Checklist

### ✅ Pre-Deployment
- [ ] All compliance tests passing
- [ ] No linting errors or warnings
- [ ] Process tested with mock agents
- [ ] Info handler response validated
- [ ] Documentation complete and accurate

### ✅ Post-Deployment
- [ ] Verify Info handler accessible on deployed process
- [ ] Test intelligent tool integration
- [ ] Confirm error handling works in production
- [ ] Monitor for ADP compliance issues

## Common Issues Resolution

### ❌ "Handler not found" errors
- **Check**: Handler registered with exact action name match
- **Check**: Metadata system initialized before handler registration
- **Fix**: Verify `Handlers.add()` call syntax

### ❌ "Invalid protocol version" errors  
- **Check**: `protocolVersion = "1.0"` in Info response
- **Fix**: Use exact string "1.0", not number 1.0

### ❌ "Missing required fields" errors
- **Check**: Info response includes all mandatory fields
- **Fix**: Use the provided Info handler template

### ❌ "Schema validation failed" errors
- **Check**: Handler definitions include all required metadata
- **Fix**: Ensure action, description, category, version are present

### ❌ Tool integration failures
- **Check**: Response format matches ADP v1.0 specification exactly
- **Fix**: Use ProcessBase wrappers, never manual response construction

## Success Criteria

Your process is ADP v1.0 compliant when:
- [ ] All four required handlers implemented and working
- [ ] Info handler returns complete, valid metadata
- [ ] All responses use standard ADP format
- [ ] Input validation prevents invalid operations  
- [ ] Automated compliance tests pass
- [ ] Process integrates with intelligent development tools
- [ ] Documentation is generated automatically from metadata

Save this checklist and refer to it during development to maintain ADP v1.0 compliance across all processes.