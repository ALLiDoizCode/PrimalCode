-- Unit tests for ProcessBase utility
-- Tests ADP v1.0 compliance validation and response creation

local ProcessBase = require('shared.utils.process-base')
local json = require('json')

-- Test suite for ProcessBase
local ProcessBaseTests = {}

-- Test ADP header validation
function ProcessBaseTests.test_validate_adp_headers_valid()
    local msg = {
        Tags = {
            ["ADP-Version"] = "1.0",
            ["Content-Type"] = "application/json",
            Action = "Test-Action"
        },
        Data = "{\"test\": \"data\"}"
    }
    
    local valid, error_code, error_message = ProcessBase.validate_adp_headers(msg)
    assert(valid == true, "Should validate correct ADP headers")
    assert(error_code == nil, "Should not return error code for valid headers")
end

function ProcessBaseTests.test_validate_adp_headers_invalid_version()
    local msg = {
        Tags = {
            ["ADP-Version"] = "2.0",
            ["Content-Type"] = "application/json",
            Action = "Test-Action"
        }
    }
    
    local valid, error_code, error_message = ProcessBase.validate_adp_headers(msg)
    assert(valid == false, "Should reject invalid ADP version")
    assert(error_code == "INVALID_ADP_VERSION", "Should return correct error code")
    assert(string.find(error_message, "1.0"), "Should mention correct version in error")
end

function ProcessBaseTests.test_validate_adp_headers_missing_action()
    local msg = {
        Tags = {
            ["ADP-Version"] = "1.0",
            ["Content-Type"] = "application/json"
        }
    }
    
    local valid, error_code, error_message = ProcessBase.validate_adp_headers(msg)
    assert(valid == false, "Should reject missing Action header")
    assert(error_code == "MISSING_ACTION", "Should return correct error code")
end

function ProcessBaseTests.test_validate_adp_headers_invalid_content_type()
    local msg = {
        Tags = {
            ["ADP-Version"] = "1.0",
            ["Content-Type"] = "text/plain",
            Action = "Test-Action"
        },
        Data = "some data"
    }
    
    local valid, error_code, error_message = ProcessBase.validate_adp_headers(msg)
    assert(valid == false, "Should reject invalid content type")
    assert(error_code == "INVALID_CONTENT_TYPE", "Should return correct error code")
end

-- Test ADP response creation
function ProcessBaseTests.test_create_adp_response_basic()
    local response = ProcessBase.create_adp_response("target_123", "Test-Response", {test = "data"})
    
    assert(response.Target == "target_123", "Should set correct target")
    assert(response.Action == "Test-Response", "Should set correct action")
    assert(response.Tags["ADP-Version"] == "1.0", "Should include ADP version")
    assert(response.Tags["Content-Type"] == "application/json", "Should include content type")
    
    local decoded_data = json.decode(response.Data)
    assert(decoded_data.test == "data", "Should encode data correctly")
end

function ProcessBaseTests.test_create_adp_response_with_extra_tags()
    local extra_tags = {CustomTag = "custom_value"}
    local response = ProcessBase.create_adp_response(
        "target_123", 
        "Test-Response", 
        {test = "data"}, 
        extra_tags
    )
    
    assert(response.Tags.CustomTag == "custom_value", "Should include extra tags")
    assert(response.Tags["ADP-Version"] == "1.0", "Should still include ADP version")
end

-- Test error response creation
function ProcessBaseTests.test_create_error_response()
    local response = ProcessBase.create_error_response(
        "target_123",
        "TEST_ERROR",
        "Test error message",
        {detail = "test detail"}
    )
    
    assert(response.Target == "target_123", "Should set correct target")
    assert(response.Action == "Error", "Should set error action")
    
    local decoded_data = json.decode(response.Data)
    assert(decoded_data.error.code == "TEST_ERROR", "Should include error code")
    assert(decoded_data.error.message == "Test error message", "Should include error message")
    assert(decoded_data.error.details.detail == "test detail", "Should include error details")
    assert(decoded_data.error.timestamp, "Should include timestamp")
end

-- Test protocol version checking
function ProcessBaseTests.test_check_protocol_version()
    local msg_valid = {Tags = {["ADP-Version"] = "1.0"}}
    local msg_invalid = {Tags = {["ADP-Version"] = "2.0"}}
    local msg_missing = {Tags = {}}
    
    assert(ProcessBase.check_protocol_version(msg_valid) == true, "Should accept v1.0")
    assert(ProcessBase.check_protocol_version(msg_invalid) == false, "Should reject v2.0")
    assert(ProcessBase.check_protocol_version(msg_missing) == false, "Should reject missing version")
end

-- Test process info generation
function ProcessBaseTests.test_get_process_info()
    local info = ProcessBase.get_process_info("test", "test_123")
    
    assert(info.process_type == "test", "Should set correct process type")
    assert(info.process_id == "test_123", "Should set correct process ID")
    assert(info.adp_version == "1.0", "Should include ADP version")
    assert(info.status == "healthy", "Should default to healthy status")
    assert(info.timestamp, "Should include timestamp")
end

-- Run all tests
function ProcessBaseTests.run_all()
    local tests = {
        "test_validate_adp_headers_valid",
        "test_validate_adp_headers_invalid_version", 
        "test_validate_adp_headers_missing_action",
        "test_validate_adp_headers_invalid_content_type",
        "test_create_adp_response_basic",
        "test_create_adp_response_with_extra_tags",
        "test_create_error_response",
        "test_check_protocol_version",
        "test_get_process_info"
    }
    
    local passed = 0
    local total = #tests
    
    for _, test_name in ipairs(tests) do
        local success, error_msg = pcall(ProcessBaseTests[test_name])
        if success then
            passed = passed + 1
            print("✓ " .. test_name)
        else
            print("✗ " .. test_name .. ": " .. tostring(error_msg))
        end
    end
    
    print("\nProcessBase Tests: " .. passed .. "/" .. total .. " passed")
    return passed == total
end

return ProcessBaseTests