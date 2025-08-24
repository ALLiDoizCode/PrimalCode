local PerformanceHistory = require("../../../shared/utils/performance-history")

-- Test suite for PerformanceHistory
local function test_performance_history()
  print("Running PerformanceHistory tests...")
  
  -- Test 1: History manager creation with default config
  local history = PerformanceHistory.new()
  assert(history ~= nil, "History manager should be created successfully")
  assert(history.config.minute_retention_hours == 24, "Default minute retention should be 24 hours")
  assert(history.config.hour_retention_days == 30, "Default hour retention should be 30 days")
  assert(history.config.day_retention_months == 12, "Default day retention should be 12 months")
  assert(history.config.enable_trend_analysis == true, "Trend analysis should be enabled by default")
  assert(history.config.auto_cleanup_enabled == true, "Auto cleanup should be enabled by default")
  print("✓ History manager creation with default config")
  
  -- Test 2: History manager creation with custom config
  local custom_config = {
    minute_retention_hours = 12,
    hour_retention_days = 15,
    day_retention_months = 6,
    enable_trend_analysis = false,
    trend_analysis_window = 72,
    auto_cleanup_enabled = false
  }
  
  local custom_history = PerformanceHistory.new(custom_config)
  assert(custom_history.config.minute_retention_hours == 12, "Custom minute retention should be set")
  assert(custom_history.config.hour_retention_days == 15, "Custom hour retention should be set")
  assert(custom_history.config.enable_trend_analysis == false, "Trend analysis should be disabled")
  print("✓ History manager creation with custom config")
  
  -- Test 3: Raw metrics addition
  local test_metrics = {
    execution_time_ms = 150,
    memory_usage_bytes = 500000000, -- 500MB
    concurrent_requests = 8,
    throughput_per_second = 25,
    error_rate = 1.5,
    queue_depth = 12
  }
  
  history:add_raw_metrics("test_process_123", test_metrics)
  assert(#history.raw_metrics_buffer == 1, "Should add metrics to raw buffer")
  
  local buffered_metric = history.raw_metrics_buffer[1]
  assert(buffered_metric.process_id == "test_process_123", "Process ID should match")
  assert(buffered_metric.execution_time_ms == 150, "Execution time should match")
  assert(buffered_metric.memory_usage_bytes == 500000000, "Memory usage should match")
  print("✓ Raw metrics addition")
  
  -- Test 4: Storage metrics calculation
  local storage_metrics = history:get_storage_metrics()
  assert(storage_metrics.total_historical_points ~= nil, "Should calculate total historical points")
  assert(storage_metrics.raw_buffer_size == 1, "Should track raw buffer size")
  assert(storage_metrics.estimated_memory_kb > 0, "Should estimate memory usage")
  print("✓ Storage metrics calculation")
  
  -- Test 5: Manual aggregation
  -- Add enough metrics to trigger aggregation
  for i = 1, 10 do
    local metrics = {
      execution_time_ms = 100 + i * 10,
      memory_usage_bytes = 400000000 + i * 10000000,
      concurrent_requests = 5 + i,
      throughput_per_second = 20 + i,
      error_rate = 0.5 + i * 0.1,
      queue_depth = 8 + i
    }
    history:add_raw_metrics("test_process_" .. i, metrics)
  end
  
  -- Force aggregation
  history:force_aggregation()
  
  -- Check that minute data was created
  local minute_data = history:get_historical_data("minute")
  assert(#minute_data > 0, "Should have minute-level aggregated data")
  print("✓ Manual aggregation")
  
  -- Test 6: Historical data retrieval with filters
  local process_1_data = history:get_historical_data("minute", "test_process_1")
  assert(#process_1_data > 0, "Should retrieve data for specific process")
  
  for _, data_point in ipairs(process_1_data) do
    assert(data_point.process_id == "test_process_1", "Filtered data should only contain specified process")
  end
  
  -- Test with limit
  local limited_data = history:get_historical_data("minute", nil, 3)
  assert(#limited_data <= 3, "Should respect limit parameter")
  print("✓ Historical data retrieval with filters")
  
  -- Test 7: Data retention status
  local retention_status = history:get_data_retention_status()
  assert(retention_status.minute_count ~= nil, "Should report minute data count")
  assert(retention_status.minute_storage_kb ~= nil, "Should report minute data storage")
  assert(retention_status.raw_buffer_count ~= nil, "Should report raw buffer count")
  print("✓ Data retention status")
  
  -- Test 8: Capacity planning data export
  local capacity_data = history:export_capacity_planning_data("test_process_1")
  assert(type(capacity_data) == "table", "Should return capacity planning data")
  
  if #capacity_data > 0 then
    local first_entry = capacity_data[1]
    assert(first_entry.date ~= nil, "Should include date")
    assert(first_entry.avg_execution_time ~= nil, "Should include execution time")
    assert(first_entry.peak_memory_mb ~= nil, "Should include memory in MB")
    assert(first_entry.total_messages ~= nil, "Should include message count")
  end
  print("✓ Capacity planning data export")
  
  -- Test 9: Trend analysis (with trend analysis enabled history)
  local trend_enabled_history = PerformanceHistory.new({enable_trend_analysis = true, trend_analysis_window = 24})
  
  -- Add historical data points to enable trend calculation
  for i = 1, 5 do
    local metrics = {
      execution_time_ms = 100 + i * 20, -- Increasing trend
      memory_usage_bytes = 500000000,
      concurrent_requests = 10,
      throughput_per_second = 30 - i, -- Decreasing trend
      error_rate = 1.0,
      queue_depth = 10
    }
    trend_enabled_history:add_raw_metrics("trend_process", metrics)
  end
  
  trend_enabled_history:force_aggregation()
  
  local trends = trend_enabled_history:analyze_performance_trends("trend_process")
  assert(type(trends) == "table", "Should return trends analysis")
  
  for _, trend in ipairs(trends) do
    assert(trend.metric_name ~= nil, "Trend should have metric name")
    assert(trend.trend_direction ~= nil, "Trend should have direction")
    assert(trend.change_percentage ~= nil, "Trend should have change percentage")
    assert(trend.confidence ~= nil, "Trend should have confidence level")
  end
  print("✓ Trend analysis")
  
  -- Test 10: Individual trend calculation
  local execution_trend = trend_enabled_history:calculate_trend("trend_process", "execution_time", 5)
  assert(execution_trend.metric_name == "execution_time", "Should calculate execution time trend")
  assert(execution_trend.current_value ~= execution_trend.previous_value, "Current and previous should be different")
  print("✓ Individual trend calculation")
  
  print("All PerformanceHistory tests passed! ✅")
end

-- Integration test with multiple time buckets
local function test_time_bucket_aggregation()
  print("\nRunning Time Bucket Aggregation tests...")
  
  local history = PerformanceHistory.new()
  
  -- Simulate metrics over time with different timestamps
  local base_time = os.time()
  
  -- Add metrics spanning multiple minutes
  for minute = 0, 3 do
    for sample = 1, 5 do
      local timestamp = base_time + (minute * 60) + (sample * 10)
      
      local metrics = {
        execution_time_ms = 120 + minute * 10 + sample,
        memory_usage_bytes = 600000000 + minute * 50000000,
        concurrent_requests = 8 + minute + sample,
        throughput_per_second = 25 + minute * 2,
        error_rate = 1.0 + minute * 0.5,
        queue_depth = 10 + minute
      }
      
      -- Manually set timestamp for testing
      table.insert(history.raw_metrics_buffer, {
        process_id = "time_test_process",
        timestamp = timestamp,
        execution_time_ms = metrics.execution_time_ms,
        memory_usage_bytes = metrics.memory_usage_bytes,
        concurrent_requests = metrics.concurrent_requests,
        throughput_per_second = metrics.throughput_per_second,
        error_rate = metrics.error_rate,
        queue_depth = metrics.queue_depth
      })
    end
  end
  
  -- Force minute aggregation
  local minute_points = history:aggregate_minute_data()
  assert(#minute_points > 0, "Should create minute aggregation points")
  
  -- Verify aggregation properties
  for _, point in ipairs(minute_points) do
    assert(point.time_bucket == "minute", "Should be minute bucket")
    assert(point.process_id == "time_test_process", "Should have correct process ID")
    assert(point.average_execution_time > 0, "Should calculate average execution time")
    assert(point.peak_memory_usage > 0, "Should track peak memory usage")
    assert(point.total_messages_processed >= 0, "Should track message count")
    assert(point.retention_expires > point.bucket_timestamp, "Should set proper retention expiry")
  end
  
  print("✓ Minute-level aggregation")
  
  -- Test hour-level aggregation (simulate by adding minute data to history)
  history.historical_data.minute = minute_points
  
  -- Simulate hour aggregation
  local hour_points = history:aggregate_hour_data()
  
  for _, point in ipairs(hour_points) do
    assert(point.time_bucket == "hour", "Should be hour bucket")
    assert(point.average_execution_time > 0, "Should aggregate execution time")
  end
  
  print("✓ Hour-level aggregation")
  print("Time Bucket Aggregation tests passed! ✅")
end

-- Test data cleanup and retention
local function test_data_retention()
  print("\nRunning Data Retention tests...")
  
  local history = PerformanceHistory.new({
    minute_retention_hours = 1, -- Very short retention for testing
    hour_retention_days = 1,
    day_retention_months = 1
  })
  
  -- Add some test data with old timestamps
  local old_time = os.time() - (2 * 3600) -- 2 hours ago
  local recent_time = os.time() - (30 * 60) -- 30 minutes ago
  
  -- Create old data that should be expired
  local old_data_point = {
    data_point_id = "old_test",
    process_id = "retention_test",
    time_bucket = "minute",
    bucket_timestamp = old_time,
    average_execution_time = 100,
    peak_memory_usage = 500000000,
    total_messages_processed = 100,
    error_count = 1,
    throughput_per_second = 10,
    concurrent_peak = 5,
    performance_trend = "STABLE",
    retention_expires = old_time + 3600 -- Expired 1 hour ago
  }
  
  -- Create recent data that should be kept
  local recent_data_point = {
    data_point_id = "recent_test",
    process_id = "retention_test",
    time_bucket = "minute",
    bucket_timestamp = recent_time,
    average_execution_time = 120,
    peak_memory_usage = 600000000,
    total_messages_processed = 120,
    error_count = 2,
    throughput_per_second = 12,
    concurrent_peak = 6,
    performance_trend = "STABLE",
    retention_expires = recent_time + 3600 -- Still valid
  }
  
  -- Add to history
  table.insert(history.historical_data.minute, old_data_point)
  table.insert(history.historical_data.minute, recent_data_point)
  
  assert(#history.historical_data.minute == 2, "Should have 2 data points before cleanup")
  
  -- Run cleanup
  history:cleanup_expired_data()
  
  assert(#history.historical_data.minute == 1, "Should have 1 data point after cleanup")
  assert(history.historical_data.minute[1].data_point_id == "recent_test", "Should keep recent data")
  
  print("✓ Data retention and cleanup")
  print("Data Retention tests passed! ✅")
end

-- Performance test for historical data operations
local function test_history_performance()
  print("\nRunning PerformanceHistory performance tests...")
  
  local history = PerformanceHistory.new()
  local iterations = 100
  
  -- Test raw metrics addition performance
  local start_time = os.clock()
  
  for i = 1, iterations do
    local metrics = {
      execution_time_ms = 100 + i,
      memory_usage_bytes = 500000000 + i * 1000000,
      concurrent_requests = 5 + (i % 10),
      throughput_per_second = 20 + (i % 5),
      error_rate = 1.0 + (i % 3),
      queue_depth = 8 + (i % 4)
    }
    
    history:add_raw_metrics("perf_test_process_" .. (i % 10), metrics)
  end
  
  local end_time = os.clock()
  local total_time = (end_time - start_time) * 1000
  local avg_time_per_add = total_time / iterations
  
  print(string.format("Raw metrics addition: %.2fms total, %.3fms per addition", total_time, avg_time_per_add))
  
  assert(avg_time_per_add < 1.0, string.format("Average addition time %.3fms should be under 1ms", avg_time_per_add))
  
  -- Test aggregation performance
  start_time = os.clock()
  history:force_aggregation()
  end_time = os.clock()
  
  local aggregation_time = (end_time - start_time) * 1000
  print(string.format("Aggregation time: %.2fms for %d metrics", aggregation_time, iterations))
  
  assert(aggregation_time < 100.0, string.format("Aggregation time %.2fms should be under 100ms", aggregation_time))
  
  -- Test data retrieval performance
  start_time = os.clock()
  
  for i = 1, 50 do
    local data = history:get_historical_data("minute", "perf_test_process_" .. (i % 10), 10)
  end
  
  end_time = os.clock()
  local retrieval_time = (end_time - start_time) * 1000
  local avg_retrieval_time = retrieval_time / 50
  
  print(string.format("Data retrieval: %.2fms total, %.3fms per query", retrieval_time, avg_retrieval_time))
  
  assert(avg_retrieval_time < 5.0, string.format("Average retrieval time %.3fms should be under 5ms", avg_retrieval_time))
  
  print("✓ Historical data operations performance within acceptable limits")
  print("PerformanceHistory performance tests passed! ✅")
end

-- Test execution
test_performance_history()
test_time_bucket_aggregation()
test_data_retention()
test_history_performance()