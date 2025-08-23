# Database Schema

Since our tech stack uses AO Process State for data persistence rather than traditional databases, our "schema" consists of JSON data structures stored within each AO process:

## World Process State Structure

```json
{
  "world_id": "world_001",
  "owner_agent_id": "agent_123",
  "terrain_map": {
    "width": 100,
    "height": 100,
    "tiles": [
      {"x": 0, "y": 0, "type": "grass", "passable": true},
      {"x": 1, "y": 0, "type": "water", "passable": false}
    ]
  },
  "agent_state": {
    "agent_id": "agent_123",
    "position": {"x": 50, "y": 50},
    "active_tuxemon_team": ["tux_001", "tux_002"],
    "inventory": {
      "items": [
        {"item_id": "potion", "quantity": 5},
        {"item_id": "pokeball", "quantity": 10}
      ]
    },
    "owned_tuxemon": {
      "tux_001": {
        "tuxemon_id": "tux_001",
        "species_id": "agnite",
        "level": 12,
        "hp_current": 45,
        "hp_max": 45,
        "stats": {"attack": 28, "defense": 22, "speed": 18},
        "experience_points": 1250
      }
    }
  },
  "encounter_zones": [
    {
      "zone_id": "grassland_1",
      "area": {"x": 40, "y": 40, "width": 20, "height": 20},
      "encounter_table": [
        {"species_id": "agnite", "rate": 0.4, "min_level": 8, "max_level": 15},
        {"species_id": "bamboon", "rate": 0.3, "min_level": 10, "max_level": 18}
      ]
    }
  ],
  "item_spawns": [
    {
      "spawn_id": "item_spawn_001",
      "item_type": "potion",
      "position": {"x": 25, "y": 75},
      "respawn_timer": 3600,
      "available": true
    }
  ],
  "world_seed": 987654321,
  "last_updated": "2025-08-23T10:30:00Z"
}
```

## Battle Process State Structure

```json
{
  "battle_id": "battle_456",
  "participants": ["agent_123", "agent_789"],
  "battle_state": "active",
  "current_turn": 3,
  "turn_order": [
    {"agent_id": "agent_789", "tuxemon_id": "tux_003", "speed": 35},
    {"agent_id": "agent_123", "tuxemon_id": "tux_001", "speed": 18}
  ],
  "participant_teams": {
    "agent_123": [
      {
        "tuxemon_id": "tux_001",
        "species_id": "agnite",
        "hp_current": 30,
        "hp_max": 45,
        "status_effects": ["burned"]
      }
    ],
    "agent_789": [
      {
        "tuxemon_id": "tux_003",
        "species_id": "bamboon",
        "hp_current": 52,
        "hp_max": 60,
        "status_effects": []
      }
    ]
  },
  "battle_log": [
    {
      "action_id": "action_001",
      "turn_number": 1,
      "acting_agent_id": "agent_789",
      "action_type": "attack",
      "move_used": "flame_burst",
      "target_tuxemon_id": "tux_001",
      "damage_dealt": 15,
      "random_factors": {"critical_hit_roll": 0.85, "damage_variance": 0.92}
    }
  ],
  "random_seed": 123456789,
  "created_timestamp": "2025-08-23T10:15:00Z"
}
```

## Agent Registry State Structure

```json
{
  "registry_id": "main_registry",
  "active_agents": {
    "agent_123": {
      "world_process_id": "world_001",
      "status": "active",
      "last_heartbeat": "2025-08-23T10:30:00Z",
      "capabilities": ["battle", "exploration", "collection"],
      "battle_preferences": {
        "max_level_difference": 5,
        "preferred_battle_types": ["standard", "tournament"]
      }
    }
  },
  "battle_queue": [
    {
      "agent_id": "agent_456",
      "queue_timestamp": "2025-08-23T10:28:00Z",
      "preferences": {"max_level_difference": 3}
    }
  ],
  "matchmaking_rules": {
    "level_tolerance": 5,
    "queue_timeout": 300,
    "min_active_time": 60
  }
}
