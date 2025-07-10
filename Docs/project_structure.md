# Project Structure - PrimalCode

## Root Directory Structure

```
PrimalCode/
├── src/
│   ├── client/           # Excalibur.js game client
│   ├── ao-processes/     # AO process implementations
│   ├── shared/          # Shared utilities and types
│   └── tests/           # Test files
├── assets/              # Game assets (sprites, sounds, etc.)
├── docs/                # Documentation files
├── scripts/             # Build and deployment scripts
├── config/              # Configuration files
├── .env.example         # Environment variables template
├── package.json         # Node.js dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md           # Project overview
```

## Detailed Structure

### `/src/client/` - Game Client (Excalibur.js)

```
src/client/
├── core/                # Core game engine setup
│   ├── engine.ts        # Main Excalibur engine initialization
│   ├── scenes/          # Game scenes
│   │   ├── MainScene.ts # Primary game scene
│   │   ├── MenuScene.ts # Menu/UI scene
│   │   └── LoadingScene.ts # Loading screen
│   └── systems/         # Game systems
│       ├── CameraSystem.ts
│       ├── InputSystem.ts
│       └── UISystem.ts
├── entities/            # Game entities and actors
│   ├── Monster.ts       # Monster visual representation
│   ├── Player.ts        # Player entity
│   ├── Environment.ts   # Environmental elements
│   └── UI/              # UI components
│       ├── MonsterPanel.ts
│       ├── Inventory.ts
│       ├── RouteMap.ts
│       └── ActionLog.ts
├── services/            # Client services
│   ├── AOService.ts     # AO process communication
│   ├── StateManager.ts  # Client state management
│   ├── MonsterObserver.ts # Real-time monster tracking
│   └── CacheManager.ts  # Client-side caching
├── utils/               # Client utilities
│   ├── constants.ts     # Game constants
│   ├── types.ts         # TypeScript type definitions
│   ├── helpers.ts       # Helper functions
│   └── animations.ts    # Animation utilities
├── styles/              # CSS/styling
│   ├── main.css         # Main stylesheet
│   └── components/      # Component-specific styles
└── main.ts              # Client entry point
```

### `/src/ao-processes/` - AO Process Implementations

```
src/ao-processes/
├── monster/             # Monster process implementation
│   ├── init.lua         # Monster process initialization
│   ├── handlers/        # Message handlers
│   │   ├── decision.lua # AI decision handling
│   │   ├── combat.lua   # Combat resolution
│   │   ├── movement.lua # Movement and pathfinding
│   │   ├── communication.lua # Inter-monster communication
│   │   └── state.lua    # State management
│   ├── ai/              # AI behavior modules
│   │   ├── personalities.lua # Monster personality types
│   │   ├── behaviors.lua # Behavior patterns
│   │   ├── decision_tree.lua # Decision logic
│   │   └── learning.lua # Adaptive learning
│   ├── utils/           # Process utilities
│   │   ├── helpers.lua  # Helper functions
│   │   ├── constants.lua # Process constants
│   │   └── validation.lua # Input validation
│   └── tests/           # Process tests
│       ├── test_decisions.lua
│       ├── test_combat.lua
│       └── test_communication.lua
├── world/               # World/environment processes
│   ├── init.lua         # World state initialization
│   ├── handlers/        # World message handlers
│   │   ├── spawn.lua    # Monster spawning
│   │   ├── environment.lua # Environmental changes
│   │   └── resources.lua # Resource management
│   └── config/          # World configuration
│       ├── routes.lua   # Route definitions
│       ├── biomes.lua   # Biome configurations
│       └── spawning.lua # Spawn configurations
├── player/              # Player process implementation
│   ├── init.lua         # Player process initialization
│   ├── handlers/        # Player message handlers
│   │   ├── collection.lua # Monster collection
│   │   ├── inventory.lua # Inventory management
│   │   └── influence.lua # Environmental influence
│   └── utils/           # Player utilities
└── shared/              # Shared process utilities
    ├── message_types.lua # Message type definitions
    ├── common_handlers.lua # Common handler functions
    └── process_utils.lua # Process utility functions
```

### `/src/shared/` - Shared Code

```
src/shared/
├── types/               # TypeScript type definitions
│   ├── monster.ts       # Monster-related types
│   ├── player.ts        # Player-related types
│   ├── world.ts         # World/environment types
│   ├── ai.ts            # AI-related types
│   └── messages.ts      # Message types for AO communication
├── constants/           # Shared constants
│   ├── game.ts          # Game constants
│   ├── ai.ts            # AI constants
│   └── world.ts         # World constants
├── utils/               # Shared utilities
│   ├── validation.ts    # Input validation
│   ├── serialization.ts # Data serialization
│   ├── crypto.ts        # Cryptographic utilities
│   └── logging.ts       # Logging utilities
└── config/              # Shared configuration
    ├── environment.ts   # Environment configuration
    ├── api.ts           # API configuration
    └── features.ts      # Feature flags
```

### `/assets/` - Game Assets

