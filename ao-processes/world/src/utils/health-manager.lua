-- Health Manager Utility
-- Comprehensive health tracking, combat readiness assessment, and healing management
-- Implements Story 4.4 requirements for health management and combat readiness system

local ProcessBase = require('shared.utils.process-base')
local HandlerMetadata = require('shared.utils.handler-metadata')

local HealthManager = {}

-- Initialize health management system
function HealthManager.new(captured_creature_manager)
    local self = {
        creature_manager = captured_creature_manager,
        healing_items = HealthManager.build_healing_items(),
        status_effects = HealthManager.build_status_effects(),
        health_thresholds = HealthManager.build_health_thresholds(),
        recovery_rates = HealthManager.build_recovery_rates(),
        battle_readiness_cache = {}
    }
    return setmetatable(self, {__index = HealthManager})
end

-- Build healing items database
function HealthManager.build_healing_items()
    return {
        potion = {
            name = "Potion",
            heal_amount = 20,
            heal_type = "fixed",
            cost = 10,
            availability = "common"
        },
        super_potion = {
            name = "Super Potion",
            heal_amount = 50,
            heal_type = "fixed",
            cost = 25,
            availability = "uncommon"
        },
        hyper_potion = {
            name = "Hyper Potion",
            heal_amount = 100,
            heal_type = "fixed",
            cost = 50,
            availability = "rare"
        },
        max_potion = {
            name = "Max Potion",
            heal_amount = 1.0,
            heal_type = "percentage",
            cost = 100,
            availability = "very_rare"
        },
        berry_heal = {
            name = "Healing Berry",
            heal_amount = 0.25,
            heal_type = "percentage",
            cost = 5,
            availability = "common",
            natural_recovery = true
        },
        revive = {
            name = "Revive",
            heal_amount = 0.5,
            heal_type = "percentage",
            cost = 75,
            availability = "rare",
            revives_fainted = true
        }
    }
end

-- Build status effects database
function HealthManager.build_status_effects()
    return {
        burn = {
            name = "Burn",
            hp_drain_per_turn = 0.125,  -- 12.5% of max HP per turn
            stat_effects = {attack = 0.5},
            recovery_chance_per_turn = 0.1,
            blocks_healing = false,
            battle_impact = "high"
        },
        poison = {
            name = "Poison",
            hp_drain_per_turn = 0.125,
            stat_effects = {},
            recovery_chance_per_turn = 0.15,
            blocks_healing = false,
            battle_impact = "medium"
        },
        paralysis = {
            name = "Paralysis",
            hp_drain_per_turn = 0,
            stat_effects = {speed = 0.25},
            recovery_chance_per_turn = 0.2,
            action_block_chance = 0.25,
            battle_impact = "high"
        },
        sleep = {
            name = "Sleep",
            hp_drain_per_turn = 0,
            stat_effects = {attack = 0, defense = 0, speed = 0},
            recovery_chance_per_turn = 0.33,
            action_block_chance = 1.0,
            battle_impact = "critical"
        },
        freeze = {
            name = "Freeze",
            hp_drain_per_turn = 0,
            stat_effects = {speed = 0},
            recovery_chance_per_turn = 0.1,
            action_block_chance = 1.0,
            battle_impact = "critical"
        },
        confusion = {
            name = "Confusion",
            hp_drain_per_turn = 0,
            stat_effects = {},
            recovery_chance_per_turn = 0.25,
            self_damage_chance = 0.33,
            battle_impact = "medium"
        }
    }
end

-- Build health threshold definitions
function HealthManager.build_health_thresholds()
    return {
        critical = 0.15,    -- 15% or below - critical condition
        low = 0.35,         -- 35% or below - low health
        moderate = 0.60,    -- 60% or below - moderate health
        good = 0.85,        -- 85% or below - good health
        excellent = 1.0     -- Above 85% - excellent health
    }
end

-- Build natural recovery rates
function HealthManager.build_recovery_rates()
    return {
        rest_recovery_per_hour = 0.05,    -- 5% of max HP per hour of rest
        active_recovery_per_hour = 0.02,  -- 2% of max HP per hour while active
        battle_recovery_per_hour = 0.0,   -- No recovery during battle
        status_effect_recovery_base = 0.1, -- Base chance to recover from status per hour
        location_modifiers = {
            healing_center = 3.0,  -- 3x recovery rate
            forest = 1.2,          -- 20% bonus in natural areas
            cave = 0.8,            -- 20% penalty in harsh environments
            battle_arena = 0.5     -- 50% penalty in combat zones
        }
    }
end

