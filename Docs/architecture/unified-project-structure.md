# Unified Project Structure

```
PrimalCode/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── test.yml
│       ├── deploy-mcp.yml
│       └── deploy-ao.yml
├── src/                        # MCP Server Implementation
│   ├── tools/                  # MCP tool implementations
│   │   ├── ecosystem-observer.ts
│   │   ├── environment-modifier.ts
│   │   ├── monster-analyzer.ts
│   │   ├── route-manager.ts
│   │   ├── influence-tracker.ts
│   │   ├── capture-mechanics.ts
│   │   └── inference-marketplace.ts
│   ├── ao-integration/         # AO process communication
│   │   ├── ao-client.ts
│   │   ├── message-schemas.ts
│   │   ├── process-manager.ts
│   │   └── wallet-integration.ts
│   ├── ecosystem/              # Game logic and state management
│   │   ├── monster-state.ts
│   │   ├── environment-state.ts
│   │   ├── game-logic.ts
│   │   └── adaptation-engine.ts
│   ├── marketplace/            # Inference marketplace components
│   │   ├── marketplace-client.ts
│   │   ├── provider-registry.ts
│   │   ├── reputation-manager.ts
│   │   └── token-handler.ts
│   ├── ai-integration/         # AI decision systems
│   │   ├── claude-client.ts
│   │   ├── decision-cache.ts
│   │   ├── fallback-ai.ts
│   │   └── prompt-optimizer.ts
│   ├── types/                  # TypeScript definitions
│   │   ├── monster-types.ts
│   │   ├── environment-types.ts
│   │   ├── mcp-tool-types.ts
│   │   ├── ao-message-types.ts
│   │   └── marketplace-types.ts
│   ├── utils/                  # Shared utilities
│   │   ├── logging.ts
│   │   ├── validation.ts
│   │   └── error-handling.ts
│   └── index.ts               # MCP server entry point
├── ao-processes/              # AO process implementations
│   ├── monster-process.lua
│   ├── environment-process.lua
│   ├── player-process.lua
│   ├── marketplace-core.lua
│   ├── provider-registry.lua
│   ├── reputation-manager.lua
│   ├── token-payment-handler.lua
│   └── shared/
│       ├── message-handlers.lua
│       ├── ai-integration.lua
│       ├── token-blueprint.lua
│       └── utils.lua
├── tests/                     # Comprehensive test suite
│   ├── unit/
│   │   ├── tools/
│   │   ├── ao-integration/
│   │   └── ecosystem/
│   ├── integration/
│   │   ├── mcp-tools.test.ts
│   │   └── ao-communication.test.ts
│   └── e2e/
│       └── ecosystem-workflows.test.ts
├── scripts/                   # Deployment and utility scripts
│   ├── deploy-ao-processes.js
│   ├── setup-development.js
│   └── monitor-health.js
├── docs/                      # Documentation
│   ├── architecture.md
│   ├── prd.md
│   ├── api-documentation.md
│   ├── tool-usage-examples.md
│   └── deployment-guide.md
├── config/                    # Configuration files
│   ├── development.json
│   ├── staging.json
│   └── production.json
├── .env.example              # Environment template
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Testing configuration
└── README.md                 # Project overview
```
