local PerformanceMonitor = require("../../../shared/utils/performance-monitor")

-- Test suite for Load Monitoring functionality
local function test_load_monitoring()
  print("Running Load Monitoring tests...")
  
  -- Test 1: Load state determination - idle
  local config = {
    load_thresholds = {
      idle_threshold = 2,
      active_threshold = 10,
      overload_threshold = 20,
      max_queue_depth = 50
    }
  }
  
  local monitor = PerformanceMonitor.new(config)
  local load_state = monitor:determine_load_state(1, 5)
  assert(load_state == "idle", "Should be idle with 1 concurrent handler")
  print("✓ Load state determination - idle")
  
  -- Test 2: Load state determination - active
  load_state = monitor:determine_load_state(5, 10)
  assert(load_state == "active", "Should be active with 5 concurrent handlers")
  print("✓ Load state determination - active")
  
  -- Test 3: Load state determination - overloaded by concurrent count
  load_state = monitor:determine_load_state(25, 10)
  assert(load_state == "overloaded", "Should be overloaded with 25 concurrent handlers")
  print("✓ Load state determination - overloaded by concurrent count")
  
  -- Test 4: Load state determination - overloaded by queue depth
  load_state = monitor:determine_load_state(5, 60)
  assert(load_state == "overloaded", "Should be overloaded with queue depth 60")
  print("✓ Load state determination - overloaded by queue depth")
  
  -- Test 5: Load percentage calculation
  local load_percentage = monitor:calculate_load_percentage(10)
  assert(load_percentage == 50.0, "50% load should be calculated correctly")
  
  load_percentage = monitor:calculate_load_percentage(25)
  assert(load_percentage == 100.0, "Should cap at 100% for overload")
  print("✓ Load percentage calculation")
  
  -- Test 6: Message queue operations
  local message1 = {id = "msg1", data = "test"}
  local message2 = {id = "msg2", data = "test2"}
  
  monitor:add_to_message_queue(message1)
  monitor:add_to_message_queue(message2)
  
  assert(monitor:get_queue_depth() == 2, "Queue depth should be 2")
  
  local removed_msg = monitor:remove_from_message_queue()
  assert(removed_msg ~= nil, "Should remove a message from queue")
  assert(monitor:get_queue_depth() == 1, "Queue depth should be 1 after removal")
  print("✓ Message queue operations")
  
  -- Test 7: Load metrics calculation
  -- Simulate some handler activity first
  local timing_id1 = monitor:start_handler_timing("test_handler_1", "trace_001")
  local timing_id2 = monitor:start_handler_timing("test_handler_2", "trace_002")
  
  local load_metrics = monitor:calculate_load_metrics()
  assert(load_metrics.concurrent_handlers == 2, "Should track 2 concurrent handlers")
  assert(load_metrics.load_state ~= nil, "Load state should be calculated")
  assert(load_metrics.load_percentage >= 0, "Load percentage should be non-negative")
  assert(load_metrics.queue_depth >= 0, "Queue depth should be non-negative")
  
  monitor:end_handler_timing(timing_id1, true)
  monitor:end_handler_timing(timing_id2, true)
  print("✓ Load metrics calculation")
  
  -- Test 8: Load history tracking
  local history_before = #monitor:get_load_history()
  monitor:calculate_load_metrics()
  monitor:calculate_load_metrics()
  local history_after = #monitor:get_load_history()
  
  assert(history_after > history_before, "Load history should grow with each calculation")
  print("✓ Load history tracking")
  
  -- Test 9: Peak concurrent tracking
  assert(monitor.peak_concurrent == 2, "Peak concurrent should track maximum seen")
  
  -- Add more concurrent handlers to test peak tracking
  local timing_id3 = monitor:start_handler_timing("handler_3", "trace_003")
  local timing_id4 = monitor:start_handler_timing("handler_4", "trace_004")
  local timing_id5 = monitor:start_handler_timing("handler_5", "trace_005")
  
  assert(monitor.peak_concurrent == 3, "Peak should update to new maximum")
  
  monitor:end_handler_timing(timing_id3, true)
  monitor:end_handler_timing(timing_id4, true)
  monitor:end_handler_timing(timing_id5, true)
  print("✓ Peak concurrent tracking")
  
  -- Test 10: Circuit breaker functionality
  assert(not monitor:is_circuit_breaker_active(), "Circuit breaker should be inactive initially")
  
  -- Add enough messages to trigger circuit breaker
  for i = 1, 55 do  -- Exceed max_queue_depth of 50
    monitor:add_to_message_queue({id = "overload_msg_" .. i})
  end
  
  assert(monitor:is_circuit_breaker_active(), "Circuit breaker should be triggered")
  
  -- Remove enough messages to reset circuit breaker
  for i = 1, 30 do  -- Bring below 50% of max_queue_depth
    monitor:remove_from_message_queue()
  end
  
  assert(not monitor:is_circuit_breaker_active(), "Circuit breaker should reset")
  print("✓ Circuit breaker functionality")
  
  -- Test 11: Total messages processed tracking
  local initial_total = monitor.total_messages_processed
  local timing_id = monitor:start_handler_timing("tracking_test", "trace_track")
  monitor:end_handler_timing(timing_id, true)
  
  assert(monitor.total_messages_processed == initial_total + 1, "Total messages should increment")
  print("✓ Total messages processed tracking")
  
  -- Test 12: Load monitoring with custom thresholds
  local custom_config = {
    load_thresholds = {
      idle_threshold = 1,
      active_threshold = 3,
      overload_threshold = 5,
      max_queue_depth = 10
    }
  }
  
  local custom_monitor = PerformanceMonitor.new(custom_config)
  assert(custom_monitor.config.load_thresholds.idle_threshold == 1, "Custom idle threshold should be set")
  assert(custom_monitor.config.load_thresholds.overload_threshold == 5, "Custom overload threshold should be set")
  
  local custom_load_state = custom_monitor:determine_load_state(4, 5)
  assert(custom_load_state == "active", "Should be active with custom thresholds")
  
  custom_load_state = custom_monitor:determine_load_state(6, 2)
  assert(custom_load_state == "overloaded", "Should be overloaded with lower custom threshold")
  print("✓ Load monitoring with custom thresholds")
  
  print("All Load Monitoring tests passed! ✅")
