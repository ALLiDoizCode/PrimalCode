-- Monster Process Configuration
-- Centralized configuration for monster processes

local config = {}

-- Process Configuration
config.process = {
    name = "Monster Process",
    version = "1.0.0",
    description = "Autonomous monster with persistent state and decision-making",
    type = "monster",
    author = "PrimalCode Development Team"
}

-- Monster Default Settings
config.monster = {
    -- Decision-making intervals
    decision_interval = 60000, -- 60 seconds in milliseconds
    timer_process_interval = 5000, -- 5 seconds for timer processing
    
    -- State limits
    max_health = 100,
    max_hunger = 100,
    max_energy = 100,
    
    -- Default personality ranges
    personality_ranges = {
        aggression = { min = 0.0, max = 1.0, default = 0.5 },
        intelligence = { min = 0.0, max = 1.0, default = 0.5 },
        pack_tendency = { min = 0.0, max = 1.0, default = 0.5 }
    },
    
    -- Default monster species configurations
    species_configs = {
        basic_monster = {
            base_stats = {
                health = 100,
                hunger = 0,
                energy = 100
            },
            personality = {
                aggression = 0.5,
                intelligence = 0.5,
                pack_tendency = 0.5
            },
            decision_modifiers = {
                hunger_threshold = 70,
                energy_threshold = 30,
                health_threshold = 50
            }
        },
        aggressive_hunter = {
            base_stats = {
                health = 90,
                hunger = 20,
                energy = 80
            },
            personality = {
                aggression = 0.8,
                intelligence = 0.6,
                pack_tendency = 0.3
            },
            decision_modifiers = {
                hunger_threshold = 60,
                energy_threshold = 25,
                health_threshold = 40
            }
        },
        cautious_forager = {
            base_stats = {
                health = 100,
                hunger = 10,
                energy = 90
            },
            personality = {
                aggression = 0.2,
                intelligence = 0.8,
                pack_tendency = 0.4
            },
            decision_modifiers = {
                hunger_threshold = 80,
                energy_threshold = 40,
                health_threshold = 60
            }
        },
        pack_leader = {
            base_stats = {
                health = 95,
                hunger = 15,
                energy = 85
            },
            personality = {
                aggression = 0.6,
                intelligence = 0.9,
                pack_tendency = 0.9
            },
            decision_modifiers = {
                hunger_threshold = 65,
                energy_threshold = 35,
                health_threshold = 45
            }
        }
    }
}

-- Persistence Configuration
config.persistence = {
    -- Backup intervals
    backup_interval = 300, -- 5 minutes in seconds
    max_backup_history = 100,
    max_state_history = 100,
    
    -- Arweave configuration
    arweave = {
        enabled = true,
        compression_threshold = 1024, -- bytes
        retry_attempts = 3,
        retry_delay = 2000 -- milliseconds
    }
}

-- Health Monitoring Configuration
config.health = {
    -- Health check intervals
    heartbeat_interval = 30, -- seconds
    health_check_timeout = 5000, -- milliseconds
    
    -- Error thresholds
    max_error_count = 10,
    max_restart_count = 5,
    
    -- Performance monitoring
    performance_monitoring = {
        enabled = true,
        metric_collection_interval = 60, -- seconds
        max_metrics_history = 1000
    }
}

-- Decision Making Configuration
config.decision_making = {
    -- Decision urgency factors
    urgency_factors = {
        health_critical = 0.8,
        health_low = 0.4,
        hunger_critical = 0.6,
        hunger_high = 0.3,
        energy_critical = 0.5,
        energy_low = 0.2
    },
    
    -- Behavioral state transitions
    state_transitions = {
        exploring = { "hunting", "resting", "seeking_pack", "patrolling" },
        hunting = { "exploring", "resting", "seeking_healing" },
        resting = { "exploring", "hunting", "patrolling" },
        seeking_pack = { "exploring", "hunting", "joining_pack" },
        patrolling = { "exploring", "hunting", "resting" },
        seeking_healing = { "resting", "exploring" },
        joining_pack = { "exploring", "patrolling" },
        retreating = { "exploring", "seeking_healing" }
    },
    
    -- Decision logging
    logging = {
        enabled = true,
        log_decisions = true,
        log_state_changes = true,
        log_environmental_awareness = true
    }
}

