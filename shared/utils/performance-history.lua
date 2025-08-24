local record PerformanceHistory
  type TimeBucket = "minute" | "hour" | "day"
  type TrendDirection = "IMPROVING" | "STABLE" | "DEGRADING"
  
  type HistoricalPerformanceData = record
    data_point_id: string
    process_id: string
    time_bucket: TimeBucket
    bucket_timestamp: number
    average_execution_time: number
    peak_memory_usage: number
    total_messages_processed: number
    error_count: number
    throughput_per_second: number
    concurrent_peak: number
    performance_trend: TrendDirection
    retention_expires: number
  end
  
  type AggregationConfig = record
    minute_retention_hours: number
    hour_retention_days: number
    day_retention_months: number
    enable_trend_analysis: boolean
    trend_analysis_window: number
    auto_cleanup_enabled: boolean
  end
  
  type TrendAnalysis = record
    metric_name: string
    current_value: number
    previous_value: number
    trend_direction: TrendDirection
    change_percentage: number
    confidence: number
  end
  
  historical_data: {string: {HistoricalPerformanceData}} -- bucket_type -> data_points
  config: AggregationConfig
  raw_metrics_buffer: {any} -- Buffer for raw metrics before aggregation
  last_aggregation_times: {TimeBucket: number}
  
  new: function(config: AggregationConfig?): PerformanceHistory
  add_raw_metrics: function(self: PerformanceHistory, process_id: string, metrics: any)
  aggregate_data: function(self: PerformanceHistory, bucket: TimeBucket)
  aggregate_minute_data: function(self: PerformanceHistory): {HistoricalPerformanceData}
  aggregate_hour_data: function(self: PerformanceHistory): {HistoricalPerformanceData}
  aggregate_day_data: function(self: PerformanceHistory): {HistoricalPerformanceData}
  calculate_trend: function(self: PerformanceHistory, process_id: string, metric_name: string, time_window: number): TrendAnalysis
  get_historical_data: function(self: PerformanceHistory, bucket: TimeBucket, process_id: string?, limit: number?): {HistoricalPerformanceData}
  cleanup_expired_data: function(self: PerformanceHistory)
  export_capacity_planning_data: function(self: PerformanceHistory, process_id: string): {any}
  analyze_performance_trends: function(self: PerformanceHistory, process_id: string): {TrendAnalysis}
  get_data_retention_status: function(self: PerformanceHistory): {string: number}
  force_aggregation: function(self: PerformanceHistory)
  get_storage_metrics: function(self: PerformanceHistory): {string: number}
end

local PerformanceHistory = {}
PerformanceHistory.__index = PerformanceHistory

-- Create new performance history manager
function PerformanceHistory.new(config: PerformanceHistory.AggregationConfig?): PerformanceHistory
  local history = setmetatable({} as PerformanceHistory, PerformanceHistory)
  
  -- Initialize storage buckets
  history.historical_data = {
    minute = {},
    hour = {},
    day = {}
  }
  
  history.raw_metrics_buffer = {}
  history.last_aggregation_times = {
    minute = os.time(),
    hour = os.time(),
    day = os.time()
  }
  
  -- Default configuration
  history.config = config or {
    minute_retention_hours = 24,      -- Keep minute data for 24 hours
    hour_retention_days = 30,         -- Keep hourly data for 30 days  
    day_retention_months = 12,        -- Keep daily data for 12 months
    enable_trend_analysis = true,
    trend_analysis_window = 168,      -- 7 days worth of hours for trend analysis
    auto_cleanup_enabled = true
  }
  
  return history
end

