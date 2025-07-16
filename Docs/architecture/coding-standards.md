# Coding Standards

## Critical Fullstack Rules

- **Type Safety:** All AO message schemas must have corresponding TypeScript interfaces
- **Error Handling:** Every MCP tool must implement comprehensive error handling with user-friendly messages
- **State Consistency:** AO process state updates must be atomic and include rollback mechanisms
- **Natural Language:** All MCP tool responses must be engaging, narrative-driven descriptions
- **Performance Budgets:** AI API calls must complete within 5 seconds or fall back to cached decisions
- **Security First:** All player inputs must be validated and sanitized before AO process communication
- **Autonomous Integrity:** Monster decisions must never be directly controlled by players
- **Resource Management:** Primal token economy must be enforced at every environmental modification

## Naming Conventions

| Element | MCP Server | AO Process | Example |
|---------|------------|------------|---------|
| Tools | snake_case | - | `observe_ecosystem` |
| Functions | camelCase | snake_case | `generateNarrative` / `make_decision` |
| Types | PascalCase | snake_case | `MonsterState` / `monster_state` |
| Constants | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | `MAX_INFLUENCE_POINTS` |
| Variables | camelCase | snake_case | `ecosystemState` / `ecosystem_state` |
| AO Messages | kebab-case | kebab-case | `Environment-Change` |

## Terminology Standardization

**Core Terminology Alignment Between Architecture and PRD:**

**MCP Tools (consistent snake_case naming):**
- `observe_ecosystem` - Primary ecosystem observation tool
- `modify_environment` - Environmental modification tool
- `analyze_monster` - Individual monster analysis tool
- `navigate_routes` - Route management and navigation tool
- `track_influence` - Influence point tracking and management tool
- `capture_creature` - Monster capture mechanics tool
- `inference_marketplace` - AI marketplace interaction tool

**Component Naming (consistent PascalCase):**
- `EcosystemObserverTool` - Ecosystem observation component
- `EnvironmentModifierTool` - Environmental modification component
- `MonsterAnalyzerTool` - Monster analysis component
- `RouteNavigatorTool` - Route management component
- `InfluenceTrackerTool` - Influence tracking component
- `CaptureCaptureTool` - Capture mechanics component
- `InferenceMarketplaceTool` - Marketplace interaction component

**Process Naming (consistent kebab-case for AO messages):**
- `Monster-Decision` - Monster AI decision requests
- `Environment-Change` - Environmental modification events
- `Player-Action` - Player interaction events
- `Process-Health` - Process health monitoring
- `AI-Inference-Request` - AI marketplace service requests
- `Provider-Registration` - Provider service registration
- `Credit-Notice` / `Debit-Notice` - Token transfer notifications

**File Structure Naming (consistent kebab-case):**
- `ecosystem-observer.ts` - Ecosystem observation implementation
- `environment-modifier.ts` - Environmental modification implementation
- `monster-analyzer.ts` - Monster analysis implementation
- `route-navigator.ts` - Route management implementation
- `influence-tracker.ts` - Influence tracking implementation
- `capture-mechanics.ts` - Capture mechanics implementation
- `inference-marketplace.ts` - Marketplace interaction implementation

**Epic and Story Terminology:**
- **Epic 1**: "MCP Foundation & Proof of Concept" 
- **Epic 2**: "Autonomous Monster Integration"
- **Epic 3**: "Full Ecosystem Experience"
- **Epic 5**: "Inference Provider Infrastructure"

**Technical Stack Terminology:**
- **MCP Server**: FastMCP-based TypeScript application
- **AO Processes**: Lua-based autonomous processes on Arweave
- **Inference Providers**: Node.js applications handling AI marketplace requests
- **Service Discovery**: Intelligent provider matching and routing system

**Quality Assurance Terminology:**
- **Integration Verification (IV)**: Acceptance criteria validation points
- **Performance Benchmarks**: Quantified performance requirements
- **Fallback Hierarchy**: AI service degradation levels
- **Error Recovery**: Graceful degradation and recovery mechanisms

This standardization ensures consistent terminology across all documentation, code, and communication, supporting clear development workflows and reducing confusion between architecture and PRD specifications.
