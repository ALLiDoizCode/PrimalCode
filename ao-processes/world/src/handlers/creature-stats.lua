-- Creature Stats Management System
-- Comprehensive stat calculation, IV system, and combat effectiveness analysis
-- Implements Story 4.4 requirements for transparent creature stat systems

local json = require('json')
local SeededRNG = require('shared.utils.seeded-rng')
local ProcessBase = require('shared.utils.process-base')
local HandlerMetadata = require('shared.utils.handler-metadata')
local MessageLogger = require('shared.utils.message-logger')

local CreatureStats = {}

-- Initialize creature stats management system
function CreatureStats.initialize(world_state)
    local self = {
        world_state = world_state,
        species_data_cache = {},
        stat_calculations = {
            iv_range = {min = 0, max = 31},  -- Individual Value range
            ev_range = {min = 0, max = 252}, -- Effort Value range (future enhancement)
            level_scaling_factor = 2.5,
            base_stat_multiplier = 2.0
        },
        type_effectiveness_chart = CreatureStats.build_type_effectiveness_chart(),
        stat_modifiers = CreatureStats.build_stat_modifiers()
    }
    
    -- Load species data into cache
    self:load_species_data()
    
    return setmetatable(self, {__index = CreatureStats})
end

-- Build comprehensive type effectiveness chart
function CreatureStats.build_type_effectiveness_chart()
    return {
        fire = {
            strong_against = {"nature", "ice", "crystal", "metal"},
            weak_against = {"water", "earth", "dragon"},
            resists = {"fire", "nature", "ice", "crystal", "metal"},
            weak_to = {"water", "earth", "dragon"}
        },
        water = {
            strong_against = {"fire", "earth", "flying"},
            weak_against = {"nature", "electric", "poison"},
            resists = {"fire", "water", "ice", "metal"},
            weak_to = {"nature", "electric"}
        },
        nature = {
            strong_against = {"water", "earth", "flying"},
            weak_against = {"fire", "ice", "poison", "flying"},
            resists = {"water", "electric", "nature", "earth"},
            weak_to = {"fire", "ice", "poison", "flying"}
        },
        earth = {
            strong_against = {"fire", "electric", "poison", "metal"},
            weak_against = {"water", "nature", "ice", "flying"},
            resists = {"poison", "flying"},
            weak_to = {"water", "nature", "ice"}
        },
        electric = {
            strong_against = {"water", "flying", "metal"},
            weak_against = {"earth", "nature"},
            resists = {"flying", "metal", "electric"},
            weak_to = {"earth"}
        },
        ice = {
            strong_against = {"nature", "earth", "flying", "dragon"},
            weak_against = {"fire", "water", "metal", "crystal"},
            resists = {"ice"},
            weak_to = {"fire", "water", "metal", "crystal"}
        },
        flying = {
            strong_against = {"nature", "electric", "poison"},
            weak_against = {"ice", "electric", "crystal"},
            resists = {"nature", "poison", "earth"},
            weak_to = {"ice", "electric", "crystal"}
        },
        poison = {
            strong_against = {"nature", "water"},
            weak_against = {"earth", "crystal", "metal", "psychic"},
            resists = {"nature", "poison", "psychic"},
            weak_to = {"earth", "psychic"}
        },
        psychic = {
            strong_against = {"poison", "dark"},
            weak_against = {"dark", "metal", "crystal"},
            resists = {"poison", "psychic"},
            weak_to = {"dark", "metal"}
        },
        crystal = {
            strong_against = {"ice", "flying", "fire", "electric"},
            weak_against = {"earth", "water", "metal"},
            resists = {"fire", "ice", "poison", "psychic", "crystal"},
            weak_to = {"earth", "water", "metal"}
        },
        metal = {
            strong_against = {"ice", "crystal", "flying"},
            weak_against = {"fire", "water", "electric", "earth"},
            resists = {"nature", "ice", "flying", "psychic", "crystal", "metal", "poison"},
            weak_to = {"fire", "water", "electric", "earth"}
        },
        dark = {
            strong_against = {"psychic", "crystal"},
            weak_against = {"poison"},
            resists = {"dark", "psychic"},
            weak_to = {"poison"}
        },
        dragon = {
            strong_against = {"dragon", "flying", "water"},
            weak_against = {"ice", "crystal"},
            resists = {"fire", "water", "electric", "nature"},
            weak_to = {"ice", "crystal", "dragon"}
        }
    }
end