-- Add raw metrics data to buffer for aggregation
function PerformanceHistory:add_raw_metrics(process_id: string, metrics: any)
  local timestamp = os.time()
  
  local raw_metric = {
    process_id = process_id,
    timestamp = timestamp,
    execution_time_ms = metrics.execution_time_ms or 0,
    memory_usage_bytes = metrics.memory_usage_bytes or 0,
    concurrent_requests = metrics.concurrent_requests or 0,
    throughput_per_second = metrics.throughput_per_second or 0,
    error_rate = metrics.error_rate or 0,
    queue_depth = metrics.queue_depth or 0
  }
  
  table.insert(self.raw_metrics_buffer, raw_metric)
  
  -- Trigger aggregation if enough data has accumulated or enough time has passed
  if #self.raw_metrics_buffer >= 100 or (timestamp - self.last_aggregation_times.minute) >= 60 then
    self:aggregate_data("minute")
  end
  
  if (timestamp - self.last_aggregation_times.hour) >= 3600 then
    self:aggregate_data("hour")
  end
  
  if (timestamp - self.last_aggregation_times.day) >= 86400 then
    self:aggregate_data("day")
  end
  
  -- Auto-cleanup if enabled
  if self.config.auto_cleanup_enabled and math.random() < 0.01 then -- 1% chance per call
    self:cleanup_expired_data()
  end
end

-- Aggregate data for specified time bucket
function PerformanceHistory:aggregate_data(bucket: PerformanceHistory.TimeBucket)
  if bucket == "minute" then
    self:aggregate_minute_data()
  elseif bucket == "hour" then
    self:aggregate_hour_data()
  elseif bucket == "day" then
    self:aggregate_day_data()
  end
end

-- Aggregate minute-level data
function PerformanceHistory:aggregate_minute_data(): {PerformanceHistory.HistoricalPerformanceData}
  local current_time = os.time()
  local minute_boundary = current_time - (current_time % 60) -- Round down to minute boundary
  
  -- Group raw metrics by process and time bucket
  local process_buckets: {string: {any}} = {}
  
  for i = #self.raw_metrics_buffer, 1, -1 do
    local metric = self.raw_metrics_buffer[i]
    local metric_minute = metric.timestamp - (metric.timestamp % 60)
    
    if metric_minute <= minute_boundary then
      if not process_buckets[metric.process_id] then
        process_buckets[metric.process_id] = {}
      end
      
      table.insert(process_buckets[metric.process_id], metric)
      table.remove(self.raw_metrics_buffer, i)
    end
  end
  
  local aggregated_data: {PerformanceHistory.HistoricalPerformanceData} = {}
  
  -- Process each bucket
  for process_id, metrics in pairs(process_buckets) do
    if #metrics > 0 then
      local aggregated = self:create_aggregated_data_point(process_id, "minute", minute_boundary, metrics)
      table.insert(self.historical_data.minute, aggregated)
      table.insert(aggregated_data, aggregated)
    end
  end
  
  self.last_aggregation_times.minute = current_time
  return aggregated_data
end

-- Aggregate hour-level data
function PerformanceHistory:aggregate_hour_data(): {PerformanceHistory.HistoricalPerformanceData}
  local current_time = os.time()
  local hour_boundary = current_time - (current_time % 3600) -- Round down to hour boundary
  local hour_start = hour_boundary - 3600 -- Previous hour
  
  local aggregated_data: {PerformanceHistory.HistoricalPerformanceData} = {}
  
  -- Find all minute data points from the previous hour
  local process_metrics: {string: {PerformanceHistory.HistoricalPerformanceData}} = {}
  
  for _, minute_data in ipairs(self.historical_data.minute) do
    if minute_data.bucket_timestamp >= hour_start and minute_data.bucket_timestamp < hour_boundary then
      if not process_metrics[minute_data.process_id] then
        process_metrics[minute_data.process_id] = {}
      end
      table.insert(process_metrics[minute_data.process_id], minute_data)
    end
  end
  
  -- Aggregate minute data into hour buckets
  for process_id, minute_points in pairs(process_metrics) do
    if #minute_points > 0 then
      local aggregated = self:aggregate_historical_points(process_id, "hour", hour_boundary, minute_points)
      table.insert(self.historical_data.hour, aggregated)
      table.insert(aggregated_data, aggregated)
    end
  end
  
  self.last_aggregation_times.hour = current_time
  return aggregated_data
