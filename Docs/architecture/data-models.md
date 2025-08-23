# Data Models

Based on the PRD requirements for turn-based gameplay, Tuxemon collection, and battle mechanics, I've identified the core business entities that will drive our AO process state management:

## Agent

**Purpose:** Represents an external autonomous agent participating in the game ecosystem

**Key Attributes:**
- agent_id: string - Unique identifier for the agent
- world_process_id: string - Reference to agent's individual world process
- active_tuxemon_team: array[6] - Currently active Tuxemon team (max 6 creatures)
- position: {x: number, y: number} - Current world coordinates
- inventory: object - Items and resources owned by agent
- session_state: string - Current game session status (active, battling, idle)
- battle_history: array - Record of previous battles for reputation tracking

**Relationships:**
- Has many Tuxemon (owned creatures)
- Participates in many Battles
- Belongs to one WorldState (individual world instance)

## Tuxemon

**Purpose:** Individual creatures that agents collect, train, and battle with

**Key Attributes:**
- tuxemon_id: string - Unique identifier for this creature instance
- species_id: string - Reference to Tuxemon species template
- owner_agent_id: string - Agent that owns this creature
- level: number - Current experience level
- hp_current: number - Current health points
- hp_max: number - Maximum health points
- attack: number - Attack stat value
- defense: number - Defense stat value
- speed: number - Speed stat value
- status_effects: array - Current battle status effects
- experience_points: number - Total XP earned

**Relationships:**
- Belongs to one Agent (owner)
- Participates in many Battles
- Based on one TuxemonSpecies (template)

## Battle

**Purpose:** Turn-based combat encounters between agents' Tuxemon teams

**Key Attributes:**
- battle_id: string - Unique battle identifier
- participant_agents: array[2] - Two agents participating in battle
- battle_state: string - Current battle phase (setup, active, resolved)
- turn_order: array - Calculated turn sequence based on Tuxemon speed
- current_turn: number - Active turn counter
- battle_log: array - Complete record of all battle actions
- victory_condition: string - How battle was resolved
- winner_agent_id: string - Victorious agent (if resolved)
- random_seed: number - Deterministic seed for battle calculations

**Relationships:**
- Involves many Agents (participants)
- Involves many Tuxemon (active teams)
- Generates many BattleActions (turn log)

## WorldState

**Purpose:** Individual game world instance for a single agent to eliminate concurrency issues

**Key Attributes:**
- world_id: string - Unique world instance identifier
- owner_agent_id: string - Agent that owns this world
- terrain_map: object - 2D tile-based world representation
- npc_positions: object - Non-player character locations
- item_spawns: array - Available items for collection
- encounter_zones: object - Areas where Tuxemon can be found
- world_seed: number - Deterministic seed for world generation
- last_updated: timestamp - State modification timestamp

**Relationships:**
- Belongs to one Agent (owner)
- Contains many ItemSpawns
- Contains many EncounterZones

## TuxemonSpecies

**Purpose:** Static template data defining base characteristics for each Tuxemon species

**Key Attributes:**
- species_id: string - Unique species identifier (e.g., "agnite", "bamboon")
- name: string - Display name of the species
- type_primary: string - Primary elemental type (fire, water, earth, metal, etc.)
- type_secondary: string? - Optional secondary type
- base_stats: object - Base stat template {hp, attack, defense, speed}
- evolution_chain: array - Species this can evolve from/to
- learnable_moves: array - Moves this species can learn by level
- capture_rate: number - Probability modifier for capture attempts
- experience_type: string - XP curve type (fast, medium, slow)
- sprite_assets: object - References to visual assets for display tools

**Relationships:**
- Template for many Tuxemon instances
- Part of SpeciesEvolutionChain

## ItemSpawn

**Purpose:** Represents collectible items available in the world environment

**Key Attributes:**
- spawn_id: string - Unique spawn point identifier
- item_type: string - Type of item (potion, capture_device, food, etc.)
- position: {x: number, y: number} - World coordinates
- respawn_timer: number - Time until item respawns after collection
- spawn_rate: number - Probability of item appearing (0.0-1.0)
- quantity: number - Number of items available at this spawn
- conditions: object - Requirements for spawn activation

**Relationships:**
- Belongs to one WorldState
- References ItemTemplate (static item data)

## EncounterZone

**Purpose:** Defines areas where wild Tuxemon can be encountered and captured

