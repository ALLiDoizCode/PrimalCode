export declare enum MonsterSpecies {
    SHADOW_WOLF = "shadow_wolf",
    FROST_BEAR = "frost_bear",
    EMBER_HAWK = "ember_hawk",
    STONE_SERPENT = "stone_serpent",
    WIND_STAG = "wind_stag"
}
export declare enum MonsterState {
    IDLE = "idle",
    HUNTING = "hunting",
    RESTING = "resting",
    FEEDING = "feeding",
    MOVING = "moving",
    ALERTING = "alerting",
    FLEEING = "fleeing"
}
export declare enum MonsterPersonalityType {
    AGGRESSIVE_HUNTER = "aggressive_hunter",
    CAUTIOUS_FORAGER = "cautious_forager",
    PACK_LEADER = "pack_leader"
}
export interface Position {
    x: number;
    y: number;
    route: string;
}
export interface MonsterStats {
    health: number;
    maxHealth: number;
    hunger: number;
    maxHunger: number;
    energy: number;
    maxEnergy: number;
    position: Position;
}
export interface MonsterPersonality {
    type: MonsterPersonalityType;
    aggression: number;
    intelligence: number;
    pack_tendency: number;
    caution: number;
    exploration: number;
}
export interface EnvironmentalAwareness {
    detected_structures: string[];
    resource_memory: ResourceMemory[];
    weather_adaptation: number;
    threat_awareness: number;
}
export interface ResourceMemory {
    type: string;
    location: Position;
    quality: number;
    last_visited: number;
}
export interface Monster {
    id: string;
    species: MonsterSpecies;
    stats: MonsterStats;
    ai_personality: MonsterPersonality;
    environmental_awareness: EnvironmentalAwareness;
    state: MonsterState;
    created_at: number;
    last_updated: number;
}
export interface MonsterDecision {
    action: string;
    reasoning: string;
    target_position?: Position;
    duration: number;
    narrative: string;
}
export interface MonsterBehaviorPattern {
    personality_type: MonsterPersonalityType;
    preferred_actions: string[];
    decision_weights: Record<string, number>;
    response_patterns: Record<string, string>;
}
//# sourceMappingURL=monster-types.d.ts.map