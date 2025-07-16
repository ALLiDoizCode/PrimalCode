local ReputationTypes = require('../types/reputation.d')
local MetricsUtils = require('../utils/metrics-utils')

local HistoryManagement = {}

-- History retention settings
local MAX_HISTORY_DAYS = 30
local MAX_TREND_ENTRIES = 100
local CLEANUP_THRESHOLD = 86400000 -- 24 hours in milliseconds

-- Add service record to history
function HistoryManagement.add_service_record(outcome)
  if not outcome or not outcome.provider_id then
    return false
  end
  
  local provider_id = outcome.provider_id
  local metrics = ReputationManager.provider_metrics[provider_id]
  
  if not metrics then
    return false
  end
  
  -- Update last activity timestamp
  metrics.last_updated = outcome.timestamp or os.time() * 1000
  
  -- Add to reputation trend if significant change
  HistoryManagement.update_reputation_trend(provider_id, outcome.timestamp)
  
  return true
end

-- Update reputation trend with new data point
function HistoryManagement.update_reputation_trend(provider_id, timestamp)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics then
    return false
  end
  
  if not metrics.reputation_trend then
    metrics.reputation_trend = {}
  end
  
  -- Calculate current reputation score
  local current_score = 0.5 -- Default score
  
  -- Simple reputation calculation based on recent metrics
  local quality_metrics = MetricsUtils.calculate_quality_metrics(metrics)
  if quality_metrics then
    current_score = (quality_metrics.avg_quality_score + quality_metrics.completion_rate) / 2
  end
  
  -- Check if we should add a new trend point
  local should_add_point = false
  
  if #metrics.reputation_trend == 0 then
    should_add_point = true
  else
    local last_trend = metrics.reputation_trend[#metrics.reputation_trend]
    local score_diff = math.abs(current_score - last_trend.score)
    local time_diff = timestamp - last_trend.date
    
    -- Add point if significant change or enough time has passed
    if score_diff > 0.05 or time_diff > 3600000 then -- 1 hour
      should_add_point = true
    end
  end
  
  if should_add_point then
    table.insert(metrics.reputation_trend, {
      date = timestamp,
      score = current_score
    })
    
    -- Keep only recent trend data
    if #metrics.reputation_trend > MAX_TREND_ENTRIES then
      table.remove(metrics.reputation_trend, 1)
    end
  end
  
  return true
end

-- Get reputation history for a provider
function HistoryManagement.get_reputation_history(provider_id, days_back)
  days_back = days_back or MAX_HISTORY_DAYS
  local cutoff_time = os.time() * 1000 - (days_back * 24 * 60 * 60 * 1000)
  
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics or not metrics.reputation_trend then
    return {
      provider_id = provider_id,
      history = {},
      summary = {
        total_points = 0,
        date_range = { start = 0, end = 0 },
        avg_score = 0,
        min_score = 0,
        max_score = 0,
        trend_direction = "neutral"
      }
    }
  end
  
  -- Filter history within time range
  local filtered_history = {}
  for _, trend_point in ipairs(metrics.reputation_trend) do
    if trend_point.date >= cutoff_time then
      table.insert(filtered_history, trend_point)
    end
  end
  
  -- Calculate summary statistics
  local summary = HistoryManagement.calculate_history_summary(filtered_history)
  
  return {
    provider_id = provider_id,
    history = filtered_history,
    summary = summary
  }
end

-- Calculate summary statistics for history
function HistoryManagement.calculate_history_summary(history)
  if not history or #history == 0 then
    return {
      total_points = 0,
      date_range = { start = 0, end = 0 },
      avg_score = 0,
      min_score = 0,
      max_score = 0,
      trend_direction = "neutral"
    }
  end
  
  local scores = {}
  local min_score = 1.0
  local max_score = 0.0
  local start_date = history[1].date
  local end_date = history[#history].date
  
  for _, point in ipairs(history) do
    table.insert(scores, point.score)
    min_score = math.min(min_score, point.score)
    max_score = math.max(max_score, point.score)
  end
  
  local avg_score = MetricsUtils.calculate_average(scores)
  local trend_direction = MetricsUtils.calculate_trend(history)
  
  return {
    total_points = #history,
    date_range = { start = start_date, end = end_date },
    avg_score = avg_score,
    min_score = min_score,
    max_score = max_score,
    trend_direction = trend_direction
  }
end

-- Get historical performance comparison
function HistoryManagement.get_performance_comparison(provider_id, compare_days)
  compare_days = compare_days or 7
  
  local recent_history = HistoryManagement.get_reputation_history(provider_id, compare_days)
  local older_history = HistoryManagement.get_reputation_history(provider_id, compare_days * 2)
  
  -- Split older history into comparison period
  local comparison_history = {}
  local cutoff_time = os.time() * 1000 - (compare_days * 24 * 60 * 60 * 1000)
  
  for _, point in ipairs(older_history.history) do
    if point.date < cutoff_time then
      table.insert(comparison_history, point)
    end
  end
  
  local comparison_summary = HistoryManagement.calculate_history_summary(comparison_history)
  
  return {
    provider_id = provider_id,
    recent_period = {
      days = compare_days,
      summary = recent_history.summary
    },
    comparison_period = {
      days = compare_days,
      summary = comparison_summary
    },
    improvement = recent_history.summary.avg_score - comparison_summary.avg_score
  }
end

-- Cleanup old data
function HistoryManagement.cleanup_old_data(current_time)
  local cutoff_time = current_time - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000)
  local cleaned_providers = {}
  
  for provider_id, metrics in pairs(ReputationManager.provider_metrics) do
    local cleaned = false
    
    -- Clean up old reputation trend data
    if metrics.reputation_trend then
      local filtered_trend = {}
      for _, trend_point in ipairs(metrics.reputation_trend) do
        if trend_point.date >= cutoff_time then
          table.insert(filtered_trend, trend_point)
        else
          cleaned = true
        end
      end
      metrics.reputation_trend = filtered_trend
    end
    
    -- Clean up old response time data (keep only recent)
    if metrics.response_times and #metrics.response_times > 50 then
      local keep_count = 30
      local new_times = {}
      for i = #metrics.response_times - keep_count + 1, #metrics.response_times do
        table.insert(new_times, metrics.response_times[i])
      end
      metrics.response_times = new_times
      cleaned = true
    end
    
    -- Clean up old quality score data
    if metrics.quality_scores and #metrics.quality_scores > 50 then
      local keep_count = 30
      local new_scores = {}
      for i = #metrics.quality_scores - keep_count + 1, #metrics.quality_scores do
        table.insert(new_scores, metrics.quality_scores[i])
      end
      metrics.quality_scores = new_scores
      cleaned = true
    end
    
    if cleaned then
      table.insert(cleaned_providers, provider_id)
    end
  end
  
  return cleaned_providers
end

-- Get provider activity timeline
function HistoryManagement.get_activity_timeline(provider_id, granularity)
  granularity = granularity or "hourly" -- hourly, daily, weekly
  
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics or not metrics.reputation_trend then
    return {
      provider_id = provider_id,
      timeline = {},
      granularity = granularity
    }
  end
  
  local timeline = {}
  local bucket_size = 3600000 -- 1 hour in milliseconds
  
  if granularity == "daily" then
    bucket_size = 86400000 -- 24 hours
  elseif granularity == "weekly" then
    bucket_size = 604800000 -- 7 days
  end
  
  -- Group data points by time buckets
  local buckets = {}
  for _, trend_point in ipairs(metrics.reputation_trend) do
    local bucket_key = math.floor(trend_point.date / bucket_size) * bucket_size
    
    if not buckets[bucket_key] then
      buckets[bucket_key] = {
        timestamp = bucket_key,
        scores = {},
        count = 0
      }
    end
    
    table.insert(buckets[bucket_key].scores, trend_point.score)
    buckets[bucket_key].count = buckets[bucket_key].count + 1
  end
  
  -- Convert buckets to timeline
  for timestamp, bucket in pairs(buckets) do
    table.insert(timeline, {
      timestamp = timestamp,
      avg_score = MetricsUtils.calculate_average(bucket.scores),
      min_score = math.min(table.unpack(bucket.scores)),
      max_score = math.max(table.unpack(bucket.scores)),
      data_points = bucket.count
    })
  end
  
  -- Sort by timestamp
  table.sort(timeline, function(a, b)
    return a.timestamp < b.timestamp
  end)
  
  return {
    provider_id = provider_id,
    timeline = timeline,
    granularity = granularity
  }
end

-- Export historical data for analysis
function HistoryManagement.export_history_data(provider_ids, format)
  format = format or "json"
  provider_ids = provider_ids or {}
  
  -- If no specific providers, export all
  if #provider_ids == 0 then
    for provider_id, _ in pairs(ReputationManager.provider_metrics) do
      table.insert(provider_ids, provider_id)
    end
  end
  
  local exported_data = {
    export_timestamp = os.time() * 1000,
    format = format,
    providers = {}
  }
  
  for _, provider_id in ipairs(provider_ids) do
    local history = HistoryManagement.get_reputation_history(provider_id)
    local timeline = HistoryManagement.get_activity_timeline(provider_id, "daily")
    
    exported_data.providers[provider_id] = {
      history = history,
      timeline = timeline,
      metrics = ReputationManager.provider_metrics[provider_id]
    }
  end
  
  return exported_data
end

-- Archive old provider data
function HistoryManagement.archive_provider_data(provider_id)
  local metrics = ReputationManager.provider_metrics[provider_id]
  if not metrics then
    return false
  end
  
  -- Create archive record
  local archive_record = {
    provider_id = provider_id,
    archived_at = os.time() * 1000,
    final_metrics = metrics,
    final_score = MetricsUtils.calculate_quality_metrics(metrics)
  }
  
  -- Initialize archive storage if needed
  if not ReputationManager.archived_providers then
    ReputationManager.archived_providers = {}
  end
  
  ReputationManager.archived_providers[provider_id] = archive_record
  
  -- Remove from active metrics
  ReputationManager.provider_metrics[provider_id] = nil
  
  -- Clean up ranking cache
  for service_type, ranking in pairs(ReputationManager.ranking_cache) do
    local filtered_ranking = {}
    for _, entry in ipairs(ranking) do
      if entry.provider_id ~= provider_id then
        table.insert(filtered_ranking, entry)
      end
    end
    ReputationManager.ranking_cache[service_type] = filtered_ranking
  end
  
  return true
end

-- Restore archived provider data
function HistoryManagement.restore_provider_data(provider_id)
  if not ReputationManager.archived_providers or not ReputationManager.archived_providers[provider_id] then
    return false
  end
  
  local archive_record = ReputationManager.archived_providers[provider_id]
  
  -- Restore metrics
  ReputationManager.provider_metrics[provider_id] = archive_record.final_metrics
  
  -- Remove from archive
  ReputationManager.archived_providers[provider_id] = nil
  
  return true
end

return HistoryManagement