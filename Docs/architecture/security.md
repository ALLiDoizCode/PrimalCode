# Security

Implementation-specific security requirements for AO process development:

## Input Validation
- **Validation Library:** Custom ADP validation in `shared/utils/adp-validation.tl`
- **Validation Location:** All external message handlers must validate before processing
- **Required Rules:**
  - All agent messages MUST be validated against ADP v1.0 specification
  - Numeric inputs must have range validation (position coordinates, damage values, etc.)
  - String inputs must have length limits and character whitelisting

## Authentication & Authorization  
- **Auth Method:** AO Process message sender verification (built-in AO capability)
- **Session Management:** Agent session state tracked in individual world processes
- **Required Patterns:**
  - Verify message sender matches registered agent ID for all operations
  - Validate agent ownership before accessing Tuxemon or inventory data

## Secrets Management
- **Development:** No secrets required for local aolite development
- **Production:** AO process deployment keys managed via deployment scripts
- **Code Requirements:**
  - No hardcoded process IDs or agent identifiers
  - Configuration via process initialization messages only
  - No sensitive game data in error messages or logs

## Data Protection
- **Agent Data Isolation:** Each world process stores only single agent's data
- **Battle Privacy:** Battle process purges detailed logs after completion
- **PII Handling:** No personally identifiable information stored in any process
- **Logging Restrictions:** Never log agent strategies, detailed battle plans, or sensitive game state

## Dependency Security
- **AO Process Dependencies:** Only use verified AO-compatible Lua libraries
- **JavaScript Dependencies:** Regular npm audit for tooling and test dependencies
- **Update Policy:** Monthly dependency updates with testing validation
