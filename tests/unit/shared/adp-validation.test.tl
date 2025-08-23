-- Unit tests for ADPValidator utility
-- Tests input validation framework with comprehensive edge cases

local ADPValidator = require('shared.utils.adp-validation')

-- Test suite for ADPValidator
local ADPValidatorTests = {}

-- Test string validation
function ADPValidatorTests.test_validate_string_valid()
    local valid, error_code, error_msg = ADPValidator.validate_string("test_string", "test_field")
    assert(valid == true, "Should validate correct string")
    assert(error_code == nil, "Should not return error for valid string")
end

function ADPValidatorTests.test_validate_string_too_short()
    local valid, error_code, error_msg = ADPValidator.validate_string("", "test_field", 1)
    assert(valid == false, "Should reject empty string when min length > 0")
    assert(error_code == "VALIDATION_FAILED", "Should return validation failed error")
    assert(string.find(error_msg, "at least"), "Should mention minimum length in error")
end

function ADPValidatorTests.test_validate_string_too_long()
    local long_string = string.rep("a", 1001)
    local valid, error_code, error_msg = ADPValidator.validate_string(long_string, "test_field")
    assert(valid == false, "Should reject string exceeding max length")
    assert(string.find(error_msg, "maximum length"), "Should mention maximum length in error")
end

function ADPValidatorTests.test_validate_string_non_string()
    local valid, error_code, error_msg = ADPValidator.validate_string(123, "test_field")
    assert(valid == false, "Should reject non-string input")
    assert(string.find(error_msg, "must be a string"), "Should mention string requirement")
end

-- Test numeric validation
function ADPValidatorTests.test_validate_number_valid()
    local valid, error_code, error_msg = ADPValidator.validate_number(42, "test_field")
    assert(valid == true, "Should validate correct number")
    assert(error_code == nil, "Should not return error for valid number")
end

function ADPValidatorTests.test_validate_number_string_conversion()
    local valid, error_code, error_msg = ADPValidator.validate_number("42", "test_field")
    assert(valid == true, "Should convert valid numeric string")
end

function ADPValidatorTests.test_validate_number_invalid_string()
    local valid, error_code, error_msg = ADPValidator.validate_number("not_a_number", "test_field")
    assert(valid == false, "Should reject invalid numeric string")
    assert(string.find(error_msg, "valid number"), "Should mention number requirement")
end

function ADPValidatorTests.test_validate_number_range_checking()
    local valid, error_code, error_msg = ADPValidator.validate_number(5, "test_field", 1, 10)
    assert(valid == true, "Should validate number within range")
    
    valid, error_code, error_msg = ADPValidator.validate_number(0, "test_field", 1, 10)
    assert(valid == false, "Should reject number below minimum")
    
    valid, error_code, error_msg = ADPValidator.validate_number(15, "test_field", 1, 10)
    assert(valid == false, "Should reject number above maximum")
end

-- Test coordinate validation
function ADPValidatorTests.test_validate_coordinate()
    local valid, error_code, error_msg = ADPValidator.validate_coordinate(100, "x_coord")
    assert(valid == true, "Should validate normal coordinate")
    
    valid, error_code, error_msg = ADPValidator.validate_coordinate(-100, "y_coord")
    assert(valid == true, "Should validate negative coordinate")
    
    valid, error_code, error_msg = ADPValidator.validate_coordinate(1000000, "x_coord")
    assert(valid == false, "Should reject coordinate outside range")
end

-- Test damage validation
function ADPValidatorTests.test_validate_damage()
    local valid, error_code, error_msg = ADPValidator.validate_damage(100, "damage")
    assert(valid == true, "Should validate normal damage")
    
    valid, error_code, error_msg = ADPValidator.validate_damage(0, "damage")
    assert(valid == true, "Should validate zero damage")
    
    valid, error_code, error_msg = ADPValidator.validate_damage(-10, "damage")
    assert(valid == false, "Should reject negative damage")
end

-- Test alphanumeric validation
function ADPValidatorTests.test_validate_alphanumeric()
    local valid, error_code, error_msg = ADPValidator.validate_alphanumeric("agent_123", "agent_id")
    assert(valid == true, "Should validate alphanumeric with underscore")
    
    valid, error_code, error_msg = ADPValidator.validate_alphanumeric("agent-456", "agent_id")
    assert(valid == true, "Should validate alphanumeric with hyphen")
    
    valid, error_code, error_msg = ADPValidator.validate_alphanumeric("agent@123", "agent_id")
    assert(valid == false, "Should reject non-alphanumeric characters")
