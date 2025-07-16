-- Validation Utilities
--
-- Provides validation functions for provider registry operations,
-- including schema validation and data sanitization.

local json = require("json")
local types = require("types.registry")

local ValidationUtils = {}

-- Valid service types supported by the marketplace
local VALID_SERVICE_TYPES = {
  ["text-generation"] = true,
  ["image-analysis"] = true,
  ["decision-making"] = true,
  ["code-generation"] = true,
  ["data-analysis"] = true,
  ["sentiment-analysis"] = true,
  ["translation"] = true,
  ["summarization"] = true,
  ["question-answering"] = true,
  ["content-moderation"] = true
}

-- Valid x-tags supported by the marketplace
local VALID_X_TAGS = {
  ["X-Context-Data"] = true,
  ["X-Quality-Tier"] = true,
  ["X-Timeout"] = true,
  ["X-Priority"] = true,
  ["X-Fallback-Enabled"] = true,
  ["X-Cache-Enabled"] = true,
  ["X-Streaming"] = true,
  ["X-Model-Preference"] = true
}

-- Valid provider statuses
local VALID_STATUSES = {
  ["active"] = true,
  ["inactive"] = true,
  ["suspended"] = true,
  ["maintenance"] = true
}

-- Valid quality tiers
local VALID_QUALITY_TIERS = {
  ["basic"] = true,
  ["standard"] = true,
  ["premium"] = true,
  ["enterprise"] = true
}

-- Validate service type
function ValidationUtils.validate_service_type(service_type: string): boolean, string
  if not service_type or service_type == "" then
    return false, "Service type cannot be empty"
  end
  
  if not VALID_SERVICE_TYPES[service_type] then
    return false, "Invalid service type: " .. service_type
  end
  
  return true, "Valid service type"
end

-- Validate x-tags
function ValidationUtils.validate_x_tags(x_tags: {string}): boolean, string
  if not x_tags then
    return true, "No x-tags to validate"
  end
  
  for _, tag in ipairs(x_tags) do
    if not VALID_X_TAGS[tag] then
      return false, "Invalid x-tag: " .. tag
    end
  end
  
  return true, "Valid x-tags"
end

-- Validate provider status
function ValidationUtils.validate_provider_status(status: string): boolean, string
  if not status or status == "" then
    return false, "Status cannot be empty"
  end
  
  if not VALID_STATUSES[status] then
    return false, "Invalid status: " .. status
  end
  
  return true, "Valid status"
end

-- Validate quality tier
function ValidationUtils.validate_quality_tier(quality_tier: string): boolean, string
  if not quality_tier or quality_tier == "" then
    return true, "Quality tier is optional"
  end
  
  if not VALID_QUALITY_TIERS[quality_tier] then
    return false, "Invalid quality tier: " .. quality_tier
  end
  
  return true, "Valid quality tier"
end

-- Validate pricing structure
function ValidationUtils.validate_pricing(pricing: types.ProviderPricing): boolean, string
  if not pricing then
    return false, "Pricing information is required"
  end
  
  local has_valid_pricing = false
  
  for service_type, cost in pairs(pricing) do
    -- Validate service type
    local valid_service, service_error = ValidationUtils.validate_service_type(service_type)
    if not valid_service then
      return false, service_error
    end
    
    -- Validate cost format
    local cost_num = tonumber(cost)
    if not cost_num or cost_num < 0 then
      return false, "Invalid pricing for " .. service_type .. ": must be non-negative number"
    end
    
    has_valid_pricing = true
  end
  
  if not has_valid_pricing then
    return false, "At least one service type pricing is required"
  end
  
  return true, "Valid pricing"
end

-- Validate capabilities list
function ValidationUtils.validate_capabilities(capabilities: {string}): boolean, string
  if not capabilities or #capabilities == 0 then
    return false, "At least one capability is required"
  end
  
  local unique_capabilities = {}
  
  for _, capability in ipairs(capabilities) do
    -- Check for duplicates
    if unique_capabilities[capability] then
      return false, "Duplicate capability: " .. capability
    end
    unique_capabilities[capability] = true
    
    -- Validate capability
    local valid_capability, capability_error = ValidationUtils.validate_service_type(capability)
    if not valid_capability then
      return false, capability_error
    end
  end
  
  return true, "Valid capabilities"
end

-- Validate provider ID format
function ValidationUtils.validate_provider_id(provider_id: string): boolean, string
  if not provider_id or provider_id == "" then
    return false, "Provider ID is required"
  end
  
  -- Check length
  if #provider_id < 3 or #provider_id > 64 then
    return false, "Provider ID must be between 3 and 64 characters"
  end
  
  -- Check format (alphanumeric, underscore, hyphen)
  if not provider_id:match("^[a-zA-Z0-9_-]+$") then
    return false, "Provider ID can only contain alphanumeric characters, underscores, and hyphens"
  end
  
  return true, "Valid provider ID"
end