-- Analyze creature health status comprehensively
function HealthManager:analyze_health_status(agent_id, creature_id)
    local creature, err = self.creature_manager:get_creature_by_id(agent_id, creature_id)
    if not creature then
        return nil, err
    end
    
    local health_percentage = creature.hp_current / creature.hp_max
    local status_effects = creature.status_effects or {}
    
    local analysis = {
        creature_id = creature_id,
        health_stats = {
            current_hp = creature.hp_current,
            max_hp = creature.hp_max,
            health_percentage = health_percentage * 100,
            hp_missing = creature.hp_max - creature.hp_current
        },
        health_status = self:determine_health_status(health_percentage),
        combat_readiness = self:assess_combat_readiness(creature, health_percentage, status_effects),
        status_effects_analysis = self:analyze_status_effects(status_effects),
        healing_recommendations = self:generate_healing_recommendations(creature, health_percentage, status_effects),
        recovery_projections = self:calculate_recovery_projections(creature, health_percentage),
        battle_impact_assessment = self:assess_battle_impact(creature, health_percentage, status_effects),
        timestamp = os.time()
    }
    
    return analysis
end

-- Determine health status category
function HealthManager:determine_health_status(health_percentage)
    if health_percentage <= 0 then
        return {
            status = "fainted",
            description = "Creature is unable to battle",
            severity = "critical",
            action_required = "revival"
        }
    elseif health_percentage <= self.health_thresholds.critical then
        return {
            status = "critical",
            description = "Immediate healing required",
            severity = "critical",
            action_required = "immediate_healing"
        }
    elseif health_percentage <= self.health_thresholds.low then
        return {
            status = "low",
            description = "Health is concerning, healing recommended",
            severity = "high",
            action_required = "healing_recommended"
        }
    elseif health_percentage <= self.health_thresholds.moderate then
        return {
            status = "moderate",
            description = "Health is acceptable for non-critical battles",
            severity = "medium",
            action_required = "monitor"
        }
    elseif health_percentage <= self.health_thresholds.good then
        return {
            status = "good",
            description = "Health is good for most activities",
            severity = "low",
            action_required = "none"
        }
    else
        return {
            status = "excellent",
            description = "Creature is in peak condition",
            severity = "none",
            action_required = "none"
        }
    end
end

-- Assess combat readiness
function HealthManager:assess_combat_readiness(creature, health_percentage, status_effects)
    local readiness_score = 100
    local readiness_factors = {}
    
    -- Health impact on readiness
    if health_percentage <= 0 then
        readiness_score = 0
        table.insert(readiness_factors, "Creature is fainted")
    elseif health_percentage <= self.health_thresholds.critical then
        readiness_score = readiness_score * 0.3
        table.insert(readiness_factors, "Critical health severely limits combat ability")
    elseif health_percentage <= self.health_thresholds.low then
        readiness_score = readiness_score * 0.6
        table.insert(readiness_factors, "Low health reduces combat effectiveness")
    elseif health_percentage <= self.health_thresholds.moderate then
        readiness_score = readiness_score * 0.8
        table.insert(readiness_factors, "Moderate health allows cautious combat")
    end
    
    -- Status effect impact
    local status_penalty = 0
    for _, effect in ipairs(status_effects) do
        if self.status_effects[effect] then
            local effect_data = self.status_effects[effect]
            if effect_data.battle_impact == "critical" then
                status_penalty = status_penalty + 40
                table.insert(readiness_factors, effect_data.name .. " severely impairs battle ability")
            elseif effect_data.battle_impact == "high" then
                status_penalty = status_penalty + 25
                table.insert(readiness_factors, effect_data.name .. " significantly affects combat")
            elseif effect_data.battle_impact == "medium" then
                status_penalty = status_penalty + 15
                table.insert(readiness_factors, effect_data.name .. " moderately impacts performance")
            end
        end
    end
    
    readiness_score = math.max(0, readiness_score - status_penalty)
    
    -- Determine readiness category
    local readiness_category
    if readiness_score >= 90 then
        readiness_category = "excellent"
    elseif readiness_score >= 75 then
        readiness_category = "good"
    elseif readiness_score >= 50 then
        readiness_category = "fair"
    elseif readiness_score >= 25 then
        readiness_category = "poor"
    else
        readiness_category = "not_ready"
    end
    
    return {
        readiness_score = readiness_score,
        readiness_category = readiness_category,
        battle_ready = readiness_score >= 50,
        factors_affecting_readiness = readiness_factors,
        recommended_actions = self:get_readiness_recommendations(readiness_category, status_effects)
    }
end

