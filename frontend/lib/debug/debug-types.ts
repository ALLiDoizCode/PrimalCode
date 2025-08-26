/**
 * TypeScript interfaces for debug interface data models
 * Building on existing dashboard types with debug-specific extensions
 */

// Debug interface types extend and enhance dashboard types

// Debug Interface Data Models
export interface BattleStateDebugData {
  battle_id: string
  participants: AgentBattleStatus[]
  current_turn: number
  turn_history: BattleAction[]
  battle_state: 'setup' | 'active' | 'resolved'
  performance_metrics: {
    turn_resolution_time_ms: number
    total_battle_duration_ms: number
  }
}

export interface AgentBattleStatus {
  agent_id: string
  status: 'battling' | 'waiting' | 'defeated'
  team: TuxemonDebugData[]
}

export interface TuxemonDebugData {
  id: string
  species: string
  level: number
  hp_current: number
  hp_max: number
  attack: number
  defense: number
  speed: number
  status_effects: string[]
  is_active: boolean
}

export interface BattleAction {
  turn: number
  timestamp: number
  type: 'damage' | 'heal' | 'status' | 'system'
  message: string
  agent_id?: string
  target_id?: string
  damage?: number
}

// Registry Debug Data
export interface RegistryStateDebugData {
  registry_id: string
  agents: Record<string, AgentRegistryStatus>
  matchmaking_queue: MatchmakingEntry[]
  active_battles: ActiveBattleInfo[]
  system_health: SystemHealthMetrics
}

export interface AgentRegistryStatus {
  status: 'online' | 'in_world' | 'battling' | 'offline'
  world_process: string | null
  battle_process: string | null
  last_seen: number
  session_start: number
  total_battles: number
  win_rate: number
}

export interface MatchmakingEntry {
  agent_id: string
  wait_time: number
  position: number
  preferences?: {
    battle_type?: string
    skill_range?: number
  }
}

export interface ActiveBattleInfo {
  battle_id: string
  participants: string[]
  status: 'setup' | 'active' | 'resolving'
  duration: number
  turn_count: number
}

export interface SystemHealthMetrics {
  uptime: number
  cpu_usage: number
  memory_usage: number
  request_rate: number
  error_rate: number
  avg_response_time: number
}

// World State Debug Data
export interface WorldStateDebugData {
  world_id: string
  owner_agent_id: string
  terrain_map: TerrainCell[][]
  agent_positions: AgentPositionData[]
  nearby_encounters: EncounterZone[]
  available_items: ItemSpawn[]
  movement_history: MovementEvent[]
  world_performance: {
    state_update_time_ms: number
    collision_checks_per_second: number
  }
  agents: Record<string, AgentWorldData>
}

export interface TerrainCell {
  type: 'grass' | 'water' | 'tree' | 'rock' | 'path'
  walkable: boolean
}

export interface AgentPositionData {
  agent_id: string
  x: number
  y: number
  status: 'exploring' | 'idle' | 'battling'
  facing: 'north' | 'south' | 'east' | 'west'
}

export interface EncounterZone {
  x1: number
  y1: number
  x2: number
  y2: number
  encounter_rate: number
  tuxemon_types: string[]
  min_level: number
  max_level: number
}

export interface ItemSpawn {
  x: number
  y: number
  item_type: string
  quantity: number
  is_active: boolean
}

export interface MovementEvent {
  timestamp: number
  agent_id: string
  from_x: number
  from_y: number
  to_x: number
  to_y: number
  collision?: boolean
}

export interface AgentWorldData {
  position: { x: number; y: number }
  status: string
  inventory: Record<string, InventoryItem>
  active_tuxemon_team: TuxemonDebugData[]
}

export interface InventoryItem {
  type: string
  quantity: number
  description: string
}

// Session Debug Data
export interface SessionDebugData {
  session_id: string
  agent_id: string
  session_state: 'active' | 'idle' | 'recovering'
  checkpoint_data: SessionCheckpoint
  recovery_attempts: number
  session_duration_ms: number
  last_heartbeat: string
  performance_metrics: {
    message_processing_time_ms: number
    state_sync_time_ms: number
    error_count: number
  }
}

export interface SessionCheckpoint {
  timestamp: number
  world_state_hash: string
  agent_position: { x: number; y: number }
  inventory_snapshot: Record<string, InventoryItem>
  tuxemon_team_snapshot: TuxemonDebugData[]
}

