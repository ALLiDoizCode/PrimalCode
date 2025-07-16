/**
 * TypeScript interfaces for Marketplace functionality
 */

export interface InferenceRequest {
  request_id: string;
  service_type: string;
  context_data: Record<string, unknown>;
  payment_amount: string;
  timeout: number;
  x_metadata?: Record<string, string>;
}

export interface InferenceRequestResponse {
  success: boolean;
  request_id: string;
  provider_id?: string;
  queue_position: number;
  estimated_completion: number;
  status: string;
  error?: string;
}

export interface RequestStatus {
  success: boolean;
  request_id: string;
  status: string;
  provider_id: string;
  created_at: number;
  timeout_at: number;
  error?: string;
}

export interface Provider {
  provider_id: string;
  capabilities: string[];
  pricing: Record<string, string>;
  description: string;
  x_tags_supported?: string[];
}

export interface ProviderRegistrationResponse {
  success: boolean;
  provider_id: string;
  status: string;
  error?: string;
}

export interface HealthCheckResponse {
  success: boolean;
  health: {
    is_healthy: boolean;
    last_heartbeat: number;
    error_count: number;
    uptime: number;
    memory_usage: number;
  };
  queue_stats: {
    high: number;
    medium: number;
    low: number;
    active: number;
  };
  total_providers: number;
  total_requests: number;
  version: string;
}

export interface MarketplaceStats {
  success: boolean;
  stats: {
    total_providers: number;
    active_providers: number;
    total_requests: number;
    active_requests: number;
    queued_requests: number;
    recent_transactions: number;
    average_response_time: number;
    success_rate: number;
  };
}

export interface MarketplaceClient {
  submitInferenceRequest(request: InferenceRequest): Promise<InferenceRequestResponse>;
  getRequestStatus(request_id: string): Promise<RequestStatus>;
  registerProvider(provider: Provider): Promise<ProviderRegistrationResponse>;
  healthCheck(): Promise<HealthCheckResponse>;
  getMarketplaceStats(): Promise<MarketplaceStats>;
  isProcessAvailable(): Promise<boolean>;
}