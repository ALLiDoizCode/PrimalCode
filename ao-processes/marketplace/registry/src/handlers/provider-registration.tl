-- Provider Registration Handler
--
-- Handles provider registration, deregistration, and capability management
-- for the AI inference marketplace provider registry.

local json = require("json")
local types = require("types.registry")

local ProviderRegistrationHandler = {}

-- Initialize provider with default reputation and metadata
local function init_provider(data: types.ProviderRegistrationData, timestamp: number): types.InferenceProvider
  return {
    provider_id = data.provider_id,
    capabilities = data.capabilities,
    pricing = data.pricing,
    reputation = {
      response_time_avg = 0,
      quality_score = 0.5,
      completion_rate = 0,
      total_requests = 0,
      last_updated = timestamp
    },
    metadata = {
      last_seen = timestamp,
      x_tags_supported = data.x_tags_supported,
      description = data.description,
      provider_version = data.provider_version or "1.0.0",
      contact_info = data.contact_info or ""
    },
    status = "active",
    registered_at = timestamp,
    last_heartbeat = timestamp
  }
end

-- Validate provider registration data
local function validate_registration(data: types.ProviderRegistrationData): boolean, string
  if not data.provider_id or data.provider_id == "" then
    return false, "Provider ID is required"
  end
  
  if not data.capabilities or #data.capabilities == 0 then
    return false, "At least one capability is required"
  end
  
  if not data.pricing then
    return false, "Pricing information is required"
  end
  
  -- Validate capabilities against known service types
  local valid_service_types = {
    ["text-generation"] = true,
    ["image-analysis"] = true,
    ["decision-making"] = true,
    ["code-generation"] = true,
    ["data-analysis"] = true
  }
  
  for _, capability in ipairs(data.capabilities) do
    if not valid_service_types[capability] then
      return false, "Invalid service type: " .. capability
    end
  end
  
  -- Validate pricing format
  for service_type, cost in pairs(data.pricing) do
    if not valid_service_types[service_type] then
      return false, "Invalid pricing service type: " .. service_type
    end
    
    local cost_num = tonumber(cost)
    if not cost_num or cost_num < 0 then
      return false, "Invalid pricing for " .. service_type .. ": must be non-negative number"
    end
  end
  
  return true, "Valid registration data"
end

-- Register a new provider
function ProviderRegistrationHandler.register_provider(data: types.ProviderRegistrationData): boolean, string
  local valid, error_msg = validate_registration(data)
  if not valid then
    return false, error_msg
  end
  
  local timestamp = os.time()
  
  -- Check if provider already exists
  if ProviderRegistry.providers[data.provider_id] then
    -- Update existing provider
    local existing = ProviderRegistry.providers[data.provider_id]
    existing.capabilities = data.capabilities
    existing.pricing = data.pricing
    existing.metadata.description = data.description
    existing.metadata.x_tags_supported = data.x_tags_supported
    existing.metadata.last_seen = timestamp
    existing.metadata.provider_version = data.provider_version or existing.metadata.provider_version
    existing.metadata.contact_info = data.contact_info or existing.metadata.contact_info
    existing.status = "active"
    existing.last_heartbeat = timestamp
    
    -- Invalidate service discovery cache for updated capabilities
    for _, capability in ipairs(data.capabilities) do
      ProviderRegistry.service_discovery_cache[capability] = nil
    end
    
    return true, "Provider updated successfully"
  else
    -- Create new provider
    local provider = init_provider(data, timestamp)
    ProviderRegistry.providers[data.provider_id] = provider
    
    -- Invalidate service discovery cache for new capabilities
    for _, capability in ipairs(data.capabilities) do
      ProviderRegistry.service_discovery_cache[capability] = nil
    end
    
    return true, "Provider registered successfully"
  end
end

