-- Marketplace State Manager
-- Handles marketplace state persistence and management

local json = require("json")
local types = require("types.marketplace")

local state_manager = {}

-- Initialize empty marketplace state
function state_manager.create_initial_state(): types.MarketplaceState
    return {
        providers = {},
        active_requests = {},
        request_queue = {
            high = {},
            medium = {},
            low = {}
        },
        transactions = {},
        total_requests = 0,
        total_providers = 0,
        last_cleanup = os.time(),
        process_health = {
            is_healthy = true,
            last_heartbeat = os.time(),
            error_count = 0,
            uptime = 0,
            memory_usage = 0
        }
    }
end

-- Save state to Arweave (persistent storage)
function state_manager.save_state(state: types.MarketplaceState): boolean
    local success, err = pcall(function()
        local serialized = json.encode(state)
        -- In a real AO process, this would use AO's persistence mechanisms
        -- For now, we'll use a simple file-based approach for testing
        local file = io.open("marketplace_state.json", "w")
        if file then
            file:write(serialized)
            file:close()
            return true
        end
        return false
    end)
    
    if not success then
        print("Error saving state: " .. tostring(err))
        return false
    end
    
    return true
end

-- Load state from Arweave (persistent storage)
function state_manager.load_state(): types.MarketplaceState
    local file = io.open("marketplace_state.json", "r")
    if file then
        local content = file:read("*all")
        file:close()
        
        local success, state = pcall(function()
            return json.decode(content)
        end)
        
        if success and state then
            return state as types.MarketplaceState
        end
    end
    
    -- Return initial state if loading fails
    return state_manager.create_initial_state()
end

-- Update provider in state
function state_manager.update_provider(state: types.MarketplaceState, provider: types.InferenceProvider): boolean
    state.providers[provider.provider_id] = provider
    
    -- Update total providers count
    local count = 0
    for _ in pairs(state.providers) do
        count = count + 1
    end
    state.total_providers = count
    
    return state_manager.save_state(state)
end

-- Add request to active requests
function state_manager.add_active_request(state: types.MarketplaceState, request: types.InferenceRequest): boolean
    state.active_requests[request.request_id] = request
    state.total_requests = state.total_requests + 1
    
    return state_manager.save_state(state)
end

-- Remove request from active requests
function state_manager.remove_active_request(state: types.MarketplaceState, request_id: string): boolean
    state.active_requests[request_id] = nil
    
    return state_manager.save_state(state)
end

-- Add request to queue
function state_manager.add_to_queue(state: types.MarketplaceState, entry: types.QueueEntry, priority: string): boolean
    local queue = state.request_queue[priority]
    if not queue then
        print("Invalid priority: " .. priority)
        return false
    end
    
    table.insert(queue, entry)
    
    return state_manager.save_state(state)
end

-- Remove request from queue
function state_manager.remove_from_queue(state: types.MarketplaceState, request_id: string): boolean
    local found = false
    
    -- Check all priority queues
    for priority, queue in pairs(state.request_queue) do
        for i, entry in ipairs(queue) do
            if entry.request.request_id == request_id then
                table.remove(queue, i)
                found = true
                break
            end
        end
        if found then break end
    end
    
    return found and state_manager.save_state(state)
end

-- Add transaction to history
function state_manager.add_transaction(state: types.MarketplaceState, transaction: types.MarketplaceTransaction): boolean
    state.transactions[transaction.transaction_id] = transaction
    
    return state_manager.save_state(state)
end

-- Get provider by ID
function state_manager.get_provider(state: types.MarketplaceState, provider_id: string): types.InferenceProvider | nil
    return state.providers[provider_id]
end

-- Get active request by ID
function state_manager.get_active_request(state: types.MarketplaceState, request_id: string): types.InferenceRequest | nil
    return state.active_requests[request_id]
end

-- Get all active providers
function state_manager.get_active_providers(state: types.MarketplaceState): {types.InferenceProvider}
    local active_providers = {}
    
    for _, provider in pairs(state.providers) do
        if provider.status == "active" then
            table.insert(active_providers, provider)
        end
    end
    
    return active_providers
end

-- Get queue entries by priority
function state_manager.get_queue_entries(state: types.MarketplaceState, priority: string): {types.QueueEntry}
    return state.request_queue[priority] or {}
end

-- Clean up expired requests
function state_manager.cleanup_expired_requests(state: types.MarketplaceState): number
    local current_time = os.time()
    local cleaned_count = 0
    
    -- Clean up active requests
    for request_id, request in pairs(state.active_requests) do
        if current_time > request.timeout_at then
            state.active_requests[request_id] = nil
            cleaned_count = cleaned_count + 1
        end
    end
    
    -- Clean up queue entries
    for priority, queue in pairs(state.request_queue) do
        local i = 1
        while i <= #queue do
            if current_time > queue[i].request.timeout_at then
                table.remove(queue, i)
                cleaned_count = cleaned_count + 1
            else
                i = i + 1
            end
        end
    end
    
    state.last_cleanup = current_time
    
    if cleaned_count > 0 then
        state_manager.save_state(state)
    end
    
    return cleaned_count
end

-- Update process health
function state_manager.update_health(state: types.MarketplaceState, health: types.HealthStatus): boolean
    state.process_health = health
    
    return state_manager.save_state(state)
end

return state_manager