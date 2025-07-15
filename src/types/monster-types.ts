export type MonsterSpecies = 'aggressive_hunter' | 'cautious_forager' | 'pack_leader';

export type MonsterState = 
  | 'hunting'
  | 'foraging'
  | 'resting'
  | 'moving'
  | 'socializing'
  | 'fleeing'
  | 'territorial';

export interface MonsterPersonality {
  aggression: number; // 0-1 scale
  intelligence: number; // 0-1 scale
  pack_tendency: number; // 0-1 scale
}

export interface ResourceMemory {
  resource_type: string;
  location: MonsterPosition;
  quality: number; // 0-1 scale
  last_visited: Date;
}

export type AdaptationType = 'behavioral' | 'environmental' | 'social';

export interface AdaptationEvent {
  timestamp: Date;
  adaptation_type: AdaptationType;
  effectiveness: number; // 0-1 scale
  context: string;
}

export interface MonsterPosition {
  x: number;
  y: number;
  route: string;
}

export interface MonsterStats {
  health: number; // 0-100
  hunger: number; // 0-100
  energy: number; // 0-100
  position: MonsterPosition;
}

// Using MonsterPersonality interface to reduce duplication
export type MonsterAiPersonality = MonsterPersonality;

export interface MonsterEnvironmentalAwareness {
  detected_structures: string[];
  resource_memory: ResourceMemory[];
  weather_adaptation: number; // 0-1 scale
}

export interface MonsterInfluenceResistance {
  learned_patterns: Record<string, number>;
  adaptation_history: AdaptationEvent[];
}

export interface Monster {
  id: string;
  species: MonsterSpecies;
  stats: MonsterStats;
  ai_personality: MonsterAiPersonality;
  environmental_awareness: MonsterEnvironmentalAwareness;
  influence_resistance: MonsterInfluenceResistance;
  state: MonsterState;
  last_decision: Date;
}

export interface MonsterDecision {
  monster_id: string;
  action: string;
  reasoning: string;
  confidence: number; // 0-1 scale
  timestamp: Date;
  environmental_factors: Record<string, number>;
}