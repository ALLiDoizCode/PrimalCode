# Data Models

## Monster

**Purpose:** Represents an autonomous creature with persistent state, AI personality, and environmental awareness

**Key Attributes:**
- id: string - Unique identifier for the monster process
- species: string - Monster type determining base behavior patterns
- stats: MonsterStats - Health, hunger, energy, position tracking
- ai_personality: PersonalityTraits - Aggression, intelligence, pack tendency
- environmental_awareness: EnvironmentalData - Detected structures, resource memory
- influence_resistance: AdaptationData - Learned patterns, counter-strategies

### TypeScript Interface

```typescript
interface Monster {
  id: string;
  species: MonsterSpecies;
  stats: {
    health: number;
    hunger: number;
    energy: number;
    position: {
      x: number;
      y: number;
      route: string;
    };
  };
  ai_personality: {
    aggression: number;
    intelligence: number;
    pack_tendency: number;
  };
  environmental_awareness: {
    detected_structures: string[];
    resource_memory: ResourceMemory[];
    weather_adaptation: number;
  };
  influence_resistance: {
    learned_patterns: Record<string, number>;
    adaptation_history: AdaptationEvent[];
  };
  state: MonsterState;
  last_decision: Date;
}
```

### Relationships
- Belongs to Route (1:N)
- Communicates with other Monsters (N:N)
- Affected by Environmental Modifications (N:N)
- Owned by Player through Capture (N:1)

## Environment

**Purpose:** Manages route-level environmental state including structures, resources, and weather conditions

**Key Attributes:**
- route_id: string - Unique identifier for the habitat area
- structures: EnvironmentalStructure[] - Active player modifications
- resources: ResourcePool[] - Food, water, scent markers
- weather_state: WeatherCondition - Current environmental conditions
- ecosystem_balance: number - Natural vs artificial balance metric

### TypeScript Interface

```typescript
interface Environment {
  route_id: string;
  structures: EnvironmentalStructure[];
  resources: ResourcePool[];
  weather_state: WeatherCondition;
  influence_points: InfluencePoint[];
  ecosystem_balance: number;
  last_modified: Date;
}
```

### Relationships
- Contains multiple Monsters (1:N)
- Modified by Player Actions (N:N)
- Influences Monster Behavior (1:N)

## Player

**Purpose:** Tracks player progression, influence points, and ecosystem management history

**Key Attributes:**
- wallet_address: string - Arweave wallet for authentication
- influence_points: number - Available resources for modifications
- unlocked_tools: string[] - Available environmental modification tools
- ecosystem_mastery: MasteryLevel[] - Expertise in different routes
- capture_collection: string[] - Owned monster IDs

### TypeScript Interface

```typescript
interface Player {
  wallet_address: string;
  influence_points: number;
  unlocked_tools: EnvironmentalTool[];
  ecosystem_mastery: {
    route_id: string;
    mastery_level: number;
    specialization: string;
  }[];
  capture_collection: string[];
  session_history: SessionData[];
}
```

### Relationships
- Owns multiple Captured Monsters (1:N)
- Modifies multiple Environments (N:N)
- Earns Influence Points through successful management
