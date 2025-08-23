# Error Handling Strategy

## General Approach
- **Error Model:** ADP-compliant error responses with structured error codes
- **Exception Hierarchy:** Process-specific error types with standardized format
- **Error Propagation:** Local process error handling with inter-process error notification

## Logging Standards
- **Library:** Native AO Process Logging
- **Format:** Structured JSON logging for agent analysis and debugging
- **Levels:** ERROR, WARN, INFO, DEBUG with process-specific context
- **Required Context:**
  - Correlation ID: `${process_id}_${timestamp}_${sequence}`
  - Service Context: Process type, handler name, operation
  - Agent Context: Agent ID and session information (never sensitive data)

## Error Handling Patterns

### External Agent Communication Errors
- **Retry Policy:** Exponential backoff for temporary failures (network, rate limits)
- **Circuit Breaker:** Disable problematic agents after repeated failures
- **Timeout Configuration:** 2-second handler timeout per NFR requirements
- **Error Translation:** Convert AO internal errors to agent-friendly ADP responses

### Business Logic Errors  
- **Custom Exceptions:** Game-specific error types (InvalidMove, TuxemonNotFound, BattleInProgress)
- **User-Facing Errors:** Clear, actionable error messages for agent developers
- **Error Codes:** Structured error code system (WORLD_001, BATTLE_002, etc.)

### Data Consistency
- **Transaction Strategy:** AO Process atomic state updates with rollback capability
- **Compensation Logic:** Battle result compensation if process failures occur
- **Idempotency:** All message handlers support safe retry without side effects
