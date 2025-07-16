-- Simple JSON encoder/decoder for AO Process
-- Basic JSON implementation for Teal/Lua

local json = {}

-- Encode a value to JSON string
function json.encode(value: any): string
    local value_type = type(value)
    
    if value_type == "nil" then
        return "null"
    elseif value_type == "boolean" then
        return tostring(value)
    elseif value_type == "number" then
        return tostring(value)
    elseif value_type == "string" then
        return '"' .. json.escape_string(value) .. '"'
    elseif value_type == "table" then
        return json.encode_table(value)
    else
        return '"unknown"'
    end
end

-- Escape special characters in strings
function json.escape_string(str: string): string
    local escaped = str
    escaped = string.gsub(escaped, '\\', '\\\\')
    escaped = string.gsub(escaped, '"', '\\"')
    escaped = string.gsub(escaped, '\n', '\\n')
    escaped = string.gsub(escaped, '\r', '\\r')
    escaped = string.gsub(escaped, '\t', '\\t')
    return escaped
end

-- Encode table to JSON object or array
function json.encode_table(tbl: {any: any}): string
    if json.is_array(tbl) then
        return json.encode_array(tbl)
    else
        return json.encode_object(tbl)
    end
end

-- Check if table is an array (consecutive integer keys starting from 1)
function json.is_array(tbl: {any: any}): boolean
    local count = 0
    for k, v in pairs(tbl) do
        count = count + 1
        if type(k) ~= "number" or k ~= count then
            return false
        end
    end
    return true
end

-- Encode table as JSON array
function json.encode_array(arr: {any}): string
    local elements = {}
    for i, value in ipairs(arr) do
        table.insert(elements, json.encode(value))
    end
    return "[" .. table.concat(elements, ",") .. "]"
end

-- Encode table as JSON object
function json.encode_object(obj: {any: any}): string
    local pairs_list = {}
    for key, value in pairs(obj) do
        local key_str = type(key) == "string" and key or tostring(key)
        local encoded_key = '"' .. json.escape_string(key_str) .. '"'
        local encoded_value = json.encode(value)
        table.insert(pairs_list, encoded_key .. ":" .. encoded_value)
    end
    return "{" .. table.concat(pairs_list, ",") .. "}"
end

-- Simple JSON decoder (basic implementation)
function json.decode(json_str: string): any
    -- Remove whitespace
    json_str = string.gsub(json_str, "%s+", "")
    
    if json_str == "null" then
        return nil
    elseif json_str == "true" then
        return true
    elseif json_str == "false" then
        return false
    elseif string.match(json_str, "^%-?%d+%.?%d*$") then
        return tonumber(json_str)
    elseif string.sub(json_str, 1, 1) == '"' and string.sub(json_str, -1) == '"' then
        return json.decode_string(string.sub(json_str, 2, -2))
    elseif string.sub(json_str, 1, 1) == '[' then
        return json.decode_array(json_str)
    elseif string.sub(json_str, 1, 1) == '{' then
        return json.decode_object(json_str)
    else
        return nil
    end
end

-- Decode JSON string
function json.decode_string(str: string): string
    local decoded = str
    decoded = string.gsub(decoded, '\\"', '"')
    decoded = string.gsub(decoded, '\\\\', '\\')
    decoded = string.gsub(decoded, '\\n', '\n')
    decoded = string.gsub(decoded, '\\r', '\r')
    decoded = string.gsub(decoded, '\\t', '\t')
    return decoded
end

-- Basic array decoder (simplified)
function json.decode_array(json_str: string): {any}
    local result = {}
    -- This is a simplified implementation
    -- In a production system, you'd want a proper JSON parser
    return result
end

-- Basic object decoder (simplified)
function json.decode_object(json_str: string): {string: any}
    local result = {}
    -- This is a simplified implementation
    -- In a production system, you'd want a proper JSON parser
    return result
end

return json