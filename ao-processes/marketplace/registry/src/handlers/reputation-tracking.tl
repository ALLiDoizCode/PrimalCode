-- Reputation Tracking Handler
--
-- Manages provider reputation, performance metrics, and heartbeat monitoring
-- for the AI inference marketplace provider registry.

local json = require("json")
local types = require("types.registry")

local ReputationTrackingHandler = {}

-- Update provider reputation based on performance metrics
local function update_reputation(provider: types.InferenceProvider, response_time: number, quality_score: number, success: boolean)
  local reputation = provider.reputation
  
  -- Update total requests count
  reputation.total_requests = reputation.total_requests + 1
  
  -- Update completion rate (exponential moving average)
  local alpha = 0.1 -- learning rate
  local completion_value = success and 1.0 or 0.0
  reputation.completion_rate = reputation.completion_rate * (1 - alpha) + completion_value * alpha
  
  -- Update response time (exponential moving average)
  if response_time > 0 then
    if reputation.response_time_avg > 0 then
      reputation.response_time_avg = reputation.response_time_avg * (1 - alpha) + response_time * alpha
    else
      reputation.response_time_avg = response_time
    end
  end
  
  -- Update quality score (exponential moving average)
  if quality_score >= 0 and quality_score <= 1 then
    reputation.quality_score = reputation.quality_score * (1 - alpha) + quality_score * alpha
  end
  
  -- Update timestamp
  reputation.last_updated = os.time()
  
  -- Clear service discovery cache for this provider's capabilities
  for _, capability in ipairs(provider.capabilities) do
    ProviderRegistry.service_discovery_cache[capability] = nil
  end
end

-- Update provider heartbeat
function ReputationTrackingHandler.update_heartbeat(data: types.HeartbeatData): boolean, string
  if not data.provider_id or data.provider_id == "" then
    return false, "Provider ID is required"
  end
  
  local provider = ProviderRegistry.providers[data.provider_id]
  if not provider then
    return false, "Provider not found"
  end
  
  -- Update heartbeat timestamp
  provider.last_heartbeat = data.timestamp or os.time()
  provider.metadata.last_seen = provider.last_heartbeat
  
  -- Update status if provided
  if data.status then
    if data.status == "active" or data.status == "inactive" or data.status == "maintenance" then
      provider.status = data.status
    else
      return false, "Invalid status: " .. data.status
    end
  end
  
  -- Update performance metrics if provided
  if data.performance_metrics then
    if data.performance_metrics.response_time_avg then
      provider.reputation.response_time_avg = data.performance_metrics.response_time_avg
    end
    
    if data.performance_metrics.quality_score then
      provider.reputation.quality_score = data.performance_metrics.quality_score
    end
    
    if data.performance_metrics.completion_rate then
      provider.reputation.completion_rate = data.performance_metrics.completion_rate
    end
    
    provider.reputation.last_updated = provider.last_heartbeat
  end
  
  -- Clear service discovery cache for this provider's capabilities
  for _, capability in ipairs(provider.capabilities) do
    ProviderRegistry.service_discovery_cache[capability] = nil
  end
  
  return true, "Heartbeat updated successfully"
end

-- Report provider performance (called by marketplace core)
function ReputationTrackingHandler.report_performance(provider_id: string, response_time: number, quality_score: number, success: boolean): boolean, string
  if not provider_id or provider_id == "" then
    return false, "Provider ID is required"
  end
  
  local provider = ProviderRegistry.providers[provider_id]
  if not provider then
    return false, "Provider not found"
  end
  
  -- Validate inputs
  if response_time < 0 then
    return false, "Response time must be non-negative"
  end
  
  if quality_score < 0 or quality_score > 1 then
    return false, "Quality score must be between 0 and 1"
  end
  
  -- Update reputation
  update_reputation(provider, response_time, quality_score, success)
  
  return true, "Performance reported successfully"
end

-- Clean up inactive providers
function ReputationTrackingHandler.cleanup_inactive_providers(): number
  local cleanup_count = 0
  local current_time = os.time()
  local timeout_seconds = ProviderRegistry.heartbeat_config.timeout_seconds or 300 -- 5 minutes default
  
  local providers_to_deactivate = {}
  
  for provider_id, provider in pairs(ProviderRegistry.providers) do
    if provider.status == "active" then
      local time_since_heartbeat = current_time - provider.last_heartbeat
      
      if time_since_heartbeat > timeout_seconds then
        table.insert(providers_to_deactivate, provider_id)
      end
    end
  end
  
  -- Deactivate providers that have timed out
  for _, provider_id in ipairs(providers_to_deactivate) do
    local provider = ProviderRegistry.providers[provider_id]
    provider.status = "inactive"
    provider.metadata.last_seen = current_time
    
    -- Clear service discovery cache for this provider's capabilities
    for _, capability in ipairs(provider.capabilities) do
      ProviderRegistry.service_discovery_cache[capability] = nil
    end
    
    cleanup_count = cleanup_count + 1
  end
  
  return cleanup_count
