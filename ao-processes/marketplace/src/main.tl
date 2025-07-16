-- Marketplace AO Process Main Entry Point
-- AI inference marketplace with Teal type safety

-- Import required modules
local state_manager = require('utils.state-manager')
local request_router = require('utils.request-router')
local provider_matcher = require('utils.provider-matcher')
local json = require('utils.json')
local types = require('types.marketplace')

-- Global process state
local PROCESS_VERSION = "1.0.0"
local CLEANUP_INTERVAL = 300 -- 5 minutes
local QUEUE_PROCESSING_INTERVAL = 10 -- 10 seconds

-- Initialize process on startup
local function initialize_process(): types.ProcessState
    print("🏪 Initializing Marketplace AO Process v" .. PROCESS_VERSION)
    
    -- Load or create marketplace state
    local marketplace_state = state_manager.load_state()
    
    print("🏪 Marketplace initialized")
    print("👥 Total providers: " .. marketplace_state.total_providers)
    print("📊 Total requests: " .. marketplace_state.total_requests)
    print("✅ Process health: " .. (marketplace_state.process_health.is_healthy and "healthy" or "unhealthy"))
    
    local process_state: types.ProcessState = {
        marketplace = marketplace_state,
        health = marketplace_state.process_health,
        version = PROCESS_VERSION,
        last_backup = os.time()
    }
    
    return process_state
end

-- Periodic cleanup of expired requests
local function cleanup_cycle()
    local marketplace_state = state_manager.load_state()
    local cleaned_count = state_manager.cleanup_expired_requests(marketplace_state)
    
    if cleaned_count > 0 then
        print("🧹 Cleaned up " .. cleaned_count .. " expired requests")
    end
end

-- Process queued requests
local function process_queue_cycle()
    local marketplace_state = state_manager.load_state()
    local processed_request = request_router.process_next_queued_request(marketplace_state)
    
    if processed_request then
        print("📋 Processed queued request: " .. processed_request.request_id)
    end
end

-- Handle AI Inference Request
local function handle_ai_inference_request(msg): string
    print("🧠 Processing AI inference request from: " .. msg.From)
    
    local marketplace_state = state_manager.load_state()
    
    -- Parse message data
    local request_data = msg.Data
    if not request_data or not request_data.request_id then
        return json.encode({
            success = false,
            error = "Invalid request data - missing request_id",
            timestamp = os.time()
        })
    end
    
    -- Create inference request
    local request: types.InferenceRequest = {
        request_id = request_data.request_id,
        requester = msg.From,
        provider_id = "",
        service_type = request_data.service_type or "unknown",
        context_data = request_data.context_data or {},
        payment_amount = request_data.payment_amount or "0",
        x_metadata = msg.Tags or {},
        status = "pending",
        created_at = os.time(),
        timeout_at = request_router.calculate_timeout({
            request_id = request_data.request_id,
            service_type = request_data.service_type or "unknown",
            x_metadata = msg.Tags or {}
        } as types.InferenceRequest)
    }
    
    -- Route the request
    local routing_result = request_router.route_request(marketplace_state, request)
    
    if routing_result.success then
        print("✅ Request routed successfully to provider: " .. routing_result.provider_id)
        
        return json.encode({
            success = true,
            request_id = request.request_id,
            provider_id = routing_result.provider_id,
            queue_position = routing_result.queue_position,
            estimated_completion = routing_result.estimated_completion,
            timestamp = os.time()
        })
    else
        print("❌ Request routing failed: " .. routing_result.error_message)
        
        return json.encode({
            success = false,
            error = routing_result.error_message,
            timestamp = os.time()
        })
    end
end

