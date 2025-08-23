# Source Tree

Based on our monorepo structure and AO process-based microservices architecture:

```
tuxemon-ao-process/
├── ao-processes/                   # AO process implementations
│   ├── world/                      # Individual world process
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── movement.tl     # Agent movement and collision
│   │   │   │   ├── encounters.tl   # Tuxemon encounter mechanics
│   │   │   │   ├── items.tl        # Item collection and inventory
│   │   │   │   └── world-state.tl  # World state queries
│   │   │   ├── utils/
│   │   │   │   ├── collision.tl    # Collision detection utilities
│   │   │   │   ├── seeded-rng.tl   # Deterministic random generation
│   │   │   │   └── state-manager.tl # World state persistence
│   │   │   └── main.tl             # Process entry point and routing
│   │   ├── package.json
│   │   └── tlconfig.lua            # Teal configuration
│   ├── battle/                     # Shared battle process
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── battle-setup.tl    # Battle initialization
│   │   │   │   ├── turn-resolution.tl  # Combat mechanics
│   │   │   │   ├── damage-calc.tl      # Damage calculations
│   │   │   │   └── battle-end.tl       # Battle completion
│   │   │   ├── utils/
│   │   │   │   ├── move-effects.tl     # Move and status effects
│   │   │   │   ├── type-effectiveness.tl # Elemental type system
│   │   │   │   └── battle-logger.tl    # Action logging
│   │   │   └── main.tl
│   │   ├── package.json
│   │   └── tlconfig.lua
│   ├── registry/                   # Agent registry process
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── agent-registration.tl # Agent discovery
│   │   │   │   ├── matchmaking.tl        # Battle opponent matching
│   │   │   │   └── status-tracking.tl    # Agent status updates
│   │   │   ├── utils/
│   │   │   │   └── matching-algorithm.tl # Matchmaking logic
│   │   │   └── main.tl
│   │   ├── package.json
│   │   └── tlconfig.lua
│   └── health-monitor/             # System monitoring process
│       ├── src/
│       │   ├── handlers/
│       │   │   ├── health-check.tl      # Process health monitoring
│       │   │   ├── metrics-collection.tl # Performance tracking
│       │   │   └── error-logging.tl     # Error aggregation
│       │   ├── utils/
│       │   │   └── monitoring-utils.tl  # Health check utilities
│       │   └── main.tl
│       ├── package.json
│       └── tlconfig.lua
├── shared/                         # Shared utilities and types
│   ├── types/
│   │   ├── agent.d.tl              # Agent data types
│   │   ├── tuxemon.d.tl            # Tuxemon data types
│   │   ├── battle.d.tl             # Battle data types
│   │   └── world.d.tl              # World data types
│   ├── utils/
│   │   ├── adp-validation.tl       # ADP message validation
│   │   ├── error-handling.tl       # Standardized error handling
│   │   └── json-utils.tl           # JSON serialization utilities
│   └── data/
│       ├── tuxemon-species.json    # Static species reference data
│       ├── move-templates.json     # Static move reference data
│       └── item-templates.json     # Static item reference data
├── scripts/                        # Development and deployment scripts
│   ├── build-all.js                # Build all AO processes
│   ├── deploy-local.js             # Local aolite deployment
│   ├── deploy-mainnet.js           # Mainnet deployment
│   └── test-runner.js              # Test execution coordination
├── tests/                          # Testing infrastructure
│   ├── unit/                       # Unit tests for individual processes
│   │   ├── world/
│   │   ├── battle/
│   │   ├── registry/
│   │   └── health-monitor/
│   ├── integration/                # Inter-process integration tests
│   │   ├── battle-workflow.test.js
│   │   ├── agent-registration.test.js
│   │   └── world-exploration.test.js
│   └── mock-agents/                # Mock external agents for testing
│       ├── basic-explorer.js
│       ├── battle-seeker.js
│       └── tuxemon-collector.js
├── development/                    # Development and monitoring tools
│   ├── monitoring-dashboard/       # Process health visualization
│   ├── debug-interface/            # Interactive debugging tools
│   └── agent-simulator/            # Agent behavior simulation
├── docs/                          # Documentation
│   ├── architecture.md            # This document
│   ├── api-reference.md           # ADP message specifications
│   └── development-guide.md       # Developer onboarding
├── package.json                   # Root monorepo configuration
└── README.md                      # Project overview and setup
```
