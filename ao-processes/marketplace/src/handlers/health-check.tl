-- Health Check Handler
-- Handles marketplace health monitoring and diagnostics

local types = require('types.marketplace')
local json = require('utils.json')
local state_manager = require('utils.state-manager')
local request_router = require('utils.request-router')

local health_handler = {}

-- Perform comprehensive health check
function health_handler.perform_health_check(): types.HealthStatus
    local current_time = os.time()
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Calculate basic health metrics
    local health_status: types.HealthStatus = {
        is_healthy = true,
        last_heartbeat = current_time,
        error_count = 0,
        uptime = current_time - (marketplace_state.last_cleanup or current_time),
        memory_usage = 0  -- Would be calculated based on actual memory usage
    }
    
    -- Check for critical issues
    local issues = {}
    
    -- Check if there are any active providers
    local active_providers = state_manager.get_active_providers(marketplace_state)
    if #active_providers == 0 then
        table.insert(issues, "No active providers available")
        health_status.error_count = health_status.error_count + 1
    end
    
    -- Check queue sizes
    local queue_stats = request_router.get_queue_stats(marketplace_state)
    local total_queued = (queue_stats.high or 0) + (queue_stats.medium or 0) + (queue_stats.low or 0)
    
    if total_queued > 100 then
        table.insert(issues, "High queue backlog: " .. total_queued .. " requests")
        health_status.error_count = health_status.error_count + 1
    end
    
    -- Check for old requests
    local old_request_count = 0
    local one_hour_ago = current_time - 3600
    
    for _, request in pairs(marketplace_state.active_requests) do
        if request.created_at < one_hour_ago then
            old_request_count = old_request_count + 1
        end
    end
    
    if old_request_count > 0 then
        table.insert(issues, "Old active requests: " .. old_request_count)
        health_status.error_count = health_status.error_count + 1
    end
    
    -- Check provider health
    local inactive_providers = 0
    for _, provider in pairs(marketplace_state.providers) do
        if provider.status ~= "active" then
            inactive_providers = inactive_providers + 1
        end
    end
    
    if inactive_providers > 0 then
        table.insert(issues, "Inactive providers: " .. inactive_providers)
    end
    
    -- Determine overall health
    health_status.is_healthy = health_status.error_count == 0
    
    -- Update marketplace health state
    marketplace_state.process_health = health_status
    state_manager.update_health(marketplace_state, health_status)
    
    -- Log health status
    if health_status.is_healthy then
        print("✅ Health check passed")
    else
        print("⚠️ Health check found issues:")
        for _, issue in ipairs(issues) do
            print("  - " .. issue)
        end
    end
    
    return health_status
end

-- Handle health check request
function health_handler.handle_health_check(msg): string
    print("🏥 Processing health check from: " .. msg.From)
    
    local health_status = health_handler.perform_health_check()
    
    -- Load marketplace state for additional metrics
    local marketplace_state = state_manager.load_state()
    local queue_stats = request_router.get_queue_stats(marketplace_state)
    
    -- Get provider statistics
    local provider_stats = {
        total = marketplace_state.total_providers,
        active = 0,
        inactive = 0,
        suspended = 0
    }
    
    for _, provider in pairs(marketplace_state.providers) do
        if provider.status == "active" then
            provider_stats.active = provider_stats.active + 1
        elseif provider.status == "inactive" then
            provider_stats.inactive = provider_stats.inactive + 1
        elseif provider.status == "suspended" then
            provider_stats.suspended = provider_stats.suspended + 1
        end
    end
    
    -- Calculate processing metrics
    local processing_stats = {
        total_requests = marketplace_state.total_requests,
        active_requests = queue_stats.active or 0,
        queued_requests = (queue_stats.high or 0) + (queue_stats.medium or 0) + (queue_stats.low or 0),
        queue_breakdown = {
            high = queue_stats.high or 0,
            medium = queue_stats.medium or 0,
            low = queue_stats.low or 0
        }
    }
    
    -- Calculate transaction metrics
    local transaction_count = 0
    local successful_transactions = 0
    
    for _, transaction in pairs(marketplace_state.transactions) do
        transaction_count = transaction_count + 1
        if transaction.success then
            successful_transactions = successful_transactions + 1
        end
    end
    
    local transaction_stats = {
        total_transactions = transaction_count,
        successful_transactions = successful_transactions,
        success_rate = transaction_count > 0 and (successful_transactions / transaction_count) or 0
    }
    
    print("🏥 Health check results:")
    print("  - Overall health: " .. (health_status.is_healthy and "healthy" or "unhealthy"))
    print("  - Active providers: " .. provider_stats.active)
    print("  - Active requests: " .. processing_stats.active_requests)
    print("  - Queued requests: " .. processing_stats.queued_requests)
    print("  - Transaction success rate: " .. string.format("%.2f%%", transaction_stats.success_rate * 100))
    
    return json.encode({
        success = true,
        health = health_status,
        provider_stats = provider_stats,
        processing_stats = processing_stats,
        transaction_stats = transaction_stats,
        marketplace_version = "1.0.0",
        timestamp = os.time()
    })
