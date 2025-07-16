local ReputationTypes = require('../types/reputation.d')
local MetricsUtils = require('../utils/metrics-utils')

local ReputationScoring = {}

-- Scoring weights configuration
local SCORING_WEIGHTS = {
  response_time = 0.25,
  quality_score = 0.35,
  reliability = 0.30,
  trend = 0.10
}

-- Time decay configuration
local TIME_DECAY_RATE = 0.1 -- Daily decay rate

-- Calculate comprehensive reputation score for a provider
function ReputationScoring.calculate_reputation_score(provider_id)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics then
    return 0.5 -- Default neutral score for unknown providers
  end
  
  local quality_metrics = MetricsUtils.calculate_quality_metrics(metrics)
  
  -- Calculate individual component scores
  local response_time_score = ReputationScoring.calculate_response_time_score(quality_metrics.avg_response_time)
  local quality_score = quality_metrics.avg_quality_score
  local reliability_score = quality_metrics.reliability_score
  local trend_score = ReputationScoring.calculate_trend_score(quality_metrics.trend_direction)
  
  -- Calculate weighted composite score
  local composite_score = (
    response_time_score * SCORING_WEIGHTS.response_time +
    quality_score * SCORING_WEIGHTS.quality_score +
    reliability_score * SCORING_WEIGHTS.reliability +
    trend_score * SCORING_WEIGHTS.trend
  )
  
  -- Apply data confidence adjustment
  local confidence_factor = ReputationScoring.calculate_confidence_factor(quality_metrics.data_points)
  local adjusted_score = composite_score * confidence_factor + 0.5 * (1 - confidence_factor)
  
  -- Ensure score is within valid range
  return math.max(0, math.min(1, adjusted_score))
end

-- Calculate response time score (normalized and inverted - lower is better)
function ReputationScoring.calculate_response_time_score(avg_response_time)
  if avg_response_time <= 0 then
    return 1.0
  end
  
  local benchmark_time = 3.0 -- 3 second benchmark
  local penalty_factor = 0.5
  
  if avg_response_time <= benchmark_time then
    return 1.0
  else
    local penalty = (avg_response_time - benchmark_time) / benchmark_time
    return math.max(0, 1.0 - penalty * penalty_factor)
  end
end

-- Calculate trend score based on trend direction
function ReputationScoring.calculate_trend_score(trend_direction)
  if trend_direction == "improving" then
    return 1.0
  elseif trend_direction == "stable" then
    return 0.7
  elseif trend_direction == "declining" then
    return 0.3
  else
    return 0.5 -- neutral
  end
end

-- Calculate confidence factor based on data points
function ReputationScoring.calculate_confidence_factor(data_points)
  local min_points = 10
  local max_points = 100
  
  if data_points <= 0 then
    return 0
  elseif data_points <= min_points then
    return data_points / min_points
  elseif data_points >= max_points then
    return 1.0
  else
    -- Logarithmic scaling for confidence
    local log_factor = math.log(data_points) / math.log(max_points)
    return math.min(1.0, log_factor)
  end
end

-- Update reputation score and add to trend history
function ReputationScoring.update_reputation_score(provider_id)
  local current_score = ReputationScoring.calculate_reputation_score(provider_id)
  local metrics = ReputationManager.provider_metrics[provider_id]
  
  if not metrics then
    return current_score
  end
  
  if not metrics.reputation_trend then
    metrics.reputation_trend = {}
  end
  
  -- Add current score to trend history
  table.insert(metrics.reputation_trend, {
    date = os.time() * 1000, -- Current timestamp in milliseconds
    score = current_score
  })
  
  -- Keep only recent trend data (last 30 entries)
  local max_trend_size = 30
  if #metrics.reputation_trend > max_trend_size then
    table.remove(metrics.reputation_trend, 1)
  end
  
  return current_score
end

-- Generate provider ranking for a service type
function ReputationScoring.generate_provider_ranking(service_type)
  local rankings = {}
  
  -- Calculate reputation scores for all providers
  for provider_id, metrics in pairs(ReputationManager.provider_metrics) do
    local score = ReputationScoring.calculate_reputation_score(provider_id)
    
    table.insert(rankings, {
      provider_id = provider_id,
      score = score,
      last_updated = metrics.last_updated
    })
  end
  
  -- Sort by score (descending)
  table.sort(rankings, function(a, b)
    return a.score > b.score
  end)
  
  return rankings
end

-- Update provider ranking cache
function ReputationScoring.update_provider_ranking(service_type)
  local ranking = ReputationScoring.generate_provider_ranking(service_type)
  
  if not ReputationManager.ranking_cache then
    ReputationManager.ranking_cache = {}
  end
  
  ReputationManager.ranking_cache[service_type] = ranking
  
  return ranking
