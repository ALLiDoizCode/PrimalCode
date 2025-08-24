-- Creature Progression Management System
-- Experience tracking, level advancement, and progression analysis
-- Implements Story 4.4 requirements for creature level and progression tracking

local ProcessBase = require('shared.utils.process-base')
local HandlerMetadata = require('shared.utils.handler-metadata')
local MessageLogger = require('shared.utils.message-logger')
local SeededRNG = require('shared.utils.seeded-rng')

local CreatureProgression = {}

-- Initialize creature progression management system
function CreatureProgression.initialize(captured_creature_manager)
    local self = {
        creature_manager = captured_creature_manager,
        experience_curves = CreatureProgression.build_experience_curves(),
        level_progression_data = CreatureProgression.build_level_progression(),
        milestone_rewards = CreatureProgression.build_milestone_rewards(),
        evolution_requirements = CreatureProgression.build_evolution_requirements(),
        progression_cache = {}
    }
    return setmetatable(self, {__index = CreatureProgression})
end

-- Build experience curve formulas
function CreatureProgression.build_experience_curves()
    return {
        fast = {
            formula = function(level) return math.floor((4 * level ^ 3) / 5) end,
            description = "Quick leveling for early game creatures",
            multiplier = 0.8
        },
        medium_fast = {
            formula = function(level) return level ^ 3 end,
            description = "Standard leveling curve",
            multiplier = 1.0
        },
        medium_slow = {
            formula = function(level) 
                return math.floor((6 * level ^ 3 / 5) - (15 * level ^ 2) + (100 * level) - 140)
            end,
            description = "Slower progression for powerful creatures",
            multiplier = 1.2
        },
        slow = {
            formula = function(level) return math.floor((5 * level ^ 3) / 4) end,
            description = "Very slow progression for legendary creatures",
            multiplier = 1.5
        },
        fluctuating = {
            formula = function(level)
                if level <= 15 then
                    return math.floor((level ^ 3 * ((24 + ((level + 1) / 3))) / 50))
                elseif level <= 35 then
                    return math.floor((level ^ 3 * ((14 + level) / 50)))
                else
                    return math.floor((level ^ 3 * ((32 + (level / 2))) / 50))
                end
            end,
            description = "Variable progression rate",
            multiplier = 1.1
        }
    }
end

-- Build level progression data
function CreatureProgression.build_level_progression()
    return {
        max_level = 100,
        stat_growth_per_level = {
            hp = {base = 2, variance = 1},
            attack = {base = 1.5, variance = 1},
            defense = {base = 1.5, variance = 1},
            speed = {base = 1, variance = 1}
        },
        milestone_levels = {5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100},
        evolution_check_levels = {16, 18, 20, 22, 25, 28, 30, 32, 35, 40, 45, 50}
    }
end

-- Build milestone reward system
function CreatureProgression.build_milestone_rewards()
    return {
        [5] = {type = "stat_boost", description = "Early development bonus"},
        [10] = {type = "ability_unlock", description = "Basic ability mastery"},
        [15] = {type = "stat_boost", description = "Adolescent growth spurt"},
        [20] = {type = "evolution_check", description = "Evolution potential assessment"},
        [25] = {type = "stat_specialization", description = "Specialized development"},
        [30] = {type = "ability_unlock", description = "Advanced ability access"},
        [40] = {type = "stat_boost", description = "Maturity bonus"},
        [50] = {type = "mastery_unlock", description = "Combat mastery achieved"},
        [75] = {type = "legendary_potential", description = "Exceptional creature development"},
        [100] = {type = "ultimate_mastery", description = "Peak potential reached"}
    }
end

-- Build evolution requirements system
function CreatureProgression.build_evolution_requirements()
    return {
        level_based = {
            min_level_check = true,
            stat_threshold_check = true,
            friendship_requirement = false
        },
        condition_based = {
            time_of_day = false,
            location_requirement = false,
            item_requirement = false,
            battle_experience = true
        }
    }
end

