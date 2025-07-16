-- Service Discovery Handler
--
-- Handles service discovery queries, provider matching, and capability-based
-- filtering for the AI inference marketplace provider registry.

local json = require("json")
local types = require("types.registry")

local ServiceDiscoveryHandler = {}

-- Calculate provider score based on multiple factors
local function calculate_provider_score(provider: types.InferenceProvider, query: types.ServiceDiscoveryQuery): number
  local score = 0.0
  
  -- Base score from quality rating (0-1)
  score = score + (provider.reputation.quality_score or 0.5) * 0.4
  
  -- Completion rate bonus (0-1)
  score = score + (provider.reputation.completion_rate or 0.0) * 0.3
  
  -- Response time penalty (lower is better)
  local response_time_score = 1.0
  if provider.reputation.response_time_avg > 0 then
    -- Normalize response time (assume 5 seconds is poor, 1 second is excellent)
    response_time_score = math.max(0, 1.0 - (provider.reputation.response_time_avg - 1.0) / 4.0)
  end
  score = score + response_time_score * 0.2
  
  -- Cost efficiency (lower cost is better, but weight it less)
  local cost_score = 0.5 -- default neutral score
  if query.max_cost and provider.pricing[query.service_type] then
    local provider_cost = tonumber(provider.pricing[query.service_type])
    local max_cost = tonumber(query.max_cost)
    
    if provider_cost and max_cost and provider_cost <= max_cost then
      -- Give higher score to lower cost providers
      cost_score = 1.0 - (provider_cost / max_cost) * 0.5
    elseif provider_cost and max_cost and provider_cost > max_cost then
      -- Heavily penalize providers over budget
      return 0.0
    end
  end
  score = score + cost_score * 0.1
  
  -- Clamp score to [0, 1]
  return math.min(1.0, math.max(0.0, score))
end

-- Check if provider matches query requirements
local function matches_query(provider: types.InferenceProvider, query: types.ServiceDiscoveryQuery): boolean
  -- Check if provider is active
  if provider.status ~= "active" then
    return false
  end
  
  -- Check if provider supports the requested service type
  local supports_service = false
  for _, capability in ipairs(provider.capabilities) do
    if capability == query.service_type then
      supports_service = true
      break
    end
  end
  
  if not supports_service then
    return false
  end
  
  -- Check cost constraints
  if query.max_cost and provider.pricing[query.service_type] then
    local provider_cost = tonumber(provider.pricing[query.service_type])
    local max_cost = tonumber(query.max_cost)
    
    if provider_cost and max_cost and provider_cost > max_cost then
      return false
    end
  end
  
  -- Check x-tag requirements
  if query.x_tags_required and #query.x_tags_required > 0 then
    local supported_tags = {}
    for _, tag in ipairs(provider.metadata.x_tags_supported) do
      supported_tags[tag] = true
    end
    
    for _, required_tag in ipairs(query.x_tags_required) do
      if not supported_tags[required_tag] then
        return false
      end
    end
  end
  
  return true
end

-- Discover services based on query
function ServiceDiscoveryHandler.discover_services(query: types.ServiceDiscoveryQuery): {types.ServiceDiscoveryResult}
  local results = {}
  
  -- Check cache first
  local cache_key = query.service_type .. ":" .. (query.quality_tier or "default") .. ":" .. (query.max_cost or "any")
  local cached_results = ProviderRegistry.service_discovery_cache[cache_key]
  
  if cached_results then
    -- Filter cached results by x-tag requirements if specified
    if query.x_tags_required and #query.x_tags_required > 0 then
      local filtered_results = {}
      for _, result in ipairs(cached_results) do
        local provider = ProviderRegistry.providers[result.provider_id]
        if provider and matches_query(provider, query) then
          table.insert(filtered_results, result)
        end
      end
      return filtered_results
    else
      return cached_results
    end
  end
  
  -- Perform fresh discovery
  for provider_id, provider in pairs(ProviderRegistry.providers) do
    if matches_query(provider, query) then
      local score = calculate_provider_score(provider, query)
      
      local result = {
        provider_id = provider_id,
        score = score,
        estimated_cost = provider.pricing[query.service_type] or "0",
        response_time_avg = provider.reputation.response_time_avg,
        quality_score = provider.reputation.quality_score
      }
      
      table.insert(results, result)
    end
  end
  
  -- Sort by score (highest first)
  table.sort(results, function(a, b)
    return a.score > b.score
  end)
  
  -- Cache results if no x-tag requirements (they make caching less effective)
  if not query.x_tags_required or #query.x_tags_required == 0 then
    ProviderRegistry.service_discovery_cache[cache_key] = results
  end
  
  return results
