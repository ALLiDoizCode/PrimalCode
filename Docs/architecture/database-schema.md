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
```
