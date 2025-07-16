-- Decision Engine for Monster AO Process
-- Handles autonomous decision-making logic based on monster state and personality

local types = require('types.monster')
local json = require('utils.json')

local decision_engine = {}

-- Decision weights and thresholds
local DECISION_THRESHOLDS = {
    HUNGER_HIGH = 75,
    HUNGER_LOW = 25,
    ENERGY_LOW = 30,
    HEALTH_LOW = 40,
    AGGRESSION_THRESHOLD = 0.6,
    INTELLIGENCE_THRESHOLD = 0.7
}

-- Available actions for monsters
local ACTIONS = {
    "hunt",
    "rest",
    "explore",
    "seek_shelter",
    "patrol_territory",
    "flee",
    "socialize",
    "forage"
}

-- Calculate decision urgency based on stats
function decision_engine.calculate_urgency(monster: types.MonsterState): string
    local stats = monster.stats
    
    -- Critical conditions require immediate action
    if stats.health < DECISION_THRESHOLDS.HEALTH_LOW then
        return "high"
    end
    
    if stats.hunger > DECISION_THRESHOLDS.HUNGER_HIGH and stats.energy > DECISION_THRESHOLDS.ENERGY_LOW then
        return "high"
    end
    
    if stats.energy < DECISION_THRESHOLDS.ENERGY_LOW then
        return "medium"
    end
    
    return "low"
end

-- Generate decision context from monster state
function decision_engine.create_context(monster: types.MonsterState): types.DecisionContext
    return {
        current_state = monster,
        environment = {
            weather = "clear",  -- Would come from environment system
            time_of_day = "day", -- Would come from game time
            resources_nearby = {} -- Would come from environment detection
        },
        nearby_monsters = {}, -- Would come from proximity detection
        player_influences = {} -- Would come from recent player actions
    }
end

-- Core decision-making logic
function decision_engine.make_decision(monster: types.MonsterState): types.MonsterDecision
    local personality = monster.ai_personality
    local stats = monster.stats
    local urgency = decision_engine.calculate_urgency(monster)
    
    local action = "explore" -- Default action
    local target = "none"
    local reasoning = "Default exploration behavior"
    local state_changes: {string: any} = {}
    local next_delay = 60 -- Default 60 second cycle
    
    -- High urgency decisions (survival needs)
    if urgency == "high" then
        if stats.health < DECISION_THRESHOLDS.HEALTH_LOW then
            action = "seek_shelter"
            target = "safe_location"
            reasoning = "Low health requires immediate shelter"
            next_delay = 30 -- Check more frequently when injured
        elseif stats.hunger > DECISION_THRESHOLDS.HUNGER_HIGH and stats.energy > DECISION_THRESHOLDS.ENERGY_LOW then
            action = "hunt"
            target = "prey"
            reasoning = "High hunger drives hunting behavior"
            state_changes.hunger = stats.hunger - 20 -- Hunting reduces hunger
            state_changes.energy = stats.energy - 10 -- Hunting costs energy
        end
    -- Medium urgency decisions (maintenance needs)
    elseif urgency == "medium" then
        if stats.energy < DECISION_THRESHOLDS.ENERGY_LOW then
            action = "rest"
            target = "resting_spot"
            reasoning = "Low energy requires rest"
            state_changes.energy = stats.energy + 25 -- Resting restores energy
            next_delay = 90 -- Rest longer
        elseif stats.hunger > 50 then
            action = "forage"
            target = "food_source"
            reasoning = "Moderate hunger prompts foraging"
            state_changes.hunger = stats.hunger - 10
        end
    -- Low urgency decisions (personality-driven behavior)
    else
        -- Aggressive monsters patrol territory more
        if personality.aggression > DECISION_THRESHOLDS.AGGRESSION_THRESHOLD then
            action = "patrol_territory"
            target = "territory_boundary"
            reasoning = "High aggression drives territorial patrol"
        -- Intelligent monsters explore more efficiently
        elseif personality.intelligence > DECISION_THRESHOLDS.INTELLIGENCE_THRESHOLD then
            action = "explore"
            target = "unexplored_area"
            reasoning = "High intelligence drives systematic exploration"
        -- Pack-oriented monsters seek social interaction
        elseif personality.pack_tendency > 0.7 then
            action = "socialize"
            target = "other_monsters"
            reasoning = "High pack tendency drives social behavior"
        else
            -- Random exploration for balanced personalities
            local random_action = ACTIONS[math.random(#ACTIONS)]
            action = random_action
            target = "random_location"
            reasoning = "Balanced personality leads to varied behavior"
        end
    end
    
    -- Apply natural stat changes over time
    local time_passed = os.time() - stats.last_updated
    local hunger_increase = math.min(5, time_passed / 12) -- Hunger increases over time
    local energy_decay = math.min(3, time_passed / 20) -- Energy decays slowly
    
    state_changes.hunger = (state_changes.hunger or stats.hunger) + hunger_increase
    state_changes.energy = (state_changes.energy or stats.energy) - energy_decay
    
    -- Ensure values stay within bounds
    if state_changes.hunger then
        state_changes.hunger = math.max(0, math.min(100, state_changes.hunger))
    end
    if state_changes.energy then
        state_changes.energy = math.max(0, math.min(100, state_changes.energy))
    end
    
    local decision: types.MonsterDecision = {
        action = action,
        target = target,
        reasoning = reasoning,
        state_changes = state_changes,
        next_decision_delay = next_delay
    }
    
    return decision
end

-- Apply decision results to monster state
function decision_engine.apply_decision(monster: types.MonsterState, decision: types.MonsterDecision): types.MonsterState
    -- Update stats based on decision
    for stat_name, new_value in pairs(decision.state_changes) do
        if stat_name == "hunger" then
            monster.stats.hunger = new_value
        elseif stat_name == "energy" then
            monster.stats.energy = new_value
        elseif stat_name == "health" then
            monster.stats.health = new_value
        end
    end
    
    -- Update monster state and timing
    monster.state = decision.action
    monster.last_decision = os.time()
    monster.next_decision_at = os.time() + decision.next_decision_delay
    monster.stats.last_updated = os.time()
    
    return monster
end

-- Learning from player influences (future enhancement)
function decision_engine.learn_from_influence(monster: types.MonsterState, influence_type: string, success: boolean)
    local patterns = monster.influence_resistance.learned_patterns
    
    if not patterns[influence_type] then
        patterns[influence_type] = 0
    end
    
    if success then
        patterns[influence_type] = patterns[influence_type] + 0.1
    else
        patterns[influence_type] = patterns[influence_type] - 0.05
    end
    
    -- Clamp values
    patterns[influence_type] = math.max(-1, math.min(1, patterns[influence_type]))
end

return decision_engine