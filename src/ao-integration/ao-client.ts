/**
 * AO Client Integration for Monster Process Communication
 * Handles communication between MCP tools and AO monster processes
 */


export interface AOMessage {
  Action: string;
  Data?: any;
  From?: string;
  Timestamp?: number;
  Tags?: Record<string, string>;
}

export interface AOResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface MonsterState {
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
}

export class AOClient {
  private processId: string;
  private apiEndpoint: string;
  private timeout: number;

  constructor(processId: string, apiEndpoint: string = 'http://localhost:8080', timeout: number = 5000) {
    this.processId = processId;
    this.apiEndpoint = apiEndpoint;
    this.timeout = timeout;
  }

  /**
   * Send a message to the AO process
   */
  async sendMessage(action: string, data?: any): Promise<AOResponse> {
    const message: AOMessage = {
      Action: action,
      Data: data,
      From: 'mcp-server',
      Timestamp: Date.now(),
      Tags: { Action: action }
    };

    try {
      const response = await fetch(`${this.apiEndpoint}/process/${this.processId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result as AOResponse;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get current monster state
   */
  async getMonsterState(): Promise<MonsterState | null> {
    const response = await this.sendMessage('Get-State');
    
    if (response.success && response.data) {
      return response.data as MonsterState;
    }
    
    return null;
  }

  /**
   * Get basic monster stats only (lighter call)
   */
  async getMonsterStats(): Promise<Pick<MonsterState, 'monster_id' | 'stats' | 'current_state'> | null> {
    const response = await this.sendMessage('Get-Stats');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return null;
  }

  /**
   * Get monster personality traits
   */
  async getMonsterPersonality(): Promise<Pick<MonsterState, 'monster_id' | 'species' | 'personality'> | null> {
    const response = await this.sendMessage('Get-Personality');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return null;
  }

  /**
   * Notify monster of environmental changes
   */
  async notifyEnvironmentChange(modification: {
    type: string;
    location: { x: number; y: number };
    parameters: Record<string, any>;
    duration?: number;
  }): Promise<{
    monster_id: string;
    reaction: string;
    behavior_change: boolean;
    new_state?: string;
  } | null> {
    const response = await this.sendMessage('Environment-Change', {
      route_id: 'current_route',
      modification,
      player_id: 'mcp_player'
    });

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Perform health check on the monster process
   */
  async healthCheck(): Promise<{
    monster_id: string;
    health_status: {
      is_healthy: boolean;
      uptime_hours: number;
      memory_usage_kb: number;
      error_count: number;
      last_decision_ago: number;
      next_decision_in: number;
    };
    issues: string[];
  } | null> {
    const response = await this.sendMessage('Health-Check');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return null;
  }

  /**
   * Send communication to monster (from other monsters or system)
   */
  async sendMonsterCommunication(
    messageType: 'territory_claim' | 'threat_warning' | 'resource_share' | 'pack_coordination',
    senderId: string,
    content: Record<string, any>,
    urgency: 'low' | 'medium' | 'high' = 'low'
  ): Promise<{
    monster_id: string;
    response: string;
    behavior_change: boolean;
    new_state?: string;
  } | null> {
    const response = await this.sendMessage('Monster-Communication', {
      message_type: messageType,
      sender_id: senderId,
      content,
      urgency
    });

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Check if the AO process is available and responsive
   */
  async isProcessAvailable(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      return response !== null && response.health_status.is_healthy;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the process ID
   */
  getProcessId(): string {
    return this.processId;
  }

  /**
   * Update process configuration
   */
  setProcessId(processId: string): void {
    this.processId = processId;
  }

  setApiEndpoint(endpoint: string): void {
    this.apiEndpoint = endpoint;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}

/**
 * Create an AO client instance
 */
export function createAOClient(processId: string, apiEndpoint?: string, timeout?: number): AOClient {
  return new AOClient(processId, apiEndpoint, timeout);
}

/**
 * AO Client Manager for handling multiple monster processes
 */
export class AOClientManager {
  private clients: Map<string, AOClient> = new Map();
  private defaultEndpoint: string;
  private defaultTimeout: number;

  constructor(defaultEndpoint: string = 'http://localhost:8080', defaultTimeout: number = 5000) {
    this.defaultEndpoint = defaultEndpoint;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Add a monster process client
   */
  addClient(monsterId: string, processId: string): AOClient {
    const client = new AOClient(processId, this.defaultEndpoint, this.defaultTimeout);
    this.clients.set(monsterId, client);
    return client;
  }

  /**
   * Get client for a specific monster
   */
  getClient(monsterId: string): AOClient | undefined {
    return this.clients.get(monsterId);
  }

  /**
   * Get all clients
   */
  getAllClients(): Map<string, AOClient> {
    return this.clients;
  }

  /**
   * Remove a client
   */
  removeClient(monsterId: string): boolean {
    return this.clients.delete(monsterId);
  }

  /**
   * Check health of all monster processes
   */
  async checkAllHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();
    
    for (const [monsterId, client] of this.clients) {
      const isHealthy = await client.isProcessAvailable();
      healthStatus.set(monsterId, isHealthy);
    }

    return healthStatus;
  }

  /**
   * Broadcast environment change to all monsters
   */
  async broadcastEnvironmentChange(modification: {
    type: string;
    location: { x: number; y: number };
    parameters: Record<string, any>;
    duration?: number;
  }): Promise<Map<string, any>> {
    const responses = new Map<string, any>();

    for (const [monsterId, client] of this.clients) {
      try {
        const response = await client.notifyEnvironmentChange(modification);
        responses.set(monsterId, response);
      } catch (error) {
        responses.set(monsterId, { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return responses;
  }
}

// Export singleton instance
export const aoClientManager = new AOClientManager();