end

-- Get top providers by reputation score
function ReputationScoring.get_top_providers(service_type, limit)
  limit = limit or 10
  
  local ranking = ReputationManager.ranking_cache[service_type]
  if not ranking then
    ranking = ReputationScoring.generate_provider_ranking(service_type)
    ReputationManager.ranking_cache[service_type] = ranking
  end
  
  local top_providers = {}
  for i = 1, math.min(limit, #ranking) do
    table.insert(top_providers, ranking[i])
  end
  
  return top_providers
end

-- Calculate provider selection bias based on reputation
function ReputationScoring.calculate_selection_bias(provider_id)
  local score = ReputationScoring.calculate_reputation_score(provider_id)
  
  -- Convert reputation score to selection bias
  -- Higher reputation = higher selection probability
  local bias = score * score -- Quadratic scaling to emphasize high performers
  
  return math.max(0.1, bias) -- Minimum bias to ensure all providers have some chance
end

-- Apply reputation threshold filtering
function ReputationScoring.filter_providers_by_threshold(providers, threshold)
  threshold = threshold or 0.6 -- Default minimum reputation threshold
  
  local filtered = {}
  
  for _, provider in ipairs(providers) do
    local score = ReputationScoring.calculate_reputation_score(provider)
    if score >= threshold then
      table.insert(filtered, provider)
    end
  end
  
  return filtered
end

-- Calculate reputation-weighted load balancing weights
function ReputationScoring.calculate_load_balancing_weights(providers)
  local weights = {}
  local total_weight = 0
  
  for _, provider in ipairs(providers) do
    local score = ReputationScoring.calculate_reputation_score(provider)
    local weight = ReputationScoring.calculate_selection_bias(provider)
    
    weights[provider] = weight
    total_weight = total_weight + weight
  end
  
  -- Normalize weights to sum to 1
  if total_weight > 0 then
    for provider, weight in pairs(weights) do
      weights[provider] = weight / total_weight
    end
  end
  
  return weights
end

-- Reputation recovery mechanism for improving providers
function ReputationScoring.check_reputation_recovery(provider_id)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics or not metrics.reputation_trend then
    return false
  end
  
  local trend_data = metrics.reputation_trend
  if #trend_data < 5 then
    return false -- Need at least 5 data points
  end
  
  -- Check if last 5 scores show improvement
  local recent_scores = {}
  for i = #trend_data - 4, #trend_data do
    table.insert(recent_scores, trend_data[i].score)
  end
  
  -- Calculate improvement rate
  local improvement_rate = 0
  for i = 2, #recent_scores do
    improvement_rate = improvement_rate + (recent_scores[i] - recent_scores[i-1])
  end
  
  improvement_rate = improvement_rate / (#recent_scores - 1)
  
  -- Recovery threshold (0.05 = 5% improvement rate)
  return improvement_rate > 0.05
end

-- Get detailed reputation breakdown
function ReputationScoring.get_reputation_breakdown(provider_id)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics then
    return nil
  end
  
  local quality_metrics = MetricsUtils.calculate_quality_metrics(metrics)
  
  return {
    overall_score = ReputationScoring.calculate_reputation_score(provider_id),
    response_time_score = ReputationScoring.calculate_response_time_score(quality_metrics.avg_response_time),
    quality_score = quality_metrics.avg_quality_score,
    reliability_score = quality_metrics.reliability_score,
    trend_score = ReputationScoring.calculate_trend_score(quality_metrics.trend_direction),
    confidence_factor = ReputationScoring.calculate_confidence_factor(quality_metrics.data_points),
    computed_at = os.time() * 1000
  }
end

-- Compare providers by reputation
function ReputationScoring.compare_providers(provider_id1, provider_id2)
  local score1 = ReputationScoring.calculate_reputation_score(provider_id1)
  local score2 = ReputationScoring.calculate_reputation_score(provider_id2)
  
  local breakdown1 = ReputationScoring.get_reputation_breakdown(provider_id1)
  local breakdown2 = ReputationScoring.get_reputation_breakdown(provider_id2)
  
  return {
    provider1 = {
      provider_id = provider_id1,
      score = score1,
      breakdown = breakdown1
    },
    provider2 = {
      provider_id = provider_id2,
      score = score2,
      breakdown = breakdown2
    },
    winner = score1 > score2 and provider_id1 or provider_id2,
    score_difference = math.abs(score1 - score2)
  }
end

return ReputationScoring