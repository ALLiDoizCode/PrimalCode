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
  primal_token_deposits: PrimalTokenDeposit[];
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
  primal_token_balance: number;
  unlocked_tools: EnvironmentalTool[];
  ecosystem_mastery: {
    route_id: string;
    mastery_level: number;
    specialization: string;
  }[];
  capture_collection: string[];
  session_history: SessionData[];
  token_transaction_history: PrimalTokenTransaction[];
}

interface PrimalTokenDeposit {
  amount: number;
  deposited_by: string;
  deposited_at: Date;
  purpose: "environmental_modification" | "future_use";
}

interface PrimalTokenTransaction {
  transaction_id: string;
  amount: number;
  type: "deduction" | "deposit" | "refund";
  purpose: string;
  timestamp: Date;
  modification_id?: string;
}
```

### Relationships
- Owns multiple Captured Monsters (1:N)
- Modifies multiple Environments (N:N)
- Spends Primal Tokens for environmental modifications
- Participates in Inference Marketplace (1:N)

## Inference Marketplace Provider

**Purpose:** Represents an AI inference service provider in the marketplace with capabilities, pricing, and reputation

**Key Attributes:**
- provider_id: string - Unique identifier for the AI service provider
- capabilities: string[] - Types of AI services offered
- pricing: PricingModel - Token costs per service type
- reputation: ReputationMetrics - Quality and performance indicators
- metadata: ProviderMetadata - Additional provider information

### TypeScript Interface

```typescript
interface InferenceProvider {
  provider_id: string;
  capabilities: string[];
  pricing: {
    [service_type: string]: string; // tokens per request
  };
  reputation: {
    response_time_avg: number;
    quality_score: number;
    completion_rate: number;
    total_requests: number;
  };
  metadata: {
    last_seen: number;
    x_tags_supported: string[];
    description: string;
  };
  status: "active" | "inactive" | "suspended";
}
```

### Relationships
- Handles multiple Inference Requests (1:N)
- Has Reputation History (1:N)
- Managed by Marketplace Core (N:1)

## Inference Request

**Purpose:** Represents a request for AI inference services with payment and context information

**Key Attributes:**
- request_id: string - Unique identifier for the inference request
- requester: string - AO process ID making the request
- provider_id: string - Target AI service provider
- service_type: string - Type of AI service requested
- context_data: any - Inference parameters and context
- payment_amount: string - Token amount for the service
- x_metadata: XMetadata - X-prefix forwarded tags

### TypeScript Interface

```typescript
interface InferenceRequest {
  request_id: string;
  requester: string;
  provider_id: string;
  service_type: string;
  context_data: any;
  payment_amount: string;
  x_metadata: {
    [key: string]: string; // X-prefixed tags
  };
  status: "pending" | "processing" | "completed" | "failed";
  created_at: number;
  timeout_at: number;
}
```

### Relationships
- Issued by Monster Process (N:1)
- Processed by Inference Provider (N:1)
- Tracked by Marketplace Core (N:1)

## Marketplace Transaction

**Purpose:** Records token transfers and AI service transactions for audit and reputation tracking

**Key Attributes:**
- transaction_id: string - Unique identifier for the transaction
- request_id: string - Associated inference request
- from_process: string - Token sender (requester)
- to_process: string - Token recipient (provider)
- amount: string - Token amount transferred
- service_type: string - Type of AI service
- success: boolean - Transaction completion status

### TypeScript Interface

```typescript
interface MarketplaceTransaction {
  transaction_id: string;
  request_id: string;
  from_process: string;
  to_process: string;
  amount: string;
  service_type: string;
  success: boolean;
  timestamp: number;
  credit_notice_sent: boolean;
  debit_notice_sent: boolean;
}
```

### Relationships
- Associated with Inference Request (1:1)
- Tracked by Reputation Manager (N:1)
- Logged by Marketplace Core (N:1)
