-- JSON utilities for AO processes - safe wrapper around AO's built-in JSON
local record JSONUtils
    encode: function(data: any): string
    decode: function(json_string: string): any, string
end
local json_utils: JSONUtils = {}
-- Encode data to JSON string
function json_utils.encode(data: any): string
    -- In AO processes, json is available globally
    return json.encode(data)
end
-- Decode JSON string to Lua data
-- Returns data and error message (if any)
function json_utils.decode(json_string: string): any, string
    local success, result = pcall(json.decode, json_string)
    if success then
        return result, ""
    else
        return nil, result as string
    end
end
return json_utils