end

-- Handle diagnostic request
function health_handler.handle_diagnostics(msg): string
    print("🔬 Processing diagnostics request from: " .. msg.From)
    
    local marketplace_state = state_manager.load_state()
    
    -- Collect detailed diagnostic information
    local diagnostics = {
        marketplace_state = {
            total_providers = marketplace_state.total_providers,
            total_requests = marketplace_state.total_requests,
            last_cleanup = marketplace_state.last_cleanup
        },
        providers = {},
        recent_requests = {},
        recent_transactions = {},
        performance_metrics = {}
    }
    
    -- Provider diagnostics
    for provider_id, provider in pairs(marketplace_state.providers) do
        diagnostics.providers[provider_id] = {
            status = provider.status,
            capabilities = provider.capabilities,
            reputation = provider.reputation,
            last_seen = provider.metadata.last_seen,
            pricing_count = 0
        }
        
        -- Count pricing entries
        for _ in pairs(provider.pricing) do
            diagnostics.providers[provider_id].pricing_count = diagnostics.providers[provider_id].pricing_count + 1
        end
    end
    
    -- Recent requests (last 10)
    local request_count = 0
    for request_id, request in pairs(marketplace_state.active_requests) do
        if request_count < 10 then
            diagnostics.recent_requests[request_id] = {
                status = request.status,
                service_type = request.service_type,
                created_at = request.created_at,
                timeout_at = request.timeout_at,
                provider_id = request.provider_id
            }
            request_count = request_count + 1
        end
    end
    
    -- Recent transactions (last 10)
    local transaction_count = 0
    for transaction_id, transaction in pairs(marketplace_state.transactions) do
        if transaction_count < 10 then
            diagnostics.recent_transactions[transaction_id] = {
                request_id = transaction.request_id,
                amount = transaction.amount,
                success = transaction.success,
                timestamp = transaction.timestamp,
                service_type = transaction.service_type
            }
            transaction_count = transaction_count + 1
        end
    end
    
    -- Performance metrics
    local current_time = os.time()
    local one_hour_ago = current_time - 3600
    
    local recent_request_count = 0
    local recent_transaction_count = 0
    
    for _, request in pairs(marketplace_state.active_requests) do
        if request.created_at > one_hour_ago then
            recent_request_count = recent_request_count + 1
        end
    end
    
    for _, transaction in pairs(marketplace_state.transactions) do
        if transaction.timestamp > one_hour_ago then
            recent_transaction_count = recent_transaction_count + 1
        end
    end
    
    diagnostics.performance_metrics = {
        requests_per_hour = recent_request_count,
        transactions_per_hour = recent_transaction_count,
        average_queue_time = 0,  -- Could be calculated from queue entry timestamps
        average_processing_time = 0  -- Could be calculated from request lifecycle
    }
    
    print("🔬 Diagnostics collected:")
    print("  - Providers analyzed: " .. tostring(marketplace_state.total_providers))
    print("  - Recent requests: " .. request_count)
    print("  - Recent transactions: " .. transaction_count)
    print("  - Requests per hour: " .. recent_request_count)
    
    return json.encode({
        success = true,
        diagnostics = diagnostics,
        timestamp = os.time()
    })
end

-- Handle process restart request
function health_handler.handle_restart(msg): string
    print("🔄 Processing restart request from: " .. msg.From)
    
    -- Perform cleanup before restart
    local marketplace_state = state_manager.load_state()
    local cleaned_count = state_manager.cleanup_expired_requests(marketplace_state)
    
    -- Update health status
    local health_status = health_handler.perform_health_check()
    
    print("🔄 Restart preparation:")
    print("  - Expired requests cleaned: " .. cleaned_count)
    print("  - Health status: " .. (health_status.is_healthy and "healthy" or "unhealthy"))
    print("  - Ready for restart")
    
    return json.encode({
        success = true,
        message = "Process ready for restart",
        cleaned_requests = cleaned_count,
        health_status = health_status,
        timestamp = os.time()
    })
end

-- Handle emergency stop request
function health_handler.handle_emergency_stop(msg): string
    print("🚨 Processing emergency stop request from: " .. msg.From)
    
    -- Stop accepting new requests by marking all providers as inactive
    local marketplace_state = state_manager.load_state()
    
    local stopped_providers = 0
    for _, provider in pairs(marketplace_state.providers) do
        if provider.status == "active" then
            provider.status = "inactive"
            stopped_providers = stopped_providers + 1
        end
    end
    
    -- Save state
    state_manager.save_state(marketplace_state)
    
    print("🚨 Emergency stop executed:")
    print("  - Providers stopped: " .. stopped_providers)
    print("  - Marketplace in emergency mode")
    
    return json.encode({
        success = true,
        message = "Emergency stop executed",
        stopped_providers = stopped_providers,
        timestamp = os.time()
    })
end

return health_handler