end

-- Integration test with performance monitoring
local function test_load_integration()
  print("\nRunning Load Monitoring integration tests...")
  
  local monitor = PerformanceMonitor.new()
  
  -- Simulate a realistic load scenario
  local timing_ids = {}
  
  -- Start multiple handlers
  for i = 1, 15 do
    local timing_id = monitor:start_handler_timing("handler_" .. i, "trace_" .. i)
    table.insert(timing_ids, timing_id)
    
    -- Simulate random processing delays
    local delay_start = os.clock()
    while os.clock() - delay_start < 0.001 do end -- 1ms delay
  end
  
  -- Check load state during high activity
  local load_metrics = monitor:calculate_load_metrics()
  assert(load_metrics.concurrent_handlers == 15, "Should track 15 concurrent handlers")
  assert(load_metrics.load_state == "active", "Should be in active state")
  
  -- Complete some handlers
  for i = 1, 10 do
    monitor:end_handler_timing(timing_ids[i], i <= 8) -- 8 success, 2 failures
  end
  
  -- Check metrics after partial completion
  local updated_metrics = monitor:calculate_load_metrics()
  assert(updated_metrics.concurrent_handlers == 5, "Should track 5 remaining concurrent handlers")
  
  -- Complete remaining handlers
  for i = 11, 15 do
    monitor:end_handler_timing(timing_ids[i], true)
  end
  
  -- Final load check
  local final_metrics = monitor:calculate_load_metrics()
  assert(final_metrics.concurrent_handlers == 0, "Should have no concurrent handlers")
  assert(final_metrics.load_state == "idle", "Should return to idle state")
  
  -- Verify load history contains progression
  local load_history = monitor:get_load_history()
  assert(#load_history >= 3, "Should have recorded load transitions")
  
  print("✓ Load monitoring integration with performance metrics")
  
  -- Test correlation with error tracking
  assert(monitor.error_count == 2, "Should track 2 errors from failed handlers")
  print("✓ Load monitoring correlation with error tracking")
  
  print("Load Monitoring integration tests passed! ✅")
end

-- Test execution
test_load_monitoring()
test_load_integration()