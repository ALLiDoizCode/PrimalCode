# Coding Standards

## Critical Fullstack Rules

- **Type Safety:** All AO message schemas must have corresponding TypeScript interfaces
- **Error Handling:** Every MCP tool must implement comprehensive error handling with user-friendly messages
- **State Consistency:** AO process state updates must be atomic and include rollback mechanisms
- **Natural Language:** All MCP tool responses must be engaging, narrative-driven descriptions
- **Performance Budgets:** AI API calls must complete within 5 seconds or fall back to cached decisions
- **Security First:** All player inputs must be validated and sanitized before AO process communication
- **Autonomous Integrity:** Monster decisions must never be directly controlled by players
- **Resource Management:** Influence point economy must be enforced at every environmental modification

## Naming Conventions

| Element | MCP Server | AO Process | Example |
|---------|------------|------------|---------|
| Tools | snake_case | - | `observe_ecosystem` |
| Functions | camelCase | snake_case | `generateNarrative` / `make_decision` |
| Types | PascalCase | snake_case | `MonsterState` / `monster_state` |
| Constants | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | `MAX_INFLUENCE_POINTS` |
| Variables | camelCase | snake_case | `ecosystemState` / `ecosystem_state` |
| AO Messages | kebab-case | kebab-case | `Environment-Change` |