end

-- Aggregate day-level data
function PerformanceHistory:aggregate_day_data(): {PerformanceHistory.HistoricalPerformanceData}
  local current_time = os.time()
  local day_boundary = current_time - (current_time % 86400) -- Round down to day boundary
  local day_start = day_boundary - 86400 -- Previous day
  
  local aggregated_data: {PerformanceHistory.HistoricalPerformanceData} = {}
  
  -- Find all hour data points from the previous day
  local process_metrics: {string: {PerformanceHistory.HistoricalPerformanceData}} = {}
  
  for _, hour_data in ipairs(self.historical_data.hour) do
    if hour_data.bucket_timestamp >= day_start and hour_data.bucket_timestamp < day_boundary then
      if not process_metrics[hour_data.process_id] then
        process_metrics[hour_data.process_id] = {}
      end
      table.insert(process_metrics[hour_data.process_id], hour_data)
    end
  end
  
  -- Aggregate hour data into day buckets
  for process_id, hour_points in pairs(process_metrics) do
    if #hour_points > 0 then
      local aggregated = self:aggregate_historical_points(process_id, "day", day_boundary, hour_points)
      table.insert(self.historical_data.day, aggregated)
      table.insert(aggregated_data, aggregated)
    end
  end
  
  self.last_aggregation_times.day = current_time
  return aggregated_data
end

-- Create aggregated data point from raw metrics
function PerformanceHistory:create_aggregated_data_point(
  process_id: string, 
  bucket: PerformanceHistory.TimeBucket, 
  timestamp: number, 
  raw_metrics: {any}
): PerformanceHistory.HistoricalPerformanceData
  
  local total_execution_time = 0
  local peak_memory = 0
  local total_messages = 0
  local total_errors = 0
  local total_throughput = 0
  local peak_concurrent = 0
  
  for _, metric in ipairs(raw_metrics) do
    total_execution_time = total_execution_time + metric.execution_time_ms
    peak_memory = math.max(peak_memory, metric.memory_usage_bytes)
    total_messages = total_messages + (metric.throughput_per_second or 0)
    total_errors = total_errors + ((metric.error_rate or 0) * (metric.throughput_per_second or 0) / 100)
    total_throughput = total_throughput + (metric.throughput_per_second or 0)
    peak_concurrent = math.max(peak_concurrent, metric.concurrent_requests)
  end
  
  local avg_execution_time = #raw_metrics > 0 and total_execution_time / #raw_metrics or 0
  local avg_throughput = #raw_metrics > 0 and total_throughput / #raw_metrics or 0
  
  -- Calculate retention expiry
  local retention_seconds = 0
  if bucket == "minute" then
    retention_seconds = self.config.minute_retention_hours * 3600
  elseif bucket == "hour" then
    retention_seconds = self.config.hour_retention_days * 86400
  elseif bucket == "day" then
    retention_seconds = self.config.day_retention_months * 30 * 86400
  end
  
  return {
    data_point_id = process_id .. "_" .. bucket .. "_" .. timestamp,
    process_id = process_id,
    time_bucket = bucket,
    bucket_timestamp = timestamp,
    average_execution_time = avg_execution_time,
    peak_memory_usage = peak_memory,
    total_messages_processed = total_messages,
    error_count = total_errors,
    throughput_per_second = avg_throughput,
    concurrent_peak = peak_concurrent,
    performance_trend = "STABLE", -- Will be calculated by trend analysis
    retention_expires = timestamp + retention_seconds
  }
end