-- Handle provider registration
local function handle_provider_registration(msg): string
    print("👥 Processing provider registration from: " .. msg.From)
    
    local marketplace_state = state_manager.load_state()
    local data = msg.Data
    
    if not data or not data.provider_id then
        return json.encode({
            success = false,
            error = "Invalid provider data - missing provider_id",
            timestamp = os.time()
        })
    end
    
    -- Create provider record
    local provider: types.InferenceProvider = {
        provider_id = data.provider_id,
        capabilities = data.capabilities or {},
        pricing = data.pricing or {},
        reputation = {
            response_time_avg = 5000,
            quality_score = 0.8,
            completion_rate = 0.95,
            total_requests = 0
        },
        metadata = {
            last_seen = os.time(),
            x_tags_supported = data.x_tags_supported or {},
            description = data.description or "AI inference provider"
        },
        status = "active"
    }
    
    -- Save provider
    local success = state_manager.update_provider(marketplace_state, provider)
    
    if success then
        print("✅ Provider registered successfully: " .. provider.provider_id)
        
        return json.encode({
            success = true,
            provider_id = provider.provider_id,
            status = "registered",
            timestamp = os.time()
        })
    else
        print("❌ Provider registration failed")
        
        return json.encode({
            success = false,
            error = "Failed to register provider",
            timestamp = os.time()
        })
    end
end

-- Handle Credit-Notice (payment received)
local function handle_credit_notice(msg): string
    print("💰 Processing credit notice from: " .. msg.From)
    
    local marketplace_state = state_manager.load_state()
    local data = msg.Data
    
    if not data or not data.quantity then
        return json.encode({
            success = false,
            error = "Invalid credit notice - missing quantity",
            timestamp = os.time()
        })
    end
    
    -- Extract request ID from X-metadata
    local request_id = msg.Tags and msg.Tags["X-Request-ID"]
    local service_type = msg.Tags and msg.Tags["X-Service-Type"]
    
    if not request_id then
        return json.encode({
            success = false,
            error = "Invalid credit notice - missing X-Request-ID",
            timestamp = os.time()
        })
    end
    
    -- Create transaction record
    local transaction: types.MarketplaceTransaction = {
        transaction_id = "txn_" .. os.time() .. "_" .. math.random(1000, 9999),
        request_id = request_id,
        from_process = msg.From,
        to_process = "marketplace",
        amount = data.quantity,
        service_type = service_type or "unknown",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = true,
        debit_notice_sent = false
    }
    
    -- Save transaction
    local success = state_manager.add_transaction(marketplace_state, transaction)
    
    if success then
        print("✅ Credit notice processed: " .. transaction.transaction_id)
        
        return json.encode({
            success = true,
            transaction_id = transaction.transaction_id,
            amount = data.quantity,
            timestamp = os.time()
        })
    else
        print("❌ Credit notice processing failed")
        
        return json.encode({
            success = false,
            error = "Failed to process credit notice",
            timestamp = os.time()
        })
    end
end

-- Handle Debit-Notice (payment sent)
local function handle_debit_notice(msg): string
    print("💸 Processing debit notice from: " .. msg.From)
    
    local marketplace_state = state_manager.load_state()
    local data = msg.Data
    
    if not data or not data.quantity then
        return json.encode({
            success = false,
            error = "Invalid debit notice - missing quantity",
            timestamp = os.time()
        })
    end
    
    -- Extract request ID from X-metadata
    local request_id = msg.Tags and msg.Tags["X-Request-ID"]
    local service_type = msg.Tags and msg.Tags["X-Service-Type"]
    
    if not request_id then
        return json.encode({
            success = false,
            error = "Invalid debit notice - missing X-Request-ID",
            timestamp = os.time()
        })
    end
    
    -- Create transaction record
    local transaction: types.MarketplaceTransaction = {
        transaction_id = "txn_" .. os.time() .. "_" .. math.random(1000, 9999),
        request_id = request_id,
        from_process = "marketplace",
        to_process = data.recipient,
        amount = data.quantity,
        service_type = service_type or "unknown",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = false,
        debit_notice_sent = true
    }
    
    -- Save transaction
    local success = state_manager.add_transaction(marketplace_state, transaction)
    
    if success then
        print("✅ Debit notice processed: " .. transaction.transaction_id)
        
        return json.encode({
            success = true,
            transaction_id = transaction.transaction_id,
            amount = data.quantity,
            timestamp = os.time()
        })
    else
        print("❌ Debit notice processing failed")
        
        return json.encode({
            success = false,
            error = "Failed to process debit notice",
            timestamp = os.time()
        })
    end