-- Analyze status effects
function HealthManager:analyze_status_effects(status_effects)
    local analysis = {
        active_effects = {},
        total_effects = #status_effects,
        severity_assessment = "none",
        combined_impact = {
            hp_drain_per_turn = 0,
            stat_modifications = {},
            action_restrictions = {}
        }
    }
    
    local severity_score = 0
    
    for _, effect in ipairs(status_effects) do
        if self.status_effects[effect] then
            local effect_data = self.status_effects[effect]
            
            table.insert(analysis.active_effects, {
                name = effect_data.name,
                impact = effect_data.battle_impact,
                hp_drain = effect_data.hp_drain_per_turn,
                recovery_chance = effect_data.recovery_chance_per_turn
            })
            
            -- Accumulate combined effects
            analysis.combined_impact.hp_drain_per_turn = 
                analysis.combined_impact.hp_drain_per_turn + effect_data.hp_drain_per_turn
            
            -- Combine stat modifications
            for stat, modifier in pairs(effect_data.stat_effects or {}) do
                if not analysis.combined_impact.stat_modifications[stat] then
                    analysis.combined_impact.stat_modifications[stat] = 1.0
                end
                analysis.combined_impact.stat_modifications[stat] = 
                    analysis.combined_impact.stat_modifications[stat] * modifier
            end
            
            -- Track action restrictions
            if effect_data.action_block_chance and effect_data.action_block_chance > 0 then
                table.insert(analysis.combined_impact.action_restrictions, {
                    effect = effect,
                    block_chance = effect_data.action_block_chance
                })
            end
            
            -- Calculate severity
            if effect_data.battle_impact == "critical" then
                severity_score = severity_score + 3
            elseif effect_data.battle_impact == "high" then
                severity_score = severity_score + 2
            elseif effect_data.battle_impact == "medium" then
                severity_score = severity_score + 1
            end
        end
    end
    
    -- Determine overall severity
    if severity_score >= 3 then
        analysis.severity_assessment = "severe"
    elseif severity_score >= 2 then
        analysis.severity_assessment = "moderate"
    elseif severity_score >= 1 then
        analysis.severity_assessment = "mild"
    else
        analysis.severity_assessment = "none"
    end
    
    return analysis
end

-- Generate healing recommendations
function HealthManager:generate_healing_recommendations(creature, health_percentage, status_effects)
    local recommendations = {
        immediate_actions = {},
        healing_items = {},
        strategic_advice = {},
        priority_level = "none"
    }
    
    local hp_missing = creature.hp_max - creature.hp_current
    
    -- Determine healing priority
    if health_percentage <= 0 then
        recommendations.priority_level = "emergency"
        table.insert(recommendations.immediate_actions, "Revive creature immediately")
        recommendations.healing_items = {"revive"}
    elseif health_percentage <= self.health_thresholds.critical then
        recommendations.priority_level = "urgent"
        table.insert(recommendations.immediate_actions, "Heal immediately before any activity")
        
        -- Recommend appropriate healing items
        if hp_missing <= 20 then
            table.insert(recommendations.healing_items, "potion")
        elseif hp_missing <= 50 then
            table.insert(recommendations.healing_items, "super_potion")
        else
            table.insert(recommendations.healing_items, "hyper_potion")
            table.insert(recommendations.healing_items, "max_potion")
        end
    elseif health_percentage <= self.health_thresholds.low then
        recommendations.priority_level = "high"
        table.insert(recommendations.immediate_actions, "Heal before challenging encounters")
        
        if hp_missing <= 50 then
            table.insert(recommendations.healing_items, "super_potion")
        else
            table.insert(recommendations.healing_items, "hyper_potion")
        end
    elseif health_percentage <= self.health_thresholds.moderate then
        recommendations.priority_level = "medium"
        table.insert(recommendations.strategic_advice, "Consider healing before important battles")
        table.insert(recommendations.healing_items, "potion")
        table.insert(recommendations.healing_items, "berry_heal")
    end
    
    -- Status effect specific recommendations
    for _, effect in ipairs(status_effects) do
        if effect == "burn" or effect == "poison" then
            table.insert(recommendations.immediate_actions, "Address " .. effect .. " to prevent HP drain")
            recommendations.priority_level = "high"
        elseif effect == "sleep" or effect == "freeze" then
            table.insert(recommendations.immediate_actions, "Cure " .. effect .. " before battle")
            recommendations.priority_level = "urgent"
        end
    end
    
    -- Add general strategic advice
    table.insert(recommendations.strategic_advice, "Monitor health regularly during exploration")
    table.insert(recommendations.strategic_advice, "Keep healing items in inventory")
    
    return recommendations
end

