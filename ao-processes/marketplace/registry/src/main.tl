-- Provider Registry AO Process
--
-- Main entry point for the AI inference marketplace provider registry.
-- Handles provider registration, service discovery, and reputation tracking.

local json = require("json")
local types = require("types.registry")
local ProviderRegistrationHandler = require("handlers.provider-registration")
local ServiceDiscoveryHandler = require("handlers.service-discovery")
local ReputationTrackingHandler = require("handlers.reputation-tracking")
local ValidationUtils = require("utils.validation-utils")

-- Initialize global registry state
ProviderRegistry = {
  providers = {},
  service_discovery_cache = {},
  heartbeat_config = {
    timeout_seconds = 300, -- 5 minutes
    cleanup_interval = 60  -- 1 minute
  }
}

-- Process initialization
function InitializeRegistry()
  print("Initializing Provider Registry AO Process...")
  
  -- Set up periodic cleanup
  ao.send({
    Target = ao.id,
    Action = "Cron-Cleanup",
    Data = json.encode({
      message = "Starting periodic cleanup"
    })
  })
  
  print("Provider Registry initialized successfully")
end

-- Handle incoming messages
local function handle_message(msg)
  local action = msg.Action
  
  if action == "Provider-Registration" then
    ProviderRegistrationHandler.handle_provider_registration(msg)
    
  elseif action == "Provider-Deregistration" then
    ProviderRegistrationHandler.handle_provider_deregistration(msg)
    
  elseif action == "Service-Discovery" then
    ServiceDiscoveryHandler.handle_service_discovery(msg)
    
  elseif action == "Service-Recommendations" then
    ServiceDiscoveryHandler.handle_service_recommendations(msg)
    
  elseif action == "Provider-Heartbeat" then
    ReputationTrackingHandler.handle_provider_heartbeat(msg)
    
  elseif action == "Performance-Report" then
    ReputationTrackingHandler.handle_performance_report(msg)
    
  elseif action == "Provider-Health-Check" then
    ReputationTrackingHandler.handle_provider_health_check(msg)
    
  elseif action == "Registry-Status" then
    handle_registry_status(msg)
    
  elseif action == "Cache-Clear" then
    handle_cache_clear(msg)
    
  elseif action == "Cron-Cleanup" then
    handle_cleanup_cron(msg)
    
  elseif action == "Get-Registry-Info" then
    handle_get_registry_info(msg)
    
  else
    -- Unknown action
    ao.send({
      Target = msg.From,
      Action = "Error",
      Data = json.encode({
        error = "Unknown action: " .. (action or "nil"),
        available_actions = {
          "Provider-Registration",
          "Provider-Deregistration",
          "Service-Discovery",
          "Service-Recommendations",
          "Provider-Heartbeat",
          "Performance-Report",
          "Provider-Health-Check",
          "Registry-Status",
          "Cache-Clear",
          "Get-Registry-Info"
        }
      })
    })
  end
end

-- Handle registry status request
function handle_registry_status(msg)
  local active_providers = 0
  local inactive_providers = 0
  local suspended_providers = 0
  local total_capabilities = {}
  
  for provider_id, provider in pairs(ProviderRegistry.providers) do
    if provider.status == "active" then
      active_providers = active_providers + 1
    elseif provider.status == "inactive" then
      inactive_providers = inactive_providers + 1
    elseif provider.status == "suspended" then
      suspended_providers = suspended_providers + 1
    end
    
    -- Collect unique capabilities
    for _, capability in ipairs(provider.capabilities) do
      total_capabilities[capability] = (total_capabilities[capability] or 0) + 1
    end
  end
  
  local capabilities_list = {}
  for capability, count in pairs(total_capabilities) do
    table.insert(capabilities_list, {
      service_type = capability,
      provider_count = count
    })
  end
  
  ao.send({
    Target = msg.From,
    Action = "Registry-Status-Response",
    Data = json.encode({
      status = {
        total_providers = active_providers + inactive_providers + suspended_providers,
        active_providers = active_providers,
        inactive_providers = inactive_providers,
        suspended_providers = suspended_providers,
        capabilities = capabilities_list,
        cache_entries = #ProviderRegistry.service_discovery_cache,
        heartbeat_config = ProviderRegistry.heartbeat_config
      },
      timestamp = os.time()
    })
  })
end

-- Handle cache clear request
function handle_cache_clear(msg)
  local cleared_count = ServiceDiscoveryHandler.clear_cache()
  
  ao.send({
    Target = msg.From,
    Action = "Cache-Clear-Response",
    Data = json.encode({
      message = "Cache cleared successfully",
      cleared_entries = cleared_count,
      timestamp = os.time()
    })
  })