end

-- Handle request status queries
local function handle_request_status(msg): string
    print("📊 Processing request status query from: " .. msg.From)
    
    local marketplace_state = state_manager.load_state()
    local data = msg.Data
    
    if not data or not data.request_id then
        return json.encode({
            success = false,
            error = "Invalid status query - missing request_id",
            timestamp = os.time()
        })
    end
    
    local request = request_router.get_request_status(marketplace_state, data.request_id)
    
    if request then
        return json.encode({
            success = true,
            request_id = request.request_id,
            status = request.status,
            provider_id = request.provider_id,
            created_at = request.created_at,
            timeout_at = request.timeout_at,
            timestamp = os.time()
        })
    else
        return json.encode({
            success = false,
            error = "Request not found",
            timestamp = os.time()
        })
    end
end

-- Handle health check
local function handle_health_check(msg): string
    local marketplace_state = state_manager.load_state()
    local queue_stats = request_router.get_queue_stats(marketplace_state)
    
    return json.encode({
        success = true,
        health = marketplace_state.process_health,
        queue_stats = queue_stats,
        total_providers = marketplace_state.total_providers,
        total_requests = marketplace_state.total_requests,
        version = PROCESS_VERSION,
        timestamp = os.time()
    })
end

-- Message handler dispatcher
local function handle_message(msg): string
    local action = msg.Action
    local response = ""
    
    print("📨 Received message: " .. action)
    
    if action == "AI-Inference-Request" then
        response = handle_ai_inference_request(msg)
    elseif action == "Provider-Registration" then
        response = handle_provider_registration(msg)
    elseif action == "Credit-Notice" then
        response = handle_credit_notice(msg)
    elseif action == "Debit-Notice" then
        response = handle_debit_notice(msg)
    elseif action == "Request-Status" then
        response = handle_request_status(msg)
    elseif action == "Health-Check" then
        response = handle_health_check(msg)
    else
        response = json.encode({
            success = false,
            error = "Unknown action: " .. action,
            timestamp = os.time()
        })
    end
    
    return response
end

-- AO Process Event Handlers
Handlers.add(
    "cleanup-cycle",
    Handlers.utils.hasMatchingTag("Action", "Cron-Cleanup"),
    function(msg)
        cleanup_cycle()
    end
)

Handlers.add(
    "queue-processing",
    Handlers.utils.hasMatchingTag("Action", "Cron-Queue"),
    function(msg)
        process_queue_cycle()
    end
)

Handlers.add(
    "ai-inference-request",
    Handlers.utils.hasMatchingTag("Action", "AI-Inference-Request"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "provider-registration",
    Handlers.utils.hasMatchingTag("Action", "Provider-Registration"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "credit-notice",
    Handlers.utils.hasMatchingTag("Action", "Credit-Notice"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "debit-notice",
    Handlers.utils.hasMatchingTag("Action", "Debit-Notice"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "request-status",
    Handlers.utils.hasMatchingTag("Action", "Request-Status"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "health-check",
    Handlers.utils.hasMatchingTag("Action", "Health-Check"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

-- Initialize the process
local process_state = initialize_process()

-- Set up periodic tasks
-- Note: In a real AO process, this would use AO's cron functionality

print("✅ Marketplace AO Process initialized successfully!")
print("🔄 Cleanup cycle started (" .. CLEANUP_INTERVAL .. " second intervals)")
print("📋 Queue processing started (" .. QUEUE_PROCESSING_INTERVAL .. " second intervals)")
print("📡 Listening for messages...")

-- Export for testing
return {
    handle_message = handle_message,
    cleanup_cycle = cleanup_cycle,
    process_queue_cycle = process_queue_cycle,
    initialize_process = initialize_process,
    version = PROCESS_VERSION
}