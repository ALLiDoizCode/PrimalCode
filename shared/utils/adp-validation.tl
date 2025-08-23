-- ADP Message Validation Framework
-- Provides comprehensive input validation for ADP v1.0 compliant messages
local json = require('json')
-- Validation constraints
local CONSTRAINTS = {
    -- String validation
    MAX_STRING_LENGTH = 1000,
    MIN_STRING_LENGTH = 1,
    -- Numeric validation
    MAX_COORDINATE = 999999,
    MIN_COORDINATE = -999999,
    MAX_DAMAGE = 9999,
    MIN_DAMAGE = 0,
    MAX_HEALTH = 9999,
    MIN_HEALTH = 0,
    -- Character whitelists
    ALPHANUMERIC = "^[%w_%-]+$",
    COORDINATE_FORMAT = "^%-?%d+%.?%d*$",
    ACTION_FORMAT = "^[%w%-]+$"
}
-- ADP Validation Module
local ADPValidator = {}
-- Validate string input
function ADPValidator.validate_string(value, field_name, min_length, max_length)
    if type(value) ~= "string" then
        return false, "VALIDATION_FAILED", field_name .. " must be a string"
    end
    local min_len = min_length or CONSTRAINTS.MIN_STRING_LENGTH
    local max_len = max_length or CONSTRAINTS.MAX_STRING_LENGTH
    if #value < min_len then
        return false, "VALIDATION_FAILED", field_name .. " must be at least " .. min_len .. " characters"
    end
    if #value > max_len then
        return false, "VALIDATION_FAILED", field_name .. " exceeds maximum length of " .. max_len
    end
    return true, nil, nil
end
-- Validate numeric input with range checking
function ADPValidator.validate_number(value, field_name, min_val, max_val)
    if type(value) ~= "number" then
        -- Try to convert string to number
        if type(value) == "string" then
            value = tonumber(value)
            if not value then
                return false, "VALIDATION_FAILED", field_name .. " must be a valid number"
            end
        else
            return false, "VALIDATION_FAILED", field_name .. " must be a number"
        end
    end
    if min_val and value < min_val then
        return false, "VALIDATION_FAILED", field_name .. " must be at least " .. min_val
    end
    if max_val and value > max_val then
        return false, "VALIDATION_FAILED", field_name .. " must be at most " .. max_val
    end
    return true, nil, nil
end
-- Validate coordinate values
function ADPValidator.validate_coordinate(value, field_name)
    return ADPValidator.validate_number(
        value,
        field_name,
        CONSTRAINTS.MIN_COORDINATE,
        CONSTRAINTS.MAX_COORDINATE
    )
end
-- Validate damage values
function ADPValidator.validate_damage(value, field_name)
    return ADPValidator.validate_number(
        value,
        field_name,
        CONSTRAINTS.MIN_DAMAGE,
        CONSTRAINTS.MAX_DAMAGE
    )
end
-- Validate health values
function ADPValidator.validate_health(value, field_name)
    return ADPValidator.validate_number(
        value,
        field_name,
        CONSTRAINTS.MIN_HEALTH,
        CONSTRAINTS.MAX_HEALTH
    )
end
-- Validate alphanumeric strings
function ADPValidator.validate_alphanumeric(value, field_name)
    local valid, error_code, error_msg = ADPValidator.validate_string(value, field_name)
    if not valid then
        return valid, error_code, error_msg
    end
    if not string.match(value, CONSTRAINTS.ALPHANUMERIC) then
        return false, "VALIDATION_FAILED", field_name .. " contains invalid characters (alphanumeric, underscore, hyphen only)"
    end
    return true, nil, nil
end
-- Validate action format
function ADPValidator.validate_action(value, field_name)
    local valid, error_code, error_msg = ADPValidator.validate_string(value, field_name)
    if not valid then
        return valid, error_code, error_msg
    end
    if not string.match(value, CONSTRAINTS.ACTION_FORMAT) then
        return false, "VALIDATION_FAILED", field_name .. " contains invalid action format"
    end
    return true, nil, nil