-- Aggregate historical data points into higher level bucket
function PerformanceHistory:aggregate_historical_points(
  process_id: string,
  bucket: PerformanceHistory.TimeBucket,
  timestamp: number,
  data_points: {PerformanceHistory.HistoricalPerformanceData}
): PerformanceHistory.HistoricalPerformanceData
  
  local total_execution_time = 0
  local peak_memory = 0
  local total_messages = 0
  local total_errors = 0
  local total_throughput = 0
  local peak_concurrent = 0
  
  for _, point in ipairs(data_points) do
    total_execution_time = total_execution_time + point.average_execution_time
    peak_memory = math.max(peak_memory, point.peak_memory_usage)
    total_messages = total_messages + point.total_messages_processed
    total_errors = total_errors + point.error_count
    total_throughput = total_throughput + point.throughput_per_second
    peak_concurrent = math.max(peak_concurrent, point.concurrent_peak)
  end
  
  local avg_execution_time = #data_points > 0 and total_execution_time / #data_points or 0
  local avg_throughput = #data_points > 0 and total_throughput / #data_points or 0
  
  -- Calculate retention expiry
  local retention_seconds = 0
  if bucket == "hour" then
    retention_seconds = self.config.hour_retention_days * 86400
  elseif bucket == "day" then
    retention_seconds = self.config.day_retention_months * 30 * 86400
  end
  
  return {
    data_point_id = process_id .. "_" .. bucket .. "_" .. timestamp,
    process_id = process_id,
    time_bucket = bucket,
    bucket_timestamp = timestamp,
    average_execution_time = avg_execution_time,
    peak_memory_usage = peak_memory,
    total_messages_processed = total_messages,
    error_count = total_errors,
    throughput_per_second = avg_throughput,
    concurrent_peak = peak_concurrent,
    performance_trend = "STABLE", -- Will be calculated by trend analysis
    retention_expires = timestamp + retention_seconds
  }
end