-- Award experience to creature and handle level ups
function CreatureProgression:award_experience(agent_id, creature_id, experience_amount, experience_source)
    local creature, err = self.creature_manager:get_creature_by_id(agent_id, creature_id)
    if not creature then
        return false, err
    end
    
    local old_level = creature.level
    local old_experience = creature.experience_points or 0
    local new_experience = old_experience + experience_amount
    
    -- Calculate new level based on experience
    local experience_curve = self:get_creature_experience_curve(creature)
    local new_level = self:calculate_level_from_experience(new_experience, experience_curve)
    
    -- Cap at max level
    new_level = math.min(new_level, self.level_progression_data.max_level)
    
    -- Update creature experience
    creature.experience_points = new_experience
    
    local level_up_data = nil
    
    -- Handle level ups
    if new_level > old_level then
        level_up_data = self:process_level_up(creature, old_level, new_level)
        creature.level = new_level
        
        -- Update creature stats in the manager
        self.creature_manager:update_creature_stats(agent_id, creature_id, {
            level = new_level,
            experience_points = new_experience,
            hp_max = level_up_data.new_stats.hp_max,
            attack = level_up_data.new_stats.attack,
            defense = level_up_data.new_stats.defense,
            speed = level_up_data.new_stats.speed,
            hp_current = level_up_data.new_stats.hp_max  -- Full heal on level up
        })
        
        MessageLogger:info("Creature leveled up", {
            agent_id = agent_id,
            creature_id = creature_id
        }, {
            old_level = old_level,
            new_level = new_level,
            experience_gained = experience_amount,
            source = experience_source
        })
    else
        -- Just update experience without level up
        self.creature_manager:update_creature_stats(agent_id, creature_id, {
            experience_points = new_experience
        })
    end
    
    return {
        success = true,
        experience_awarded = experience_amount,
        old_experience = old_experience,
        new_experience = new_experience,
        old_level = old_level,
        new_level = new_level,
        leveled_up = new_level > old_level,
        level_up_data = level_up_data,
        progression_analysis = self:analyze_progression_state(creature, new_level, new_experience)
    }
end

-- Process creature level up with stat increases and rewards
function CreatureProgression:process_level_up(creature, old_level, new_level)
    local levels_gained = new_level - old_level
    local stat_increases = {}
    local milestone_rewards = {}
    local evolution_check = nil
    
    -- Calculate stat increases with individual variation
    local seed = string.len(creature.tuxemon_id) + new_level
    local rng = SeededRNG.new(seed)
    
    local new_stats = {
        hp_max = creature.hp_max or 50,
        attack = creature.attack or 30,
        defense = creature.defense or 25,
        speed = creature.speed or 35
    }
    
    for level = old_level + 1, new_level do
        -- Calculate stat growth for each level
        for stat_name, growth_data in pairs(self.level_progression_data.stat_growth_per_level) do
            local base_increase = growth_data.base
            local variance = rng:next(0, growth_data.variance)
            local increase = math.floor(base_increase + variance)
            
            if stat_name == "hp" then
                local old_hp_max = new_stats.hp_max
                new_stats.hp_max = new_stats.hp_max + increase
                stat_increases[stat_name] = (stat_increases[stat_name] or 0) + (new_stats.hp_max - old_hp_max)
            else
                new_stats[stat_name] = new_stats[stat_name] + increase
                stat_increases[stat_name] = (stat_increases[stat_name] or 0) + increase
            end
        end
        
        -- Check for milestone rewards
        if self.milestone_rewards[level] then
            table.insert(milestone_rewards, {
                level = level,
                reward = self.milestone_rewards[level]
            })
        end
        
        -- Check for evolution possibility
        if self:table_contains(self.level_progression_data.evolution_check_levels, level) then
            evolution_check = self:check_evolution_eligibility(creature, level)
        end
    end
    
    return {
        levels_gained = levels_gained,
        stat_increases = stat_increases,
        new_stats = new_stats,
        milestone_rewards = milestone_rewards,
        evolution_check = evolution_check,
        level_up_timestamp = os.time()
    }
end

-- Calculate level from total experience points
function CreatureProgression:calculate_level_from_experience(total_experience, experience_curve)
    experience_curve = experience_curve or self.experience_curves.medium_fast
    
    for level = 1, self.level_progression_data.max_level do
        local exp_for_level = experience_curve.formula(level)
        if total_experience < exp_for_level then
            return level - 1
        end
    end
    
    return self.level_progression_data.max_level
end

-- Get creature's experience curve type
function CreatureProgression:get_creature_experience_curve(creature)
    -- In a full implementation, this would be based on species data
    -- For now, using a simple mapping based on species characteristics
    local species_id = creature.species_id
    
    if species_id:find("legendary") or species_id:find("rare") then
        return self.experience_curves.slow
    elseif species_id:find("dragon") or species_id:find("crystal") then
        return self.experience_curves.medium_slow
    elseif species_id:find("common") or species_id:find("basic") then
        return self.experience_curves.fast
    else
        return self.experience_curves.medium_fast
    end
