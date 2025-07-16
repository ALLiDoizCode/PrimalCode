local ReputationTypes = require('../types/reputation.d')
local MetricsUtils = require('../utils/metrics-utils')

local QualityTracking = {}

-- Maximum number of entries to keep in history arrays
local MAX_HISTORY_SIZE = 50

-- Track service outcome and update provider metrics
function QualityTracking.track_service_outcome(outcome)
  if not outcome or not outcome.provider_id then
    return false
  end
  
  -- Initialize provider metrics if not exists
  if not ReputationManager.provider_metrics[outcome.provider_id] then
    ReputationManager.provider_metrics[outcome.provider_id] = {
      provider_id = outcome.provider_id,
      response_times = {},
      quality_scores = {},
      completion_history = {
        total_requests = 0,
        successful_requests = 0,
        failed_requests = 0,
        timeout_requests = 0
      },
      reputation_trend = {},
      last_updated = outcome.timestamp or 0
    }
  end
  
  local metrics = ReputationManager.provider_metrics[outcome.provider_id]
  
  -- Update response times
  if outcome.response_time and outcome.response_time > 0 then
    QualityTracking.update_response_times(metrics, outcome.response_time)
  end
  
  -- Update quality scores
  if outcome.quality_score and outcome.quality_score >= 0 then
    QualityTracking.update_quality_scores(metrics, outcome.quality_score)
  end
  
  -- Update completion history
  QualityTracking.update_completion_history(metrics, outcome)
  
  -- Update last updated timestamp
  metrics.last_updated = outcome.timestamp or 0
  
  return true
end

-- Update response times array with new measurement
function QualityTracking.update_response_times(metrics, response_time)
  if not metrics.response_times then
    metrics.response_times = {}
  end
  
  table.insert(metrics.response_times, response_time)
  
  -- Keep only the most recent measurements
  if #metrics.response_times > MAX_HISTORY_SIZE then
    table.remove(metrics.response_times, 1)
  end
end

-- Update quality scores array with new measurement
function QualityTracking.update_quality_scores(metrics, quality_score)
  if not metrics.quality_scores then
    metrics.quality_scores = {}
  end
  
  table.insert(metrics.quality_scores, quality_score)
  
  -- Keep only the most recent measurements
  if #metrics.quality_scores > MAX_HISTORY_SIZE then
    table.remove(metrics.quality_scores, 1)
  end
end

-- Update completion history with service outcome
function QualityTracking.update_completion_history(metrics, outcome)
  if not metrics.completion_history then
    metrics.completion_history = {
      total_requests = 0,
      successful_requests = 0,
      failed_requests = 0,
      timeout_requests = 0
    }
  end
  
  local history = metrics.completion_history
  history.total_requests = history.total_requests + 1
  
  if outcome.success then
    history.successful_requests = history.successful_requests + 1
  else
    history.failed_requests = history.failed_requests + 1
    
    -- Check if it was a timeout (response_time > threshold or specific error)
    if outcome.response_time and outcome.response_time > 30 then -- 30 second timeout
      history.timeout_requests = history.timeout_requests + 1
    end
  end
end

-- Get current quality metrics for a provider
function QualityTracking.get_quality_metrics(provider_id)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics then
    return nil
  end
  
  return MetricsUtils.calculate_quality_metrics(metrics)
end

