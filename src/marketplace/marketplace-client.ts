/**
 * Marketplace Client Integration for AI Inference Request Processing
 * Handles communication between MCP tools and AO marketplace processes
 */


export interface MarketplaceMessage {
  Action: string;
  Data?: any;
  From?: string;
  Timestamp?: number;
  Tags?: Record<string, string>;
}

export interface MarketplaceResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface InferenceRequest {
  request_id: string;
  requester: string;
  provider_id: string;
  service_type: string;
  context_data: any;
  payment_amount: string;
  x_metadata: Record<string, string>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: number;
  timeout_at: number;
}

export interface InferenceProvider {
  provider_id: string;
  capabilities: string[];
  pricing: Record<string, string>;
  reputation: {
    response_time_avg: number;
    quality_score: number;
    completion_rate: number;
    total_requests: number;
  };
  metadata: {
    last_seen: number;
    x_tags_supported: string[];
    description: string;
  };
  status: 'active' | 'inactive' | 'suspended';
}

export interface MarketplaceTransaction {
  transaction_id: string;
  request_id: string;
  from_process: string;
  to_process: string;
  amount: string;
  service_type: string;
  success: boolean;
  timestamp: number;
  credit_notice_sent: boolean;
  debit_notice_sent: boolean;
}

export interface MarketplaceHealth {
  is_healthy: boolean;
  last_heartbeat: number;
  error_count: number;
  uptime: number;
  memory_usage: number;
}

export interface MarketplaceState {
  providers: Record<string, InferenceProvider>;
  active_requests: Record<string, InferenceRequest>;
  transactions: Record<string, MarketplaceTransaction>;
  total_requests: number;
  total_providers: number;
  last_cleanup: number;
  process_health: MarketplaceHealth;
}

export class MarketplaceClient {
  private processId: string;
  private apiEndpoint: string;
  private timeout: number;

  constructor(processId: string, apiEndpoint: string = 'http://localhost:8081', timeout: number = 5000) {
    this.processId = processId;
    this.apiEndpoint = apiEndpoint;
    this.timeout = timeout;
  }