end
-- Validate required field exists
function ADPValidator.validate_required(value, field_name)
    if value == nil or value == "" then
        return false, "VALIDATION_FAILED", field_name .. " is required"
    end
    return true, nil, nil
end
-- Validate enum values
function ADPValidator.validate_enum(value, field_name, allowed_values)
    local valid, error_code, error_msg = ADPValidator.validate_required(value, field_name)
    if not valid then
        return valid, error_code, error_msg
    end
    for _, allowed in ipairs(allowed_values) do
        if value == allowed then
            return true, nil, nil
        end
    end
    return false, "VALIDATION_FAILED", field_name .. " must be one of: " .. table.concat(allowed_values, ", ")
end
-- Validate JSON data structure
function ADPValidator.validate_json_data(data_string, field_name)
    if type(data_string) ~= "string" then
        return false, "VALIDATION_FAILED", field_name .. " must be a valid JSON string"
    end
    local success, parsed = pcall(json.decode, data_string)
    if not success then
        return false, "VALIDATION_FAILED", field_name .. " contains invalid JSON"
    end
    return true, nil, nil, parsed
end
-- Comprehensive message validation
function ADPValidator.validate_message(msg, validation_rules)
    local errors = {}
    -- Validate required tags
    if validation_rules.required_tags then
        for _, tag_name in ipairs(validation_rules.required_tags) do
            local value = msg.Tags and msg.Tags[tag_name]
            local valid, error_code, error_msg = ADPValidator.validate_required(value, tag_name)
            if not valid then
                table.insert(errors, {
                    field = tag_name,
                    code = error_code,
                    message = error_msg
                })
            end
        end
    end
    -- Validate tag formats
    if validation_rules.tag_validations and msg.Tags then
        for tag_name, validation_func in pairs(validation_rules.tag_validations) do
            local value = msg.Tags[tag_name]
            if value then
                local valid, error_code, error_msg = validation_func(value, tag_name)
                if not valid then
                    table.insert(errors, {
                        field = tag_name,
                        code = error_code,
                        message = error_msg
                    })
                end
            end
        end
    end
    -- Validate data structure if present
    if validation_rules.data_validation and msg.Data then
        local valid, error_code, error_msg, parsed_data = ADPValidator.validate_json_data(msg.Data, "Data")
        if not valid then
            table.insert(errors, {
                field = "Data",
                code = error_code,
                message = error_msg
            })
        else
            -- Additional data field validations
            local data_valid, data_errors = validation_rules.data_validation(parsed_data)
            if not data_valid and data_errors then
                for _, error in ipairs(data_errors) do
                    table.insert(errors, error)
                end
            end
        end
    end
    if #errors > 0 then
        return false, "VALIDATION_FAILED", "Message validation failed", errors
    end
    return true, nil, nil, nil
end
-- Create validation middleware
function ADPValidator.create_middleware(validation_rules)
    return function(msg)
        local valid, error_code, error_msg, errors = ADPValidator.validate_message(msg, validation_rules)
        if not valid then
            return {
                valid = false,
                error_code = error_code,
                error_message = error_msg,
                validation_errors = errors
            }
        end
        return { valid = true }
    end
end
-- Common validation rule sets
ADPValidator.COMMON_RULES = {
    agent_registration = {
        required_tags = {"Action", "AgentId"},
        tag_validations = {
            Action = ADPValidator.validate_action,
            AgentId = ADPValidator.validate_alphanumeric,
            Location = ADPValidator.validate_alphanumeric
        }
    },
    movement = {
        required_tags = {"Action", "AgentId", "X", "Y"},
        tag_validations = {
            Action = ADPValidator.validate_action,
            AgentId = ADPValidator.validate_alphanumeric,
            X = ADPValidator.validate_coordinate,
            Y = ADPValidator.validate_coordinate
        }
    },
    battle_action = {
        required_tags = {"Action", "BattleId", "PlayerId"},
        tag_validations = {
            Action = ADPValidator.validate_action,
            BattleId = ADPValidator.validate_alphanumeric,
            PlayerId = ADPValidator.validate_alphanumeric,
            TuxemonId = ADPValidator.validate_alphanumeric,
            Damage = ADPValidator.validate_damage
        }
    }
}
return ADPValidator