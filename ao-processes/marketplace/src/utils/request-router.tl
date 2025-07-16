-- Request Router
-- Handles AI inference request routing and queue management

local types = require("types.marketplace")
local state_manager = require("utils.state-manager")
local provider_matcher = require("utils.provider-matcher")

local request_router = {}

-- Generate unique request ID
function request_router.generate_request_id(): string
    return "req_" .. os.time() .. "_" .. math.random(1000, 9999)
end

-- Determine request priority based on payment amount and service type
function request_router.determine_priority(request: types.InferenceRequest): string
    local payment_amount = tonumber(request.payment_amount) or 0
    
    -- High priority: payment >= 1000 or critical service types
    if payment_amount >= 1000 or request.service_type == "emergency" then
        return "high"
    end
    
    -- Medium priority: payment >= 100 or standard service types
    if payment_amount >= 100 or request.service_type == "monster_decision" then
        return "medium"
    end
    
    -- Low priority: everything else
    return "low"
end

-- Calculate request timeout based on service type
function request_router.calculate_timeout(request: types.InferenceRequest): number
    local current_time = os.time()
    local timeout_seconds = 30  -- default 30 seconds
    
    -- Service-specific timeouts
    if request.service_type == "monster_decision" then
        timeout_seconds = 60  -- 1 minute for monster decisions
    elseif request.service_type == "emergency" then
        timeout_seconds = 10  -- 10 seconds for emergency
    elseif request.service_type == "analysis" then
        timeout_seconds = 120  -- 2 minutes for analysis
    end
    
    -- Check if timeout is specified in X-metadata
    if request.x_metadata and request.x_metadata["X-Timeout"] then
        local custom_timeout = tonumber(request.x_metadata["X-Timeout"])
        if custom_timeout and custom_timeout > 0 then
            timeout_seconds = custom_timeout
        end
    end
    
    return current_time + timeout_seconds
end

-- Route request to appropriate provider
function request_router.route_request(state: types.MarketplaceState, request: types.InferenceRequest): types.RoutingResult
    -- Get active providers
    local active_providers = state_manager.get_active_providers(state)
    
    if #active_providers == 0 then
        return {
            success = false,
            provider_id = "",
            queue_position = 0,
            estimated_completion = 0,
            error_message = "No active providers available"
        }
    end
    
    -- Find best matching provider
    local best_match = provider_matcher.find_best_provider(request, active_providers)
    
    if not best_match then
        return {
            success = false,
            provider_id = "",
            queue_position = 0,
            estimated_completion = 0,
            error_message = "No capable providers found for service type: " .. request.service_type
        }
    end
    
    -- Check if provider is available for immediate processing
    if best_match.available then
        -- Add to active requests
        request.provider_id = best_match.provider_id
        request.status = "processing"
        
        local success = state_manager.add_active_request(state, request)
        
        if success then
            return {
                success = true,
                provider_id = best_match.provider_id,
                queue_position = 0,
                estimated_completion = os.time() + (best_match.estimated_time / 1000),
                error_message = ""
            }
        else
            return {
                success = false,
                provider_id = "",
                queue_position = 0,
                estimated_completion = 0,
                error_message = "Failed to add request to active processing"
            }
        end
    else
        -- Add to queue
        return request_router.add_to_queue(state, request, best_match.provider_id)
    end
end

-- Add request to queue
function request_router.add_to_queue(state: types.MarketplaceState, request: types.InferenceRequest, provider_id: string): types.RoutingResult
    local priority = request_router.determine_priority(request)
    
    local queue_entry: types.QueueEntry = {
        request = request,
        priority = priority == "high" and 3 or (priority == "medium" and 2 or 1),
        queued_at = os.time(),
        retries = 0
    }
    
    local success = state_manager.add_to_queue(state, queue_entry, priority)
    
    if success then
        local queue_position = #state_manager.get_queue_entries(state, priority)
        
        return {
            success = true,
            provider_id = provider_id,
            queue_position = queue_position,
            estimated_completion = os.time() + (queue_position * 30),  -- Estimate 30 seconds per queued request
            error_message = ""
        }
    else
        return {
            success = false,
            provider_id = "",
            queue_position = 0,
            estimated_completion = 0,
            error_message = "Failed to add request to queue"
        }
    end