  /**
   * Send a message to the marketplace AO process
   */
  async sendMessage(action: string, data?: any, tags?: Record<string, string>): Promise<MarketplaceResponse> {
    const message: MarketplaceMessage = {
      Action: action,
      Data: data,
      From: 'mcp-server',
      Timestamp: Date.now(),
      Tags: { Action: action, ...tags }
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
      return result as MarketplaceResponse;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Submit an AI inference request to the marketplace
   */
  async submitInferenceRequest(request: {
    request_id: string;
    service_type: string;
    context_data: any;
    payment_amount: string;
    timeout?: number;
    x_metadata?: Record<string, string>;
  }): Promise<{
    success: boolean;
    request_id: string;
    provider_id?: string;
    queue_position?: number;
    estimated_completion?: number;
    status?: string;
    error?: string;
  }> {
    const tags: Record<string, string> = {
      'X-Service-Type': request.service_type,
      'X-Request-ID': request.request_id,
      'X-Timeout': (request.timeout || 30).toString(),
      ...request.x_metadata
    };

    const response = await this.sendMessage('AI-Inference-Request', {
      request_id: request.request_id,
      service_type: request.service_type,
      context_data: request.context_data,
      payment_amount: request.payment_amount,
      timeout: request.timeout || 30
    }, tags);

    if (response.success) {
      return {
        success: true,
        request_id: response.data.request_id,
        provider_id: response.data.provider_id,
        queue_position: response.data.queue_position,
        estimated_completion: response.data.estimated_completion,
        status: response.data.status
      };
    } else {
      return {
        success: false,
        request_id: request.request_id,
        error: response.error || 'Unknown error'
      };
    }
  }

  /**
   * Register a provider with the marketplace
   */
  async registerProvider(provider: {
    provider_id: string;
    capabilities: string[];
    pricing: Record<string, string>;
    description?: string;
    x_tags_supported?: string[];
  }): Promise<{
    success: boolean;
    provider_id: string;
    status?: string;
    error?: string;
  }> {
    const response = await this.sendMessage('Provider-Registration', {
      provider_id: provider.provider_id,
      capabilities: provider.capabilities,
      pricing: provider.pricing,
      description: provider.description || 'AI inference provider',
      x_tags_supported: provider.x_tags_supported || []
    });

    if (response.success) {
      return {
        success: true,
        provider_id: response.data.provider_id,
        status: response.data.status
      };
    } else {
      return {
        success: false,
        provider_id: provider.provider_id,
        error: response.error || 'Unknown error'
      };
    }
  }

  /**
   * Get request status
   */
  async getRequestStatus(request_id: string): Promise<{
    success: boolean;
    request_id: string;
    status?: string;
    provider_id?: string;
    created_at?: number;
    timeout_at?: number;
    error?: string;
  }> {
    const response = await this.sendMessage('Request-Status', {
      request_id: request_id
    });

    if (response.success) {
      return {
        success: true,
        request_id: response.data.request_id,
        status: response.data.status,
        provider_id: response.data.provider_id,
        created_at: response.data.created_at,
        timeout_at: response.data.timeout_at
      };
    } else {
      return {
        success: false,
        request_id: request_id,
        error: response.error || 'Unknown error'
      };
    }
  }

  /**
   * Send Credit-Notice (payment received)
   */
  async sendCreditNotice(payment: {
    sender: string;
    quantity: string;
    message: string;
    request_id?: string;
    service_type?: string;
    provider_id?: string;
    x_metadata?: Record<string, string>;
  }): Promise<{
    success: boolean;
    transaction_id?: string;
    amount?: string;
    error?: string;
  }> {
    const tags: Record<string, string> = {
      ...payment.x_metadata
    };

    if (payment.request_id) {
      tags['X-Request-ID'] = payment.request_id;
    }
    if (payment.service_type) {
      tags['X-Service-Type'] = payment.service_type;
    }
    if (payment.provider_id) {
      tags['X-Provider-ID'] = payment.provider_id;
    }

    const response = await this.sendMessage('Credit-Notice', {
      sender: payment.sender,
      quantity: payment.quantity,
      message: payment.message
    }, tags);

    if (response.success) {
      return {
        success: true,
        transaction_id: response.data.transaction_id,
        amount: response.data.amount
      };
    } else {
      return {
        success: false,
        error: response.error || 'Unknown error'
      };
    }
  }

  /**
   * Send Debit-Notice (payment sent)
   */
  async sendDebitNotice(payment: {
    recipient: string;
    quantity: string;
    message: string;
    request_id?: string;
    service_type?: string;
    provider_id?: string;
    x_metadata?: Record<string, string>;
  }): Promise<{
    success: boolean;
    transaction_id?: string;
    amount?: string;
    error?: string;
  }> {
    const tags: Record<string, string> = {
      ...payment.x_metadata
    };

    if (payment.request_id) {
      tags['X-Request-ID'] = payment.request_id;
    }
    if (payment.service_type) {
      tags['X-Service-Type'] = payment.service_type;
    }
    if (payment.provider_id) {
      tags['X-Provider-ID'] = payment.provider_id;
    }

    const response = await this.sendMessage('Debit-Notice', {
      recipient: payment.recipient,
      quantity: payment.quantity,
      message: payment.message
    }, tags);

    if (response.success) {
      return {
        success: true,
        transaction_id: response.data.transaction_id,
        amount: response.data.amount
      };
    } else {
      return {
        success: false,
        error: response.error || 'Unknown error'
      };
    }
  }

  /**
   * Perform marketplace health check
   */
  async healthCheck(): Promise<{
    success: boolean;
    health?: MarketplaceHealth;
    queue_stats?: Record<string, number>;
    total_providers?: number;
    total_requests?: number;
    version?: string;
    error?: string;
  }> {
    const response = await this.sendMessage('Health-Check');

    if (response.success) {
      return {
        success: true,
        health: response.data.health,
        queue_stats: response.data.queue_stats,
        total_providers: response.data.total_providers,
        total_requests: response.data.total_requests,
        version: response.data.version
      };
    } else {
      return {
        success: false,
        error: response.error || 'Unknown error'
      };
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<{
    success: boolean;
    stats?: {
      total_providers: number;
      active_providers: number;
      total_requests: number;
      active_requests: number;
      queued_requests: number;
      recent_transactions: number;
      average_response_time: number;
      success_rate: number;
    };
    error?: string;
  }> {
    const healthResponse = await this.healthCheck();
    
    if (!healthResponse.success) {
      return {
        success: false,
        error: healthResponse.error
      };
    }

    // Calculate additional statistics
    const queueStats = healthResponse.queue_stats || {};
    const totalQueued = (queueStats.high || 0) + (queueStats.medium || 0) + (queueStats.low || 0);
    
    return {
      success: true,
      stats: {
        total_providers: healthResponse.total_providers || 0,
        active_providers: 0, // Would need additional API call
        total_requests: healthResponse.total_requests || 0,
        active_requests: queueStats.active || 0,
        queued_requests: totalQueued,
        recent_transactions: 0, // Would need additional API call
        average_response_time: 0, // Would need additional API call
        success_rate: 0 // Would need additional API call
      }
    };
  }

  /**
   * Check if the marketplace process is available and responsive
   */
  async isProcessAvailable(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      return response.success && response.health?.is_healthy === true;
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
 * Create a marketplace client instance
 */
export function createMarketplaceClient(processId: string, apiEndpoint?: string, timeout?: number): MarketplaceClient {
  return new MarketplaceClient(processId, apiEndpoint, timeout);
}

/**
 * Marketplace Client Manager for handling multiple marketplace processes
 */
export class MarketplaceClientManager {
  private clients: Map<string, MarketplaceClient> = new Map();
  private defaultEndpoint: string;
  private defaultTimeout: number;

  constructor(defaultEndpoint: string = 'http://localhost:8081', defaultTimeout: number = 5000) {
    this.defaultEndpoint = defaultEndpoint;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Add a marketplace process client
   */
  addClient(marketplaceId: string, processId: string): MarketplaceClient {
    const client = new MarketplaceClient(processId, this.defaultEndpoint, this.defaultTimeout);
    this.clients.set(marketplaceId, client);
    return client;
  }

  /**
   * Get client for a specific marketplace
   */
  getClient(marketplaceId: string): MarketplaceClient | undefined {
    return this.clients.get(marketplaceId);
  }

  /**
   * Get all clients
   */
  getAllClients(): Map<string, MarketplaceClient> {
    return this.clients;
  }

  /**
   * Remove a client
   */
  removeClient(marketplaceId: string): boolean {
    return this.clients.delete(marketplaceId);
  }

  /**
   * Check health of all marketplace processes
   */
  async checkAllHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();
    
    for (const [marketplaceId, client] of this.clients) {
      const isHealthy = await client.isProcessAvailable();
      healthStatus.set(marketplaceId, isHealthy);
    }

    return healthStatus;
  }
}

// Export singleton instance
export const marketplaceClientManager = new MarketplaceClientManager();