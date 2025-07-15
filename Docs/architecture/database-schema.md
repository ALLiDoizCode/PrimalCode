# Database Schema

## AO Process State Schema

Since PrimalCode uses AO processes for state management, the "database" is actually process variable state:

```lua
-- Monster Process State Variables
Monster = {
    -- Core Identity
    id = "monster_12345",
    species = "hunter_wolf",
    created_at = 1640995200,
    
    -- Dynamic Stats
    stats = {
        health = 100,
        hunger = 50,
        energy = 80,
        position = {
            x = 150,
            y = 200,
            route = "forest_path"
        },
        last_updated = 1640995800
    },
    
    -- AI Personality (stable traits)
    ai_personality = {
        aggression = 0.7,
        intelligence = 0.6,
        pack_tendency = 0.8,
        adaptation_rate = 0.4
    },
    
    -- Environmental Awareness (dynamic)
    environmental_awareness = {
        detected_structures = {},
        resource_memory = {},
        weather_adaptation = 0.3,
        scent_trail_following = nil
    },
    
    -- Learning and Adaptation
    influence_resistance = {
        learned_patterns = {},
        adaptation_history = {},
        counter_strategies = {}
    },
    
    -- Current State
    state = "hunting",
    last_decision = 1640995700,
    next_decision_at = 1640995760
}

-- Environment Process State Variables
Environment = {
    route_id = "forest_path",
    structures = {
        {
            id = "shelter_001",
            type = "shelter_node",
            position = {x = 100, y = 150},
            effectiveness = 0.8,
            decay_rate = 0.1,
            created_at = 1640995000
        }
    },
    resources = {
        {
            id = "food_cache_001",
            type = "meat_cache",
            position = {x = 75, y = 125},
            quantity = 50,
            decay_rate = 0.05
        }
    },
    weather_state = {
        condition = "clear",
        temperature = 22,
        humidity = 0.6,
        next_change_at = 1640999400
    },
    ecosystem_balance = 0.5,
    last_modified = 1640995800
}

-- Player Process State Variables
Player = {
    wallet_address = "arweave_wallet_address",
    influence_points = 150,
    unlocked_tools = {
        "place_food",
        "build_shelter",
        "modify_weather"
    },
    ecosystem_mastery = {
        {
            route_id = "forest_path",
            mastery_level = 3,
            specialization = "predator_management"
        }
    },
    capture_collection = {
        "monster_12345",
        "monster_67890"
    },
    session_history = {},
    last_active = 1640995800
}

-- Inference Marketplace Provider Process State Variables
InferenceProvider = {
    provider_id = "ai_provider_001",
    capabilities = {
        "text-generation",
        "image-analysis",
        "decision-making"
    },
    pricing = {
        ["text-generation"] = "100",
        ["image-analysis"] = "500",
        ["decision-making"] = "250"
    },
    reputation = {
        response_time_avg = 2.5,
        quality_score = 0.92,
        completion_rate = 0.98,
        total_requests = 1250
    },
    metadata = {
        last_seen = 1640995800,
        x_tags_supported = {"X-Context-Data", "X-Quality-Tier", "X-Timeout"},
        description = "High-performance AI inference provider"
    },
    status = "active"
}

-- Marketplace Core Process State Variables
MarketplaceCore = {
    active_requests = {
        ["req_12345"] = {
            request_id = "req_12345",
            requester = "monster_12345",
            provider_id = "ai_provider_001",
            service_type = "decision-making",
            payment_amount = "250",
            x_metadata = {
                ["X-Service-Type"] = "ai-inference",
                ["X-Request-ID"] = "req_12345",
                ["X-Context-Data"] = "hunting_decision_context"
            },
            status = "processing",
            created_at = 1640995700,
            timeout_at = 1640995730
        }
    },
    transaction_history = {
        {
            transaction_id = "txn_67890",
            request_id = "req_12345",
            from_process = "monster_12345",
            to_process = "ai_provider_001",
            amount = "250",
            service_type = "decision-making",
            success = true,
            timestamp = 1640995700,
            credit_notice_sent = true,
            debit_notice_sent = true
        }
    },
    provider_registry = {
        ["ai_provider_001"] = {
            last_heartbeat = 1640995800,
            request_count = 1250,
            avg_response_time = 2.5
        }
    }
}

-- Reputation Manager Process State Variables
ReputationManager = {
    provider_metrics = {
        ["ai_provider_001"] = {
            response_times = {2.1, 2.3, 2.8, 2.2, 2.7}, -- Last 5 responses
            quality_scores = {0.95, 0.88, 0.92, 0.94, 0.89}, -- Last 5 quality scores
            completion_history = {
                total_requests = 1250,
                successful_requests = 1225,
                failed_requests = 25,
                timeout_requests = 15
            },
            reputation_trend = {
                {date = 1640995200, score = 0.90},
                {date = 1640995500, score = 0.91},
                {date = 1640995800, score = 0.92}
            }
        }
    },
    ranking_cache = {
        ["text-generation"] = {
            {provider_id = "ai_provider_001", score = 0.92},
            {provider_id = "ai_provider_002", score = 0.88}
        }
    }
}
```