end

-- Test action validation
function ADPValidatorTests.test_validate_action()
    local valid, error_code, error_msg = ADPValidator.validate_action("Get-World-State", "action")
    assert(valid == true, "Should validate hyphenated action")
    
    valid, error_code, error_msg = ADPValidator.validate_action("Init", "action")
    assert(valid == true, "Should validate simple action")
    
    valid, error_code, error_msg = ADPValidator.validate_action("Invalid Action!", "action")
    assert(valid == false, "Should reject action with invalid characters")
end

-- Test required field validation
function ADPValidatorTests.test_validate_required()
    local valid, error_code, error_msg = ADPValidator.validate_required("present", "test_field")
    assert(valid == true, "Should validate present field")
    
    valid, error_code, error_msg = ADPValidator.validate_required(nil, "test_field")
    assert(valid == false, "Should reject nil field")
    
    valid, error_code, error_msg = ADPValidator.validate_required("", "test_field")
    assert(valid == false, "Should reject empty string field")
end

-- Test enum validation
function ADPValidatorTests.test_validate_enum()
    local allowed_values = {"red", "green", "blue"}
    
    local valid, error_code, error_msg = ADPValidator.validate_enum("red", "color", allowed_values)
    assert(valid == true, "Should validate allowed enum value")
    
    valid, error_code, error_msg = ADPValidator.validate_enum("yellow", "color", allowed_values)
    assert(valid == false, "Should reject invalid enum value")
    assert(string.find(error_msg, "red, green, blue"), "Should list allowed values in error")
end

-- Test JSON validation
function ADPValidatorTests.test_validate_json_data()
    local valid_json = '{"test": "value", "number": 42}'
    local valid, error_code, error_msg, parsed = ADPValidator.validate_json_data(valid_json, "data")
    assert(valid == true, "Should validate correct JSON")
    assert(parsed.test == "value", "Should return parsed JSON data")
    
    local invalid_json = '{"invalid": json}'
    valid, error_code, error_msg = ADPValidator.validate_json_data(invalid_json, "data")
    assert(valid == false, "Should reject invalid JSON")
end

-- Test message validation with rules
function ADPValidatorTests.test_validate_message_basic()
    local msg = {
        Tags = {
            Action = "Test-Action",
            AgentId = "agent_123"
        }
    }
    
    local rules = {
        required_tags = {"Action", "AgentId"},
        tag_validations = {
            Action = ADPValidator.validate_action,
            AgentId = ADPValidator.validate_alphanumeric
        }
    }
    
    local valid, error_code, error_msg, errors = ADPValidator.validate_message(msg, rules)
    assert(valid == true, "Should validate message with correct tags")
end

function ADPValidatorTests.test_validate_message_missing_required()
    local msg = {
        Tags = {
            Action = "Test-Action"
            -- Missing required AgentId
        }
    }
    
    local rules = {
        required_tags = {"Action", "AgentId"}
    }
    
    local valid, error_code, error_msg, errors = ADPValidator.validate_message(msg, rules)
    assert(valid == false, "Should reject message missing required tags")
    assert(#errors >= 1, "Should return validation errors")
    assert(errors[1].field == "AgentId", "Should identify missing field")
end

-- Run all tests
function ADPValidatorTests.run_all()
    local tests = {
        "test_validate_string_valid",
        "test_validate_string_too_short",
        "test_validate_string_too_long", 
        "test_validate_string_non_string",
        "test_validate_number_valid",
        "test_validate_number_string_conversion",
        "test_validate_number_invalid_string",
        "test_validate_number_range_checking",
        "test_validate_coordinate",
        "test_validate_damage",
        "test_validate_alphanumeric",
        "test_validate_action",
        "test_validate_required",
        "test_validate_enum",
        "test_validate_json_data",
        "test_validate_message_basic",
        "test_validate_message_missing_required"
    }
    
    local passed = 0
    local total = #tests
    
    for _, test_name in ipairs(tests) do
        local success, error_msg = pcall(ADPValidatorTests[test_name])
        if success then
            passed = passed + 1
            print("✓ " .. test_name)
        else
            print("✗ " .. test_name .. ": " .. tostring(error_msg))
        end
    end
    
    print("\nADPValidator Tests: " .. passed .. "/" .. total .. " passed")
    return passed == total
end

return ADPValidatorTests