-- Validate provider registration data
function ValidationUtils.validate_provider_registration(data: types.ProviderRegistrationData): boolean, string
  -- Validate provider ID
  local valid_id, id_error = ValidationUtils.validate_provider_id(data.provider_id)
  if not valid_id then
    return false, id_error
  end
  
  -- Validate capabilities
  local valid_capabilities, capabilities_error = ValidationUtils.validate_capabilities(data.capabilities)
  if not valid_capabilities then
    return false, capabilities_error
  end
  
  -- Validate pricing
  local valid_pricing, pricing_error = ValidationUtils.validate_pricing(data.pricing)
  if not valid_pricing then
    return false, pricing_error
  end
  
  -- Validate x-tags
  local valid_x_tags, x_tags_error = ValidationUtils.validate_x_tags(data.x_tags_supported)
  if not valid_x_tags then
    return false, x_tags_error
  end
  
  -- Validate description
  if data.description and #data.description > 500 then
    return false, "Description must be 500 characters or less"
  end
  
  -- Validate contact info
  if data.contact_info and #data.contact_info > 200 then
    return false, "Contact info must be 200 characters or less"
  end
  
  -- Validate provider version
  if data.provider_version and not data.provider_version:match("^%d+%.%d+%.%d+$") then
    return false, "Provider version must be in semantic versioning format (e.g., 1.0.0)"
  end
  
  -- Ensure pricing includes all capabilities
  for _, capability in ipairs(data.capabilities) do
    if not data.pricing[capability] then
      return false, "Pricing missing for capability: " .. capability
    end
  end
  
  return true, "Valid provider registration data"
end

-- Validate service discovery query
function ValidationUtils.validate_service_discovery_query(query: types.ServiceDiscoveryQuery): boolean, string
  -- Validate service type
  local valid_service, service_error = ValidationUtils.validate_service_type(query.service_type)
  if not valid_service then
    return false, service_error
  end
  
  -- Validate quality tier
  local valid_quality, quality_error = ValidationUtils.validate_quality_tier(query.quality_tier)
  if not valid_quality then
    return false, quality_error
  end
  
  -- Validate max cost
  if query.max_cost then
    local max_cost_num = tonumber(query.max_cost)
    if not max_cost_num or max_cost_num < 0 then
      return false, "Max cost must be a non-negative number"
    end
  end
  
  -- Validate timeout
  if query.timeout and (query.timeout <= 0 or query.timeout > 300) then
    return false, "Timeout must be between 1 and 300 seconds"
  end
  
  -- Validate x-tags
  local valid_x_tags, x_tags_error = ValidationUtils.validate_x_tags(query.x_tags_required)
  if not valid_x_tags then
    return false, x_tags_error
  end
  
  return true, "Valid service discovery query"
end

-- Validate heartbeat data
function ValidationUtils.validate_heartbeat_data(data: types.HeartbeatData): boolean, string
  -- Validate provider ID
  local valid_id, id_error = ValidationUtils.validate_provider_id(data.provider_id)
  if not valid_id then
    return false, id_error
  end
  
  -- Validate timestamp
  if data.timestamp and data.timestamp <= 0 then
    return false, "Timestamp must be positive"
  end
  
  -- Validate status
  if data.status then
    local valid_status, status_error = ValidationUtils.validate_provider_status(data.status)
    if not valid_status then
      return false, status_error
    end
  end
  
  -- Validate performance metrics
  if data.performance_metrics then
    for metric_name, metric_value in pairs(data.performance_metrics) do
      if type(metric_value) ~= "number" then
        return false, "Performance metric " .. metric_name .. " must be a number"
      end
      
      if metric_name == "response_time_avg" and metric_value < 0 then
        return false, "Response time average must be non-negative"
      end
      
      if metric_name == "quality_score" and (metric_value < 0 or metric_value > 1) then
        return false, "Quality score must be between 0 and 1"
      end
      
      if metric_name == "completion_rate" and (metric_value < 0 or metric_value > 1) then
        return false, "Completion rate must be between 0 and 1"
      end
    end
  end
  
  return true, "Valid heartbeat data"
end

-- Sanitize string input
function ValidationUtils.sanitize_string(input: string): string
  if not input then
    return ""
  end
  
  -- Remove potentially dangerous characters
  local sanitized = input:gsub("[<>\"'&]", "")
  
  -- Trim whitespace
  sanitized = sanitized:match("^%s*(.-)%s*$") or ""
  
  return sanitized
end

-- Get list of valid service types
function ValidationUtils.get_valid_service_types(): {string}
  local service_types = {}
  for service_type, _ in pairs(VALID_SERVICE_TYPES) do
    table.insert(service_types, service_type)
  end
  return service_types
end

-- Get list of valid x-tags
function ValidationUtils.get_valid_x_tags(): {string}
  local x_tags = {}
  for x_tag, _ in pairs(VALID_X_TAGS) do
    table.insert(x_tags, x_tag)
  end
  return x_tags
end

-- Get list of valid statuses
function ValidationUtils.get_valid_statuses(): {string}
  local statuses = {}
  for status, _ in pairs(VALID_STATUSES) do
    table.insert(statuses, status)
  end
  return statuses
end

-- Get list of valid quality tiers
function ValidationUtils.get_valid_quality_tiers(): {string}
  local quality_tiers = {}
  for quality_tier, _ in pairs(VALID_QUALITY_TIERS) do
    table.insert(quality_tiers, quality_tier)
  end
  return quality_tiers
end

return ValidationUtils