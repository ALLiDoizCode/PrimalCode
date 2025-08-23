# Coding Standards

These standards are MANDATORY for AI agents and human developers. Focus on project-specific conventions that prevent common mistakes:

## Core Standards
- **Languages & Runtimes:** Lua 5.3+ for AO processes, JavaScript for tooling and tests
- **Style & Linting:** Teal type checking for Lua code, ESLint for JavaScript components
- **Test Organization:** `*.test.tl` for Lua tests, `*.test.js` for JavaScript integration tests

## Critical Rules
- **No console.log in AO processes:** Use structured logging via AO process logging only
- **All message handlers must validate ADP compliance:** Use `shared/utils/adp-validation.tl` for all external messages
- **Deterministic random generation required:** Always use seeded RNG from `shared/utils/seeded-rng.tl`, never Lua's math.random()
- **State mutations must be atomic:** All AO process state changes within single handler execution
- **Agent data isolation:** World processes must never access other agents' data directly
