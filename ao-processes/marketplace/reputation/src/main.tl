local json = require('json')
local ReputationTypes = require('./types/reputation.d')
local MetricsUtils = require('./utils/metrics-utils')
local QualityTracking = require('./handlers/quality-tracking')
local ReputationScoring = require('./handlers/reputation-scoring')
local HistoryManagement = require('./handlers/history-management')

-- Global State
ReputationManager = ReputationManager or {
  provider_metrics = {},
  ranking_cache = {},
  last_cleanup = 0
}

-- Configuration
local CLEANUP_INTERVAL = 300000 -- 5 minutes in milliseconds
local MAX_HISTORY_SIZE = 100
local REPUTATION_DECAY_FACTOR = 0.95

-- Initialize reputation manager
local function init_reputation_manager()
  if not ReputationManager.provider_metrics then
    ReputationManager.provider_metrics = {}
  end
  if not ReputationManager.ranking_cache then
    ReputationManager.ranking_cache = {}
  end
  if not ReputationManager.last_cleanup then
    ReputationManager.last_cleanup = 0
  end
end

-- Service outcome tracking handler
Handlers.add(
  "Service-Outcome",
  Handlers.utils.hasMatchingTag("Action", "Service-Outcome"),
  function(msg)
    init_reputation_manager()
    
    local success, outcome = pcall(function()
      return json.decode(msg.Data)
    end)
    
    if not success then
      msg.reply({
        Action = "Service-Outcome-Error",
        Data = json.encode({
          error = "Invalid service outcome data",
          message = "Failed to parse service outcome JSON"
        })
      })
      return
    end
    
    -- Validate required fields
    if not outcome.provider_id or not outcome.request_id or not outcome.service_type then
      msg.reply({
        Action = "Service-Outcome-Error",
        Data = json.encode({
          error = "Missing required fields",
          message = "provider_id, request_id, and service_type are required"
        })
      })
      return
    end
    
    -- Track quality metrics
    QualityTracking.track_service_outcome(outcome)
    
    -- Update reputation scores
    ReputationScoring.update_reputation_score(outcome.provider_id)
    
    -- Update history
    HistoryManagement.add_service_record(outcome)
    
    -- Trigger ranking update
    ReputationScoring.update_provider_ranking(outcome.service_type)
    
    msg.reply({
      Action = "Service-Outcome-Tracked",
      Data = json.encode({
        provider_id = outcome.provider_id,
        request_id = outcome.request_id,
        tracked_at = msg.Timestamp
      })
    })
  end
)

-- Get provider reputation handler
Handlers.add(
  "Get-Provider-Reputation",
  Handlers.utils.hasMatchingTag("Action", "Get-Provider-Reputation"),
  function(msg)
    init_reputation_manager()
    
    local provider_id = msg.Tags["Provider-ID"]
    if not provider_id then
      msg.reply({
        Action = "Provider-Reputation-Error",
        Data = json.encode({
          error = "Missing provider ID",
          message = "Provider-ID tag is required"
        })
      })
      return
    end
    
    local metrics = ReputationManager.provider_metrics[provider_id]
    if not metrics then
      msg.reply({
        Action = "Provider-Reputation-Response",
        Data = json.encode({
          provider_id = provider_id,
          reputation_score = 0.5, -- Default neutral score
          quality_metrics = {
            avg_response_time = 0,
            avg_quality_score = 0,
            completion_rate = 0,
            reliability_score = 0,
            trend_direction = "neutral",
            data_points = 0
          },
          message = "No reputation data available"
        })
      })
      return
    end
    
    local reputation_score = ReputationScoring.calculate_reputation_score(provider_id)
    local quality_metrics = MetricsUtils.calculate_quality_metrics(metrics)
    
    msg.reply({
      Action = "Provider-Reputation-Response",
      Data = json.encode({
        provider_id = provider_id,
        reputation_score = reputation_score,
        quality_metrics = quality_metrics,
        last_updated = metrics.last_updated
      })
    })
  end
)