-- Build stat modifier system for temporary effects
function CreatureStats.build_stat_modifiers()
    return {
        status_effects = {
            burn = {attack = 0.5, hp_drain = 0.125},
            poison = {hp_drain = 0.125},
            paralysis = {speed = 0.25, accuracy = 0.75},
            sleep = {attack = 0, defense = 0, speed = 0},
            freeze = {attack = 0, speed = 0},
            confusion = {accuracy = 0.5}
        },
        weather_effects = {
            sunny = {fire_moves = 1.5, water_moves = 0.5},
            rain = {water_moves = 1.5, fire_moves = 0.5},
            sandstorm = {earth_moves = 1.3, hp_drain_non_earth = 0.0625},
            hail = {ice_moves = 1.3, hp_drain_non_ice = 0.0625}
        },
        item_effects = {
            attack_boost = {attack = 1.3},
            defense_boost = {defense = 1.3},
            speed_boost = {speed = 1.3},
            hp_boost = {hp_max = 1.2}
        }
    }
end

-- Load species data into cache
function CreatureStats:load_species_data()
    -- In a real implementation, this would load from shared/data/tuxemon-species.json
    -- For now, using a simplified cache structure
    self.species_data_cache = {
        species_loaded = true,
        load_timestamp = os.time()
    }
end

-- Calculate final stats from base stats, level, IVs, and modifiers
function CreatureStats:calculate_final_stats(creature, species_data, temporary_modifiers)
    if not species_data or not species_data.base_stats then
        return nil, "Species data not available for stat calculation"
    end
    
    local base_stats = species_data.base_stats
    local level = creature.level or 1
    local ivs = creature.individual_values or {}
    
    -- Calculate base stat values using Pokémon-style formula
    local final_stats = {}
    
    -- HP calculation (different formula)
    local hp_iv = ivs.hp or 15  -- Default to average IV
    final_stats.hp_max = math.floor(((2 * base_stats.hp + hp_iv) * level / 100) + level + 10)
    
    -- Other stat calculations
    for stat_name, base_value in pairs(base_stats) do
        if stat_name ~= "hp" then
            local iv = ivs[stat_name] or 15  -- Default to average IV
            local stat_value = math.floor(((2 * base_value + iv) * level / 100) + 5)
            
            -- Apply stat modifiers
            if temporary_modifiers and temporary_modifiers[stat_name] then
                stat_value = math.floor(stat_value * temporary_modifiers[stat_name])
            end
            
            final_stats[stat_name] = stat_value
        end
    end
    
    -- Ensure current HP doesn't exceed max HP
    if creature.hp_current and creature.hp_current > final_stats.hp_max then
        final_stats.hp_current = final_stats.hp_max
    else
        final_stats.hp_current = creature.hp_current or final_stats.hp_max
    end
    
    return final_stats
end

-- Generate Individual Values for a new creature
function CreatureStats:generate_individual_values(creature_id, species_id, capture_method)
    local seed = string.len(creature_id .. species_id) + os.time()
    local rng = SeededRNG.new(seed)
    
    -- Generate IVs for each stat (0-31 range)
    local ivs = {
        hp = rng:next(self.stat_calculations.iv_range.min, self.stat_calculations.iv_range.max),
        attack = rng:next(self.stat_calculations.iv_range.min, self.stat_calculations.iv_range.max),
        defense = rng:next(self.stat_calculations.iv_range.min, self.stat_calculations.iv_range.max),
        speed = rng:next(self.stat_calculations.iv_range.min, self.stat_calculations.iv_range.max)
    }
    
    -- Capture method can influence IV quality
    if capture_method == "rare_capture_item" then
        -- Guarantee at least one high IV
        local high_stat = {"hp", "attack", "defense", "speed"}[rng:next(1, 4)]
        ivs[high_stat] = rng:next(25, 31)
    elseif capture_method == "perfect_capture" then
        -- Guarantee multiple high IVs
        for stat, _ in pairs(ivs) do
            ivs[stat] = rng:next(20, 31)
        end
    end
    
    return ivs
end

-- Calculate combat effectiveness rating
function CreatureStats:calculate_combat_effectiveness(creature, species_data, final_stats)
    if not final_stats then
        return 0, "Cannot calculate combat effectiveness without final stats"
    end
    
    -- Base combat power calculation
    local offensive_power = final_stats.attack * 1.5 + final_stats.speed * 0.8
    local defensive_power = final_stats.defense * 1.2 + final_stats.hp_max * 0.6
    local base_power = (offensive_power + defensive_power) / 2
    
    -- Level scaling
    local level_bonus = creature.level * 2
    
    -- Health factor
    local health_factor = (final_stats.hp_current / final_stats.hp_max)
    
    -- Type effectiveness bonus (dual types get small bonus)
    local type_bonus = 1.0
    if species_data.type_secondary then
        type_bonus = 1.1
    end
    
    -- Status effect penalties
    local status_penalty = 0
    if creature.status_effects then
        for _, effect in ipairs(creature.status_effects) do
            if self.stat_modifiers.status_effects[effect] then
                status_penalty = status_penalty + 10  -- Each status effect reduces effectiveness
            end
        end
    end
    
    -- Calculate final combat effectiveness (0-100 scale)
    local combat_effectiveness = ((base_power + level_bonus) * health_factor * type_bonus - status_penalty)
    combat_effectiveness = math.max(0, math.min(100, combat_effectiveness))
    
    return combat_effectiveness