end

-- Analyze creature progression state
function CreatureProgression:analyze_progression_state(creature, current_level, current_experience)
    local experience_curve = self:get_creature_experience_curve(creature)
    local exp_for_current_level = current_level > 1 and experience_curve.formula(current_level) or 0
    local exp_for_next_level = experience_curve.formula(current_level + 1)
    
    local analysis = {
        current_level = current_level,
        current_experience = current_experience,
        experience_curve_type = self:get_curve_name(experience_curve),
        level_progress = {
            experience_for_current_level = exp_for_current_level,
            experience_for_next_level = exp_for_next_level,
            experience_in_current_level = current_experience - exp_for_current_level,
            experience_needed_for_next = exp_for_next_level - current_experience,
            progress_percentage = 0
        },
        progression_rate = self:calculate_progression_rate(creature),
        milestones = self:get_upcoming_milestones(current_level),
        evolution_analysis = self:analyze_evolution_potential(creature, current_level),
        long_term_projections = self:calculate_long_term_projections(creature, current_level, current_experience)
    }
    
    -- Calculate progress percentage
    local level_exp_range = exp_for_next_level - exp_for_current_level
    if level_exp_range > 0 then
        analysis.level_progress.progress_percentage = 
            (analysis.level_progress.experience_in_current_level / level_exp_range) * 100
    end
    
    return analysis
end

-- Calculate progression rate analysis
function CreatureProgression:calculate_progression_rate(creature)
    local current_level = creature.level
    local experience_per_level = (creature.experience_points or 0) / math.max(1, current_level)
    
    -- Estimate battles/activities needed for next level
    local experience_curve = self:get_creature_experience_curve(creature)
    local exp_for_next = experience_curve.formula(current_level + 1)
    local exp_current = experience_curve.formula(current_level)
    local exp_needed = exp_for_next - (creature.experience_points or 0)
    
    -- Assume average experience per battle (this could be made more sophisticated)
    local avg_exp_per_battle = math.max(10, current_level * 2)
    local battles_to_next_level = math.ceil(exp_needed / avg_exp_per_battle)
    
    return {
        experience_per_level = experience_per_level,
        battles_to_next_level = battles_to_next_level,
        progression_efficiency = current_level > 0 and (experience_per_level / current_level) or 0,
        progression_tier = self:classify_progression_rate(experience_per_level, current_level)
    }
end

-- Get upcoming milestone information
function CreatureProgression:get_upcoming_milestones(current_level)
    local upcoming = {}
    
    for _, milestone_level in ipairs(self.level_progression_data.milestone_levels) do
        if milestone_level > current_level then
            table.insert(upcoming, {
                level = milestone_level,
                levels_away = milestone_level - current_level,
                reward = self.milestone_rewards[milestone_level]
            })
            
            -- Only show next 3 milestones
            if #upcoming >= 3 then
                break
            end
        end
    end
    
    return upcoming
end

-- Analyze evolution potential
function CreatureProgression:analyze_evolution_potential(creature, current_level)
    -- In full implementation, this would check species evolution data
    local analysis = {
        can_evolve = false,
        evolution_requirements_met = {},
        evolution_requirements_pending = {},
        estimated_evolution_level = nil,
        evolution_species = nil
    }
    
    -- Simplified evolution check based on level thresholds
    local common_evolution_levels = {16, 18, 20, 25, 30, 35, 40}
    
    for _, evolution_level in ipairs(common_evolution_levels) do
        if current_level >= evolution_level - 2 and current_level < evolution_level + 5 then
            analysis.estimated_evolution_level = evolution_level
            analysis.can_evolve = current_level >= evolution_level
            
            if analysis.can_evolve then
                table.insert(analysis.evolution_requirements_met, "Level requirement satisfied")
                analysis.evolution_species = creature.species_id .. "_evolved"
            else
                table.insert(analysis.evolution_requirements_pending, 
                    string.format("Reach level %d (%d levels remaining)", 
                    evolution_level, evolution_level - current_level))
            end
            break
        end
    end
    
    return analysis
end