-- Get provider ranking handler
Handlers.add(
  "Get-Provider-Ranking",
  Handlers.utils.hasMatchingTag("Action", "Get-Provider-Ranking"),
  function(msg)
    init_reputation_manager()
    
    local service_type = msg.Tags["Service-Type"] or "default"
    local limit = tonumber(msg.Tags["Limit"]) or 10
    
    local ranking = ReputationManager.ranking_cache[service_type]
    if not ranking then
      -- Generate ranking if not cached
      ranking = ReputationScoring.generate_provider_ranking(service_type)
      ReputationManager.ranking_cache[service_type] = ranking
    end
    
    -- Apply limit
    local limited_ranking = {}
    for i = 1, math.min(limit, #ranking) do
      limited_ranking[i] = ranking[i]
    end
    
    msg.reply({
      Action = "Provider-Ranking-Response",
      Data = json.encode({
        service_type = service_type,
        ranking = limited_ranking,
        total_providers = #ranking,
        generated_at = msg.Timestamp
      })
    })
  end
)

-- Get reputation history handler
Handlers.add(
  "Get-Reputation-History",
  Handlers.utils.hasMatchingTag("Action", "Get-Reputation-History"),
  function(msg)
    init_reputation_manager()
    
    local provider_id = msg.Tags["Provider-ID"]
    if not provider_id then
      msg.reply({
        Action = "Reputation-History-Error",
        Data = json.encode({
          error = "Missing provider ID",
          message = "Provider-ID tag is required"
        })
      })
      return
    end
    
    local history = HistoryManagement.get_reputation_history(provider_id)
    
    msg.reply({
      Action = "Reputation-History-Response",
      Data = json.encode({
        provider_id = provider_id,
        history = history,
        retrieved_at = msg.Timestamp
      })
    })
  end
)

-- Reputation cleanup handler (periodic maintenance)
Handlers.add(
  "Reputation-Cleanup",
  Handlers.utils.hasMatchingTag("Action", "Reputation-Cleanup"),
  function(msg)
    init_reputation_manager()
    
    local current_time = msg.Timestamp
    if current_time - ReputationManager.last_cleanup < CLEANUP_INTERVAL then
      msg.reply({
        Action = "Reputation-Cleanup-Skipped",
        Data = json.encode({
          message = "Cleanup performed recently",
          next_cleanup = ReputationManager.last_cleanup + CLEANUP_INTERVAL
        })
      })
      return
    end
    
    local cleaned_providers = HistoryManagement.cleanup_old_data(current_time)
    ReputationManager.last_cleanup = current_time
    
    -- Clear ranking cache to force refresh
    ReputationManager.ranking_cache = {}
    
    msg.reply({
      Action = "Reputation-Cleanup-Complete",
      Data = json.encode({
        cleaned_providers = cleaned_providers,
        cleanup_time = current_time
      })
    })
  end
)

-- Process health check
Handlers.add(
  "Reputation-Health",
  Handlers.utils.hasMatchingTag("Action", "Process-Health"),
  function(msg)
    init_reputation_manager()
    
    local provider_count = 0
    local total_requests = 0
    
    for provider_id, metrics in pairs(ReputationManager.provider_metrics) do
      provider_count = provider_count + 1
      if metrics.completion_history then
        total_requests = total_requests + metrics.completion_history.total_requests
      end
    end
    
    local ranking_cache_size = 0
    for service_type, ranking in pairs(ReputationManager.ranking_cache) do
      ranking_cache_size = ranking_cache_size + #ranking
    end
    
    msg.reply({
      Action = "Process-Health-Response",
      Data = json.encode({
        status = "healthy",
        provider_count = provider_count,
        total_requests_tracked = total_requests,
        ranking_cache_size = ranking_cache_size,
        last_cleanup = ReputationManager.last_cleanup,
        timestamp = msg.Timestamp
      })
    })
  end
)