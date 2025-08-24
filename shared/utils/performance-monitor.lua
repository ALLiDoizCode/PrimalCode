-- Performance monitoring utility for AO processes
local PerformanceMonitor = {}
PerformanceMonitor.__index = PerformanceMonitor

-- Create new performance monitor instance
function PerformanceMonitor.new(config)
  local monitor = setmetatable({}, PerformanceMonitor)
  
  monitor.metrics_buffer = {}
  monitor.active_handlers = {}
  monitor.concurrent_count = 0
  monitor.message_count = 0
  monitor.error_count = 0
  monitor.last_throughput_check = os.time()
  
  -- Default configuration
  monitor.config = config or {}
  monitor.config.collection_interval_ms = monitor.config.collection_interval_ms or 1000
  monitor.config.max_metrics_buffer = monitor.config.max_metrics_buffer or 1000
  monitor.config.enable_memory_tracking = monitor.config.enable_memory_tracking ~= false
  monitor.config.enable_throughput_tracking = monitor.config.enable_throughput_tracking ~= false
  
  -- Load thresholds with defaults
  monitor.config.load_thresholds = monitor.config.load_thresholds or {}
  local thresholds = monitor.config.load_thresholds
  thresholds.idle_threshold = thresholds.idle_threshold or 2
  thresholds.active_threshold = thresholds.active_threshold or 10
  thresholds.overload_threshold = thresholds.overload_threshold or 20
  thresholds.max_queue_depth = thresholds.max_queue_depth or 50
  
  -- Initialize load monitoring state
  monitor.message_queue = {}
  monitor.load_history = {}
  monitor.peak_concurrent = 0
  monitor.total_messages_processed = 0
  monitor.circuit_breaker_triggered = false
  
  return monitor
end

-- Start timing a handler execution
function PerformanceMonitor:start_handler_timing(handler_name, correlation_id)
  local timing_id = handler_name .. "_" .. os.time() .. "_" .. math.random(1000, 9999)
  local start_time = os.clock()
  
  self.active_handlers[timing_id] = start_time
  self:update_concurrent_count(1)
  self:add_message_count()
  
  -- Add to message queue for tracking
  self:add_to_message_queue({
    timing_id = timing_id,
    handler_name = handler_name,
    correlation_id = correlation_id,
    start_time = start_time
  })
  
  return timing_id
end

-- End timing a handler execution
function PerformanceMonitor:end_handler_timing(timing_id, success)
  local start_time = self.active_handlers[timing_id]
  if not start_time then
    return -- Invalid timing_id
  end
  
  local execution_time = (os.clock() - start_time) * 1000 -- Convert to milliseconds
  self.active_handlers[timing_id] = nil
  self:update_concurrent_count(-1)
  
  -- Remove from message queue
  self:remove_from_message_queue()
  self.total_messages_processed = self.total_messages_processed + 1
  
  if not success then
    self:add_error_count()
  end
  
  -- Store timing for metrics collection
  if not self._current_handler_times then
    self._current_handler_times = {}
  end
  
  local handler_name = timing_id:match("^([^_]+)")
  table.insert(self._current_handler_times, {
    handler_name = handler_name,
    execution_time_ms = execution_time,
    timestamp = os.time()
  })
end

-- Collect current performance metrics
function PerformanceMonitor:collect_metrics(process_id)
  local current_time = os.time()
  local memory_usage = self:get_memory_usage()
  local throughput = self:calculate_throughput()
  
  -- Calculate average execution time from recent handler timings
  local avg_execution_time = 0
  local handler_name = "mixed"
  
  if self._current_handler_times and #self._current_handler_times > 0 then
    local total_time = 0
    local recent_count = 0
    
    for _, timing in ipairs(self._current_handler_times) do
      if current_time - timing.timestamp <= 60 then -- Last minute only
        total_time = total_time + timing.execution_time_ms
        recent_count = recent_count + 1
        handler_name = timing.handler_name -- Use most recent
      end
    end
    
    if recent_count > 0 then
      avg_execution_time = total_time / recent_count
    end
  end
  
  -- Calculate error rate
  local total_messages = self.message_count > 0 and self.message_count or 1
  local error_rate = (self.error_count / total_messages) * 100
  
  local metrics = {
    process_id = process_id,
    timestamp = current_time,
    handler_name = handler_name,
    execution_time_ms = avg_execution_time,
    memory_usage_bytes = memory_usage,
    concurrent_requests = self.concurrent_count,
    queue_depth = self:get_queue_depth(),
    throughput_per_second = throughput,
    error_rate = error_rate,
    correlation_id = self.correlation_tracer and self.correlation_tracer:get_current_trace_id() or "none"
  }
  
  -- Add to metrics buffer
  table.insert(self.metrics_buffer, metrics)
  
  -- Limit buffer size
  if #self.metrics_buffer > self.config.max_metrics_buffer then
    table.remove(self.metrics_buffer, 1)
  end
  
  return metrics
