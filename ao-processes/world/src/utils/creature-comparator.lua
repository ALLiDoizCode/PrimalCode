-- Creature Comparator Utility
-- Advanced creature comparison, strategic analysis, and team optimization recommendations
-- Implements Story 4.4 requirements for creature comparison tools

local StatCalculator = require('ao-processes.world.src.utils.stat-calculator')
local ProcessBase = require('shared.utils.process-base')
local HandlerMetadata = require('shared.utils.handler-metadata')

local CreatureComparator = {}

-- Initialize creature comparator with world state
function CreatureComparator.new(captured_creature_manager)
    local self = {
        creature_manager = captured_creature_manager,
        comparison_cache = {},  -- Cache for expensive comparisons
        type_effectiveness_chart = CreatureComparator.build_type_chart(),
        battle_scenario_weights = CreatureComparator.build_scenario_weights()
    }
    return setmetatable(self, {__index = CreatureComparator})
end

-- Build type effectiveness chart for strategic analysis
function CreatureComparator.build_type_chart()
    return {
        fire = {advantages = {"nature", "ice", "crystal"}, disadvantages = {"water", "earth"}},
        water = {advantages = {"fire", "earth"}, disadvantages = {"nature", "electric"}},
        nature = {advantages = {"water", "earth"}, disadvantages = {"fire", "ice", "poison"}},
        earth = {advantages = {"fire", "electric", "poison"}, disadvantages = {"water", "nature", "ice"}},
        electric = {advantages = {"water", "flying"}, disadvantages = {"earth"}},
        ice = {advantages = {"nature", "earth", "flying", "dragon"}, disadvantages = {"fire", "water"}},
        flying = {advantages = {"nature", "electric"}, disadvantages = {"ice", "electric"}},
        poison = {advantages = {"nature"}, disadvantages = {"earth", "psychic"}},
        psychic = {advantages = {"poison"}, disadvantages = {"dark"}},
        crystal = {advantages = {"ice", "flying", "fire"}, disadvantages = {"earth", "water"}},
        dark = {advantages = {"psychic"}, disadvantages = {"poison"}},
        dragon = {advantages = {"dragon"}, disadvantages = {"ice", "crystal"}}
    }
end

-- Build battle scenario weighting factors
function CreatureComparator.build_scenario_weights()
    return {
        offense_focused = {attack = 1.5, speed = 1.2, defense = 0.8, hp_max = 0.9},
        defense_focused = {defense = 1.5, hp_max = 1.3, attack = 0.8, speed = 0.9},
        speed_focused = {speed = 1.6, attack = 1.1, defense = 0.9, hp_max = 0.8},
        balanced = {attack = 1.0, defense = 1.0, speed = 1.0, hp_max = 1.0},
        endurance = {hp_max = 1.4, defense = 1.2, attack = 0.9, speed = 0.8}
    }
end

-- Compare two creatures comprehensively
function CreatureComparator:compare_creatures(agent_id, creature1_id, creature2_id, comparison_options)
    comparison_options = comparison_options or {}
    
    -- Get both creatures
    local creature1, err1 = self.creature_manager:get_creature_by_id(agent_id, creature1_id)
    local creature2, err2 = self.creature_manager:get_creature_by_id(agent_id, creature2_id)
    
    if not creature1 then
        return nil, "Creature 1 not found: " .. (err1 or "unknown error")
    end
    if not creature2 then
        return nil, "Creature 2 not found: " .. (err2 or "unknown error")
    end
    
    -- Check cache first
    local cache_key = creature1_id .. "_vs_" .. creature2_id
    if self.comparison_cache[cache_key] and 
       self.comparison_cache[cache_key].timestamp > (os.time() - 300) then  -- 5-minute cache
        return self.comparison_cache[cache_key].result
    end
    
    -- Perform comprehensive comparison
    local comparison = {
        creature1 = self:extract_creature_summary(creature1),
        creature2 = self:extract_creature_summary(creature2),
        stat_comparison = self:compare_stats(creature1, creature2),
        combat_analysis = self:analyze_combat_scenarios(creature1, creature2),
        type_effectiveness = self:analyze_type_matchup(creature1, creature2),
        strategic_analysis = self:generate_strategic_analysis(creature1, creature2),
        recommendations = self:generate_battle_recommendations(creature1, creature2),
        comparison_metadata = {
            timestamp = os.time(),
            comparison_id = cache_key,
            scenario_weights = comparison_options.scenario or "balanced"
        }
    }
    
    -- Cache the result
    self.comparison_cache[cache_key] = {
        result = comparison,
        timestamp = os.time()
    }
    
    return comparison
