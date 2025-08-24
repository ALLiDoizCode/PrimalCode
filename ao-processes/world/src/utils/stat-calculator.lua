-- Stat Calculator Utility
-- Core mathematical functions for creature stat calculations, IV generation, and combat effectiveness

local SeededRNG = require('shared.utils.seeded-rng')

local StatCalculator = {}

-- Constants for stat calculation formulas
StatCalculator.CONSTANTS = {
    IV_MIN = 0,
    IV_MAX = 31,
    EV_MIN = 0,
    EV_MAX = 252,
    LEVEL_MIN = 1,
    LEVEL_MAX = 100,
    HP_BASE_CONSTANT = 10,
    STAT_BASE_CONSTANT = 5,
    NATURE_MULTIPLIER_HIGH = 1.1,
    NATURE_MULTIPLIER_LOW = 0.9,
    COMBAT_EFFECTIVENESS_MAX = 100
}

-- Advanced stat calculation using modified Pokémon formula
function StatCalculator.calculate_hp(base_hp, level, iv, ev, nature_modifier)
    ev = ev or 0
    nature_modifier = nature_modifier or 1.0
    
    -- HP Formula: ((2 * base + IV + EV/4) * level / 100) + level + 10
    local hp = math.floor(((2 * base_hp + iv + math.floor(ev / 4)) * level / 100) + level + StatCalculator.CONSTANTS.HP_BASE_CONSTANT)
    
    -- Apply nature modifier
    hp = math.floor(hp * nature_modifier)
    
    return math.max(1, hp)  -- Ensure minimum HP of 1
end

function StatCalculator.calculate_stat(base_stat, level, iv, ev, nature_modifier)
    ev = ev or 0
    nature_modifier = nature_modifier or 1.0
    
    -- Stat Formula: ((2 * base + IV + EV/4) * level / 100) + 5
    local stat = math.floor(((2 * base_stat + iv + math.floor(ev / 4)) * level / 100) + StatCalculator.CONSTANTS.STAT_BASE_CONSTANT)
    
    -- Apply nature modifier
    stat = math.floor(stat * nature_modifier)
    
    return math.max(1, stat)  -- Ensure minimum stat of 1
end

