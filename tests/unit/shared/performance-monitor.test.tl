local PerformanceMonitor = require("../../../shared/utils/performance-monitor")

-- Test suite for PerformanceMonitor
local function test_performance_monitor()
  print("Running PerformanceMonitor tests...")
  
  -- Test 1: Monitor creation with default config
  local monitor = PerformanceMonitor.new()
  assert(monitor ~= nil, "Monitor should be created successfully")
  assert(monitor.config.collection_interval_ms == 1000, "Default collection interval should be 1000ms")
  assert(monitor.config.max_metrics_buffer == 1000, "Default max buffer should be 1000")
  assert(monitor.config.enable_memory_tracking == true, "Memory tracking should be enabled by default")
  assert(monitor.config.enable_throughput_tracking == true, "Throughput tracking should be enabled by default")
  print("✓ Monitor creation with default config")
  
  -- Test 2: Monitor creation with custom config
  local custom_config = {
    collection_interval_ms = 500,
    max_metrics_buffer = 50,
    enable_memory_tracking = false,
    enable_throughput_tracking = true
  }
  local custom_monitor = PerformanceMonitor.new(custom_config)
  assert(custom_monitor.config.collection_interval_ms == 500, "Custom collection interval should be set")
  assert(custom_monitor.config.max_metrics_buffer == 50, "Custom max buffer should be set")
  assert(custom_monitor.config.enable_memory_tracking == false, "Memory tracking should be disabled")
  print("✓ Monitor creation with custom config")
  
  -- Test 3: Handler timing functionality
  local timing_id = monitor:start_handler_timing("test_handler", "trace_123")
  assert(timing_id ~= nil, "Timing ID should be returned")
  assert(monitor.concurrent_count == 1, "Concurrent count should increase")
  assert(monitor.message_count == 1, "Message count should increase")
  
  -- Simulate some processing time
  local start_time = os.clock()
  while os.clock() - start_time < 0.01 do end -- 10ms delay
  
  monitor:end_handler_timing(timing_id, true)
  assert(monitor.concurrent_count == 0, "Concurrent count should decrease")
  print("✓ Handler timing functionality")
  
  -- Test 4: Error tracking
  local error_timing_id = monitor:start_handler_timing("error_handler", "trace_456")
  monitor:end_handler_timing(error_timing_id, false) -- false = failure
  assert(monitor.error_count == 1, "Error count should increase on failure")
  print("✓ Error tracking functionality")
  
  -- Test 5: Metrics collection
  local metrics = monitor:collect_metrics("test_process_123")
  assert(metrics.process_id == "test_process_123", "Process ID should match")
  assert(metrics.timestamp > 0, "Timestamp should be set")
  assert(metrics.execution_time_ms >= 0, "Execution time should be non-negative")
  assert(metrics.memory_usage_bytes >= 0, "Memory usage should be non-negative")
  assert(metrics.concurrent_requests == 0, "Concurrent requests should be current count")
  assert(metrics.queue_depth >= 0, "Queue depth should be non-negative")
  assert(metrics.throughput_per_second >= 0, "Throughput should be non-negative")
  assert(metrics.error_rate >= 0, "Error rate should be non-negative")
  print("✓ Metrics collection functionality")
  
  -- Test 6: Metrics buffer management
  assert(#monitor.metrics_buffer == 1, "Metrics buffer should contain one entry")
  
  -- Add more metrics to test buffer limit
  for i = 1, 5 do
    monitor:collect_metrics("test_process_" .. i)
  end
  assert(#monitor.metrics_buffer == 6, "Metrics buffer should contain all entries")
  print("✓ Metrics buffer management")
  
  -- Test 7: Memory usage (disabled case)
  local no_memory_monitor = PerformanceMonitor.new({enable_memory_tracking = false})
  local memory_usage = no_memory_monitor:get_memory_usage()
  assert(memory_usage == 0, "Memory usage should be 0 when disabled")
  print("✓ Memory tracking disable functionality")
  
  -- Test 8: Throughput calculation (disabled case)
  local no_throughput_monitor = PerformanceMonitor.new({enable_throughput_tracking = false})
  local throughput = no_throughput_monitor:calculate_throughput()
  assert(throughput == 0, "Throughput should be 0 when disabled")
  print("✓ Throughput tracking disable functionality")
  
  -- Test 9: Metrics buffer flush
  local flushed_metrics = monitor:flush_metrics()
  assert(#flushed_metrics == 6, "Flushed metrics should contain all buffered entries")
  assert(#monitor.metrics_buffer == 0, "Metrics buffer should be empty after flush")
  print("✓ Metrics buffer flush functionality")
  
  -- Test 10: Concurrent count edge cases
  monitor:update_concurrent_count(-5) -- Should not go below 0
  assert(monitor.concurrent_count == 0, "Concurrent count should not go below 0")
  
  monitor:update_concurrent_count(3)
  assert(monitor.concurrent_count == 3, "Concurrent count should increase correctly")
  print("✓ Concurrent count edge cases")
  
  -- Test 11: Invalid timing ID handling
  monitor:end_handler_timing("invalid_timing_id", true)
  -- Should not crash or cause issues
  print("✓ Invalid timing ID handling")
  
  -- Test 12: Correlation tracer integration
  local mock_tracer = {
    get_current_trace_id = function() return "mock_trace_456" end
  }
  monitor:set_correlation_tracer(mock_tracer)
  local traced_metrics = monitor:collect_metrics("traced_process")
  assert(traced_metrics.correlation_id == "mock_trace_456", "Correlation ID should come from tracer")
  print("✓ Correlation tracer integration")
  
  print("All PerformanceMonitor tests passed! ✅")
end

-- Test execution
test_performance_monitor()

-- Performance overhead validation test
local function test_performance_overhead()
  print("\nRunning performance overhead validation...")
  
  local monitor = PerformanceMonitor.new()
  local iterations = 1000
  
  -- Baseline timing without monitoring
  local start_time = os.clock()
  for i = 1, iterations do
    -- Simulate lightweight handler work
    local dummy = i * 2 + 1
  end
  local baseline_time = os.clock() - start_time
  
  -- Timing with monitoring
  start_time = os.clock()
  for i = 1, iterations do
    local timing_id = monitor:start_handler_timing("test_handler", "trace_" .. i)
    -- Simulate lightweight handler work
    local dummy = i * 2 + 1
    monitor:end_handler_timing(timing_id, true)
  end
  local monitored_time = os.clock() - start_time
  
  local overhead_percentage = ((monitored_time - baseline_time) / baseline_time) * 100
  
  print(string.format("Baseline time: %.4f seconds", baseline_time))
  print(string.format("Monitored time: %.4f seconds", monitored_time))
  print(string.format("Performance overhead: %.2f%%", overhead_percentage))
  
  -- Validate overhead is within acceptable limits (< 5% per requirements)
  assert(overhead_percentage < 5.0, string.format("Performance overhead %.2f%% exceeds 5%% limit", overhead_percentage))
  print("✓ Performance overhead within acceptable limits")
  
  print("Performance overhead validation passed! ✅")
end

test_performance_overhead()