end

-- Extract creature summary for comparison
function CreatureComparator:extract_creature_summary(creature)
    return {
        id = creature.tuxemon_id,
        species_id = creature.species_id,
        level = creature.level,
        stats = {
            hp_max = creature.hp_max,
            hp_current = creature.hp_current,
            attack = creature.attack,
            defense = creature.defense,
            speed = creature.speed
        },
        types = {
            primary = creature.species_data and creature.species_data.type_primary or "normal",
            secondary = creature.species_data and creature.species_data.type_secondary
        },
        status_effects = creature.status_effects or {},
        individual_values = creature.individual_values or {},
        experience_points = creature.experience_points or 0
    }
end

-- Compare stats between creatures with detailed analysis
function CreatureComparator:compare_stats(creature1, creature2)
    local stats1 = {
        hp_max = creature1.hp_max,
        attack = creature1.attack,
        defense = creature1.defense,
        speed = creature1.speed
    }
    
    local stats2 = {
        hp_max = creature2.hp_max,
        attack = creature2.attack,
        defense = creature2.defense,
        speed = creature2.speed
    }
    
    -- Use StatCalculator for detailed comparison
    local raw_comparison = StatCalculator.compare_stats(stats1, stats2)
    
    -- Add percentage differences
    local percentage_differences = {}
    for stat_name, diff in pairs(raw_comparison.stat_differences) do
        local base_value = stats2[stat_name]
        if base_value > 0 then
            percentage_differences[stat_name] = (diff / base_value) * 100
        else
            percentage_differences[stat_name] = 0
        end
    end
    
    -- Calculate stat totals
    local total1 = stats1.hp_max + stats1.attack + stats1.defense + stats1.speed
    local total2 = stats2.hp_max + stats2.attack + stats2.defense + stats2.speed
    
    return {
        raw_differences = raw_comparison.stat_differences,
        percentage_differences = percentage_differences,
        creature1_advantages = raw_comparison.creature1_advantages,
        creature2_advantages = raw_comparison.creature2_advantages,
        overall_winner = raw_comparison.overall_winner,
        stat_totals = {
            creature1 = total1,
            creature2 = total2,
            difference = total1 - total2,
            percentage_difference = total2 > 0 and ((total1 - total2) / total2 * 100) or 0
        },
        stat_efficiency = {
            creature1 = creature1.level > 0 and (total1 / creature1.level) or 0,
            creature2 = creature2.level > 0 and (total2 / creature2.level) or 0
        }
    }
end

-- Analyze combat scenarios between creatures
function CreatureComparator:analyze_combat_scenarios(creature1, creature2)
    local scenarios = {}
    
    for scenario_name, weights in pairs(self.battle_scenario_weights) do
        local score1 = 0
        local score2 = 0
        
        -- Calculate weighted scores for each scenario
        for stat_name, weight in pairs(weights) do
            score1 = score1 + (creature1[stat_name] or 0) * weight
            score2 = score2 + (creature2[stat_name] or 0) * weight
        end
        
        -- Add level and health modifiers
        score1 = score1 * (creature1.level / 50) * (creature1.hp_current / creature1.hp_max)
        score2 = score2 * (creature2.level / 50) * (creature2.hp_current / creature2.hp_max)
        
        scenarios[scenario_name] = {
            creature1_score = score1,
            creature2_score = score2,
            winner = score1 > score2 and "creature1" or score2 > score1 and "creature2" or "tie",
            advantage_margin = math.abs(score1 - score2),
            confidence = self:calculate_scenario_confidence(score1, score2, scenario_name)
        }
    end
    
    return scenarios