end

-- Validate calculated stats against expected ranges
function CreatureStats:validate_calculated_stats(creature, final_stats, species_data)
    local validation_results = {
        valid = true,
        warnings = {},
        errors = {}
    }
    
    -- Check for reasonable stat ranges based on level
    local level = creature.level or 1
    local expected_min = level * 0.8
    local expected_max = level * 8.0  -- High-level creatures can have very high stats
    
    for stat_name, value in pairs(final_stats) do
        if stat_name ~= "hp_current" then
            if value < expected_min then
                table.insert(validation_results.warnings, 
                    string.format("%s value %d seems low for level %d", stat_name, value, level))
            elseif value > expected_max then
                table.insert(validation_results.warnings, 
                    string.format("%s value %d seems high for level %d", stat_name, value, level))
            end
        end
    end
    
    -- Validate HP current vs max
    if final_stats.hp_current > final_stats.hp_max then
        table.insert(validation_results.errors, 
            string.format("Current HP (%d) exceeds maximum HP (%d)", final_stats.hp_current, final_stats.hp_max))
        validation_results.valid = false
    end
    
    return validation_results
end

-- Create handler for calculating creature stats
function CreatureStats:create_calculate_stats_handler()
    return HandlerMetadata.create_handler("calculate-creature-stats", {
        action = "Calculate-Creature-Stats",
        description = "Calculate comprehensive creature stats including final values, combat effectiveness, and stat analysis",
        category = "creature_stats",
        version = "1.0",
        tags = {
            {
                name = "Creature-Id",
                type = "string",
                required = true,
                description = "ID of the creature to calculate stats for"
            },
            {
                name = "Include-Temporary-Modifiers",
                type = "boolean",
                required = false,
                description = "Whether to apply temporary stat modifiers",
                default_value = "false"
            }
        },
        input_schema = {
            required_tags = {"Action", "Creature-Id"},
            optional_tags = {"Include-Temporary-Modifiers"}
        },
        output_schema = {
            response_action = "Creature-Stats-Response",
            data_example = {
                creature_id = "creature_123",
                final_stats = {
                    hp_max = 65,
                    hp_current = 65,
                    attack = 42,
                    defense = 38,
                    speed = 45
                },
                combat_effectiveness = 78,
                stat_analysis = {},
                individual_values = {},
                validation = {}
            }
        }
    }, function(msg)
        local agent_id = msg.From
        local creature_id = msg.Tags["Creature-Id"]
        local include_modifiers = msg.Tags["Include-Temporary-Modifiers"] == "true"
        
        if not creature_id then
            local response = ProcessBase.create_error_response(
                msg.From,
                "VALIDATION_ERROR",
                "Creature-Id is required"
            )
            ao.send(response)
            return
        end
        
        -- Get creature from captured creature manager
        local captured_creature_manager = self.world_state.captured_creature_manager
        local creature, error_msg = captured_creature_manager:get_creature_by_id(agent_id, creature_id)
        
        if not creature then
            local response = ProcessBase.create_error_response(
                msg.From,
                "CREATURE_NOT_FOUND",
                error_msg or "Creature not found in collection"
            )
            ao.send(response)
            return
        end
        
        -- Get species data (would normally load from JSON file)
        local species_data = {
            base_stats = {
                hp = 35 + (creature.level or 1),
                attack = 30 + (creature.level or 1),
                defense = 25 + (creature.level or 1),
                speed = 40 + (creature.level or 1)
            },
            type_primary = creature.species_data and creature.species_data.type_primary or "normal",
            type_secondary = creature.species_data and creature.species_data.type_secondary or nil
        }
        
        -- Calculate final stats
        local temporary_modifiers = include_modifiers and {} or nil  -- Future enhancement
        local final_stats, calc_error = self:calculate_final_stats(creature, species_data, temporary_modifiers)
        
        if not final_stats then
            local response = ProcessBase.create_error_response(
                msg.From,
                "CALCULATION_ERROR",
                calc_error or "Failed to calculate creature stats"
            )
            ao.send(response)
            return
        end
        
        -- Calculate combat effectiveness
        local combat_effectiveness = self:calculate_combat_effectiveness(creature, species_data, final_stats)
        
        -- Validate calculated stats
        local validation = self:validate_calculated_stats(creature, final_stats, species_data)
        
        -- Prepare comprehensive response
        local response_data = {
            creature_id = creature_id,
            final_stats = final_stats,
            combat_effectiveness = combat_effectiveness,
            individual_values = creature.individual_values or {},
            stat_analysis = {
                total_stat_points = final_stats.hp_max + final_stats.attack + final_stats.defense + final_stats.speed,
                dominant_stat = self:find_dominant_stat(final_stats),
                stat_distribution = self:calculate_stat_distribution(final_stats),
                growth_potential = self:assess_growth_potential(creature, species_data)
            },
            type_effectiveness = self:analyze_type_effectiveness(species_data),
            validation = validation,
            calculation_metadata = {
                calculation_timestamp = os.time(),
                included_temporary_modifiers = include_modifiers,
                species_id = creature.species_id
            }
        }
        
        MessageLogger:info("Creature stats calculated", {
            agent_id = agent_id,
            creature_id = creature_id
        }, {
            combat_effectiveness = combat_effectiveness,
            total_stats = response_data.stat_analysis.total_stat_points
        })
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Creature-Stats-Response",
            response_data
        )
        ao.send(response)
    end)
