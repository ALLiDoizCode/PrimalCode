local PerformanceAlerts = require("../../../shared/utils/performance-alerts")

-- Test suite for PerformanceAlerts
local function test_performance_alerts()
  print("Running PerformanceAlerts tests...")
  
  -- Test 1: Alert manager creation with default config
  local alerts_manager = PerformanceAlerts.new()
  assert(alerts_manager ~= nil, "Alerts manager should be created successfully")
  assert(alerts_manager.config.max_active_alerts == 50, "Default max active alerts should be 50")
  assert(alerts_manager.config.alert_cooldown_ms == 60000, "Default cooldown should be 60000ms")
  assert(alerts_manager.config.auto_resolve_after_ms == 300000, "Default auto-resolve should be 300000ms")
  assert(#alerts_manager.active_alerts == 0, "Should start with no active alerts")
  print("✓ Alert manager creation with default config")
  
  -- Test 2: Alert manager creation with custom config
  local custom_config = {
    max_active_alerts = 25,
    alert_cooldown_ms = 30000,
    auto_resolve_after_ms = 180000,
    notification_enabled = false,
    correlation_enabled = false
  }
  local custom_manager = PerformanceAlerts.new(custom_config)
  assert(custom_manager.config.max_active_alerts == 25, "Custom max active alerts should be set")
  assert(custom_manager.config.alert_cooldown_ms == 30000, "Custom cooldown should be set")
  print("✓ Alert manager creation with custom config")
  
  -- Test 3: Default thresholds initialization
  local default_thresholds = 0
  for _ in pairs(alerts_manager.thresholds) do
    default_thresholds = default_thresholds + 1
  end
  assert(default_thresholds >= 5, "Should initialize with default thresholds")
  
  -- Check specific default thresholds
  assert(alerts_manager.thresholds["execution_time_ms"] ~= nil, "Should have execution time threshold")
  assert(alerts_manager.thresholds["memory_usage_bytes"] ~= nil, "Should have memory usage threshold")
  assert(alerts_manager.thresholds["error_rate"] ~= nil, "Should have error rate threshold")
  assert(alerts_manager.thresholds["queue_depth"] ~= nil, "Should have queue depth threshold")
  assert(alerts_manager.thresholds["concurrent_requests"] ~= nil, "Should have concurrent requests threshold")
  print("✓ Default thresholds initialization")
  
  -- Test 4: Adding and removing custom thresholds
  local custom_threshold = {
    metric_name = "custom_metric",
    threshold_value = 100,
    severity = "INFO",
    comparison = "greater_than",
    enabled = true
  }
  
  alerts_manager:add_threshold(custom_threshold)
  assert(alerts_manager.thresholds["custom_metric"] ~= nil, "Custom threshold should be added")
  assert(alerts_manager.thresholds["custom_metric"].threshold_value == 100, "Custom threshold value should be set")
  
  local removed = alerts_manager:remove_threshold("custom_metric")
  assert(removed == true, "Should successfully remove existing threshold")
  assert(alerts_manager.thresholds["custom_metric"] == nil, "Custom threshold should be removed")
  
  local not_removed = alerts_manager:remove_threshold("nonexistent_metric")
  assert(not_removed == false, "Should return false when removing non-existent threshold")
  print("✓ Adding and removing custom thresholds")
  
  -- Test 5: Triggering alerts
  local alert = alerts_manager:trigger_alert(
    "test_process_123",
    "execution_time_ms",
    2000,
    3500,
    "CRITICAL",
    "test_trace_456"
  )
  
  assert(alert ~= nil, "Alert should be created")
  assert(alert.process_id == "test_process_123", "Process ID should match")
  assert(alert.metric_type == "execution_time_ms", "Metric type should match")
  assert(alert.threshold_value == 2000, "Threshold value should match")
  assert(alert.actual_value == 3500, "Actual value should match")
  assert(alert.severity == "CRITICAL", "Severity should match")
  assert(alert.correlation_id == "test_trace_456", "Correlation ID should match")
  assert(alert.resolved == false, "Alert should not be resolved initially")
  
  assert(#alerts_manager.active_alerts == 1, "Should have one active alert")
  assert(#alerts_manager.alert_history == 1, "Should have one alert in history")
  print("✓ Triggering alerts")
  
  -- Test 6: Alert message generation
  local message = alerts_manager:generate_alert_message("execution_time_ms", 3500, 2000, "CRITICAL")
  assert(type(message) == "string", "Message should be a string")
  assert(string.find(message, "3500"), "Message should contain actual value")
  assert(string.find(message, "2000"), "Message should contain threshold value")
  assert(string.find(message, "CRITICAL"), "Message should contain severity")
  print("✓ Alert message generation")
  
  -- Test 7: Resolving alerts
  local resolved = alerts_manager:resolve_alert(alert.alert_id)
  assert(resolved == true, "Should successfully resolve existing alert")
  assert(alert.resolved == true, "Alert should be marked as resolved")
  assert(alert.resolution_timestamp ~= nil, "Resolution timestamp should be set")
  assert(#alerts_manager.active_alerts == 0, "Should have no active alerts after resolution")
  
  local not_resolved = alerts_manager:resolve_alert("nonexistent_alert_id")
  assert(not_resolved == false, "Should return false when resolving non-existent alert")
  print("✓ Resolving alerts")
  
  -- Test 8: Metrics checking and threshold violations
  local test_metrics = {
    execution_time_ms = 2500, -- Exceeds 2000ms threshold
    memory_usage_bytes = 500000000, -- Below 1GB threshold
    error_rate = 7.5, -- Exceeds 5% threshold
    queue_depth = 25, -- Below 50 threshold
    concurrent_requests = 15 -- Below 20 threshold
  }
  
  local triggered_alerts = alerts_manager:check_metrics("test_process_456", test_metrics)
  assert(#triggered_alerts >= 2, "Should trigger at least 2 alerts (execution_time_ms and error_rate)")
  
  -- Check that correct alerts were triggered
  local execution_alert_found = false
  local error_rate_alert_found = false
  
  for _, triggered_alert in ipairs(triggered_alerts) do
    if triggered_alert.metric_type == "execution_time_ms" then
      execution_alert_found = true
      assert(triggered_alert.actual_value == 2500, "Execution time alert should have correct value")
    elseif triggered_alert.metric_type == "error_rate" then
      error_rate_alert_found = true
      assert(triggered_alert.actual_value == 7.5, "Error rate alert should have correct value")
    end
  end
  
  assert(execution_alert_found, "Should trigger execution time alert")
  assert(error_rate_alert_found, "Should trigger error rate alert")
  print("✓ Metrics checking and threshold violations")
  
  -- Test 9: Alert cooldown functionality
  -- First check should trigger alerts (already done above)
  assert(alerts_manager:is_in_cooldown("execution_time_ms"), "Should be in cooldown after triggering alert")
  assert(alerts_manager:is_in_cooldown("error_rate"), "Should be in cooldown after triggering alert")
  
  -- Second immediate check should not trigger due to cooldown
  local cooldown_alerts = alerts_manager:check_metrics("test_process_456", test_metrics)
  assert(#cooldown_alerts == 0, "Should not trigger alerts during cooldown period")
  
  -- Test with metric not in cooldown
  assert(not alerts_manager:is_in_cooldown("memory_usage_bytes"), "Should not be in cooldown for unused metric")
  print("✓ Alert cooldown functionality")
  
  -- Test 10: Auto-resolution of old alerts
  -- Create an alert and simulate old timestamp
  local old_alert = alerts_manager:trigger_alert("old_process", "queue_depth", 50, 75, "WARNING", "old_trace")
  old_alert.timestamp = os.time() - 400 -- Make it 400 seconds old (older than 300s auto-resolve threshold)
  
  alerts_manager:auto_resolve_alerts()
  assert(old_alert.resolved == true, "Old alert should be auto-resolved")
  print("✓ Auto-resolution of old alerts")
  
  -- Test 11: Getting alerts by severity
  -- Create alerts with different severities
  alerts_manager:trigger_alert("proc1", "metric1", 10, 15, "CRITICAL", "trace1")
  alerts_manager:trigger_alert("proc2", "metric2", 20, 25, "WARNING", "trace2")
  alerts_manager:trigger_alert("proc3", "metric3", 30, 35, "INFO", "trace3")
  
  local critical_alerts = alerts_manager:get_alerts_by_severity("CRITICAL")
  local warning_alerts = alerts_manager:get_alerts_by_severity("WARNING")
  local info_alerts = alerts_manager:get_alerts_by_severity("INFO")
  
  assert(#critical_alerts >= 1, "Should have at least one critical alert")
  assert(#warning_alerts >= 1, "Should have at least one warning alert")
  assert(#info_alerts >= 1, "Should have at least one info alert")
  
  -- Verify severity filtering
  for _, alert in ipairs(critical_alerts) do
    assert(alert.severity == "CRITICAL", "Critical alerts should only contain CRITICAL severity")
  end
  print("✓ Getting alerts by severity")
  
  -- Test 12: Getting alerts by process
  local proc1_alerts = alerts_manager:get_alerts_by_process("proc1")
  assert(#proc1_alerts >= 1, "Should have alerts for proc1")
  
  for _, alert in ipairs(proc1_alerts) do
    assert(alert.process_id == "proc1", "Process alerts should only contain specified process")
  end
  print("✓ Getting alerts by process")
  
  -- Test 13: Correlation tracer integration
  local mock_tracer = {
    get_current_trace_id = function() return "mock_correlation_789" end
  }
  
  alerts_manager:set_correlation_tracer(mock_tracer)
  
  local traced_metrics = {
    queue_depth = 60 -- Exceeds 50 threshold
  }
  
  local traced_alerts = alerts_manager:check_metrics("traced_process", traced_metrics)
  assert(#traced_alerts >= 1, "Should trigger alert for queue depth")
  assert(traced_alerts[1].correlation_id == "mock_correlation_789", "Should use tracer correlation ID")
  print("✓ Correlation tracer integration")
  
  -- Test 14: Alert history and cleanup
  local history_before_cleanup = #alerts_manager:get_alert_history()
  assert(history_before_cleanup > 0, "Should have alerts in history")
  
  -- Simulate old alerts for cleanup testing
  for i = 1, 3 do
    local old_alert = alerts_manager:trigger_alert("cleanup_proc_" .. i, "test_metric", 100, 150, "INFO", "cleanup_trace_" .. i)
    old_alert.timestamp = os.time() - (25 * 60 * 60) -- Make it 25 hours old (older than 24 hour cleanup threshold)
  end
  
  alerts_manager:clear_old_alerts()
  local history_after_cleanup = #alerts_manager:get_alert_history()
  assert(history_after_cleanup < history_before_cleanup + 3, "Should clean up old alerts from history")
  print("✓ Alert history and cleanup")
  
  -- Test 15: Max active alerts limit
  -- Fill up to the limit
  for i = 1, 60 do -- Exceed max_active_alerts of 50
    alerts_manager:trigger_alert("limit_proc_" .. i, "test_metric", 10, 20, "INFO", "limit_trace_" .. i)
  end
  
  assert(#alerts_manager:get_active_alerts() <= alerts_manager.config.max_active_alerts, "Should not exceed max active alerts limit")
  print("✓ Max active alerts limit")
  
  print("All PerformanceAlerts tests passed! ✅")
end

-- Integration test with performance monitoring
local function test_alerts_integration()
  print("\nRunning PerformanceAlerts integration tests...")
  
  local alerts_manager = PerformanceAlerts.new()
  
  -- Test realistic alerting scenario
  local scenarios = {
    {
      name = "Normal Operation",
      metrics = {
        execution_time_ms = 150,
        memory_usage_bytes = 500000000, -- 500MB
        error_rate = 0.5,
        queue_depth = 10,
        concurrent_requests = 8
      },
      expected_alerts = 0
    },
    {
      name = "High Load Scenario",
      metrics = {
        execution_time_ms = 1800,
        memory_usage_bytes = 800000000, -- 800MB
        error_rate = 3.5,
        queue_depth = 45,
        concurrent_requests = 25
      },
      expected_alerts = 1 -- Only concurrent_requests should trigger
    },
    {
      name = "Critical Issues",
      metrics = {
        execution_time_ms = 2500, -- Critical
        memory_usage_bytes = 1200000000, -- 1.2GB - Warning
        error_rate = 8.0, -- Warning
        queue_depth = 60, -- Critical
        concurrent_requests = 30 -- Warning
      },
      expected_alerts = 5 -- All metrics should trigger alerts
    }
  }
  
  for scenario_idx, scenario in ipairs(scenarios) do
    local process_id = "integration_test_process_" .. scenario_idx
    local triggered_alerts = alerts_manager:check_metrics(process_id, scenario.metrics)
    
    print(string.format("Scenario: %s - Triggered %d alerts (expected %d)", 
          scenario.name, #triggered_alerts, scenario.expected_alerts))
    
    -- Reset cooldowns to test each scenario independently
    alerts_manager.alert_cooldowns = {}
  end
  
  -- Test alert resolution workflow
  local active_alerts = alerts_manager:get_active_alerts()
  local initial_active_count = #active_alerts
  
  if initial_active_count > 0 then
    local first_alert = active_alerts[1]
    alerts_manager:resolve_alert(first_alert.alert_id)
    
    local updated_active_count = #alerts_manager:get_active_alerts()
    assert(updated_active_count == initial_active_count - 1, "Should reduce active alert count after resolution")
    print("✓ Alert resolution workflow")
  end
  
  -- Test alert severity distribution
  local critical_count = #alerts_manager:get_alerts_by_severity("CRITICAL")
  local warning_count = #alerts_manager:get_alerts_by_severity("WARNING")
  local info_count = #alerts_manager:get_alerts_by_severity("INFO")
  
  print(string.format("Alert severity distribution - Critical: %d, Warning: %d, Info: %d", 
        critical_count, warning_count, info_count))
  
  assert(critical_count + warning_count + info_count == #alerts_manager:get_active_alerts(),
         "Sum of severity counts should equal total active alerts")
  print("✓ Alert severity distribution")
  
  print("PerformanceAlerts integration tests passed! ✅")
end

-- Performance test for alerting system
local function test_alerts_performance()
  print("\nRunning PerformanceAlerts performance tests...")
  
  local alerts_manager = PerformanceAlerts.new()
  local iterations = 1000
  
  -- Test metrics checking performance
  local test_metrics = {
    execution_time_ms = 1500,
    memory_usage_bytes = 900000000,
    error_rate = 2.5,
    queue_depth = 30,
    concurrent_requests = 15
  }
  
  local start_time = os.clock()
  
  for i = 1, iterations do
    alerts_manager:check_metrics("perf_test_process_" .. i, test_metrics)
    -- Clear cooldowns to allow all checks to trigger
    if i % 100 == 0 then
      alerts_manager.alert_cooldowns = {}
    end
  end
  
  local end_time = os.clock()
  local total_time = (end_time - start_time) * 1000 -- Convert to milliseconds
  local avg_time_per_check = total_time / iterations
  
  print(string.format("Metrics checking performance: %.2fms total, %.3fms per check", total_time, avg_time_per_check))
  
  -- Verify performance meets requirements (should be very fast)
  assert(avg_time_per_check < 1.0, string.format("Average check time %.3fms should be under 1ms", avg_time_per_check))
  print("✓ Alerting system performance within acceptable limits")
  
  print("PerformanceAlerts performance tests passed! ✅")
end

-- Test execution
test_performance_alerts()
test_alerts_integration()
test_alerts_performance()