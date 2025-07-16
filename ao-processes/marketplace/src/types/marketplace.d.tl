-- Marketplace AO Process Type Definitions
-- Teal type definitions for marketplace state, requests, and provider data

-- Provider reputation metrics
local record ProviderReputation
    response_time_avg: number
    quality_score: number
    completion_rate: number
    total_requests: number
end

-- Provider metadata
local record ProviderMetadata
    last_seen: number
    x_tags_supported: {string}
    description: string
end

-- Provider pricing configuration
local record ProviderPricing
    [string]: string  -- service_type -> tokens per request
end

-- Provider capabilities
local record ProviderCapabilities
    [number]: string  -- array of supported service types
end

-- Inference provider definition
local record InferenceProvider
    provider_id: string
    capabilities: ProviderCapabilities
    pricing: ProviderPricing
    reputation: ProviderReputation
    metadata: ProviderMetadata
    status: string  -- "active" | "inactive" | "suspended"
end

-- X-prefix metadata for requests
local record XMetadata
    [string]: string  -- X-prefixed tags
end

-- Inference request definition
local record InferenceRequest
    request_id: string
    requester: string
    provider_id: string
    service_type: string
    context_data: any
    payment_amount: string
    x_metadata: XMetadata
    status: string  -- "pending" | "processing" | "completed" | "failed"
    created_at: number
    timeout_at: number
end

-- Marketplace transaction record
local record MarketplaceTransaction
    transaction_id: string
    request_id: string
    from_process: string
    to_process: string
    amount: string
    service_type: string
    success: boolean
    timestamp: number
    credit_notice_sent: boolean
    debit_notice_sent: boolean
end

-- Request queue entry
local record QueueEntry
    request: InferenceRequest
    priority: number
    queued_at: number
    retries: number
end

-- Provider registry state
local record ProviderRegistry
    [string]: InferenceProvider  -- provider_id -> provider
end

-- Request queues by priority
local record RequestQueue
    high: {QueueEntry}
    medium: {QueueEntry}
    low: {QueueEntry}
end

-- Active request tracking
local record ActiveRequests
    [string]: InferenceRequest  -- request_id -> request
end

-- Transaction history
local record TransactionHistory
    [string]: MarketplaceTransaction  -- transaction_id -> transaction
end

-- Marketplace state
local record MarketplaceState
    -- Provider management
    providers: ProviderRegistry
    
    -- Request processing
    active_requests: ActiveRequests
    request_queue: RequestQueue
    
    -- Financial tracking
    transactions: TransactionHistory
    
    -- System state
    total_requests: number
    total_providers: number
    last_cleanup: number
    process_health: HealthStatus
end

-- AI Inference Request Message
local record AIInferenceRequestMessage
    Action: string
    Data: {
        request_id: string,
        service_type: string,
        context_data: any,
        payment_amount: string,
        timeout: number
    }
    Tags: {
        ["X-Service-Type"]: string,
        ["X-Request-ID"]: string,
        ["X-Provider-ID"]: string,
        ["X-Context-Data"]: string,
        ["X-Quality-Tier"]: string,
        ["X-Timeout"]: string
    }
    From: string
    Timestamp: number
end

-- Credit Notice Message
local record CreditNoticeMessage
    Action: string
    Data: {
        sender: string,
        quantity: string,
        message: string
    }
    Tags: {
        ["X-Service-Type"]: string,
        ["X-Request-ID"]: string,
        ["X-Provider-ID"]: string,
        [string]: string  -- Additional X-prefixed tags
    }
    From: string
    Timestamp: number
end

-- Debit Notice Message
local record DebitNoticeMessage
    Action: string
    Data: {
        recipient: string,
        quantity: string,
        message: string
    }
    Tags: {
        ["X-Service-Type"]: string,
        ["X-Request-ID"]: string,
        ["X-Provider-ID"]: string,
        [string]: string  -- Additional X-prefixed tags
    }
    From: string
    Timestamp: number
end

-- Provider registration message
local record ProviderRegistrationMessage
    Action: string
    Data: {
        provider_id: string,
        capabilities: {string},
        pricing: {[string]: string},
        description: string
    }
    From: string
    Timestamp: number
end

-- Health check status
local record HealthStatus
    is_healthy: boolean
    last_heartbeat: number
    error_count: number
    uptime: number
    memory_usage: number
end

-- Process state for persistence
local record ProcessState
    marketplace: MarketplaceState
    health: HealthStatus
    version: string
    last_backup: number
end

-- Provider matching result
local record ProviderMatchResult
    provider_id: string
    match_score: number
    available: boolean
    estimated_cost: string
    estimated_time: number
end

-- Request routing result
local record RoutingResult
    success: boolean
    provider_id: string
    queue_position: number
    estimated_completion: number
    error_message: string
end

return {
    ProviderReputation = ProviderReputation,
    ProviderMetadata = ProviderMetadata,
    ProviderPricing = ProviderPricing,
    ProviderCapabilities = ProviderCapabilities,
    InferenceProvider = InferenceProvider,
    XMetadata = XMetadata,
    InferenceRequest = InferenceRequest,
    MarketplaceTransaction = MarketplaceTransaction,
    QueueEntry = QueueEntry,
    ProviderRegistry = ProviderRegistry,
    RequestQueue = RequestQueue,
    ActiveRequests = ActiveRequests,
    TransactionHistory = TransactionHistory,
    MarketplaceState = MarketplaceState,
    AIInferenceRequestMessage = AIInferenceRequestMessage,
    CreditNoticeMessage = CreditNoticeMessage,
    DebitNoticeMessage = DebitNoticeMessage,
    ProviderRegistrationMessage = ProviderRegistrationMessage,
    HealthStatus = HealthStatus,
    ProcessState = ProcessState,
    ProviderMatchResult = ProviderMatchResult,
    RoutingResult = RoutingResult
}