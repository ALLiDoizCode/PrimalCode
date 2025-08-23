-- Health monitoring data types for AO processes
local record ProcessHealth
    process_id: string
    process_type: string
    status: ProcessStatus
    last_heartbeat: number
    performance_metrics: PerformanceMetrics
    resource_usage: ResourceUsage
    error_log: {ErrorEntry}
end
local enum ProcessStatus
    "healthy"
    "degraded"
    "critical"
    "offline"
end
local record PerformanceMetrics
    message_processing_time: number
    message_throughput: number
    error_rate: number
    successful_requests: number
    failed_requests: number
    average_response_time: number
end
local record ResourceUsage
    memory_usage: number
    computational_load: number
    active_handlers: number
    message_queue_size: number
end
local record ErrorEntry
    timestamp: number
    error_level: string
    correlation_id: string
    error_message: string
    process_context: string
    agent_context: string
end
local record HeartbeatData
    process_id: string
    process_type: string
    timestamp: number
    status: ProcessStatus
    metrics: PerformanceMetrics
    resource_usage: ResourceUsage
end
local record HealthCheckRequest
    target_process: string
    check_timestamp: number
    monitor_id: string
    correlation_id: string
end
local record HealthCheckResponse
    process_id: string
    process_type: string
    status: ProcessStatus
    timestamp: number
    uptime: number
    performance_metrics: PerformanceMetrics
    resource_usage: ResourceUsage
    handler_status: {HandlerStatus}
end
local record HandlerStatus
    handler_name: string
    is_available: boolean
    last_executed: number
    execution_count: number
    average_execution_time: number
end
local record SystemStatus
    monitor_id: string
    system_uptime: number
    total_processes: number
    healthy_processes: number
    degraded_processes: number
    critical_processes: number
    offline_processes: number
    overall_status: ProcessStatus
    last_updated: number
end
return {
    ProcessHealth = ProcessHealth,
    ProcessStatus = ProcessStatus,
    PerformanceMetrics = PerformanceMetrics,
    ResourceUsage = ResourceUsage,
    ErrorEntry = ErrorEntry,
    HeartbeatData = HeartbeatData,
    HealthCheckRequest = HealthCheckRequest,
    HealthCheckResponse = HealthCheckResponse,
    HandlerStatus = HandlerStatus,
    SystemStatus = SystemStatus
}