-- Get response time statistics
function QualityTracking.get_response_time_stats(provider_id)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics or not metrics.response_times or #metrics.response_times == 0 then
    return {
      avg = 0,
      min = 0,
      max = 0,
      p50 = 0,
      p95 = 0,
      p99 = 0,
      count = 0
    }
  end
  
  local times = metrics.response_times
  local sorted_times = {}
  for _, time in ipairs(times) do
    table.insert(sorted_times, time)
  end
  table.sort(sorted_times)
  
  return {
    avg = MetricsUtils.calculate_average(times),
    min = sorted_times[1],
    max = sorted_times[#sorted_times],
    p50 = MetricsUtils.get_percentile(sorted_times, 0.5),
    p95 = MetricsUtils.get_percentile(sorted_times, 0.95),
    p99 = MetricsUtils.get_percentile(sorted_times, 0.99),
    count = #times
  }
end

-- Get quality score statistics
function QualityTracking.get_quality_score_stats(provider_id)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics or not metrics.quality_scores or #metrics.quality_scores == 0 then
    return {
      avg = 0,
      min = 0,
      max = 0,
      std_dev = 0,
      count = 0
    }
  end
  
  local scores = metrics.quality_scores
  local sorted_scores = {}
  for _, score in ipairs(scores) do
    table.insert(sorted_scores, score)
  end
  table.sort(sorted_scores)
  
  return {
    avg = MetricsUtils.calculate_average(scores),
    min = sorted_scores[1],
    max = sorted_scores[#sorted_scores],
    std_dev = MetricsUtils.calculate_std_dev(scores),
    count = #scores
  }
end

-- Get completion rate statistics
function QualityTracking.get_completion_stats(provider_id)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics or not metrics.completion_history then
    return {
      total_requests = 0,
      success_rate = 0,
      failure_rate = 0,
      timeout_rate = 0
    }
  end
  
  local history = metrics.completion_history
  local total = history.total_requests
  
  if total == 0 then
    return {
      total_requests = 0,
      success_rate = 0,
      failure_rate = 0,
      timeout_rate = 0
    }
  end
  
  return {
    total_requests = total,
    success_rate = history.successful_requests / total,
    failure_rate = history.failed_requests / total,
    timeout_rate = history.timeout_requests / total
  }
end

-- Calculate accuracy score based on quality feedback
function QualityTracking.calculate_accuracy_score(provider_id, time_window)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics or not metrics.quality_scores or #metrics.quality_scores == 0 then
    return 0
  end
  
  -- If time window is specified, filter recent scores
  local scores = metrics.quality_scores
  if time_window then
    scores = QualityTracking.filter_recent_scores(metrics, time_window)
  end
  
  return MetricsUtils.calculate_average(scores)
end

-- Filter scores within a time window
function QualityTracking.filter_recent_scores(metrics, time_window)
  -- Note: This would need timestamp tracking for each score
  -- For now, return the most recent scores
  local recent_count = math.min(#metrics.quality_scores, 10)
  local recent_scores = {}
  
  for i = #metrics.quality_scores - recent_count + 1, #metrics.quality_scores do
    table.insert(recent_scores, metrics.quality_scores[i])
  end
  
  return recent_scores
end

-- Aggregate quality data across all providers
function QualityTracking.aggregate_quality_data()
  local aggregated = {
    total_providers = 0,
    total_requests = 0,
    avg_response_time = 0,
    avg_quality_score = 0,
    avg_completion_rate = 0,
    providers = {}
  }
  
  local response_times = {}
  local quality_scores = {}
  local completion_rates = {}
  
  for provider_id, metrics in pairs(ReputationManager.provider_metrics) do
    aggregated.total_providers = aggregated.total_providers + 1
    
    local provider_quality = MetricsUtils.calculate_quality_metrics(metrics)
    
    table.insert(response_times, provider_quality.avg_response_time)
    table.insert(quality_scores, provider_quality.avg_quality_score)
    table.insert(completion_rates, provider_quality.completion_rate)
    
    if metrics.completion_history then
      aggregated.total_requests = aggregated.total_requests + metrics.completion_history.total_requests
    end
    
    aggregated.providers[provider_id] = provider_quality
  end
  
  aggregated.avg_response_time = MetricsUtils.calculate_average(response_times)
  aggregated.avg_quality_score = MetricsUtils.calculate_average(quality_scores)
  aggregated.avg_completion_rate = MetricsUtils.calculate_average(completion_rates)
  
  return aggregated
end

-- Performance monitoring with alerts
function QualityTracking.check_performance_alerts(provider_id, thresholds)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics then
    return {}
  end
  
  thresholds = thresholds or {
    max_response_time = 5.0,
    min_quality_score = 0.7,
    min_completion_rate = 0.9
  }
  
  local alerts = {}
  local quality_metrics = MetricsUtils.calculate_quality_metrics(metrics)
  
  -- Check response time
  if quality_metrics.avg_response_time > thresholds.max_response_time then
    table.insert(alerts, {
      type = "response_time",
      severity = "warning",
      message = "Average response time exceeds threshold",
      value = quality_metrics.avg_response_time,
      threshold = thresholds.max_response_time
    })
  end
  
  -- Check quality score
  if quality_metrics.avg_quality_score < thresholds.min_quality_score then
    table.insert(alerts, {
      type = "quality_score",
      severity = "warning",
      message = "Average quality score below threshold",
      value = quality_metrics.avg_quality_score,
      threshold = thresholds.min_quality_score
    })
  end
  
  -- Check completion rate
  if quality_metrics.completion_rate < thresholds.min_completion_rate then
    table.insert(alerts, {
      type = "completion_rate",
      severity = "critical",
      message = "Completion rate below threshold",
      value = quality_metrics.completion_rate,
      threshold = thresholds.min_completion_rate
    })
  end
  
  return alerts
end

return QualityTracking