end

-- Helper functions for stat analysis
function CreatureStats:find_dominant_stat(final_stats)
    local max_value = 0
    local dominant_stat = "balanced"
    
    for stat_name, value in pairs(final_stats) do
        if stat_name ~= "hp_current" and value > max_value then
            max_value = value
            dominant_stat = stat_name
        end
    end
    
    return dominant_stat
end

function CreatureStats:calculate_stat_distribution(final_stats)
    local total = 0
    local stats = {}
    
    -- Calculate total excluding current HP
    for stat_name, value in pairs(final_stats) do
        if stat_name ~= "hp_current" then
            stats[stat_name] = value
            total = total + value
        end
    end
    
    local distribution = {}
    for stat_name, value in pairs(stats) do
        distribution[stat_name] = {
            value = value,
            percentage = total > 0 and (value / total * 100) or 0
        }
    end
    
    return distribution
end

function CreatureStats:assess_growth_potential(creature, species_data)
    local level = creature.level or 1
    local max_level = 100
    local growth_remaining = max_level - level
    
    return {
        current_level = level,
        max_potential_level = max_level,
        growth_remaining = growth_remaining,
        potential_stat_gains = growth_remaining * 2,  -- Approximate stat gain per level
        growth_rate = level < 50 and "fast" or level < 80 and "normal" or "slow"
    }
end

function CreatureStats:analyze_type_effectiveness(species_data)
    local primary_type = species_data.type_primary
    local secondary_type = species_data.type_secondary
    
    local effectiveness_data = {
        primary_type = primary_type,
        secondary_type = secondary_type,
        offensive_advantages = {},
        defensive_resistances = {},
        vulnerabilities = {}
    }
    
    -- Analyze primary type
    if self.type_effectiveness_chart[primary_type] then
        local primary_chart = self.type_effectiveness_chart[primary_type]
        effectiveness_data.offensive_advantages = primary_chart.strong_against or {}
        effectiveness_data.defensive_resistances = primary_chart.resists or {}
        effectiveness_data.vulnerabilities = primary_chart.weak_to or {}
    end
    
    -- Analyze secondary type if present
    if secondary_type and self.type_effectiveness_chart[secondary_type] then
        local secondary_chart = self.type_effectiveness_chart[secondary_type]
        
        -- Merge advantages (avoiding duplicates)
        for _, type_name in ipairs(secondary_chart.strong_against or {}) do
            if not self:table_contains(effectiveness_data.offensive_advantages, type_name) then
                table.insert(effectiveness_data.offensive_advantages, type_name)
            end
        end
        
        -- Merge resistances
        for _, type_name in ipairs(secondary_chart.resists or {}) do
            if not self:table_contains(effectiveness_data.defensive_resistances, type_name) then
                table.insert(effectiveness_data.defensive_resistances, type_name)
            end
        end
        
        -- Merge vulnerabilities
        for _, type_name in ipairs(secondary_chart.weak_to or {}) do
            if not self:table_contains(effectiveness_data.vulnerabilities, type_name) then
                table.insert(effectiveness_data.vulnerabilities, type_name)
            end
        end
    end
    
    return effectiveness_data
end

function CreatureStats:table_contains(table, value)
    for _, v in pairs(table) do
        if v == value then
            return true
        end
    end
    return false
end

return CreatureStats