**Key Attributes:**
- zone_id: string - Unique encounter zone identifier
- world_area: object - Rectangular or polygon area definition
- encounter_table: array - Species and their encounter rates
- min_level: number - Minimum level for encountered Tuxemon
- max_level: number - Maximum level for encountered Tuxemon
- encounter_rate: number - Base probability per step/action
- zone_type: string - Environment type (grassland, cave, water, etc.)
- special_conditions: object - Time-based or event-based encounter modifiers

**Relationships:**
- Belongs to one WorldState
- References multiple TuxemonSpecies through encounter table

## BattleAction

**Purpose:** Individual actions taken during battle for complete battle logging

**Key Attributes:**
- action_id: string - Unique action identifier
- battle_id: string - Parent battle reference
- turn_number: number - Which turn this action occurred
- acting_agent_id: string - Agent performing the action
- acting_tuxemon_id: string - Tuxemon performing the action
- action_type: string - Type of action (attack, defend, switch, item, etc.)
- target_tuxemon_id: string? - Target of the action (if applicable)
- move_used: string? - Specific move/attack used
- damage_dealt: number? - Damage amount (if applicable)
- status_effects_applied: array? - Status effects applied by this action
- random_factors: object - All random values used (for deterministic replay)

**Relationships:**
- Belongs to one Battle
- References acting Agent and Tuxemon
- May reference target Tuxemon

## AgentRegistry

**Purpose:** Central registry for agent discovery and battle matchmaking across the system

**Key Attributes:**
- registry_id: string - Unique registry instance identifier
- active_agents: object - Map of agent_id to world_process_id for active agents
- battle_queue: array - Agents seeking battle opponents
- agent_metadata: object - Agent capabilities, preferences, and status information
- matchmaking_rules: object - Configuration for battle pairing algorithms
- last_heartbeat: object - Map of agent_id to last activity timestamp

**Relationships:**
- Tracks many Agents across all world instances
- Facilitates Battle creation between agents

## ProcessHealth

**Purpose:** Monitoring and health status tracking for all AO processes in the system

**Key Attributes:**
- process_id: string - AO process identifier being monitored
- process_type: string - Type of process (world, battle, registry, health)
- status: string - Current health status (healthy, degraded, critical, offline)
- last_heartbeat: timestamp - Most recent health check
- performance_metrics: object - Response times, message throughput, error rates
- resource_usage: object - Memory usage, computational load metrics
- error_log: array - Recent errors and warnings

**Relationships:**
- Monitors all AO processes in the ecosystem
- Referenced by monitoring and debugging tools

## MessageRoute

**Purpose:** State management for inter-process message routing and delivery tracking

**Key Attributes:**
- route_id: string - Unique message route identifier
- source_process_id: string - Originating AO process
- target_process_id: string - Destination AO process
- message_type: string - Type of message being routed
- delivery_status: string - Current delivery state (pending, delivered, failed)
- retry_count: number - Number of delivery attempts
- created_timestamp: timestamp - When route was established
- delivered_timestamp: timestamp? - When message was successfully delivered

**Relationships:**
- Links source and target AO processes
- Tracks message delivery across the system

## ItemTemplate

**Purpose:** Static reference data for all collectible items in the game

**Key Attributes:**
- item_id: string - Unique item type identifier
- name: string - Display name of the item
- category: string - Item category (healing, capture, battle, quest)
- effects: object - Mechanical effects when used
- usage_constraints: object - When/how item can be used
- stack_limit: number - Maximum quantity per inventory slot
- rarity: string - Item rarity classification
- description: string - Item description for agents

**Relationships:**
- Template for ItemSpawn instances
- Referenced by Agent inventory systems

## MoveTemplate

**Purpose:** Static reference data for all Tuxemon moves and abilities

**Key Attributes:**
- move_id: string - Unique move identifier
- name: string - Display name of the move
- type: string - Elemental type of the move
- category: string - Move category (physical, special, status)
- base_power: number - Base damage value
- accuracy: number - Hit chance percentage
- pp_cost: number - Power points consumed per use
- target_type: string - Who can be targeted (self, enemy, ally, all)
- effects: array - Status effects or special mechanics
- learn_requirements: object - Level or conditions needed to learn

**Relationships:**
- Referenced by TuxemonSpecies.learnable_moves
- Used in BattleAction.move_used tracking
