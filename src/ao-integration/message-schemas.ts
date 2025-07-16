/**
 * AO Message Schemas for Monster Process Communication
 * Standardized message formats for MCP-to-AO communication
 */

// Base AO Message structure
export interface BaseAOMessage {
  Action: string;
  Data?: any;
  From?: string;
  Timestamp?: number;
  Tags?: Record<string, string>;
}

// Monster Decision Request
export interface MonsterDecisionMessage extends BaseAOMessage {
  Action: "Make-Decision";
  Data: {
    monster_id: string;
    context: {
      current_state: MonsterStateContext;
      environment: EnvironmentalContext;
      nearby_monsters: MonsterInfo[];
      player_influences: PlayerInfluence[];
    };
    decision_urgency: "low" | "medium" | "high";
  };
}

// Environment Modification Message
export interface EnvironmentModificationMessage extends BaseAOMessage {
  Action: "Environment-Change";
  Data: {
    route_id: string;
    modification: {
      type: string;
      location: { x: number; y: number };
      parameters: Record<string, any>;
      duration?: number;
    };
    player_id: string;
  };
}

// Monster Communication Message
export interface MonsterCommunicationMessage extends BaseAOMessage {
  Action: "Monster-Communication";
  Data: {
    message_type: "territory_claim" | "threat_warning" | "resource_share" | "pack_coordination";
    sender_id: string;
    target_id?: string;
    content: Record<string, any>;
    urgency: "low" | "medium" | "high";
  };
}

// State Query Messages
export interface GetStateMessage extends BaseAOMessage {
  Action: "Get-State";
}

export interface GetStatsMessage extends BaseAOMessage {
  Action: "Get-Stats";
}

export interface GetPersonalityMessage extends BaseAOMessage {
  Action: "Get-Personality";
}

// Health Check Message
export interface HealthCheckMessage extends BaseAOMessage {
  Action: "Health-Check";
}

// Process Control Messages
export interface ProcessRestartMessage extends BaseAOMessage {
  Action: "Process-Restart";
}

export interface EmergencyStopMessage extends BaseAOMessage {
  Action: "Emergency-Stop";
}

// Supporting Types
export interface MonsterStateContext {
  health: number;
  hunger: number;
  energy: number;
  position: {
    x: number;
    y: number;
    route: string;
  };
  current_state: string;
  last_decision: number;
}

export interface EnvironmentalContext {
  weather: string;
  time_of_day: string;
  resources_nearby: ResourceInfo[];
  structures_detected: StructureInfo[];
  temperature: number;
  visibility: number;
}

export interface MonsterInfo {
  id: string;
  species: string;
  distance: number;
  disposition: "friendly" | "neutral" | "hostile";
  size: "small" | "medium" | "large";
  last_seen: number;
}

export interface PlayerInfluence {
  player_id: string;
  influence_type: string;
  strength: number;
  timestamp: number;
  location: { x: number; y: number };
  success_rate: number;
}

export interface ResourceInfo {
  type: string;
  quantity: number;
  quality: number;
  distance: number;
  accessibility: number;
}

export interface StructureInfo {
  type: string;
  size: "small" | "medium" | "large";
  distance: number;
  condition: "new" | "good" | "damaged" | "ruins";
  purpose: string;
}

// Response Schemas
export interface MonsterStateResponse {
  success: boolean;
  data?: {
    monster_id: string;
    species: string;
    stats: {
      health: number;
      hunger: number;
      energy: number;
      position: {
        x: number;
        y: number;
        route: string;
      };
    };
    personality: {
      aggression: number;
      intelligence: number;
      pack_tendency: number;
      adaptation_rate: number;
    };
    current_state: string;
    last_decision: number;
    next_decision_at: number;
    environmental_awareness: {
      detected_structures: string[];
      weather_adaptation: number;
    };
    health_status: {
      is_healthy: boolean;
      uptime: number;
      last_heartbeat: number;
    };
  };
  error?: string;
  timestamp: number;
  version?: string;
}