end

-- Get provider reputation details
function ReputationTrackingHandler.get_provider_reputation(provider_id: string): types.ProviderReputation | nil
  local provider = ProviderRegistry.providers[provider_id]
  if not provider then
    return nil
  end
  
  return provider.reputation
end

-- Get provider health status
function ReputationTrackingHandler.get_provider_health(provider_id: string): {string: any} | nil
  local provider = ProviderRegistry.providers[provider_id]
  if not provider then
    return nil
  end
  
  local current_time = os.time()
  local time_since_heartbeat = current_time - provider.last_heartbeat
  local timeout_seconds = ProviderRegistry.heartbeat_config.timeout_seconds or 300
  
  return {
    provider_id = provider_id,
    status = provider.status,
    last_heartbeat = provider.last_heartbeat,
    time_since_heartbeat = time_since_heartbeat,
    is_healthy = time_since_heartbeat < timeout_seconds and provider.status == "active",
    reputation = provider.reputation,
    capabilities = provider.capabilities
  }
end

-- Handle Provider-Heartbeat message
function ReputationTrackingHandler.handle_provider_heartbeat(msg: any)
  local data = json.decode(msg.Data)
  
  if not data or not data.provider_id then
    ao.send({
      Target = msg.From,
      Action = "Heartbeat-Error",
      Data = json.encode({
        error = "Provider ID is required",
        data = data
      })
    })
    return
  end
  
  -- Build heartbeat data
  local heartbeat_data = {
    provider_id = data.provider_id,
    timestamp = data.timestamp or os.time(),
    status = data.status,
    performance_metrics = data.performance_metrics or {}
  }
  
  local success, message = ReputationTrackingHandler.update_heartbeat(heartbeat_data)
  
  if success then
    ao.send({
      Target = msg.From,
      Action = "Heartbeat-Success",
      Data = json.encode({
        message = message,
        provider_id = data.provider_id,
        timestamp = heartbeat_data.timestamp
      })
    })
  else
    ao.send({
      Target = msg.From,
      Action = "Heartbeat-Error",
      Data = json.encode({
        error = message,
        provider_id = data.provider_id
      })
    })
  end
end

-- Handle Performance-Report message
function ReputationTrackingHandler.handle_performance_report(msg: any)
  local data = json.decode(msg.Data)
  
  if not data or not data.provider_id then
    ao.send({
      Target = msg.From,
      Action = "Performance-Report-Error",
      Data = json.encode({
        error = "Provider ID is required",
        data = data
      })
    })
    return
  end
  
  local response_time = data.response_time or 0
  local quality_score = data.quality_score or 0.5
  local success = data.success ~= false -- default to true
  
  local report_success, message = ReputationTrackingHandler.report_performance(
    data.provider_id,
    response_time,
    quality_score,
    success
  )
  
  if report_success then
    ao.send({
      Target = msg.From,
      Action = "Performance-Report-Success",
      Data = json.encode({
        message = message,
        provider_id = data.provider_id,
        timestamp = os.time()
      })
    })
  else
    ao.send({
      Target = msg.From,
      Action = "Performance-Report-Error",
      Data = json.encode({
        error = message,
        provider_id = data.provider_id
      })
    })
  end
end

-- Handle Provider-Health-Check message
function ReputationTrackingHandler.handle_provider_health_check(msg: any)
  local data = json.decode(msg.Data)
  
  if data and data.provider_id then
    -- Get health for specific provider
    local health = ReputationTrackingHandler.get_provider_health(data.provider_id)
    
    if health then
      ao.send({
        Target = msg.From,
        Action = "Health-Check-Response",
        Data = json.encode({
          health = health,
          timestamp = os.time()
        })
      })
    else
      ao.send({
        Target = msg.From,
        Action = "Health-Check-Error",
        Data = json.encode({
          error = "Provider not found",
          provider_id = data.provider_id
        })
      })
    end
  else
    -- Get health for all providers
    local all_health = {}
    for provider_id, _ in pairs(ProviderRegistry.providers) do
      all_health[provider_id] = ReputationTrackingHandler.get_provider_health(provider_id)
    end
    
    ao.send({
      Target = msg.From,
      Action = "Health-Check-Response",
      Data = json.encode({
        health = all_health,
        timestamp = os.time()
      })
    })
  end
end

return ReputationTrackingHandler