end

-- Analyze type effectiveness matchup
function CreatureComparator:analyze_type_matchup(creature1, creature2)
    local type1_primary = creature1.species_data and creature1.species_data.type_primary or "normal"
    local type1_secondary = creature1.species_data and creature1.species_data.type_secondary
    local type2_primary = creature2.species_data and creature2.species_data.type_primary or "normal"
    local type2_secondary = creature2.species_data and creature2.species_data.type_secondary
    
    local matchup = {
        creature1_advantages = {},
        creature1_disadvantages = {},
        creature2_advantages = {},
        creature2_disadvantages = {},
        type_synergy = {
            creature1 = type1_secondary and 1.1 or 1.0,
            creature2 = type2_secondary and 1.1 or 1.0
        },
        effectiveness_rating = "neutral"
    }
    
    -- Check creature1's types vs creature2's types
    local c1_effectiveness = self:calculate_type_effectiveness(type1_primary, type1_secondary, type2_primary, type2_secondary)
    local c2_effectiveness = self:calculate_type_effectiveness(type2_primary, type2_secondary, type1_primary, type1_secondary)
    
    matchup.creature1_effectiveness = c1_effectiveness
    matchup.creature2_effectiveness = c2_effectiveness
    
    -- Determine overall matchup
    if c1_effectiveness > c2_effectiveness then
        matchup.effectiveness_rating = "creature1_advantage"
        matchup.advantage_degree = c1_effectiveness - c2_effectiveness
    elseif c2_effectiveness > c1_effectiveness then
        matchup.effectiveness_rating = "creature2_advantage"
        matchup.advantage_degree = c2_effectiveness - c1_effectiveness
    else
        matchup.effectiveness_rating = "neutral"
        matchup.advantage_degree = 0
    end
    
    return matchup
end

-- Calculate type effectiveness between two type combinations
function CreatureComparator:calculate_type_effectiveness(attacker_primary, attacker_secondary, defender_primary, defender_secondary)
    local effectiveness = 1.0
    
    -- Check primary type effectiveness
    if self.type_effectiveness_chart[attacker_primary] then
        local chart = self.type_effectiveness_chart[attacker_primary]
        
        if self:type_in_list(defender_primary, chart.advantages) then
            effectiveness = effectiveness * 2.0
        elseif self:type_in_list(defender_primary, chart.disadvantages) then
            effectiveness = effectiveness * 0.5
        end
        
        if defender_secondary and self:type_in_list(defender_secondary, chart.advantages) then
            effectiveness = effectiveness * 2.0
        elseif defender_secondary and self:type_in_list(defender_secondary, chart.disadvantages) then
            effectiveness = effectiveness * 0.5
        end
    end
    
    -- Check secondary type effectiveness if present
    if attacker_secondary and self.type_effectiveness_chart[attacker_secondary] then
        local chart = self.type_effectiveness_chart[attacker_secondary]
        local secondary_effectiveness = 1.0
        
        if self:type_in_list(defender_primary, chart.advantages) then
            secondary_effectiveness = secondary_effectiveness * 2.0
        elseif self:type_in_list(defender_primary, chart.disadvantages) then
            secondary_effectiveness = secondary_effectiveness * 0.5
        end
        
        if defender_secondary and self:type_in_list(defender_secondary, chart.advantages) then
            secondary_effectiveness = secondary_effectiveness * 2.0
        elseif defender_secondary and self:type_in_list(defender_secondary, chart.disadvantages) then
            secondary_effectiveness = secondary_effectiveness * 0.5
        end
        
        -- Average the effectiveness of both types
        effectiveness = (effectiveness + secondary_effectiveness) / 2
    end
    
    return effectiveness
end