-- Calculate recovery projections
function HealthManager:calculate_recovery_projections(creature, health_percentage)
    local projections = {
        natural_recovery = {},
        with_items = {},
        time_to_full_health = {}
    }
    
    local hp_missing = creature.hp_max - creature.hp_current
    local base_recovery_rate = self.recovery_rates.rest_recovery_per_hour
    
    -- Natural recovery projections
    if hp_missing > 0 then
        local hours_to_full = hp_missing / (creature.hp_max * base_recovery_rate)
        projections.natural_recovery = {
            time_to_full_health_hours = hours_to_full,
            hp_per_hour = creature.hp_max * base_recovery_rate,
            recovery_method = "natural_rest"
        }
    end
    
    -- Item-based recovery projections
    for item_id, item_data in pairs(self.healing_items) do
        local heal_amount
        if item_data.heal_type == "percentage" then
            heal_amount = creature.hp_max * item_data.heal_amount
        else
            heal_amount = item_data.heal_amount
        end
        
        local items_needed = math.ceil(hp_missing / heal_amount)
        projections.with_items[item_id] = {
            heal_amount = heal_amount,
            items_needed = items_needed,
            total_cost = items_needed * item_data.cost,
            immediate_recovery = items_needed == 1
        }
    end
    
    return projections
end

-- Assess battle impact
function HealthManager:assess_battle_impact(creature, health_percentage, status_effects)
    local impact = {
        can_participate = health_percentage > 0,
        effectiveness_reduction = 0,
        risk_factors = {},
        battle_duration_limit = "unlimited",
        tactical_considerations = {}
    }
    
    -- Health-based effectiveness reduction
    if health_percentage <= self.health_thresholds.critical then
        impact.effectiveness_reduction = 70
        table.insert(impact.risk_factors, "High chance of fainting early in battle")
        impact.battle_duration_limit = "very_short"
    elseif health_percentage <= self.health_thresholds.low then
        impact.effectiveness_reduction = 40
        table.insert(impact.risk_factors, "Reduced survivability in prolonged combat")
        impact.battle_duration_limit = "short"
    elseif health_percentage <= self.health_thresholds.moderate then
        impact.effectiveness_reduction = 20
        impact.battle_duration_limit = "moderate"
    end
    
    -- Status effect impact
    for _, effect in ipairs(status_effects) do
        if self.status_effects[effect] then
            local effect_data = self.status_effects[effect]
            if effect_data.battle_impact == "critical" then
                impact.effectiveness_reduction = impact.effectiveness_reduction + 30
                table.insert(impact.risk_factors, effect_data.name .. " prevents most actions")
            elseif effect_data.battle_impact == "high" then
                impact.effectiveness_reduction = impact.effectiveness_reduction + 20
                table.insert(impact.risk_factors, effect_data.name .. " significantly impairs combat")
            end
        end
    end
    
    -- Cap effectiveness reduction
    impact.effectiveness_reduction = math.min(100, impact.effectiveness_reduction)
    
    -- Add tactical considerations
    if impact.effectiveness_reduction > 50 then
        table.insert(impact.tactical_considerations, "Consider substitution with healthier creature")
        table.insert(impact.tactical_considerations, "Prioritize healing over offensive moves")
    elseif impact.effectiveness_reduction > 25 then
        table.insert(impact.tactical_considerations, "Adopt defensive strategy")
        table.insert(impact.tactical_considerations, "Avoid risky maneuvers")
    end
    
    return impact
end

-- Helper functions
function HealthManager:get_readiness_recommendations(readiness_category, status_effects)
    local recommendations = {}
    
    if readiness_category == "not_ready" then
        table.insert(recommendations, "Do not use in battle until healed")
        table.insert(recommendations, "Focus on recovery and healing")
    elseif readiness_category == "poor" then
        table.insert(recommendations, "Use only in emergencies")
        table.insert(recommendations, "Heal before any planned battles")
    elseif readiness_category == "fair" then
        table.insert(recommendations, "Suitable for low-risk encounters only")
        table.insert(recommendations, "Monitor health closely during battle")
    elseif readiness_category == "good" then
        table.insert(recommendations, "Ready for most battle scenarios")
        table.insert(recommendations, "Consider minor healing for optimal performance")
    else  -- excellent
        table.insert(recommendations, "Ready for any battle challenge")
    end
    
    -- Add status-specific recommendations
    for _, effect in ipairs(status_effects) do
        if effect == "burn" or effect == "poison" then
            table.insert(recommendations, "Cure " .. effect .. " to prevent ongoing damage")
        elseif effect == "sleep" or effect == "paralysis" then
            table.insert(recommendations, "Address " .. effect .. " for reliable battle performance")
        end
    end
    
    return recommendations
end

return HealthManager