end

-- Process next request from queue
function request_router.process_next_queued_request(state: types.MarketplaceState): types.InferenceRequest | nil
    -- Process in priority order: high -> medium -> low
    local priorities = {"high", "medium", "low"}
    
    for _, priority in ipairs(priorities) do
        local queue = state_manager.get_queue_entries(state, priority)
        
        if #queue > 0 then
            local entry = queue[1]  -- Get first entry
            
            -- Check if request hasn't expired
            if os.time() <= entry.request.timeout_at then
                -- Remove from queue
                local success = state_manager.remove_from_queue(state, entry.request.request_id)
                
                if success then
                    -- Try to route the request again
                    local routing_result = request_router.route_request(state, entry.request)
                    
                    if routing_result.success then
                        return entry.request
                    else
                        -- If routing fails, increment retries and re-queue if under limit
                        entry.retries = entry.retries + 1
                        
                        if entry.retries < 3 then
                            state_manager.add_to_queue(state, entry, priority)
                        end
                    end
                end
            else
                -- Remove expired request
                state_manager.remove_from_queue(state, entry.request.request_id)
            end
        end
    end
    
    return nil
end

-- Handle request completion
function request_router.complete_request(state: types.MarketplaceState, request_id: string, success: boolean): boolean
    local request = state_manager.get_active_request(state, request_id)
    
    if not request then
        return false
    end
    
    -- Update request status
    request.status = success and "completed" or "failed"
    
    -- Update provider reputation
    local provider = state_manager.get_provider(state, request.provider_id)
    if provider then
        provider.reputation.total_requests = provider.reputation.total_requests + 1
        
        if success then
            provider.reputation.completion_rate = 
                (provider.reputation.completion_rate * (provider.reputation.total_requests - 1) + 1.0) / provider.reputation.total_requests
        else
            provider.reputation.completion_rate = 
                (provider.reputation.completion_rate * (provider.reputation.total_requests - 1)) / provider.reputation.total_requests
        end
        
        state_manager.update_provider(state, provider)
    end
    
    -- Remove from active requests
    return state_manager.remove_active_request(state, request_id)
end

-- Handle request cancellation
function request_router.cancel_request(state: types.MarketplaceState, request_id: string): boolean
    -- Try to remove from active requests first
    local active_request = state_manager.get_active_request(state, request_id)
    if active_request then
        active_request.status = "cancelled"
        return state_manager.remove_active_request(state, request_id)
    end
    
    -- Try to remove from queue
    return state_manager.remove_from_queue(state, request_id)
end

-- Get request status
function request_router.get_request_status(state: types.MarketplaceState, request_id: string): types.InferenceRequest | nil
    -- Check active requests first
    local active_request = state_manager.get_active_request(state, request_id)
    if active_request then
        return active_request
    end
    
    -- Check queues
    local priorities = {"high", "medium", "low"}
    for _, priority in ipairs(priorities) do
        local queue = state_manager.get_queue_entries(state, priority)
        for _, entry in ipairs(queue) do
            if entry.request.request_id == request_id then
                return entry.request
            end
        end
    end
    
    return nil
end

-- Get queue statistics
function request_router.get_queue_stats(state: types.MarketplaceState): {string: number}
    local stats = {}
    
    for priority, queue in pairs(state.request_queue) do
        stats[priority] = #queue
    end
    
    stats["active"] = 0
    for _ in pairs(state.active_requests) do
        stats["active"] = stats["active"] + 1
    end
    
    return stats
end

return request_router