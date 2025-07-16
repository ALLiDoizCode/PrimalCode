local ReputationTypes = require('../types/reputation.d')

local MetricsUtils = {}

-- Calculate average of numeric array
function MetricsUtils.calculate_average(values)
  if not values or #values == 0 then
    return 0
  end
  
  local sum = 0
  for _, value in ipairs(values) do
    sum = sum + value
  end
  
  return sum / #values
end

-- Calculate standard deviation
function MetricsUtils.calculate_std_dev(values)
  if not values or #values < 2 then
    return 0
  end
  
  local mean = MetricsUtils.calculate_average(values)
  local variance_sum = 0
  
  for _, value in ipairs(values) do
    variance_sum = variance_sum + (value - mean) ^ 2
  end
  
  return math.sqrt(variance_sum / (#values - 1))
end

-- Calculate trend direction from historical data
function MetricsUtils.calculate_trend(trend_data)
  if not trend_data or #trend_data < 2 then
    return "neutral"
  end
  
  local recent_scores = {}
  local older_scores = {}
  
  -- Split data into recent and older halves
  local midpoint = math.floor(#trend_data / 2)
  
  for i = 1, midpoint do
    table.insert(older_scores, trend_data[i].score)
  end
  
  for i = midpoint + 1, #trend_data do
    table.insert(recent_scores, trend_data[i].score)
  end
  
  local recent_avg = MetricsUtils.calculate_average(recent_scores)
  local older_avg = MetricsUtils.calculate_average(older_scores)
  
  local threshold = 0.02 -- 2% threshold for trend detection
  
  if recent_avg > older_avg + threshold then
    return "improving"
  elseif recent_avg < older_avg - threshold then
    return "declining"
  else
    return "stable"
  end
end

-- Calculate quality metrics from provider metrics
function MetricsUtils.calculate_quality_metrics(metrics)
  if not metrics then
    return {
      avg_response_time = 0,
      avg_quality_score = 0,
      completion_rate = 0,
      reliability_score = 0,
      trend_direction = "neutral",
      data_points = 0
    }
  end
  
  local avg_response_time = MetricsUtils.calculate_average(metrics.response_times)
  local avg_quality_score = MetricsUtils.calculate_average(metrics.quality_scores)
  
  local completion_rate = 0
  if metrics.completion_history and metrics.completion_history.total_requests > 0 then
    completion_rate = metrics.completion_history.successful_requests / metrics.completion_history.total_requests
  end
  
  local reliability_score = MetricsUtils.calculate_reliability_score(metrics)
  local trend_direction = MetricsUtils.calculate_trend(metrics.reputation_trend)
  
  return {
    avg_response_time = avg_response_time,
    avg_quality_score = avg_quality_score,
    completion_rate = completion_rate,
    reliability_score = reliability_score,
    trend_direction = trend_direction,
    data_points = metrics.completion_history and metrics.completion_history.total_requests or 0
  }
end

-- Calculate reliability score based on completion history
function MetricsUtils.calculate_reliability_score(metrics)
  if not metrics.completion_history then
    return 0.5 -- Default neutral score
  end
  
  local history = metrics.completion_history
  if history.total_requests == 0 then
    return 0.5
  end
  
  local success_rate = history.successful_requests / history.total_requests
  local timeout_penalty = (history.timeout_requests / history.total_requests) * 0.5
  local failure_penalty = (history.failed_requests / history.total_requests) * 0.3
  
  local reliability = success_rate - timeout_penalty - failure_penalty
  
  -- Ensure score is between 0 and 1
  return math.max(0, math.min(1, reliability))
end

-- Normalize score to 0-1 range
function MetricsUtils.normalize_score(score, min_val, max_val)
  if max_val == min_val then
    return 0.5
  end
  
  local normalized = (score - min_val) / (max_val - min_val)
  return math.max(0, math.min(1, normalized))
end

-- Apply time decay to historical values
function MetricsUtils.apply_time_decay(values, timestamps, current_time, decay_rate)
  if not values or not timestamps or #values ~= #timestamps then
    return values
  end
  
  local decayed_values = {}
  
  for i, value in ipairs(values) do
    local age = current_time - timestamps[i]
    local decay_factor = math.exp(-decay_rate * age / 86400000) -- age in days
    table.insert(decayed_values, value * decay_factor)
  end
  
  return decayed_values
end

-- Calculate weighted average with time decay
function MetricsUtils.calculate_weighted_average(values, weights)
  if not values or not weights or #values ~= #weights or #values == 0 then
    return 0
  end
  
  local weighted_sum = 0
  local weight_sum = 0
  
  for i, value in ipairs(values) do
    weighted_sum = weighted_sum + (value * weights[i])
    weight_sum = weight_sum + weights[i]
  end
  
  if weight_sum == 0 then
    return 0
  end
  
  return weighted_sum / weight_sum
end

-- Get percentile value from sorted array
function MetricsUtils.get_percentile(values, percentile)
  if not values or #values == 0 then
    return 0
  end
  
  -- Sort values
  local sorted_values = {}
  for _, value in ipairs(values) do
    table.insert(sorted_values, value)
  end
  table.sort(sorted_values)
  
  local index = math.ceil(percentile * #sorted_values)
  return sorted_values[index] or 0
end

-- Calculate response time score (lower is better)
function MetricsUtils.calculate_response_time_score(avg_response_time, benchmark_time)
  if avg_response_time <= 0 then
    return 1.0
  end
  
  benchmark_time = benchmark_time or 3.0 -- Default 3 second benchmark
  
  if avg_response_time <= benchmark_time then
    return 1.0
  else
    -- Exponential decay for slower responses
    local penalty = (avg_response_time - benchmark_time) / benchmark_time
    return math.max(0, 1.0 - penalty * 0.5)
  end
end

-- Calculate composite score from multiple metrics
function MetricsUtils.calculate_composite_score(scores, weights)
  weights = weights or {
    response_time = 0.3,
    quality = 0.4,
    reliability = 0.3
  }
  
  local composite = 0
  local weight_sum = 0
  
  for metric, score in pairs(scores) do
    local weight = weights[metric] or 0
    composite = composite + (score * weight)
    weight_sum = weight_sum + weight
  end
  
  if weight_sum == 0 then
    return 0.5
  end
  
  return composite / weight_sum
end

return MetricsUtils