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
├── inference-providers/       # External Node.js Inference Provider Apps
│   ├── claude-provider/       # Claude-based inference provider
│   │   ├── src/
│   │   │   ├── index.ts       # Main application entry point
│   │   │   ├── credit-notice-handler.ts # Credit-Notice message handler
│   │   │   ├── claude-client.ts # Claude API integration
│   │   │   ├── ao-client.ts    # AO process communication
│   │   │   ├── service-registry.ts # Registry integration
│   │   │   └── types.ts       # Provider-specific types
│   │   ├── package.json
│   │   └── README.md
│   ├── openai-provider/       # OpenAI-based inference provider
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── credit-notice-handler.ts
│   │   │   ├── openai-client.ts
│   │   │   ├── ao-client.ts
│   │   │   ├── service-registry.ts
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── README.md
│   └── provider-template/     # Template for new inference providers
│       ├── src/
│       │   ├── index.ts
│       │   ├── credit-notice-handler.ts
│       │   ├── ai-client.ts
│       │   ├── ao-client.ts
│       │   ├── service-registry.ts
│       │   └── types.ts
│       ├── package.json
│       └── README.md
├── ao-processes/              # AO process implementations (Teal-based)
│   ├── monster/               # Monster creature process
│   │   ├── src/
│   │   │   ├── main.tl        # Main Teal entry point
│   │   │   ├── handlers/
│   │   │   │   ├── credit-notice.tl
│   │   │   │   ├── debit-notice.tl
│   │   │   │   └── decision-making.tl
│   │   │   ├── types/
│   │   │   │   └── monster.d.tl
│   │   │   └── utils/
│   │   │       └── payment-utils.tl
│   │   ├── packages/          # Custom Lua modules
│   │   ├── build/             # Compiled output
│   │   ├── scripts/           # Build/deploy scripts
│   │   ├── tlconfig.lua       # Teal configuration
│   │   ├── package.json       # Build dependencies
│   │   └── README.md          # Process-specific docs
│   ├── environment/           # Environment process
│   │   ├── src/
│   │   │   ├── main.tl
│   │   │   ├── handlers/
│   │   │   │   ├── weather-system.tl
│   │   │   │   ├── resource-management.tl
│   │   │   │   └── structure-tracking.tl
│   │   │   ├── types/
│   │   │   │   └── environment.d.tl
│   │   │   └── utils/
│   │   │       └── ecosystem-utils.tl
│   │   ├── packages/
│   │   ├── build/
│   │   ├── scripts/
│   │   ├── tlconfig.lua
│   │   ├── package.json
│   │   └── README.md
│   ├── player/                # Player process
│   │   ├── src/
│   │   │   ├── main.tl
│   │   │   ├── handlers/
│   │   │   │   ├── tool-authorization.tl
│   │   │   │   ├── influence-tracking.tl
│   │   │   │   └── resource-management.tl
│   │   │   ├── types/
│   │   │   │   └── player.d.tl
│   │   │   └── utils/
│   │   │       └── auth-utils.tl
│   │   ├── packages/
│   │   ├── build/
│   │   ├── scripts/
│   │   ├── tlconfig.lua
│   │   ├── package.json
│   │   └── README.md
│   ├── marketplace/           # Marketplace processes
│   │   ├── registry/          # Provider registry
│   │   │   ├── src/
│   │   │   │   ├── main.tl
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── provider-registration.tl
│   │   │   │   │   ├── service-discovery.tl
│   │   │   │   │   └── reputation-tracking.tl
│   │   │   │   ├── types/
│   │   │   │   │   └── registry.d.tl
│   │   │   │   └── utils/
│   │   │   │       └── validation-utils.tl
│   │   │   ├── packages/
│   │   │   ├── build/
│   │   │   ├── scripts/
│   │   │   ├── tlconfig.lua
│   │   │   ├── package.json
│   │   │   └── README.md
│   │   └── payment/           # Payment handler
│   │       ├── src/
│   │       │   ├── main.tl
│   │       │   ├── handlers/
│   │       │   │   ├── token-transfer.tl
│   │       │   │   ├── payment-validation.tl
│   │       │   │   └── refund-processing.tl
│   │       │   ├── types/
│   │       │   │   └── payment.d.tl
│   │       │   └── utils/
│   │       │       └── token-utils.tl
│   │       ├── packages/
│   │       ├── build/
│   │       ├── scripts/
│   │       ├── tlconfig.lua
│   │       ├── package.json
│   │       └── README.md
│   ├── shared/                # Shared AO utilities
│   │   ├── src/
│   │   │   ├── ao-types.d.tl  # Common AO type definitions
│   │   │   ├── common-handlers.tl # Shared message handlers
│   │   │   ├── token-blueprint.tl # Token contract utilities
│   │   │   └── utils.tl       # Common utility functions
│   │   └── packages/
│   └── scripts/               # Global AO scripts
│       ├── build-all.sh       # Build all processes
│       ├── deploy-all.sh      # Deploy all processes
│       ├── test-processes.sh  # Test all processes
│       └── setup-teal.sh      # Setup Teal development environment
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
