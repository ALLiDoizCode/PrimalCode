-- AI Inference Request Handler
-- Handles AI inference requests with X-prefix metadata support

local types = require('types.marketplace')
local json = require('utils.json')
local state_manager = require('utils.state-manager')
local request_router = require('utils.request-router')

local ai_inference_handler = {}

-- Validate AI inference request message
function ai_inference_handler.validate_request(msg): boolean, string
    if not msg.Data then
        return false, "Missing message data"
    end
    
    local data = msg.Data
    
    if not data.request_id or type(data.request_id) ~= "string" then
        return false, "Invalid or missing request_id"
    end
    
    if not data.service_type or type(data.service_type) ~= "string" then
        return false, "Invalid or missing service_type"
    end
    
    if not data.payment_amount or type(data.payment_amount) ~= "string" then
        return false, "Invalid or missing payment_amount"
    end
    
    -- Validate payment amount is a valid number
    local payment_num = tonumber(data.payment_amount)
    if not payment_num or payment_num < 0 then
        return false, "Invalid payment amount - must be a positive number"
    end
    
    return true, ""
end

-- Extract and validate X-prefix metadata
function ai_inference_handler.extract_x_metadata(msg): types.XMetadata
    local x_metadata: types.XMetadata = {}
    
    if msg.Tags then
        for key, value in pairs(msg.Tags) do
            if type(key) == "string" and string.sub(key, 1, 2) == "X-" then
                x_metadata[key] = value
            end
        end
    end
    
    return x_metadata
end

-- Create inference request from message
function ai_inference_handler.create_request(msg): types.InferenceRequest
    local data = msg.Data
    local x_metadata = ai_inference_handler.extract_x_metadata(msg)
    
    local request: types.InferenceRequest = {
        request_id = data.request_id,
        requester = msg.From,
        provider_id = "",
        service_type = data.service_type,
        context_data = data.context_data or {},
        payment_amount = data.payment_amount,
        x_metadata = x_metadata,
        status = "pending",
        created_at = os.time(),
        timeout_at = 0  -- Will be calculated by router
    }
    
    -- Calculate timeout
    request.timeout_at = request_router.calculate_timeout(request)
    
    return request
end

-- Handle AI inference request
function ai_inference_handler.handle(msg): string
    print("🧠 Processing AI inference request from: " .. msg.From)
    
    -- Validate the request
    local is_valid, error_message = ai_inference_handler.validate_request(msg)
    if not is_valid then
        print("❌ Invalid request: " .. error_message)
        
        return json.encode({
            success = false,
            error = error_message,
            timestamp = os.time()
        })
    end
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Create inference request
    local request = ai_inference_handler.create_request(msg)
    
    print("📋 Request details:")
    print("  - ID: " .. request.request_id)
    print("  - Service: " .. request.service_type)
    print("  - Payment: " .. request.payment_amount)
    print("  - X-metadata count: " .. tostring(ai_inference_handler.count_x_metadata(request.x_metadata)))
    
    -- Route the request
    local routing_result = request_router.route_request(marketplace_state, request)
    
    if routing_result.success then
        print("✅ Request routed successfully to provider: " .. routing_result.provider_id)
        
        -- Log successful routing
        local queue_position_msg = routing_result.queue_position > 0 and " (queued at position " .. routing_result.queue_position .. ")" or " (processing immediately)"
        print("📊 Routing result: " .. routing_result.provider_id .. queue_position_msg)
        
        return json.encode({
            success = true,
            request_id = request.request_id,
            provider_id = routing_result.provider_id,
            queue_position = routing_result.queue_position,
            estimated_completion = routing_result.estimated_completion,
            status = routing_result.queue_position > 0 and "queued" or "processing",
            timestamp = os.time()
        })
    else
        print("❌ Request routing failed: " .. routing_result.error_message)
        
        return json.encode({
            success = false,
            error = routing_result.error_message,
            request_id = request.request_id,
            timestamp = os.time()
        })
    end
end

-- Count X-metadata entries
function ai_inference_handler.count_x_metadata(x_metadata: types.XMetadata): number
    local count = 0
    for _ in pairs(x_metadata) do
        count = count + 1
    end
    return count
end

-- Handle request completion notification
function ai_inference_handler.handle_completion(msg): string
    print("✅ Processing request completion from: " .. msg.From)
    
    local data = msg.Data
    if not data or not data.request_id then
        return json.encode({
            success = false,
            error = "Invalid completion notification - missing request_id",
            timestamp = os.time()
        })
    end
    
    local success_flag = data.success ~= false  -- Default to true if not specified
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Complete the request
    local completed = request_router.complete_request(marketplace_state, data.request_id, success_flag)
    
    if completed then
        print("✅ Request completed successfully: " .. data.request_id)
        
        return json.encode({
            success = true,
            request_id = data.request_id,
            status = success_flag and "completed" or "failed",
            timestamp = os.time()
        })
    else
        print("❌ Request completion failed: " .. data.request_id)
        
        return json.encode({
            success = false,
            error = "Request not found or already completed",
            request_id = data.request_id,
            timestamp = os.time()
        })
    end
end

-- Handle request cancellation
function ai_inference_handler.handle_cancellation(msg): string
    print("❌ Processing request cancellation from: " .. msg.From)
    
    local data = msg.Data
    if not data or not data.request_id then
        return json.encode({
            success = false,
            error = "Invalid cancellation request - missing request_id",
            timestamp = os.time()
        })
    end
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Cancel the request
    local cancelled = request_router.cancel_request(marketplace_state, data.request_id)
    
    if cancelled then
        print("✅ Request cancelled successfully: " .. data.request_id)
        
        return json.encode({
            success = true,
            request_id = data.request_id,
            status = "cancelled",
            timestamp = os.time()
        })
    else
        print("❌ Request cancellation failed: " .. data.request_id)
        
        return json.encode({
            success = false,
            error = "Request not found or already completed",
            request_id = data.request_id,
            timestamp = os.time()
        })
    end
end

return ai_inference_handler