-- Calculate long-term progression projections
function CreatureProgression:calculate_long_term_projections(creature, current_level, current_experience)
    local projections = {}
    local experience_curve = self:get_creature_experience_curve(creature)
    local target_levels = {current_level + 10, current_level + 25, 50, 75, 100}
    
    for _, target_level in ipairs(target_levels) do
        if target_level > current_level and target_level <= self.level_progression_data.max_level then
            local exp_needed = experience_curve.formula(target_level) - current_experience
            
            projections[tostring(target_level)] = {
                target_level = target_level,
                experience_required = exp_needed,
                levels_to_gain = target_level - current_level,
                estimated_battles = math.ceil(exp_needed / math.max(10, current_level * 2)),
                potential_stat_gains = self:estimate_stat_gains(creature, current_level, target_level)
            }
        end
    end
    
    return projections
end

-- Check evolution eligibility
function CreatureProgression:check_evolution_eligibility(creature, level)
    -- Simplified evolution check
    return {
        eligible = level >= 16 and (level % 8 == 0),  -- Example: evolve at levels 16, 24, 32, etc.
        requirements_met = {"Level requirement"},
        requirements_pending = {},
        confidence = level >= 16 and 85 or 15
    }
end

-- Estimate stat gains for level progression
function CreatureProgression:estimate_stat_gains(creature, current_level, target_level)
    local levels_to_gain = target_level - current_level
    local estimated_gains = {}
    
    for stat_name, growth_data in pairs(self.level_progression_data.stat_growth_per_level) do
        estimated_gains[stat_name] = math.floor(growth_data.base * levels_to_gain)
    end
    
    return estimated_gains
end

-- Create handler for progression tracking queries
function CreatureProgression:create_progression_query_handler()
    return HandlerMetadata.create_handler("query-creature-progression", {
        action = "Query-Creature-Progression",
        description = "Get comprehensive creature progression analysis and projections",
        category = "creature_progression",
        version = "1.0",
        tags = {
            {
                name = "Creature-Id",
                type = "string",
                required = true,
                description = "ID of the creature to analyze progression for"
            },
            {
                name = "Include-Projections",
                type = "boolean",
                required = false,
                description = "Whether to include long-term progression projections"
            }
        },
        input_schema = {
            required_tags = {"Action", "Creature-Id"},
            optional_tags = {"Include-Projections"}
        },
        output_schema = {
            response_action = "Creature-Progression-Response",
            data_example = {
                creature_id = "creature_123",
                current_progression = {},
                level_progress = {},
                milestones = {},
                evolution_analysis = {},
                projections = {}
            }
        }
    }, function(msg)
        local agent_id = msg.From
        local creature_id = msg.Tags["Creature-Id"]
        local include_projections = msg.Tags["Include-Projections"] == "true"
        
        if not creature_id then
            local response = ProcessBase.create_error_response(
                msg.From,
                "VALIDATION_ERROR",
                "Creature-Id is required"
            )
            ao.send(response)
            return
        end
        
        local creature, err = self.creature_manager:get_creature_by_id(agent_id, creature_id)
        if not creature then
            local response = ProcessBase.create_error_response(
                msg.From,
                "CREATURE_NOT_FOUND",
                err or "Creature not found"
            )
            ao.send(response)
            return
        end
        
        local progression_analysis = self:analyze_progression_state(
            creature, 
            creature.level, 
            creature.experience_points or 0
        )
        
        local response_data = {
            creature_id = creature_id,
            current_progression = progression_analysis,
            experience_curve = progression_analysis.experience_curve_type,
            timestamp = os.time()
        }
        
        if include_projections then
            response_data.long_term_projections = progression_analysis.long_term_projections
        end
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Creature-Progression-Response",
            response_data
        )
        ao.send(response)
    end)
end

-- Helper functions
function CreatureProgression:get_curve_name(experience_curve)
    for curve_name, curve_data in pairs(self.experience_curves) do
        if curve_data == experience_curve then
            return curve_name
        end
    end
    return "unknown"
end

function CreatureProgression:classify_progression_rate(experience_per_level, current_level)
    local ratio = current_level > 0 and (experience_per_level / current_level) or 0
    
    if ratio > 15 then
        return "excellent"
    elseif ratio > 10 then
        return "good"
    elseif ratio > 7 then
        return "average"
    elseif ratio > 4 then
        return "below_average"
    else
        return "poor"
    end
end

function CreatureProgression:table_contains(table, value)
    for _, v in pairs(table) do
        if v == value then
            return true
        end
    end
    return false
end

return CreatureProgression