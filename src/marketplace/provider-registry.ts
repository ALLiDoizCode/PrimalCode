// Provider Registry TypeScript Client
//
// Provides a TypeScript client for interacting with the provider registry AO process,
// including registration, discovery, and heartbeat functionality.

import { AOClient } from '../ao/client';
import { AOMessage } from '../ao/types';

// Interface definitions matching the Teal types
export interface ProviderCapability {
  service_type: string;
  description: string;
  pricing_tier: string;
  quality_score: number;
  supported_x_tags: string[];
}

export interface ProviderPricing {
  [service_type: string]: string; // token cost as string
}

export interface ProviderReputation {
  response_time_avg: number;
  quality_score: number;
  completion_rate: number;
  total_requests: number;
  last_updated: number;
}

export interface ProviderMetadata {
  last_seen: number;
  x_tags_supported: string[];
  description: string;
  provider_version: string;
  contact_info: string;
}

export interface InferenceProvider {
  provider_id: string;
  capabilities: string[];
  pricing: ProviderPricing;
  reputation: ProviderReputation;
  metadata: ProviderMetadata;
  status: 'active' | 'inactive' | 'suspended';
  registered_at: number;
  last_heartbeat: number;
}

export interface ProviderRegistrationData {
  provider_id: string;
  capabilities: string[];
  pricing: ProviderPricing;
  description: string;
  x_tags_supported: string[];
  contact_info?: string;
  provider_version?: string;
}

export interface ServiceDiscoveryQuery {
  service_type: string;
  quality_tier?: string;
  max_cost?: string;
  timeout?: number;
  x_tags_required?: string[];
}

export interface ServiceDiscoveryResult {
  provider_id: string;
  score: number;
  estimated_cost: string;
  response_time_avg: number;
  quality_score: number;
}

export interface HeartbeatData {
  provider_id: string;
  timestamp?: number;
  status?: 'active' | 'inactive' | 'maintenance';
  performance_metrics?: {
    [metric_name: string]: number;
  };
}

export interface ProviderRegistryStatus {
  total_providers: number;
  active_providers: number;
  inactive_providers: number;
  suspended_providers: number;
  capabilities: Array<{
    service_type: string;
    provider_count: number;
  }>;
  cache_entries: number;
  heartbeat_config: {
    timeout_seconds: number;
    cleanup_interval: number;
  };
}

export interface ProviderHealth {
  provider_id: string;
  status: string;
  last_heartbeat: number;
  time_since_heartbeat: number;
  is_healthy: boolean;
  reputation: ProviderReputation;
  capabilities: string[];
}

export class ProviderRegistryClient {
  private aoClient: AOClient;
  private registryProcessId: string;

  constructor(aoClient: AOClient, registryProcessId: string) {
    this.aoClient = aoClient;
    this.registryProcessId = registryProcessId;
  }