-- Deregister a provider
function ProviderRegistrationHandler.deregister_provider(provider_id: string): boolean, string
  if not provider_id or provider_id == "" then
    return false, "Provider ID is required"
  end
  
  local provider = ProviderRegistry.providers[provider_id]
  if not provider then
    return false, "Provider not found"
  end
  
  -- Invalidate service discovery cache for removed capabilities
  for _, capability in ipairs(provider.capabilities) do
    ProviderRegistry.service_discovery_cache[capability] = nil
  end
  
  -- Remove provider from registry
  ProviderRegistry.providers[provider_id] = nil
  
  return true, "Provider deregistered successfully"
end

-- Update provider capabilities
function ProviderRegistrationHandler.update_capabilities(provider_id: string, capabilities: {string}, pricing: types.ProviderPricing): boolean, string
  if not provider_id or provider_id == "" then
    return false, "Provider ID is required"
  end
  
  local provider = ProviderRegistry.providers[provider_id]
  if not provider then
    return false, "Provider not found"
  end
  
  -- Validate new capabilities
  local registration_data = {
    provider_id = provider_id,
    capabilities = capabilities,
    pricing = pricing,
    description = provider.metadata.description,
    x_tags_supported = provider.metadata.x_tags_supported
  }
  
  local valid, error_msg = validate_registration(registration_data)
  if not valid then
    return false, error_msg
  end
  
  -- Invalidate cache for old capabilities
  for _, capability in ipairs(provider.capabilities) do
    ProviderRegistry.service_discovery_cache[capability] = nil
  end
  
  -- Update provider
  provider.capabilities = capabilities
  provider.pricing = pricing
  provider.metadata.last_seen = os.time()
  
  -- Invalidate cache for new capabilities
  for _, capability in ipairs(capabilities) do
    ProviderRegistry.service_discovery_cache[capability] = nil
  end
  
  return true, "Provider capabilities updated successfully"
end

-- Get provider information
function ProviderRegistrationHandler.get_provider_info(provider_id: string): types.InferenceProvider | nil
  return ProviderRegistry.providers[provider_id]
end

-- List all registered providers
function ProviderRegistrationHandler.list_providers(): {string: types.InferenceProvider}
  return ProviderRegistry.providers
end

-- Handle Provider-Registration message
function ProviderRegistrationHandler.handle_provider_registration(msg: any)
  local data = json.decode(msg.Data)
  
  if not data then
    ao.send({
      Target = msg.From,
      Action = "Registration-Error",
      Data = json.encode({
        error = "Invalid JSON data",
        provider_id = nil
      })
    })
    return
  end
  
  local success, message = ProviderRegistrationHandler.register_provider(data)
  
  if success then
    ao.send({
      Target = msg.From,
      Action = "Registration-Success",
      Data = json.encode({
        message = message,
        provider_id = data.provider_id,
        timestamp = os.time()
      })
    })
  else
    ao.send({
      Target = msg.From,
      Action = "Registration-Error",
      Data = json.encode({
        error = message,
        provider_id = data.provider_id
      })
    })
  end
end

-- Handle Provider-Deregistration message
function ProviderRegistrationHandler.handle_provider_deregistration(msg: any)
  local data = json.decode(msg.Data)
  
  if not data or not data.provider_id then
    ao.send({
      Target = msg.From,
      Action = "Deregistration-Error",
      Data = json.encode({
        error = "Provider ID is required",
        provider_id = nil
      })
    })
    return
  end
  
  local success, message = ProviderRegistrationHandler.deregister_provider(data.provider_id)
  
  if success then
    ao.send({
      Target = msg.From,
      Action = "Deregistration-Success",
      Data = json.encode({
        message = message,
        provider_id = data.provider_id,
        timestamp = os.time()
      })
    })
  else
    ao.send({
      Target = msg.From,
      Action = "Deregistration-Error",
      Data = json.encode({
        error = message,
        provider_id = data.provider_id
      })
    })
  end
end

return ProviderRegistrationHandler