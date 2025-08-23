-- Unit tests for health check handler
local HealthCheck = require('ao-processes.health-monitor.src.handlers.health-check')
local ProcessRegistry = require('shared.utils.process-registry')

-- Mock AO functions
local mock_ao = {
    send = function(msg) 
        -- Store sent messages for verification
        if not _G.sent_messages then _G.sent_messages = {} end
        table.insert(_G.sent_messages, msg)
    end
}

-- Override global ao for testing
_G.ao = mock_ao

-- Test state setup
local function setup_test_state()
    local state = {
        process_id = "test_health_monitor",
        registry = { processes = {} },
        health_history = {},
        metrics = {
            total_checks = 0,
            failed_checks = 0
        }
    }
    
    ProcessRegistry.init(state)
    
    -- Add test processes to registry
    ProcessRegistry.register_process(state, {
        process_id = "test_world_001",
        process_type = "world",
        status = "healthy",
        timestamp = 1640995200
    })
    
    ProcessRegistry.register_process(state, {
        process_id = "test_battle_001", 
        process_type = "battle",
        status = "healthy",
        timestamp = 1640995200
    })
    
    return state
end

-- Test cases
local function test_perform_health_check_success()
    print("Testing: perform_health_check_success")
    
    local state = setup_test_state()
    _G.sent_messages = {}
    
    local result = HealthCheck.perform_check("test_world_001", state, 1640995300)
    
    -- Verify result
    assert(result.success == true, "Health check should succeed")
    assert(result.process_id == "test_world_001", "Should return correct process ID")
    assert(result.correlation_id ~= nil, "Should generate correlation ID")
    
    -- Verify message was sent
    assert(#_G.sent_messages == 1, "Should send one health check message")
    local sent_msg = _G.sent_messages[1]
    assert(sent_msg.Target == "test_world_001", "Should target correct process")
    assert(sent_msg.Action == "Health-Check", "Should have correct action")
    assert(sent_msg["Monitor-Id"] == "test_health_monitor", "Should include monitor ID")
    
    -- Verify state was updated
    assert(state.metrics.total_checks == 1, "Should increment total checks")
    
    print("✓ perform_health_check_success passed")
end

local function test_perform_health_check_unknown_process()
    print("Testing: perform_health_check_unknown_process")
    
    local state = setup_test_state()
    _G.sent_messages = {}
    
    local result = HealthCheck.perform_check("unknown_process", state, 1640995300)
    
    -- Verify result
    assert(result.success == false, "Health check should fail for unknown process")
    assert(result.error == "Process not found in registry", "Should return correct error")
    
    -- Verify no message was sent
    assert(#_G.sent_messages == 0, "Should not send message for unknown process")
    
    print("✓ perform_health_check_unknown_process passed")
end

local function test_process_health_response_success()
    print("Testing: process_health_response_success")
    
    local state = setup_test_state()
    _G.sent_messages = {}
    
    -- Mock response message
    local response_msg = {
        From = "test_world_001",
        Timestamp = 1640995350,
        Tags = {
            ["Correlation-Id"] = "test_world_001_1640995300_hc"
        },
        Data = '{"status":"healthy","performance_metrics":{"message_processing_time":50},"resource_usage":{"memory_usage":10}}'
    }
    
    local result = HealthCheck.process_response(response_msg, state)
    
    -- Verify result
    assert(result.success == true, "Should successfully process response")
    assert(result.process_id == "test_world_001", "Should return correct process ID")
    assert(result.status == "healthy", "Should return correct status")
    
    -- Verify registry was updated
    local process_data = state.registry.processes["test_world_001"]
    assert(process_data.last_heartbeat == 1640995350, "Should update last heartbeat")
    assert(process_data.status == "healthy", "Should update status")
    assert(process_data.consecutive_failures == 0, "Should reset consecutive failures")
    
    -- Verify health history was updated
    assert(#state.health_history == 1, "Should add entry to health history")
    local history_entry = state.health_history[1]
    assert(history_entry.process_id == "test_world_001", "History should have correct process ID")
    assert(history_entry.status == "healthy", "History should have correct status")
    
    print("✓ process_health_response_success passed")
end

local function test_process_health_response_missing_correlation_id()
    print("Testing: process_health_response_missing_correlation_id")
    
    local state = setup_test_state()
    
    -- Mock response message without correlation ID
    local response_msg = {
        From = "test_world_001",
        Timestamp = 1640995350,
        Tags = {},
        Data = '{"status":"healthy"}'
    }
    
    local result = HealthCheck.process_response(response_msg, state)
    
    -- Verify result
    assert(result.success == false, "Should fail without correlation ID")
    assert(result.error == "Missing correlation ID in health check response", "Should return correct error")
    
    print("✓ process_health_response_missing_correlation_id passed")
end

local function test_handle_health_check_timeout()
    print("Testing: handle_health_check_timeout")
    
    local state = setup_test_state()
    
    local result = HealthCheck.handle_timeout("test_world_001", state, 1640995400)
    
    -- Verify result
    assert(result.success == true, "Should successfully handle timeout")
    assert(result.process_id == "test_world_001", "Should return correct process ID")
    assert(result.status == "degraded", "Should mark process as degraded")
    
    -- Verify registry was updated
    local process_data = state.registry.processes["test_world_001"]
    assert(process_data.consecutive_failures == 1, "Should increment consecutive failures")
    assert(process_data.status == "degraded", "Should update status to degraded")
    
    -- Verify metrics were updated
    assert(state.metrics.failed_checks == 1, "Should increment failed checks")
    
    -- Verify error was logged
    assert(#process_data.error_log == 1, "Should log timeout error")
    local error_entry = process_data.error_log[1]
    assert(error_entry.error_message == "Health check timeout - no response received", "Should have correct error message")
    
    print("✓ handle_health_check_timeout passed")
end

local function test_get_process_health()
    print("Testing: get_process_health")
    
    local state = setup_test_state()
    
    -- Update process with some metrics
    local process_data = state.registry.processes["test_world_001"]
    process_data.status = "healthy"
    process_data.consecutive_failures = 0
    process_data.performance_metrics = { message_processing_time = 100 }
    
    local result = HealthCheck.get_process_health("test_world_001", state)
    
    -- Verify result
    assert(result.success == true, "Should successfully get process health")
    assert(result.process_id == "test_world_001", "Should return correct process ID")
    assert(result.process_type == "world", "Should return correct process type")
    assert(result.status == "healthy", "Should return correct status")
    assert(result.consecutive_failures == 0, "Should return consecutive failures")
    assert(result.performance_metrics.message_processing_time == 100, "Should return performance metrics")
    
    print("✓ get_process_health passed")
end

local function test_get_system_health()
    print("Testing: get_system_health")
    
    local state = setup_test_state()
    
    -- Set different statuses for processes
    state.registry.processes["test_world_001"].status = "healthy"
    state.registry.processes["test_battle_001"].status = "degraded"
    
    local result = HealthCheck.get_system_health(state)
    
    -- Verify result
    assert(result.monitor_id == "test_health_monitor", "Should return correct monitor ID")
    assert(result.overall_status == "degraded", "Should return degraded status due to one degraded process")
    assert(result.process_statistics.total_processes == 2, "Should count total processes correctly")
    assert(result.process_statistics.healthy_processes == 1, "Should count healthy processes")
    assert(result.process_statistics.degraded_processes == 1, "Should count degraded processes")
    
    print("✓ get_system_health passed")
end

local function test_health_check_multiple_consecutive_failures()
    print("Testing: health_check_multiple_consecutive_failures")
    
    local state = setup_test_state()
    
    -- Simulate multiple timeouts
    HealthCheck.handle_timeout("test_world_001", state, 1640995400)
    HealthCheck.handle_timeout("test_world_001", state, 1640995500)
    HealthCheck.handle_timeout("test_world_001", state, 1640995600)
    
    local process_data = state.registry.processes["test_world_001"]
    
    -- After 3 failures, should be critical
    assert(process_data.consecutive_failures == 3, "Should have 3 consecutive failures")
    assert(process_data.status == "critical", "Should be marked as critical")
    
    -- Simulate 2 more failures to reach offline status
    HealthCheck.handle_timeout("test_world_001", state, 1640995700)
    HealthCheck.handle_timeout("test_world_001", state, 1640995800)
    
    assert(process_data.consecutive_failures == 5, "Should have 5 consecutive failures")
    assert(process_data.status == "offline", "Should be marked as offline")
    
    print("✓ health_check_multiple_consecutive_failures passed")
end

-- Run all tests
local function run_all_tests()
    print("Running Health Check Handler Unit Tests...")
    print("=" .. string.rep("=", 50))
    
    test_perform_health_check_success()
    test_perform_health_check_unknown_process()
    test_process_health_response_success()
    test_process_health_response_missing_correlation_id()
    test_handle_health_check_timeout()
    test_get_process_health()
    test_get_system_health()
    test_health_check_multiple_consecutive_failures()
    
    print("=" .. string.rep("=", 50))
    print("✓ All Health Check Handler tests passed!")
end

-- Simple assertion function
function assert(condition, message)
    if not condition then
        error("Assertion failed: " .. (message or "unknown"))
    end
end

-- Export for test runner
return {
    run_all_tests = run_all_tests
}