export interface EnvironmentReactionResponse {
  success: boolean;
  data?: {
    monster_id: string;
    reaction: string;
    behavior_change: boolean;
    new_state?: string;
    distance_to_modification: number;
    detected: boolean;
    emotional_impact?: number;
    learning_recorded?: boolean;
  };
  error?: string;
  timestamp: number;
}

export interface HealthCheckResponse {
  success: boolean;
  data?: {
    monster_id: string;
    health_status: {
      is_healthy: boolean;
      uptime_seconds: number;
      uptime_hours: number;
      last_heartbeat: number;
      memory_usage_kb: number;
      error_count: number;
      last_decision_ago: number;
      next_decision_in: number;
    };
    issues: string[];
    performance_metrics: {
      decision_frequency: string;
      state_persistence: string;
      backup_frequency: string;
      process_version: string;
    };
    monster_vitals: {
      current_state: string;
      health: number;
      hunger: number;
      energy: number;
      last_state_update: number;
    };
  };
  error?: string;
  timestamp: number;
}

export interface CommunicationResponse {
  success: boolean;
  data?: {
    monster_id: string;
    received_from: string;
    message_type: string;
    response: string;
    behavior_change: boolean;
    new_state?: string;
    emotional_response?: string;
    learning_impact?: number;
  };
  error?: string;
  timestamp: number;
}

// Message Factory Functions
export function createGetStateMessage(): GetStateMessage {
  return {
    Action: "Get-State",
    From: "mcp-server",
    Timestamp: Date.now(),
    Tags: { Action: "Get-State" }
  };
}

export function createEnvironmentChangeMessage(
  routeId: string,
  modification: {
    type: string;
    location: { x: number; y: number };
    parameters: Record<string, any>;
    duration?: number;
  },
  playerId: string = "mcp_player"
): EnvironmentModificationMessage {
  return {
    Action: "Environment-Change",
    Data: {
      route_id: routeId,
      modification,
      player_id: playerId
    },
    From: "mcp-server",
    Timestamp: Date.now(),
    Tags: { Action: "Environment-Change" }
  };
}

export function createMonsterCommunicationMessage(
  messageType: "territory_claim" | "threat_warning" | "resource_share" | "pack_coordination",
  senderId: string,
  content: Record<string, any>,
  urgency: "low" | "medium" | "high" = "low",
  targetId?: string
): MonsterCommunicationMessage {
  return {
    Action: "Monster-Communication",
    Data: {
      message_type: messageType,
      sender_id: senderId,
      target_id: targetId,
      content,
      urgency
    },
    From: "mcp-server",
    Timestamp: Date.now(),
    Tags: { Action: "Monster-Communication" }
  };
}

export function createHealthCheckMessage(): HealthCheckMessage {
  return {
    Action: "Health-Check",
    From: "mcp-server",
    Timestamp: Date.now(),
    Tags: { Action: "Health-Check" }
  };
}

// Validation Functions
export function validateMonsterStateResponse(response: any): response is MonsterStateResponse {
  return (
    typeof response === 'object' &&
    typeof response.success === 'boolean' &&
    typeof response.timestamp === 'number' &&
    (response.success === false || (
      response.data &&
      typeof response.data.monster_id === 'string' &&
      typeof response.data.species === 'string' &&
      typeof response.data.stats === 'object'
    ))
  );
}

export function validateEnvironmentReactionResponse(response: any): response is EnvironmentReactionResponse {
  return (
    typeof response === 'object' &&
    typeof response.success === 'boolean' &&
    typeof response.timestamp === 'number' &&
    (response.success === false || (
      response.data &&
      typeof response.data.monster_id === 'string' &&
      typeof response.data.reaction === 'string' &&
      typeof response.data.behavior_change === 'boolean'
    ))
  );
}

export function validateHealthCheckResponse(response: any): response is HealthCheckResponse {
  return (
    typeof response === 'object' &&
    typeof response.success === 'boolean' &&
    typeof response.timestamp === 'number' &&
    (response.success === false || (
      response.data &&
      typeof response.data.monster_id === 'string' &&
      typeof response.data.health_status === 'object' &&
      typeof response.data.health_status.is_healthy === 'boolean'
    ))
  );
}