-- Generate strategic analysis
function CreatureComparator:generate_strategic_analysis(creature1, creature2)
    local analysis = {
        level_analysis = self:analyze_level_difference(creature1, creature2),
        health_analysis = self:analyze_health_status(creature1, creature2),
        experience_analysis = self:analyze_experience_difference(creature1, creature2),
        individual_value_analysis = self:analyze_iv_quality(creature1, creature2),
        growth_potential = self:compare_growth_potential(creature1, creature2),
        strategic_roles = self:identify_strategic_roles(creature1, creature2)
    }
    
    return analysis
end

-- Generate battle recommendations
function CreatureComparator:generate_battle_recommendations(creature1, creature2)
    local recommendations = {
        preferred_choice = nil,
        confidence_level = 0,
        reasoning = {},
        tactical_advice = {},
        situational_considerations = {}
    }
    
    -- Analyze overall strength
    local total_score1 = 0
    local total_score2 = 0
    local factors_analyzed = 0
    
    -- Combat effectiveness
    local combat1 = StatCalculator.calculate_combat_effectiveness({
        attack = creature1.attack,
        defense = creature1.defense,
        speed = creature1.speed,
        hp_max = creature1.hp_max,
        hp_current = creature1.hp_current
    }, creature1.level)
    
    local combat2 = StatCalculator.calculate_combat_effectiveness({
        attack = creature2.attack,
        defense = creature2.defense,
        speed = creature2.speed,
        hp_max = creature2.hp_max,
        hp_current = creature2.hp_current
    }, creature2.level)
    
    if combat1.total_effectiveness > combat2.total_effectiveness then
        total_score1 = total_score1 + 2
        table.insert(recommendations.reasoning, "Creature 1 has higher combat effectiveness")
    elseif combat2.total_effectiveness > combat1.total_effectiveness then
        total_score2 = total_score2 + 2
        table.insert(recommendations.reasoning, "Creature 2 has higher combat effectiveness")
    end
    factors_analyzed = factors_analyzed + 1
    
    -- Level advantage
    if creature1.level > creature2.level then
        total_score1 = total_score1 + 1
        table.insert(recommendations.reasoning, "Creature 1 has level advantage")
    elseif creature2.level > creature1.level then
        total_score2 = total_score2 + 1
        table.insert(recommendations.reasoning, "Creature 2 has level advantage")
    end
    factors_analyzed = factors_analyzed + 1
    
    -- Health status
    local health1_pct = creature1.hp_current / creature1.hp_max
    local health2_pct = creature2.hp_current / creature2.hp_max
    
    if health1_pct > health2_pct + 0.2 then
        total_score1 = total_score1 + 1
        table.insert(recommendations.reasoning, "Creature 1 has better health status")
    elseif health2_pct > health1_pct + 0.2 then
        total_score2 = total_score2 + 1
        table.insert(recommendations.reasoning, "Creature 2 has better health status")
    end
    factors_analyzed = factors_analyzed + 1
    
    -- Determine recommendation
    if total_score1 > total_score2 then
        recommendations.preferred_choice = "creature1"
        recommendations.confidence_level = math.min(90, (total_score1 / factors_analyzed) * 30)
    elseif total_score2 > total_score1 then
        recommendations.preferred_choice = "creature2"
        recommendations.confidence_level = math.min(90, (total_score2 / factors_analyzed) * 30)
    else
        recommendations.preferred_choice = "either"
        recommendations.confidence_level = 50
        table.insert(recommendations.reasoning, "Both creatures are roughly equivalent")
    end
    
    -- Add tactical advice
    self:add_tactical_advice(recommendations, creature1, creature2)
    
    return recommendations
end

-- Helper functions
function CreatureComparator:type_in_list(type_name, type_list)
    if not type_list then return false end
    for _, t in ipairs(type_list) do
        if t == type_name then
            return true
        end
    end
    return false
end

function CreatureComparator:calculate_scenario_confidence(score1, score2, scenario)
    local total_score = score1 + score2
    if total_score == 0 then return 50 end
    
    local difference = math.abs(score1 - score2)
    local relative_difference = difference / total_score
    
    -- Higher relative difference means higher confidence
    return math.min(95, 50 + (relative_difference * 100))