-- Calculate performance trend for a specific metric
function PerformanceHistory:calculate_trend(
  process_id: string,
  metric_name: string,
  time_window: number
): PerformanceHistory.TrendAnalysis
  
  -- Get recent hour data for trend analysis
  local recent_data = self:get_historical_data("hour", process_id, time_window)
  
  if #recent_data < 2 then
    return {
      metric_name = metric_name,
      current_value = 0,
      previous_value = 0,
      trend_direction = "STABLE",
      change_percentage = 0,
      confidence = 0
    }
  end
  
  -- Sort by timestamp to ensure chronological order
  table.sort(recent_data, function(a, b) return a.bucket_timestamp < b.bucket_timestamp end)
  
  local current_value = 0
  local previous_value = 0
  
  -- Extract metric values
  if metric_name == "execution_time" then
    current_value = recent_data[#recent_data].average_execution_time
    previous_value = recent_data[1].average_execution_time
  elseif metric_name == "memory_usage" then
    current_value = recent_data[#recent_data].peak_memory_usage
    previous_value = recent_data[1].peak_memory_usage
  elseif metric_name == "throughput" then
    current_value = recent_data[#recent_data].throughput_per_second
    previous_value = recent_data[1].throughput_per_second
  elseif metric_name == "error_rate" then
    current_value = recent_data[#recent_data].error_count
    previous_value = recent_data[1].error_count
  end
  
  -- Calculate change percentage
  local change_percentage = 0
  if previous_value > 0 then
    change_percentage = ((current_value - previous_value) / previous_value) * 100
  end
  
  -- Determine trend direction
  local trend_direction: PerformanceHistory.TrendDirection = "STABLE"
  if math.abs(change_percentage) > 5 then -- 5% threshold for significant change
    if change_percentage > 0 then
      trend_direction = (metric_name == "throughput") and "IMPROVING" or "DEGRADING"
    else
      trend_direction = (metric_name == "throughput") and "DEGRADING" or "IMPROVING"
    end
  end
  
  -- Calculate confidence based on data points available
  local confidence = math.min(100, (#recent_data / time_window) * 100)
  
  return {
    metric_name = metric_name,
    current_value = current_value,
    previous_value = previous_value,
    trend_direction = trend_direction,
    change_percentage = change_percentage,
    confidence = confidence
  }
end

-- Get historical data for specified bucket and process
function PerformanceHistory:get_historical_data(
  bucket: PerformanceHistory.TimeBucket,
  process_id: string?,
  limit: number?
): {PerformanceHistory.HistoricalPerformanceData}
  
  local data = self.historical_data[bucket] or {}
  local filtered_data: {PerformanceHistory.HistoricalPerformanceData} = {}
  
  for _, point in ipairs(data) do
    if not process_id or point.process_id == process_id then
      table.insert(filtered_data, point)
    end
  end
  
  -- Sort by timestamp (most recent first)
  table.sort(filtered_data, function(a, b) return a.bucket_timestamp > b.bucket_timestamp end)
  
  -- Apply limit if specified
  if limit and #filtered_data > limit then
    local limited_data: {PerformanceHistory.HistoricalPerformanceData} = {}
    for i = 1, limit do
      table.insert(limited_data, filtered_data[i])
    end
    filtered_data = limited_data
  end
  
  return filtered_data
end

-- Cleanup expired data based on retention policies
function PerformanceHistory:cleanup_expired_data()
  local current_time = os.time()
  
  -- Clean up each bucket type
  for bucket_name, data_points in pairs(self.historical_data) do
    for i = #data_points, 1, -1 do
      local point = data_points[i]
      if point.retention_expires <= current_time then
        table.remove(data_points, i)
      end
    end
  end
end

-- Export capacity planning data
function PerformanceHistory:export_capacity_planning_data(process_id: string): {any}
  local day_data = self:get_historical_data("day", process_id, 30) -- Last 30 days
  local capacity_data: {any} = {}
  
  for _, point in ipairs(day_data) do
    table.insert(capacity_data, {
      date = os.date("%Y-%m-%d", point.bucket_timestamp),
      avg_execution_time = point.average_execution_time,
      peak_memory_mb = point.peak_memory_usage / 1048576,
      total_messages = point.total_messages_processed,
      peak_concurrent = point.concurrent_peak,
      error_count = point.error_count,
      avg_throughput = point.throughput_per_second
    })
  end
  
  return capacity_data
end

-- Analyze performance trends for all metrics
function PerformanceHistory:analyze_performance_trends(process_id: string): {PerformanceHistory.TrendAnalysis}
  if not self.config.enable_trend_analysis then
    return {}
  end
  
  local metrics = {"execution_time", "memory_usage", "throughput", "error_rate"}
  local trends: {PerformanceHistory.TrendAnalysis} = {}
  
  for _, metric in ipairs(metrics) do
    local trend = self:calculate_trend(process_id, metric, self.config.trend_analysis_window)
    table.insert(trends, trend)
  end
  
  return trends
end

-- Get data retention status
function PerformanceHistory:get_data_retention_status(): {string: number}
  local status = {}
  
  for bucket_name, data_points in pairs(self.historical_data) do
    status[bucket_name .. "_count"] = #data_points
    
    -- Calculate storage usage (approximate)
    local storage_bytes = #data_points * 200 -- Approximate 200 bytes per data point
    status[bucket_name .. "_storage_kb"] = storage_bytes / 1024
  end
  
  status["raw_buffer_count"] = #self.raw_metrics_buffer
  return status
end

-- Force aggregation of all pending data
function PerformanceHistory:force_aggregation()
  self:aggregate_data("minute")
  self:aggregate_data("hour")
  self:aggregate_data("day")
end

-- Get storage metrics
function PerformanceHistory:get_storage_metrics(): {string: number}
  local metrics = {}
  local total_points = 0
  
  for bucket_name, data_points in pairs(self.historical_data) do
    metrics[bucket_name] = #data_points
    total_points = total_points + #data_points
  end
  
  metrics["total_historical_points"] = total_points
  metrics["raw_buffer_size"] = #self.raw_metrics_buffer
  metrics["estimated_memory_kb"] = (total_points * 200 + #self.raw_metrics_buffer * 150) / 1024
  
  return metrics
end

return PerformanceHistory