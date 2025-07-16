-- Monster AO Process Type Definitions
-- Teal type definitions for monster state and behavior

-- Position in the world
local record Position
    x: number
    y: number
    route: string
end

-- Monster statistics
local record MonsterStats
    health: number
    hunger: number
    energy: number
    position: Position
    last_updated: number
end

-- AI personality traits (stable characteristics)
local record AIPersonality
    aggression: number      -- 0.0 to 1.0
    intelligence: number    -- 0.0 to 1.0
    pack_tendency: number   -- 0.0 to 1.0
    adaptation_rate: number -- 0.0 to 1.0
end

-- Environmental awareness (dynamic learning)
local record EnvironmentalAwareness
    detected_structures: {string}
    resource_memory: {string: any}
    weather_adaptation: number
    scent_trail_following: string
end

-- Learning and adaptation tracking
local record InfluenceResistance
    learned_patterns: {string: number}
    adaptation_history: {any}
    counter_strategies: {string: any}
end

-- Core monster state
local record MonsterState
    -- Core identity
    id: string
    species: string
    created_at: number
    
    -- Dynamic stats
    stats: MonsterStats
    
    -- AI personality (stable traits)
    ai_personality: AIPersonality
    
    -- Environmental awareness (dynamic)
    environmental_awareness: EnvironmentalAwareness
    
    -- Learning and adaptation
    influence_resistance: InfluenceResistance
    
    -- Current state
    state: string
    last_decision: number
    next_decision_at: number
end

-- Decision context for monster AI
local record DecisionContext
    current_state: MonsterState
    environment: {string: any}
    nearby_monsters: {string}
    player_influences: {string: any}
end

-- Monster decision result
local record MonsterDecision
    action: string
    target: string
    reasoning: string
    state_changes: {string: any}
    next_decision_delay: number
end

-- AO Message structures
local record AOMessage
    Action: string
    Data: any
    From: string
    Timestamp: number
end

-- Health check status
local record HealthStatus
    is_healthy: boolean
    last_heartbeat: number
    error_count: number
    uptime: number
    memory_usage: number
end

-- Process state for persistence
local record ProcessState
    monster: MonsterState
    health: HealthStatus
    version: string
    last_backup: number
end

return {
    Position = Position,
    MonsterStats = MonsterStats,
    AIPersonality = AIPersonality,
    EnvironmentalAwareness = EnvironmentalAwareness,
    InfluenceResistance = InfluenceResistance,
    MonsterState = MonsterState,
    DecisionContext = DecisionContext,
    MonsterDecision = MonsterDecision,
    AOMessage = AOMessage,
    HealthStatus = HealthStatus,
    ProcessState = ProcessState
}