end

-- Handle cleanup cron job
function handle_cleanup_cron(msg)
  local cleaned_up = ReputationTrackingHandler.cleanup_inactive_providers()
  
  -- Schedule next cleanup
  ao.send({
    Target = ao.id,
    Action = "Cron-Cleanup",
    Data = json.encode({
      message = "Periodic cleanup completed",
      cleaned_up_providers = cleaned_up
    }),
    Delay = ProviderRegistry.heartbeat_config.cleanup_interval * 1000 -- Convert to milliseconds
  })
  
  if cleaned_up > 0 then
    print("Cleaned up " .. cleaned_up .. " inactive providers")
  end
end

-- Handle get registry info request
function handle_get_registry_info(msg)
  local data = json.decode(msg.Data)
  
  if data and data.provider_id then
    -- Get specific provider info
    local provider = ProviderRegistrationHandler.get_provider_info(data.provider_id)
    
    if provider then
      ao.send({
        Target = msg.From,
        Action = "Registry-Info-Response",
        Data = json.encode({
          provider = provider,
          timestamp = os.time()
        })
      })
    else
      ao.send({
        Target = msg.From,
        Action = "Registry-Info-Error",
        Data = json.encode({
          error = "Provider not found",
          provider_id = data.provider_id
        })
      })
    end
  else
    -- Get all providers info
    local all_providers = ProviderRegistrationHandler.list_providers()
    
    ao.send({
      Target = msg.From,
      Action = "Registry-Info-Response",
      Data = json.encode({
        providers = all_providers,
        total_count = #all_providers,
        timestamp = os.time()
      })
    })
  end
end

-- Health check endpoint
function handle_health_check(msg)
  local current_time = os.time()
  local active_count = 0
  
  for _, provider in pairs(ProviderRegistry.providers) do
    if provider.status == "active" then
      active_count = active_count + 1
    end
  end
  
  ao.send({
    Target = msg.From,
    Action = "Health-Check-Response",
    Data = json.encode({
      status = "healthy",
      process_id = ao.id,
      timestamp = current_time,
      active_providers = active_count,
      total_providers = #ProviderRegistry.providers,
      uptime = current_time - (ProviderRegistry.start_time or current_time)
    })
  })
end

-- Message handler registration
Handlers.add(
  "ProviderRegistry",
  Handlers.utils.hasMatchingTag("Action", "Provider-Registration"),
  handle_message
)

Handlers.add(
  "ProviderDeregistration",
  Handlers.utils.hasMatchingTag("Action", "Provider-Deregistration"),
  handle_message
)

Handlers.add(
  "ServiceDiscovery",
  Handlers.utils.hasMatchingTag("Action", "Service-Discovery"),
  handle_message
)

Handlers.add(
  "ServiceRecommendations",
  Handlers.utils.hasMatchingTag("Action", "Service-Recommendations"),
  handle_message
)

Handlers.add(
  "ProviderHeartbeat",
  Handlers.utils.hasMatchingTag("Action", "Provider-Heartbeat"),
  handle_message
)

Handlers.add(
  "PerformanceReport",
  Handlers.utils.hasMatchingTag("Action", "Performance-Report"),
  handle_message
)

Handlers.add(
  "ProviderHealthCheck",
  Handlers.utils.hasMatchingTag("Action", "Provider-Health-Check"),
  handle_message
)

Handlers.add(
  "RegistryStatus",
  Handlers.utils.hasMatchingTag("Action", "Registry-Status"),
  handle_message
)

Handlers.add(
  "CacheClear",
  Handlers.utils.hasMatchingTag("Action", "Cache-Clear"),
  handle_message
)

Handlers.add(
  "CronCleanup",
  Handlers.utils.hasMatchingTag("Action", "Cron-Cleanup"),
  handle_message
)

Handlers.add(
  "GetRegistryInfo",
  Handlers.utils.hasMatchingTag("Action", "Get-Registry-Info"),
  handle_message
)

Handlers.add(
  "HealthCheck",
  Handlers.utils.hasMatchingTag("Action", "Health-Check"),
  handle_health_check
)

-- Initialize the registry
ProviderRegistry.start_time = os.time()
InitializeRegistry()

-- Export for testing
return {
  handle_message = handle_message,
  ProviderRegistry = ProviderRegistry,
  ValidationUtils = ValidationUtils,
  ProviderRegistrationHandler = ProviderRegistrationHandler,
  ServiceDiscoveryHandler = ServiceDiscoveryHandler,
  ReputationTrackingHandler = ReputationTrackingHandler
}