end

-- Get provider recommendations for a service type
function ServiceDiscoveryHandler.get_recommendations(service_type: string, limit: number): {types.ServiceDiscoveryResult}
  local query = {
    service_type = service_type,
    quality_tier = "any",
    max_cost = nil,
    timeout = 30,
    x_tags_required = {}
  }
  
  local results = ServiceDiscoveryHandler.discover_services(query)
  
  -- Apply limit
  if limit and limit > 0 then
    local limited_results = {}
    for i = 1, math.min(limit, #results) do
      table.insert(limited_results, results[i])
    end
    return limited_results
  end
  
  return results
end

-- Clear service discovery cache
function ServiceDiscoveryHandler.clear_cache(): number
  local cleared_count = 0
  
  for key, _ in pairs(ProviderRegistry.service_discovery_cache) do
    ProviderRegistry.service_discovery_cache[key] = nil
    cleared_count = cleared_count + 1
  end
  
  return cleared_count
end

-- Update cached results for a service type
function ServiceDiscoveryHandler.update_cache_for_service(service_type: string)
  -- Clear all cache entries for this service type
  local keys_to_clear = {}
  for key, _ in pairs(ProviderRegistry.service_discovery_cache) do
    if key:sub(1, #service_type) == service_type then
      table.insert(keys_to_clear, key)
    end
  end
  
  for _, key in ipairs(keys_to_clear) do
    ProviderRegistry.service_discovery_cache[key] = nil
  end
end

-- Handle Service-Discovery message
function ServiceDiscoveryHandler.handle_service_discovery(msg: any)
  local data = json.decode(msg.Data)
  
  if not data or not data.service_type then
    ao.send({
      Target = msg.From,
      Action = "Discovery-Error",
      Data = json.encode({
        error = "Service type is required",
        query = data
      })
    })
    return
  end
  
  -- Build query from message data
  local query = {
    service_type = data.service_type,
    quality_tier = data.quality_tier,
    max_cost = data.max_cost,
    timeout = data.timeout or 30,
    x_tags_required = data.x_tags_required or {}
  }
  
  local results = ServiceDiscoveryHandler.discover_services(query)
  
  -- Apply limit if specified
  local limit = data.limit or 10
  if limit > 0 and #results > limit then
    local limited_results = {}
    for i = 1, limit do
      table.insert(limited_results, results[i])
    end
    results = limited_results
  end
  
  ao.send({
    Target = msg.From,
    Action = "Discovery-Response",
    Data = json.encode({
      query = query,
      results = results,
      total_found = #results,
      timestamp = os.time()
    })
  })
end

-- Handle Service-Recommendations message
function ServiceDiscoveryHandler.handle_service_recommendations(msg: any)
  local data = json.decode(msg.Data)
  
  if not data or not data.service_type then
    ao.send({
      Target = msg.From,
      Action = "Recommendations-Error",
      Data = json.encode({
        error = "Service type is required",
        query = data
      })
    })
    return
  end
  
  local limit = data.limit or 5
  local results = ServiceDiscoveryHandler.get_recommendations(data.service_type, limit)
  
  ao.send({
    Target = msg.From,
    Action = "Recommendations-Response",
    Data = json.encode({
      service_type = data.service_type,
      recommendations = results,
      limit = limit,
      timestamp = os.time()
    })
  })
end

return ServiceDiscoveryHandler