-- Generate Individual Values with quality control
function StatCalculator.generate_ivs(seed, quality_tier)
    local rng = SeededRNG.new(seed)
    quality_tier = quality_tier or "normal"
    
    local ivs = {}
    local stat_names = {"hp", "attack", "defense", "speed"}
    
    for _, stat in ipairs(stat_names) do
        if quality_tier == "perfect" then
            ivs[stat] = StatCalculator.CONSTANTS.IV_MAX
        elseif quality_tier == "high" then
            ivs[stat] = rng:next(25, StatCalculator.CONSTANTS.IV_MAX)
        elseif quality_tier == "above_average" then
            ivs[stat] = rng:next(20, StatCalculator.CONSTANTS.IV_MAX)
        elseif quality_tier == "below_average" then
            ivs[stat] = rng:next(StatCalculator.CONSTANTS.IV_MIN, 15)
        else -- normal
            ivs[stat] = rng:next(StatCalculator.CONSTANTS.IV_MIN, StatCalculator.CONSTANTS.IV_MAX)
        end
    end
    
    -- Guarantee at least one decent IV for high quality
    if quality_tier == "high" or quality_tier == "above_average" then
        local guarantee_stat = stat_names[rng:next(1, #stat_names)]
        ivs[guarantee_stat] = math.max(ivs[guarantee_stat], 28)
    end
    
    return ivs
end

-- Calculate Individual Value rating (0-100 scale)
function StatCalculator.rate_iv_quality(ivs)
    local total_iv = 0
    local count = 0
    
    for _, iv in pairs(ivs) do
        total_iv = total_iv + iv
        count = count + 1
    end
    
    if count == 0 then
        return 0
    end
    
    local average_iv = total_iv / count
    local max_possible = StatCalculator.CONSTANTS.IV_MAX
    local rating = (average_iv / max_possible) * 100
    
    return math.floor(rating)
end

-- Advanced combat effectiveness calculation
function StatCalculator.calculate_combat_effectiveness(stats, level, type_advantages, status_effects)
    -- Base power calculation with weighted stats
    local offensive_power = stats.attack * 1.4 + stats.speed * 0.9
    local defensive_power = stats.defense * 1.1 + stats.hp_max * 0.7
    local survivability = stats.hp_current / stats.hp_max
    
    -- Base combat power
    local base_power = (offensive_power * 0.6 + defensive_power * 0.4) * survivability
    
    -- Level scaling (diminishing returns at high levels)
    local level_factor = level + (math.log(level) * 10)
    
    -- Type advantage multiplier
    local type_multiplier = 1.0
    if type_advantages then
        type_multiplier = type_multiplier + (#type_advantages.offensive_coverage * 0.05)
        type_multiplier = type_multiplier + (#type_advantages.defensive_resistances * 0.03)
        type_multiplier = type_multiplier - (#type_advantages.vulnerabilities * 0.04)
    end
    
    -- Status effect penalties
    local status_penalty = 0
    if status_effects and #status_effects > 0 then
        for _, effect in ipairs(status_effects) do
            if effect == "burn" or effect == "poison" then
                status_penalty = status_penalty + 8
            elseif effect == "paralysis" or effect == "freeze" then
                status_penalty = status_penalty + 15
            elseif effect == "sleep" or effect == "faint" then
                status_penalty = status_penalty + 25
            end
        end
    end
    
    -- Final effectiveness calculation
    local effectiveness = ((base_power + level_factor) * type_multiplier) - status_penalty
    
    -- Normalize to 0-100 scale
    effectiveness = math.max(0, math.min(StatCalculator.CONSTANTS.COMBAT_EFFECTIVENESS_MAX, effectiveness))
    
    return {
        total_effectiveness = math.floor(effectiveness),
        offensive_rating = math.floor(offensive_power),
        defensive_rating = math.floor(defensive_power),
        survivability_rating = math.floor(survivability * 100),
        level_contribution = math.floor(level_factor),
        type_contribution = type_multiplier,
        status_penalty = status_penalty
    }
end

-- Stat comparison between two creatures
function StatCalculator.compare_stats(creature1_stats, creature2_stats)
    local comparison = {
        creature1_advantages = {},
        creature2_advantages = {},
        stat_differences = {},
        overall_winner = nil,
        comparison_score = 0  -- Positive favors creature1, negative favors creature2
    }
    
    local stat_names = {"hp_max", "attack", "defense", "speed"}
    local score = 0
    
    for _, stat in ipairs(stat_names) do
        local diff = creature1_stats[stat] - creature2_stats[stat]
        comparison.stat_differences[stat] = diff
        
        if diff > 0 then
            table.insert(comparison.creature1_advantages, stat)
            score = score + diff
        elseif diff < 0 then
            table.insert(comparison.creature2_advantages, stat)
            score = score + diff  -- Negative value
        end
    end
    
    comparison.comparison_score = score
    comparison.overall_winner = score > 0 and "creature1" or score < 0 and "creature2" or "tie"
    
    return comparison
end

-- Calculate stat growth potential
function StatCalculator.calculate_growth_potential(current_stats, base_stats, level, ivs, max_level)
    max_level = max_level or StatCalculator.CONSTANTS.LEVEL_MAX
    
    if level >= max_level then
        return {
            growth_remaining = 0,
            max_potential_stats = current_stats,
            stat_gains = {},
            growth_rating = 0
        }
    end
    
    local growth_potential = {}
    local levels_remaining = max_level - level
    
    -- Calculate maximum potential stats at max level
    growth_potential.max_potential_stats = {}
    growth_potential.stat_gains = {}
    
    for stat_name, base_value in pairs(base_stats) do
        local current_iv = ivs[stat_name] or 15  -- Default average IV
        
        local max_stat
        if stat_name == "hp" then
            max_stat = StatCalculator.calculate_hp(base_value, max_level, current_iv)
        else
            max_stat = StatCalculator.calculate_stat(base_value, max_level, current_iv)
        end
        
        growth_potential.max_potential_stats[stat_name] = max_stat
        growth_potential.stat_gains[stat_name] = max_stat - (current_stats[stat_name] or 0)
    end
    
    -- Calculate overall growth rating
    local total_current = 0
    local total_potential = 0
    
    for stat_name, current_value in pairs(current_stats) do
        if stat_name ~= "hp_current" and growth_potential.max_potential_stats[stat_name] then
            total_current = total_current + current_value
            total_potential = total_potential + growth_potential.max_potential_stats[stat_name]
        end
    end
    
    growth_potential.growth_remaining = levels_remaining
    growth_potential.current_stat_total = total_current
    growth_potential.max_potential_total = total_potential
    growth_potential.growth_rating = total_potential > 0 and ((total_potential - total_current) / total_potential * 100) or 0
    
    return growth_potential
end

-- Calculate stat efficiency rating
function StatCalculator.calculate_stat_efficiency(stats, level)
    local total_stats = 0
    local count = 0
    
    for stat_name, value in pairs(stats) do
        if stat_name ~= "hp_current" then
            total_stats = total_stats + value
            count = count + 1
        end
    end
    
    if count == 0 or level == 0 then
        return 0
    end
    
    local average_stat = total_stats / count
    local efficiency = average_stat / level
    
    -- Normalize efficiency rating
    local efficiency_rating = math.min(100, efficiency * 10)
    
    return {
        total_stats = total_stats,
        average_stat = average_stat,
        stat_per_level = efficiency,
        efficiency_rating = math.floor(efficiency_rating),
        efficiency_tier = StatCalculator.get_efficiency_tier(efficiency_rating)
    }
end

function StatCalculator.get_efficiency_tier(rating)
    if rating >= 90 then
        return "exceptional"
    elseif rating >= 75 then
        return "excellent"
    elseif rating >= 60 then
        return "good"
    elseif rating >= 45 then
        return "average"
    elseif rating >= 30 then
        return "below_average"
    else
        return "poor"
    end
end

-- Predict stat values at a target level
function StatCalculator.predict_stats_at_level(base_stats, current_level, target_level, ivs, evs, nature_modifiers)
    if target_level <= current_level then
        return nil, "Target level must be higher than current level"
    end
    
    evs = evs or {}
    nature_modifiers = nature_modifiers or {}
    
    local predicted_stats = {}
    
    for stat_name, base_value in pairs(base_stats) do
        local iv = ivs[stat_name] or 15  -- Default average IV
        local ev = evs[stat_name] or 0
        local nature_mod = nature_modifiers[stat_name] or 1.0
        
        if stat_name == "hp" then
            predicted_stats[stat_name] = StatCalculator.calculate_hp(base_value, target_level, iv, ev, nature_mod)
        else
            predicted_stats[stat_name] = StatCalculator.calculate_stat(base_value, target_level, iv, ev, nature_mod)
        end
    end
    
    return predicted_stats
end

-- Calculate balanced team stat coverage
function StatCalculator.analyze_team_stat_coverage(team_creatures)
    local coverage_analysis = {
        team_size = #team_creatures,
        total_stats = {hp_max = 0, attack = 0, defense = 0, speed = 0},
        average_stats = {hp_max = 0, attack = 0, defense = 0, speed = 0},
        stat_distribution = {},
        balance_score = 0,
        strengths = {},
        weaknesses = {}
    }
    
    if #team_creatures == 0 then
        return coverage_analysis
    end
    
    -- Calculate team totals and averages
    for _, creature in ipairs(team_creatures) do
        if creature.final_stats then
            for stat_name, value in pairs(creature.final_stats) do
                if stat_name ~= "hp_current" and coverage_analysis.total_stats[stat_name] then
                    coverage_analysis.total_stats[stat_name] = coverage_analysis.total_stats[stat_name] + value
                end
            end
        end
    end
    
    -- Calculate averages
    for stat_name, total in pairs(coverage_analysis.total_stats) do
        coverage_analysis.average_stats[stat_name] = math.floor(total / #team_creatures)
    end
    
    -- Analyze stat balance
    local avg_values = {}
    for _, value in pairs(coverage_analysis.average_stats) do
        table.insert(avg_values, value)
    end
    
    -- Calculate variance for balance score
    local sum = 0
    for _, value in ipairs(avg_values) do
        sum = sum + value
    end
    local mean = sum / #avg_values
    
    local variance = 0
    for _, value in ipairs(avg_values) do
        variance = variance + (value - mean) ^ 2
    end
    variance = variance / #avg_values
    
    -- Lower variance indicates better balance (invert for score)
    coverage_analysis.balance_score = math.max(0, 100 - variance)
    
    -- Identify strengths and weaknesses
    for stat_name, avg_value in pairs(coverage_analysis.average_stats) do
        if avg_value > mean * 1.2 then
            table.insert(coverage_analysis.strengths, stat_name)
        elseif avg_value < mean * 0.8 then
            table.insert(coverage_analysis.weaknesses, stat_name)
        end
    end
    
    return coverage_analysis
end

return StatCalculator