# Frontend Architecture

## Component Architecture

PrimalCode uses a **conversational interface architecture** rather than traditional components:

### Component Organization
```
src/tools/
├── ecosystem-observer.ts      # Natural language ecosystem descriptions
├── environment-modifier.ts    # Environmental change tools
├── monster-analyzer.ts       # Individual creature analysis
├── route-manager.ts          # Multi-habitat navigation
├── primal-token-tracker.ts      # Resource management
├── capture-mechanics.ts      # Monster collection tools
└── inference-marketplace.ts  # AI inference marketplace interaction
```

### Component Template
```typescript
// MCP Tool Component Pattern
export class EcosystemObserverTool {
  name = "observe_ecosystem";
  description = "Get detailed natural language description of current ecosystem state";
  
  async execute(params: ObserveEcosystemParams): Promise<EcosystemObservation> {
    const { route_id, focus } = params;
    
    // Query AO processes for current state
    const environment = await this.aoClient.queryEnvironment(route_id);
    const monsters = await this.aoClient.queryMonsters(route_id);
    
    // Generate natural language description
    const observation = this.generateNarrativeDescription(environment, monsters, focus);
    
    return {
      currentState: observation.narrative,
      monsterBehaviors: observation.behaviors,
      environmentalEffects: observation.effects,
      suggestedActions: observation.suggestions,
      timestamp: new Date()
    };
  }
  
  private generateNarrativeDescription(environment: Environment, monsters: Monster[], focus?: string): ObservationNarrative {
    // Transform raw data into engaging narrative
    const narrative = this.createEngagingNarrative(environment, monsters);
    const behaviors = this.analyzeBehaviorPatterns(monsters);
    const effects = this.describeEnvironmentalEffects(environment);
    const suggestions = this.generateStrategicSuggestions(environment, monsters);
    
    return { narrative, behaviors, effects, suggestions };
  }
}
```

## State Management Architecture

### State Structure
```typescript
// MCP Server State Management
interface ServerState {
  // AO Process Connections
  aoProcesses: Map<string, AOProcessConnection>;
  
  // AI Integration State
  aiClients: {
    claude: ClaudeClient;
    fallback: RuleBasedAI;
  };
  
  // Caching Layer
  cache: {
    decisions: Map<string, CachedDecision>;
    environments: Map<string, CachedEnvironment>;
    monsters: Map<string, CachedMonster>;
  };
  
  // Active Sessions
  sessions: Map<string, PlayerSession>;
  
  // System Health
  health: {
    aoConnections: boolean;
    aiServices: boolean;
    cacheStatus: boolean;
  };
}
```

### State Management Patterns
- **Reactive State Updates:** Real-time synchronization with AO processes
- **Caching Strategy:** Intelligent caching to reduce AI API costs
- **Session Management:** Track player interactions and context
- **Health Monitoring:** Continuous system health assessment

## Routing Architecture

### Route Organization
```
MCP Tools (No traditional routing - tool-based architecture)
├── observe_ecosystem          # Ecosystem observation and monitoring
├── modify_environment         # Environmental modifications
├── analyze_monster           # Individual creature analysis
├── manage_weather            # Weather control systems
├── track_primal_tokens           # Resource and point management
├── capture_creature          # Monster collection mechanics
└── navigate_routes           # Multi-habitat management
```

### Protected Route Pattern
```typescript
// Tool Authorization Pattern
export class ToolAuthorization {
  async validatePlayerAccess(walletAddress: string, toolName: string): Promise<boolean> {
    const player = await this.aoClient.getPlayerState(walletAddress);
    
    // Check if player has unlocked this tool
    if (!player.unlocked_tools.includes(toolName)) {
      return false;
    }
    
    // Check Primal tokens for resource-consuming tools
    if (this.isResourceTool(toolName)) {
      const cost = this.getToolCost(toolName);
      return player.primal_tokens >= cost;
    }
    
    return true;
  }
}
```

## Frontend Services Layer

### API Client Setup
```typescript
// AO Process Communication Client
export class AOClient {
  private wallet: ArweaveWallet;
  private processConnections: Map<string, AOProcess>;
  
  constructor(walletAddress: string) {
    this.wallet = new ArweaveWallet(walletAddress);
    this.processConnections = new Map();
  }
  
  async queryMonsterState(monsterId: string): Promise<Monster> {
    const process = this.processConnections.get(monsterId);
    const result = await process.dryRun({
      Action: "Get-State",
      Data: { query: "full_state" }
    });
    
    return JSON.parse(result.Messages[0].Data);
  }
  
  async sendEnvironmentalModification(routeId: string, modification: EnvironmentalModification): Promise<void> {
    const envProcess = this.processConnections.get(`env_${routeId}`);
    await envProcess.message({
      Action: "Environment-Change",
      Data: modification
    });
  }
}
```

### Service Example
```typescript
// Ecosystem Management Service
export class EcosystemService {
  constructor(private aoClient: AOClient, private aiClient: AIClient) {}
  
  async observeEcosystem(routeId: string, focus?: string): Promise<EcosystemObservation> {
    // Gather raw data from AO processes
    const environment = await this.aoClient.queryEnvironment(routeId);
    const monsters = await this.aoClient.queryMonsters(routeId);
    
    // Generate natural language description
    const narrative = await this.generateNarrative(environment, monsters, focus);
    
    return {
      currentState: narrative.description,
      monsterBehaviors: narrative.behaviors,
      environmentalEffects: narrative.effects,
      suggestedActions: narrative.suggestions,
      timestamp: new Date()
    };
  }
  
  private async generateNarrative(environment: Environment, monsters: Monster[], focus?: string): Promise<NarrativeDescription> {
    // Use AI to create engaging descriptions
    const context = this.buildNarrativeContext(environment, monsters, focus);
    const description = await this.aiClient.generateEcosystemDescription(context);
    
    return {
      description: description.narrative,
      behaviors: description.monsterBehaviors,
      effects: description.environmentalEffects,
      suggestions: description.strategicSuggestions
    };
  }
}
```