// Encounter Debug Data
export interface EncounterDebugData {
  encounter_id: string
  agent_id: string
  encounter_type: 'wild_tuxemon' | 'item_discovery' | 'special_event'
  encounter_zone: EncounterZone
  tuxemon_data?: TuxemonDebugData
  item_data?: ItemSpawn
  encounter_result: 'success' | 'escape' | 'capture' | 'failed'
  encounter_duration_ms: number
  probability_calculations: {
    base_encounter_rate: number
    modified_rate: number
    random_seed: number
    random_value: number
  }
}

// Testing Interface Data
export interface HandlerTestData {
  test_id: string
  handler_name: string
  message_input: any
  expected_output: any
  actual_output?: any
  test_result?: 'passed' | 'failed' | 'pending'
  execution_time_ms?: number
  error_message?: string
  timestamp: number
}

export interface TeamManagerData {
  agent_id: string
  team_composition: TuxemonDebugData[]
  team_stats: {
    total_level: number
    average_level: number
    type_distribution: Record<string, number>
    battle_readiness: number
  }
  recommendations: {
    suggested_changes: string[]
    type_coverage_gaps: string[]
    level_balance_issues: string[]
  }
}

// Combat Mechanics Debug Data
export interface CombatMechanicsData {
  battle_id: string
  current_calculation: {
    move_name: string
    attacker: TuxemonDebugData
    defender: TuxemonDebugData
    base_damage: number
    type_effectiveness: number
    critical_hit: boolean
    final_damage: number
    accuracy_roll: number
    status_effects_applied: string[]
  }
  damage_history: DamageCalculation[]
  type_effectiveness_chart: Record<string, Record<string, number>>
}

export interface DamageCalculation {
  turn: number
  timestamp: number
  move_name: string
  attacker_id: string
  defender_id: string
  base_damage: number
  modified_damage: number
  type_effectiveness: number
  critical_hit: boolean
  accuracy: number
  status_modifiers: Record<string, number>
}

// Capture Debug Data
export interface CaptureDebugData {
  capture_id: string
  agent_id: string
  target_tuxemon: TuxemonDebugData
  capture_item: string
  capture_calculation: {
    base_capture_rate: number
    hp_modifier: number
    status_modifier: number
    ball_modifier: number
    final_capture_rate: number
    random_value: number
    success: boolean
  }
  capture_attempts: CaptureAttempt[]
  success_rate_history: number[]
}

export interface CaptureAttempt {
  timestamp: number
  ball_type: string
  target_hp_percentage: number
  status_effects: string[]
  capture_rate: number
  success: boolean
}

// Movement Debug Data
export interface MovementDebugData {
  agent_id: string
  current_position: { x: number; y: number }
  movement_queue: MovementCommand[]
  collision_data: CollisionCheck[]
  pathfinding_data: {
    start: { x: number; y: number }
    goal: { x: number; y: number }
    path: { x: number; y: number }[]
    path_length: number
    calculation_time_ms: number
  }
}

export interface MovementCommand {
  command_id: string
  direction: 'north' | 'south' | 'east' | 'west'
  timestamp: number
  processed: boolean
  collision_detected?: boolean
}

export interface CollisionCheck {
  timestamp: number
  position: { x: number; y: number }
  collision_type: 'boundary' | 'terrain' | 'agent' | 'none'
  collision_details?: string
}

// Debug Hook State Interfaces
export interface DebugDataHook<T> {
  data: T | null
  connected: boolean
  error: string | null
  historicalData: T[]
  isLoading: boolean
}

export interface DebugWebSocketOptions {
  maxHistorySize?: number
  reconnectAttempts?: number
  reconnectInterval?: number
  autoSubscribe?: boolean
}

// Debug Interface Filter and Search Types
export interface DebugFilter {
  searchTerm?: string
  statusFilter?: string
  timeRange?: {
    start: number
    end: number
  }
  agentFilter?: string[]
  processFilter?: string[]
}

export interface DebugSort {
  field: string
  direction: 'asc' | 'desc'
}

// Real-time Update Types
export interface DebugUpdate<T> {
  type: 'data_update' | 'connection_status' | 'error'
  timestamp: number
  data?: T
  error?: string
  metadata?: {
    source: string
    update_type: string
    sequence_number: number
  }
}