```
assets/
├── sprites/             # Sprite images
│   ├── monsters/        # Monster sprites
│   │   ├── hunter_wolf/
│   │   ├── cautious_rabbit/
│   │   ├── pack_leader/
│   │   ├── opportunistic_crow/
│   │   └── territorial_bear/
│   ├── environment/     # Environment sprites
│   │   ├── forest/
│   │   ├── mountain/
│   │   └── plains/
│   ├── ui/              # UI elements
│   │   ├── buttons/
│   │   ├── panels/
│   │   └── icons/
│   └── effects/         # Visual effects
│       ├── combat/
│       ├── movement/
│       └── status/
├── audio/               # Sound effects and music
│   ├── sfx/             # Sound effects
│   │   ├── combat/
│   │   ├── movement/
│   │   └── ui/
│   └── music/           # Background music
│       ├── ambient/
│       └── action/
├── animations/          # Animation data
│   ├── monster_animations.json
│   ├── environment_animations.json
│   └── effect_animations.json
└── fonts/               # Custom fonts
    ├── ui_font.ttf
    └── display_font.ttf
```

### `/config/` - Configuration Files

```
config/
├── development.json     # Development environment config
├── production.json      # Production environment config
├── testing.json         # Testing environment config
├── ao_processes.json    # AO process configurations
├── claude_api.json      # Claude API configuration
├── game_balance.json    # Game balance parameters
└── deployment.json      # Deployment configuration
```

### `/scripts/` - Build and Deployment

```
scripts/
├── build/               # Build scripts
│   ├── build_client.sh  # Client build script
│   ├── build_processes.sh # AO process build script
│   └── build_all.sh     # Complete build script
├── deploy/              # Deployment scripts
│   ├── deploy_client.sh # Client deployment
│   ├── deploy_processes.sh # AO process deployment
│   └── deploy_all.sh    # Complete deployment
├── test/                # Testing scripts
│   ├── run_tests.sh     # Run all tests
│   ├── test_client.sh   # Client tests
│   └── test_processes.sh # Process tests
└── utils/               # Utility scripts
    ├── generate_types.sh # Generate TypeScript types
    ├── validate_config.sh # Validate configuration
    └── setup_dev.sh     # Development setup
```

### `/docs/` - Documentation

```
docs/
├── Implementation.md    # Implementation plan
├── project_structure.md # This file
├── UI_UX_doc.md        # UI/UX documentation
├── api/                # API documentation
│   ├── ao_processes.md  # AO process API
│   ├── claude_integration.md # Claude API integration
│   └── client_api.md    # Client API
├── guides/             # Developer guides
│   ├── getting_started.md
│   ├── monster_creation.md
│   ├── ai_behavior.md
│   └── deployment.md
└── architecture/       # Architecture documentation
    ├── system_design.md
    ├── data_flow.md
    └── security.md
```

## File Organization Patterns

### Naming Conventions

**TypeScript Files:**
- PascalCase for classes and interfaces: `MonsterEntity.ts`, `IAIBehavior.ts`
- camelCase for functions and variables: `processDecision()`, `monsterState`
- kebab-case for component files: `monster-panel.ts`, `action-log.ts`

**Lua Files:**
- snake_case for all files: `monster_init.lua`, `decision_handler.lua`
- UPPERCASE for constants: `MAX_HEALTH`, `DECISION_INTERVAL`

**Asset Files:**
- kebab-case for all assets: `hunter-wolf-idle.png`, `forest-background.png`
- Descriptive names with type suffixes: `monster-attack-sfx.wav`

### Module Organization

**Barrel Exports:**
Each major directory should have an `index.ts` file that re-exports all public APIs:

```typescript
// src/client/entities/index.ts
export * from './Monster';
export * from './Player';
export * from './Environment';
export * from './UI';
```

**Type Definitions:**
- Global types in `/src/shared/types/`
- Module-specific types co-located with implementation
- Interface definitions separate from implementation

### Configuration Management

**Environment Variables:**
- Store sensitive data (API keys, process IDs) in environment variables
- Use `.env.example` for documenting required variables
- Validate environment variables at startup

**Configuration Files:**
- JSON format for static configuration
- TypeScript interfaces for configuration validation
- Environment-specific overrides

### Build System Integration

**TypeScript Configuration:**
- Separate `tsconfig.json` for client and shared code
- Path mapping for clean imports
- Strict type checking enabled

**Asset Pipeline:**
- Automated sprite sheet generation
- Asset optimization and compression
- Development vs production asset handling

**Testing Structure:**
- Unit tests co-located with implementation
- Integration tests in separate directories
- E2E tests for full system validation

## Development Workflow

### Local Development Setup

1. **Environment Setup:**
   ```bash
   npm install
   npm run setup:dev
   ```

2. **Process Development:**
   ```bash
   npm run dev:processes  # Watch AO processes
   npm run dev:client     # Watch client code
   ```

3. **Testing:**
   ```bash
   npm run test:unit      # Unit tests
   npm run test:integration # Integration tests
   npm run test:e2e       # End-to-end tests
   ```

### Deployment Structure

**Client Deployment:**
- Build artifacts in `/dist/client/`
- Static assets served from CDN
- Progressive web app configuration

**AO Process Deployment:**
- Compiled Lua processes in `/dist/processes/`
- Process deployment scripts
- Configuration management

**Environment Management:**
- Development, staging, production environments
- Environment-specific configurations
- Deployment validation and rollback procedures

This structure supports the autonomous monster game requirements while maintaining clean separation of concerns, scalability, and maintainability across the different technology stacks involved.