end

-- Get current memory usage
function PerformanceMonitor:get_memory_usage()
  if not self.config.enable_memory_tracking then
    return 0
  end
  
  collectgarbage("collect")
  return collectgarbage("count") * 1024 -- Convert KB to bytes
end

-- Calculate messages per second throughput
function PerformanceMonitor:calculate_throughput()
  if not self.config.enable_throughput_tracking then
    return 0
  end
  
  local current_time = os.time()
  local time_diff = current_time - self.last_throughput_check
  
  if time_diff <= 0 then
    return 0
  end
  
  local throughput = self.message_count / time_diff
  
  -- Reset counters for next calculation
  self.message_count = 0
  self.error_count = 0
  self.last_throughput_check = current_time
  
  return throughput
end

-- Update concurrent request count
function PerformanceMonitor:update_concurrent_count(delta)
  self.concurrent_count = self.concurrent_count + delta
  if self.concurrent_count < 0 then
    self.concurrent_count = 0
  end
end

-- Increment message count
function PerformanceMonitor:add_message_count()
  self.message_count = self.message_count + 1
end

-- Increment error count
function PerformanceMonitor:add_error_count()
  self.error_count = self.error_count + 1
end

-- Get current message queue depth
function PerformanceMonitor:get_queue_depth()
  return #self.message_queue
end

-- Flush all buffered metrics
function PerformanceMonitor:flush_metrics()
  local metrics = self.metrics_buffer
  self.metrics_buffer = {}
  return metrics
end

-- Set correlation tracer for linking to trace system
function PerformanceMonitor:set_correlation_tracer(tracer)
  self.correlation_tracer = tracer
end

-- Calculate current load metrics
function PerformanceMonitor:calculate_load_metrics()
  local queue_depth = self:get_queue_depth()
  local load_state = self:determine_load_state(self.concurrent_count, queue_depth)
  local load_percentage = self:calculate_load_percentage(self.concurrent_count)
  local throughput = self:calculate_throughput()
  
  local load_metrics = {
    concurrent_handlers = self.concurrent_count,
    queue_depth = queue_depth,
    throughput_per_second = throughput,
    load_state = load_state,
    load_percentage = load_percentage
  }
  
  -- Add to load history
  table.insert(self.load_history, load_metrics)
  
  -- Limit load history size
  if #self.load_history > 100 then
    table.remove(self.load_history, 1)
  end
  
  return load_metrics
end

-- Determine current load state based on thresholds
function PerformanceMonitor:determine_load_state(concurrent, queue_depth)
  local thresholds = self.config.load_thresholds
  
  -- Check for overload conditions
  if concurrent >= thresholds.overload_threshold or queue_depth >= thresholds.max_queue_depth then
    return "overloaded"
  elseif concurrent >= thresholds.active_threshold then
    return "active"
  elseif concurrent < thresholds.idle_threshold then
    return "idle"
  else
    return "active"
  end
end

-- Calculate load percentage based on overload threshold
function PerformanceMonitor:calculate_load_percentage(concurrent)
  local max_capacity = self.config.load_thresholds.overload_threshold
  local percentage = (concurrent / max_capacity) * 100
  
  -- Cap at 100%
  if percentage > 100 then
    percentage = 100
  end
  
  return percentage
end

-- Add message to queue for tracking
function PerformanceMonitor:add_to_message_queue(message)
  table.insert(self.message_queue, message)
  
  -- Update peak concurrent tracking
  self:update_peak_concurrent()
  
  -- Check for circuit breaker conditions
  if #self.message_queue >= self.config.load_thresholds.max_queue_depth then
    self:trigger_circuit_breaker()
  end
end

-- Remove message from queue
function PerformanceMonitor:remove_from_message_queue()
  if #self.message_queue > 0 then
    local removed = table.remove(self.message_queue, 1)
    
    -- Reset circuit breaker if queue is manageable
    if #self.message_queue < (self.config.load_thresholds.max_queue_depth * 0.5) then
      self:reset_circuit_breaker()
    end
    
    return removed
  end
  
  return nil
end

-- Get load history
function PerformanceMonitor:get_load_history()
  return self.load_history
end

-- Update peak concurrent count
function PerformanceMonitor:update_peak_concurrent()
  if self.concurrent_count > self.peak_concurrent then
    self.peak_concurrent = self.concurrent_count
  end
end

-- Trigger circuit breaker for overload protection
function PerformanceMonitor:trigger_circuit_breaker()
  self.circuit_breaker_triggered = true
end

-- Reset circuit breaker
function PerformanceMonitor:reset_circuit_breaker()
  self.circuit_breaker_triggered = false
end

-- Check if circuit breaker is active
function PerformanceMonitor:is_circuit_breaker_active()
  return self.circuit_breaker_triggered
end

return PerformanceMonitor