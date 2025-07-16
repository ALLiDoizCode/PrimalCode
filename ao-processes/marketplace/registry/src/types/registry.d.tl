-- Provider Registry Type Definitions
-- 
-- This file defines the core types for the provider registry system,
-- including provider registration, capability schemas, and service discovery.

local record ProviderCapability
  service_type: string
  description: string
  pricing_tier: string
  quality_score: number
  supported_x_tags: {string}
end

local record ProviderPricing
  {string: string} -- service_type -> token_cost mapping
end

local record ProviderReputation
  response_time_avg: number
  quality_score: number
  completion_rate: number
  total_requests: number
  last_updated: number
end

local record ProviderMetadata
  last_seen: number
  x_tags_supported: {string}
  description: string
  provider_version: string
  contact_info: string
end

local record InferenceProvider
  provider_id: string
  capabilities: {string}
  pricing: ProviderPricing
  reputation: ProviderReputation
  metadata: ProviderMetadata
  status: string -- "active" | "inactive" | "suspended"
  registered_at: number
  last_heartbeat: number
end

local record ProviderRegistrationData
  provider_id: string
  capabilities: {string}
  pricing: ProviderPricing
  description: string
  x_tags_supported: {string}
  contact_info: string
  provider_version: string
end

local record ServiceDiscoveryQuery
  service_type: string
  quality_tier: string
  max_cost: string
  timeout: number
  x_tags_required: {string}
end

local record ServiceDiscoveryResult
  provider_id: string
  score: number
  estimated_cost: string
  response_time_avg: number
  quality_score: number
end

local record HeartbeatData
  provider_id: string
  timestamp: number
  status: string
  performance_metrics: {string: number}
end

local record ProviderRegistryState
  providers: {string: InferenceProvider}
  service_discovery_cache: {string: {ServiceDiscoveryResult}}
  heartbeat_config: {
    timeout_seconds: number,
    cleanup_interval: number
  }
end

-- Registry Operations
local record RegistryOperations
  register_provider: function(ProviderRegistrationData): boolean, string
  deregister_provider: function(string): boolean, string
  update_heartbeat: function(HeartbeatData): boolean, string
  discover_services: function(ServiceDiscoveryQuery): {ServiceDiscoveryResult}
  get_provider_info: function(string): InferenceProvider | nil
  cleanup_inactive_providers: function(): number
end

return {
  ProviderCapability = ProviderCapability,
  ProviderPricing = ProviderPricing,
  ProviderReputation = ProviderReputation,
  ProviderMetadata = ProviderMetadata,
  InferenceProvider = InferenceProvider,
  ProviderRegistrationData = ProviderRegistrationData,
  ServiceDiscoveryQuery = ServiceDiscoveryQuery,
  ServiceDiscoveryResult = ServiceDiscoveryResult,
  HeartbeatData = HeartbeatData,
  ProviderRegistryState = ProviderRegistryState,
  RegistryOperations = RegistryOperations
}