-- Environmental Awareness Configuration
config.environmental_awareness = {
    -- Memory limits
    max_detected_structures = 50,
    max_resource_memory = 100,
    
    -- Adaptation settings
    weather_adaptation = {
        adaptation_rate = 0.1,
        max_adaptation = 1.0,
        min_adaptation = 0.0
    },
    
    -- Resource memory decay
    resource_decay = {
        enabled = true,
        decay_interval = 3600, -- 1 hour in seconds
        decay_rate = 0.1
    }
}

-- Communication Configuration
config.communication = {
    -- Message types and their priorities
    message_types = {
        territory_warning = { priority = 8, response_required = true },
        pack_invitation = { priority = 6, response_required = true },
        resource_sharing = { priority = 4, response_required = false },
        threat_alert = { priority = 9, response_required = true },
        mating_call = { priority = 5, response_required = true },
        distress_signal = { priority = 10, response_required = true }
    },
    
    -- Rate limiting
    rate_limiting = {
        enabled = true,
        max_messages_per_minute = 10,
        max_messages_per_hour = 100
    },
    
    -- Response timeouts
    response_timeouts = {
        default = 5000, -- milliseconds
        urgent = 2000,
        low_priority = 10000
    }
}

-- Logging Configuration
config.logging = {
    -- Log levels
    levels = {
        debug = 1,
        info = 2,
        warn = 3,
        error = 4
    },
    
    -- Current log level
    current_level = 1, -- debug
    
    -- Log formatting
    timestamp_format = "%Y-%m-%d %H:%M:%S",
    
    -- Log rotation
    rotation = {
        enabled = false, -- Not implemented in Lua version
        max_size = 10485760, -- 10MB
        max_files = 5
    }
}

-- Development Configuration
config.development = {
    -- Debug settings
    debug_mode = false,
    verbose_logging = false,
    
    -- Mock settings for testing
    mock_mode = false,
    mock_arweave = true,
    
    -- Performance testing
    performance_testing = {
        enabled = false,
        benchmark_decisions = false,
        benchmark_state_updates = false
    }
}

-- Validation functions
function config.validate_monster_config(monster_config)
    local errors = {}
    
    -- Validate species
    if not monster_config.species then
        table.insert(errors, "Missing species")
    elseif not config.monster.species_configs[monster_config.species] then
        table.insert(errors, "Invalid species: " .. monster_config.species)
    end
    
    -- Validate stats
    if monster_config.stats then
        if monster_config.stats.health and (monster_config.stats.health < 0 or monster_config.stats.health > config.monster.max_health) then
            table.insert(errors, "Invalid health value")
        end
        
        if monster_config.stats.hunger and (monster_config.stats.hunger < 0 or monster_config.stats.hunger > config.monster.max_hunger) then
            table.insert(errors, "Invalid hunger value")
        end
        
        if monster_config.stats.energy and (monster_config.stats.energy < 0 or monster_config.stats.energy > config.monster.max_energy) then
            table.insert(errors, "Invalid energy value")
        end
    end
    
    -- Validate personality
    if monster_config.ai_personality then
        for trait, range in pairs(config.monster.personality_ranges) do
            local value = monster_config.ai_personality[trait]
            if value and (value < range.min or value > range.max) then
                table.insert(errors, "Invalid " .. trait .. " value")
            end
        end
    end
    
    return #errors == 0, errors
end

function config.get_species_config(species)
    return config.monster.species_configs[species] or config.monster.species_configs.basic_monster
end

function config.apply_species_config(monster_data, species)
    local species_config = config.get_species_config(species)
    
    -- Apply base stats
    for stat, value in pairs(species_config.base_stats) do
        monster_data.stats[stat] = value
    end
    
    -- Apply personality
    for trait, value in pairs(species_config.personality) do
        monster_data.ai_personality[trait] = value
    end
    
    return monster_data
end

-- Environment variable overrides
function config.load_environment_overrides()
    -- This would typically load from environment variables
    -- For now, we'll just return the base config
    return config
end

-- Initialize configuration
function config.init()
    -- Load environment overrides
    local env_config = config.load_environment_overrides()
    
    -- Apply overrides (simplified for now)
    if env_config.debug_mode ~= nil then
        config.development.debug_mode = env_config.debug_mode
    end
    
    return config
end

return config