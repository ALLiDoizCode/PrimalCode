-- Unit tests for ErrorHandler utility
-- Tests structured error codes and circuit breaker functionality

local ErrorHandler = require('shared.utils.error-handling')

-- Test suite for ErrorHandler
local ErrorHandlerTests = {}

-- Test error code retrieval
function ErrorHandlerTests.test_get_codes_world()
    local codes = ErrorHandler.get_codes("WORLD")
    assert(codes.INVALID_LOCATION == "WORLD_001", "Should return correct world error code")
    assert(codes.AGENT_NOT_FOUND == "WORLD_002", "Should return correct world error code")
end

function ErrorHandlerTests.test_get_codes_battle()
    local codes = ErrorHandler.get_codes("BATTLE")
    assert(codes.BATTLE_NOT_FOUND == "BATTLE_100", "Should return correct battle error code")
    assert(codes.INVALID_ACTION == "BATTLE_101", "Should return correct battle error code")
end

function ErrorHandlerTests.test_get_codes_common_fallback()
    local codes = ErrorHandler.get_codes("UNKNOWN")
    assert(codes.INVALID_INPUT == "COMMON_400", "Should fallback to common codes")
    assert(codes.INTERNAL_ERROR == "COMMON_500", "Should fallback to common codes")
end

-- Test error response creation
function ErrorHandlerTests.test_create_error_basic()
    local error_response = ErrorHandler.create_error(
        "TEST_001",
        "Test error message"
    )
    
    assert(error_response.error.code == "TEST_001", "Should set correct error code")
    assert(error_response.error.message == "Test error message", "Should set correct message")
    assert(error_response.error.timestamp, "Should include timestamp")
end

function ErrorHandlerTests.test_create_error_with_details()
    local error_response = ErrorHandler.create_error(
        "TEST_001",
        "Test error message",
        {field = "test_field", value = "invalid_value"}
    )
    
    assert(error_response.error.details.field == "test_field", "Should include error details")
    assert(error_response.error.details.value == "invalid_value", "Should include error details")
end

-- Test circuit breaker functionality
function ErrorHandlerTests.test_circuit_breaker_tracking()
    local agent_id = "test_agent_123"
    
    -- Initially should not be blocked
    assert(ErrorHandler.is_agent_blocked(agent_id) == false, "Agent should not be blocked initially")
    
    -- Track failures up to threshold
    for i = 1, 4 do
        ErrorHandler.track_agent_failure(agent_id)
        assert(ErrorHandler.is_agent_blocked(agent_id) == false, "Agent should not be blocked before threshold")
    end
    
    -- One more failure should trigger circuit breaker
    ErrorHandler.track_agent_failure(agent_id)
    assert(ErrorHandler.is_agent_blocked(agent_id) == true, "Agent should be blocked after threshold")
end

function ErrorHandlerTests.test_circuit_breaker_reset()
    local agent_id = "test_agent_reset"
    
    -- Trigger circuit breaker
    for i = 1, 5 do
        ErrorHandler.track_agent_failure(agent_id)
    end
    assert(ErrorHandler.is_agent_blocked(agent_id) == true, "Agent should be blocked")
    
    -- Reset circuit breaker
    ErrorHandler.reset_circuit_breaker(agent_id)
    assert(ErrorHandler.is_agent_blocked(agent_id) == false, "Agent should not be blocked after reset")
end

function ErrorHandlerTests.test_circuit_breaker_status()
    local agent_id = "test_agent_status"
    
    -- Block an agent
    for i = 1, 5 do
        ErrorHandler.track_agent_failure(agent_id)
    end
    
    local status = ErrorHandler.get_circuit_breaker_status()
    assert(status.total_blocked >= 1, "Should report blocked agents")
    assert(status.blocked_agents[agent_id], "Should include specific agent in status")
    assert(status.blocked_agents[agent_id].failure_count == 5, "Should track failure count")
end

-- Test ADP error formatting
function ErrorHandlerTests.test_format_adp_error()
    local formatted_error = ErrorHandler.format_adp_error(
        "TEST_001",
        "Test message",
        {extra = "detail"}
    )
    
    assert(formatted_error.error.code == "TEST_001", "Should format error code")
    assert(formatted_error.error.message == "Test message", "Should format error message")
    assert(formatted_error.error.details.extra == "detail", "Should include details")
    assert(formatted_error.error.adp_version == "1.0", "Should include ADP version")
    assert(formatted_error.error.timestamp, "Should include timestamp")
end

-- Run all tests
function ErrorHandlerTests.run_all()
    local tests = {
        "test_get_codes_world",
        "test_get_codes_battle",
        "test_get_codes_common_fallback",
        "test_create_error_basic",
        "test_create_error_with_details",
        "test_circuit_breaker_tracking",
        "test_circuit_breaker_reset",
        "test_circuit_breaker_status",
        "test_format_adp_error"
    }
    
    local passed = 0
    local total = #tests
    
    for _, test_name in ipairs(tests) do
        local success, error_msg = pcall(ErrorHandlerTests[test_name])
        if success then
            passed = passed + 1
            print("✓ " .. test_name)
        else
            print("✗ " .. test_name .. ": " .. tostring(error_msg))
        end
    end
    
    print("\nErrorHandler Tests: " .. passed .. "/" .. total .. " passed")
    return passed == total
end

return ErrorHandlerTests