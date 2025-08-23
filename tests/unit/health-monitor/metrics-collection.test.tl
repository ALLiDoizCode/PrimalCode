-- Unit tests for metrics collection handler
local MetricsCollection = require('ao-processes.health-monitor.src.handlers.metrics-collection')

-- Mock AO functions
local mock_ao = {
    send = function(msg) 
        if not _G.sent_messages then _G.sent_messages = {} end
        table.insert(_G.sent_messages, msg)
    end
}

_G.ao = mock_ao

-- Test state setup
local function setup_test_state()
    local state = {
        process_id = "test_health_monitor",
        registry = { 
            processes = {
                ["test_world_001"] = {
                    process_id = "test_world_001",
                    process_type = "world",
                    status = "healthy",
                    performance_metrics = {
                        message_processing_time = 50,
                        message_throughput = 10,
                        error_rate = 0.01
                    }
                }
            }
        }
    }
    
    MetricsCollection.init(state)
    
    return state
end

-- Test cases
local function test_metrics_collection_init()
    print("Testing: metrics_collection_init")
    
    local state = { process_id = "test_monitor" }
    local result = MetricsCollection.init(state)
    
    assert(result.success == true, "Init should succeed")
    assert(state.metrics_collection ~= nil, "Should create metrics_collection state")
    assert(state.metrics_collection.collection_intervals ~= nil, "Should set collection intervals")
    assert(state.metrics_collection.historical_data ~= nil, "Should create historical data storage")
    
    print("✓ metrics_collection_init passed")
end