end

function CreatureComparator:analyze_level_difference(creature1, creature2)
    local diff = creature1.level - creature2.level
    return {
        level_difference = diff,
        advantage = diff > 0 and "creature1" or diff < 0 and "creature2" or "equal",
        significance = math.abs(diff) > 5 and "significant" or math.abs(diff) > 2 and "moderate" or "minor"
    }
end

function CreatureComparator:analyze_health_status(creature1, creature2)
    local health1 = creature1.hp_current / creature1.hp_max
    local health2 = creature2.hp_current / creature2.hp_max
    
    return {
        creature1_health_percentage = health1 * 100,
        creature2_health_percentage = health2 * 100,
        health_advantage = health1 > health2 and "creature1" or health2 > health1 and "creature2" or "equal",
        battle_readiness = {
            creature1 = health1 > 0.75 and "excellent" or health1 > 0.5 and "good" or health1 > 0.25 and "poor" or "critical",
            creature2 = health2 > 0.75 and "excellent" or health2 > 0.5 and "good" or health2 > 0.25 and "poor" or "critical"
        }
    }
end

function CreatureComparator:analyze_experience_difference(creature1, creature2)
    local exp1 = creature1.experience_points or 0
    local exp2 = creature2.experience_points or 0
    
    return {
        experience_difference = exp1 - exp2,
        relative_experience = {
            creature1 = creature1.level > 0 and (exp1 / creature1.level) or 0,
            creature2 = creature2.level > 0 and (exp2 / creature2.level) or 0
        }
    }
end

function CreatureComparator:analyze_iv_quality(creature1, creature2)
    local iv1_quality = StatCalculator.rate_iv_quality(creature1.individual_values or {})
    local iv2_quality = StatCalculator.rate_iv_quality(creature2.individual_values or {})
    
    return {
        creature1_iv_rating = iv1_quality,
        creature2_iv_rating = iv2_quality,
        iv_advantage = iv1_quality > iv2_quality and "creature1" or iv2_quality > iv1_quality and "creature2" or "equal"
    }
end

function CreatureComparator:compare_growth_potential(creature1, creature2)
    -- Simplified growth potential comparison
    local potential1 = (100 - creature1.level) * 2
    local potential2 = (100 - creature2.level) * 2
    
    return {
        creature1_growth_potential = potential1,
        creature2_growth_potential = potential2,
        better_investment = potential1 > potential2 and "creature1" or potential2 > potential1 and "creature2" or "equal"
    }
end

function CreatureComparator:identify_strategic_roles(creature1, creature2)
    return {
        creature1_role = self:determine_creature_role(creature1),
        creature2_role = self:determine_creature_role(creature2),
        role_complementarity = "analysis_placeholder"  -- Future enhancement
    }
end

function CreatureComparator:determine_creature_role(creature)
    local attack_ratio = creature.attack / (creature.attack + creature.defense + creature.speed + creature.hp_max)
    local defense_ratio = (creature.defense + creature.hp_max) / (creature.attack + creature.defense + creature.speed + creature.hp_max)
    local speed_ratio = creature.speed / (creature.attack + creature.defense + creature.speed + creature.hp_max)
    
    if attack_ratio > 0.4 then
        return "attacker"
    elseif defense_ratio > 0.5 then
        return "tank"
    elseif speed_ratio > 0.3 then
        return "speed_control"
    else
        return "balanced"
    end
end

function CreatureComparator:add_tactical_advice(recommendations, creature1, creature2)
    -- Add generic tactical advice
    table.insert(recommendations.tactical_advice, "Consider type advantages in battle")
    table.insert(recommendations.tactical_advice, "Monitor health status before important battles")
    table.insert(recommendations.tactical_advice, "Level up weaker creatures for better balance")
    
    -- Add situational considerations
    table.insert(recommendations.situational_considerations, "Battle scenario affects optimal choice")
    table.insert(recommendations.situational_considerations, "Team composition should be considered")
end

return CreatureComparator