  /**
   * Register a new provider or update existing provider
   */
  async registerProvider(registrationData: ProviderRegistrationData): Promise<{
    success: boolean;
    message: string;
    provider_id: string;
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Provider-Registration',
      Data: JSON.stringify(registrationData),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Registration-Success') {
      return JSON.parse(response.Data);
    } else if (response.Action === 'Registration-Error') {
      const errorData = JSON.parse(response.Data);
      throw new Error(`Registration failed: ${errorData.error}`);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Deregister a provider
   */
  async deregisterProvider(providerId: string): Promise<{
    success: boolean;
    message: string;
    provider_id: string;
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Provider-Deregistration',
      Data: JSON.stringify({ provider_id: providerId }),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Deregistration-Success') {
      return JSON.parse(response.Data);
    } else if (response.Action === 'Deregistration-Error') {
      const errorData = JSON.parse(response.Data);
      throw new Error(`Deregistration failed: ${errorData.error}`);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Discover services based on query parameters
   */
  async discoverServices(query: ServiceDiscoveryQuery): Promise<{
    query: ServiceDiscoveryQuery;
    results: ServiceDiscoveryResult[];
    total_found: number;
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Service-Discovery',
      Data: JSON.stringify(query),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Discovery-Response') {
      return JSON.parse(response.Data);
    } else if (response.Action === 'Discovery-Error') {
      const errorData = JSON.parse(response.Data);
      throw new Error(`Service discovery failed: ${errorData.error}`);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Get service recommendations for a specific service type
   */
  async getServiceRecommendations(serviceType: string, limit: number = 5): Promise<{
    service_type: string;
    recommendations: ServiceDiscoveryResult[];
    limit: number;
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Service-Recommendations',
      Data: JSON.stringify({ service_type: serviceType, limit }),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Recommendations-Response') {
      return JSON.parse(response.Data);
    } else if (response.Action === 'Recommendations-Error') {
      const errorData = JSON.parse(response.Data);
      throw new Error(`Service recommendations failed: ${errorData.error}`);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Send provider heartbeat
   */
  async sendHeartbeat(heartbeatData: HeartbeatData): Promise<{
    message: string;
    provider_id: string;
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Provider-Heartbeat',
      Data: JSON.stringify(heartbeatData),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Heartbeat-Success') {
      return JSON.parse(response.Data);
    } else if (response.Action === 'Heartbeat-Error') {
      const errorData = JSON.parse(response.Data);
      throw new Error(`Heartbeat failed: ${errorData.error}`);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Report provider performance metrics
   */
  async reportPerformance(
    providerId: string,
    responseTime: number,
    qualityScore: number,
    success: boolean
  ): Promise<{
    message: string;
    provider_id: string;
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Performance-Report',
      Data: JSON.stringify({
        provider_id: providerId,
        response_time: responseTime,
        quality_score: qualityScore,
        success,
      }),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Performance-Report-Success') {
      return JSON.parse(response.Data);
    } else if (response.Action === 'Performance-Report-Error') {
      const errorData = JSON.parse(response.Data);
      throw new Error(`Performance report failed: ${errorData.error}`);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Check provider health
   */
  async checkProviderHealth(providerId?: string): Promise<{
    health: ProviderHealth | { [providerId: string]: ProviderHealth };
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Provider-Health-Check',
      Data: JSON.stringify(providerId ? { provider_id: providerId } : {}),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Health-Check-Response') {
      return JSON.parse(response.Data);
    } else if (response.Action === 'Health-Check-Error') {
      const errorData = JSON.parse(response.Data);
      throw new Error(`Health check failed: ${errorData.error}`);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Get registry status
   */
  async getRegistryStatus(): Promise<{
    status: ProviderRegistryStatus;
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Registry-Status',
      Data: JSON.stringify({}),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Registry-Status-Response') {
      return JSON.parse(response.Data);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Clear service discovery cache
   */
  async clearCache(): Promise<{
    message: string;
    cleared_entries: number;
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Cache-Clear',
      Data: JSON.stringify({}),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Cache-Clear-Response') {
      return JSON.parse(response.Data);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Get provider information
   */
  async getProviderInfo(providerId?: string): Promise<{
    provider?: InferenceProvider;
    providers?: { [providerId: string]: InferenceProvider };
    total_count?: number;
    timestamp: number;
  }> {
    const message: AOMessage = {
      Target: this.registryProcessId,
      Action: 'Get-Registry-Info',
      Data: JSON.stringify(providerId ? { provider_id: providerId } : {}),
    };

    const response = await this.aoClient.sendMessage(message);
    
    if (response.Action === 'Registry-Info-Response') {
      return JSON.parse(response.Data);
    } else if (response.Action === 'Registry-Info-Error') {
      const errorData = JSON.parse(response.Data);
      throw new Error(`Registry info failed: ${errorData.error}`);
    } else {
      throw new Error(`Unexpected response: ${response.Action}`);
    }
  }

  /**
   * Start automated heartbeat for a provider
   */
  startHeartbeat(
    providerId: string,
    intervalSeconds: number = 60,
    performanceMetrics?: () => Promise<{ [key: string]: number }>
  ): ReturnType<typeof setInterval> {
    return setInterval(async () => {
      try {
        const heartbeatData: HeartbeatData = {
          provider_id: providerId,
          timestamp: Date.now() / 1000,
          status: 'active',
        };

        if (performanceMetrics) {
          heartbeatData.performance_metrics = await performanceMetrics();
        }

        await this.sendHeartbeat(heartbeatData);
      } catch (error) {
        // Silently handle heartbeat failures - in production, use proper logging
        // Heartbeat failed for provider - should be logged via proper logging system
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Stop automated heartbeat
   */
  stopHeartbeat(heartbeatTimer: ReturnType<typeof setInterval>): void {
    clearInterval(heartbeatTimer);
  }

  /**
   * Helper method to validate provider registration data
   */
  static validateRegistrationData(data: ProviderRegistrationData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.provider_id || data.provider_id.trim() === '') {
      errors.push('Provider ID is required');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(data.provider_id)) {
      errors.push('Provider ID can only contain alphanumeric characters, underscores, and hyphens');
    } else if (data.provider_id.length < 3 || data.provider_id.length > 64) {
      errors.push('Provider ID must be between 3 and 64 characters');
    }

    if (!data.capabilities || data.capabilities.length === 0) {
      errors.push('At least one capability is required');
    }

    if (!data.pricing || Object.keys(data.pricing).length === 0) {
      errors.push('Pricing information is required');
    } else {
      for (const [serviceType, cost] of Object.entries(data.pricing)) {
        const costNumber = Number(cost);
        if (isNaN(costNumber) || costNumber < 0) {
          errors.push(`Invalid pricing for ${serviceType}: must be non-negative number`);
        }
      }
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    if (data.contact_info && data.contact_info.length > 200) {
      errors.push('Contact info must be 200 characters or less');
    }

    if (data.provider_version && !/^\d+\.\d+\.\d+$/.test(data.provider_version)) {
      errors.push('Provider version must be in semantic versioning format (e.g., 1.0.0)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default ProviderRegistryClient;