local function test_collect_performance_metrics()
    print("Testing: collect_performance_metrics")
    
    local state = setup_test_state()
    _G.sent_messages = {}
    
    local result = MetricsCollection.collect_performance_metrics("test_world_001", state, 1640995300)
    
    -- Verify result
    assert(result.success == true, "Metrics collection should succeed")
    assert(result.process_id == "test_world_001", "Should return correct process ID")
    assert(result.correlation_id ~= nil, "Should generate correlation ID")
    
    -- Verify message was sent
    assert(#_G.sent_messages == 1, "Should send metrics collection message")
    local sent_msg = _G.sent_messages[1]
    assert(sent_msg.Target == "test_world_001", "Should target correct process")
    assert(sent_msg.Action == "Collect-Metrics", "Should have correct action")
    
    -- Verify collection job was tracked
    assert(state.metrics_collection.active_collection_jobs[result.correlation_id] ~= nil, 
           "Should track collection job")
    
    print("✓ collect_performance_metrics passed")
end

local function test_process_metrics_response()
    print("Testing: process_metrics_response")
    
    local state = setup_test_state()
    
    -- Set up a collection job
    local correlation_id = "test_world_001_1640995300_metrics"
    state.metrics_collection.active_collection_jobs[correlation_id] = {
        process_id = "test_world_001",
        collection_type = "performance",
        requested_at = 1640995300,
        status = "pending"
    }
    
    -- Mock metrics response
    local response_msg = {
        From = "test_world_001",
        Timestamp = 1640995350,
        Tags = {
            ["Correlation-Id"] = correlation_id
        },
        Data = '{"performance_metrics":{"message_processing_time":75,"error_rate":0.02}}'
    }
    
    local result = MetricsCollection.process_metrics_response(response_msg, state)
    
    -- Verify result
    assert(result.success == true, "Should successfully process metrics response")
    assert(result.process_id == "test_world_001", "Should return correct process ID")
    assert(result.metrics_collected == true, "Should indicate metrics were collected")
    
    -- Verify job was completed and cleaned up
    assert(state.metrics_collection.active_collection_jobs[correlation_id] == nil, 
           "Should clean up completed job")
    
    -- Verify historical data was stored
    assert(#state.metrics_collection.historical_data.performance_metrics == 1, 
           "Should store historical performance data")
    
    local historical_entry = state.metrics_collection.historical_data.performance_metrics[1]
    assert(historical_entry.process_id == "test_world_001", "Historical data should have correct process ID")
    assert(historical_entry.metrics.message_processing_time == 75, "Should store correct metrics")
    
    print("✓ process_metrics_response passed")
end

local function test_collect_resource_metrics()
    print("Testing: collect_resource_metrics")
    
    local state = setup_test_state()
    _G.sent_messages = {}
    
    local result = MetricsCollection.collect_resource_metrics("test_world_001", state, 1640995300)
    
    -- Verify result
    assert(result.success == true, "Resource collection should succeed")
    assert(result.process_id == "test_world_001", "Should return correct process ID")
    assert(result.correlation_id ~= nil, "Should generate correlation ID")
    
    -- Verify message was sent
    assert(#_G.sent_messages == 1, "Should send resource collection message")
    local sent_msg = _G.sent_messages[1]
    assert(sent_msg.Action == "Collect-Resources", "Should have correct action")
    
    -- Verify collection job was tracked
    assert(state.metrics_collection.active_collection_jobs[result.correlation_id].collection_type == "resource_usage", 
           "Should track resource collection job")
    
    print("✓ collect_resource_metrics passed")
end

local function test_process_resource_response()
    print("Testing: process_resource_response")
    
    local state = setup_test_state()
    
    -- Set up a resource collection job
    local correlation_id = "test_world_001_1640995300_resources"
    state.metrics_collection.active_collection_jobs[correlation_id] = {
        process_id = "test_world_001",
        collection_type = "resource_usage",
        requested_at = 1640995300,
        status = "pending"
    }
    
    -- Mock resource response
    local response_msg = {
        From = "test_world_001",
        Timestamp = 1640995350,
        Tags = {
            ["Correlation-Id"] = correlation_id
        },
        Data = '{"resource_usage":{"memory_usage":256,"computational_load":15}}'
    }
    
    local result = MetricsCollection.process_resource_response(response_msg, state)
    
    -- Verify result
    assert(result.success == true, "Should successfully process resource response")
    assert(result.resources_collected == true, "Should indicate resources were collected")
    
    -- Verify historical resource data was stored
    assert(#state.metrics_collection.historical_data.resource_metrics == 1, 
           "Should store historical resource data")
    
    local historical_entry = state.metrics_collection.historical_data.resource_metrics[1]
    assert(historical_entry.resource_usage.memory_usage == 256, "Should store correct resource usage")
    
    print("✓ process_resource_response passed")
end

local function test_get_system_metrics_overview()
    print("Testing: get_system_metrics_overview")
    
    local state = setup_test_state()
    
    -- Add some historical data
    table.insert(state.metrics_collection.historical_data.performance_metrics, {
        timestamp = os.time() - 1800, -- 30 minutes ago
        process_id = "test_world_001",
        process_type = "world",
        metrics = {
            successful_requests = 100,
            failed_requests = 5,
            message_processing_time = 50
        }
    })
    
    table.insert(state.metrics_collection.historical_data.resource_metrics, {
        timestamp = os.time() - 1800,
        process_id = "test_world_001",
        resource_usage = {
            memory_usage = 128,
            computational_load = 10
        }
    })
    
    local result = MetricsCollection.get_system_metrics_overview(state, 3600)
    
    -- Verify result structure
    assert(result.time_range_seconds == 3600, "Should return correct time range")
    assert(result.generated_at ~= nil, "Should have generation timestamp")
    assert(result.performance_summary ~= nil, "Should have performance summary")
    assert(result.resource_summary ~= nil, "Should have resource summary")
    
    -- Verify performance summary
    assert(result.performance_summary.total_messages_processed == 105, "Should sum total messages")
    assert(result.performance_summary.total_errors == 5, "Should sum total errors")
    assert(result.performance_summary.average_processing_time == 50, "Should calculate average processing time")
    
    print("✓ get_system_metrics_overview passed")
end

local function test_metrics_response_missing_correlation_id()
    print("Testing: metrics_response_missing_correlation_id")
    
    local state = setup_test_state()
    
    -- Mock response without correlation ID
    local response_msg = {
        From = "test_world_001",
        Timestamp = 1640995350,
        Tags = {},
        Data = '{"performance_metrics":{"message_processing_time":75}}'
    }
    
    local result = MetricsCollection.process_metrics_response(response_msg, state)
    
    -- Verify result
    assert(result.success == false, "Should fail without correlation ID")
    assert(result.error == "Missing correlation ID in metrics response", "Should return correct error")
    
    print("✓ metrics_response_missing_correlation_id passed")
end

local function test_historical_data_size_limit()
    print("Testing: historical_data_size_limit")
    
    local state = setup_test_state()
    
    -- Add more than 1000 entries to test size limit
    for i = 1, 1050 do
        table.insert(state.metrics_collection.historical_data.performance_metrics, {
            timestamp = os.time() - i,
            process_id = "test_process_" .. i,
            metrics = { message_processing_time = i }
        })
    end
    
    -- Process a new metrics response
    local correlation_id = "test_world_001_1640995300_metrics"
    state.metrics_collection.active_collection_jobs[correlation_id] = {
        process_id = "test_world_001",
        collection_type = "performance",
        requested_at = 1640995300,
        status = "pending"
    }
    
    local response_msg = {
        From = "test_world_001",
        Timestamp = 1640995350,
        Tags = { ["Correlation-Id"] = correlation_id },
        Data = '{"performance_metrics":{"message_processing_time":100}}'
    }
    
    MetricsCollection.process_metrics_response(response_msg, state)
    
    -- Verify size limit is enforced
    assert(#state.metrics_collection.historical_data.performance_metrics == 1000, 
           "Should limit historical data to 1000 entries")
    
    print("✓ historical_data_size_limit passed")
end

-- Run all tests
local function run_all_tests()
    print("Running Metrics Collection Handler Unit Tests...")
    print("=" .. string.rep("=", 50))
    
    test_metrics_collection_init()
    test_collect_performance_metrics()
    test_process_metrics_response()
    test_collect_resource_metrics()
    test_process_resource_response()
    test_get_system_metrics_overview()
    test_metrics_response_missing_correlation_id()
    test_historical_data_size_limit()
    
    print("=" .. string.rep("=", 50))
    print("✓ All Metrics Collection Handler tests passed!")
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