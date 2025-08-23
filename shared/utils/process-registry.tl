-- Process registry utility for tracking active AO processes
local json = require('json')
local ProcessRegistry = {}
-- Constants for configuration
local MAX_ERROR_LOG_SIZE = 100
local MAX_HISTORICAL_PERFORMANCE_ENTRIES = 1000
-- Initialize registry state if not exists
function ProcessRegistry.init(state: any)
    if not state.registry then
        state.registry = {
            processes = {},
            last_updated = 0
        }
    end
end
-- Register a new process in the registry
function ProcessRegistry.register_process(state: any, process_data: any): boolean
    if not process_data.process_id or not process_data.process_type then
        return false
    end
    state.registry.processes[process_data.process_id] = {
        process_id = process_data.process_id,
        process_type = process_data.process_type,
        status = process_data.status or "healthy",
        registered_at = process_data.timestamp or 0,
        last_heartbeat = process_data.timestamp or 0,
        metadata = process_data.metadata or {},
        performance_metrics = {
            message_processing_time = 0,
            message_throughput = 0,
            error_rate = 0,
            successful_requests = 0,
            failed_requests = 0,
            average_response_time = 0
        },
        resource_usage = {
            memory_usage = 0,
            computational_load = 0,
            active_handlers = 0,
            message_queue_size = 0
        },
        error_log = {}
    }
    state.registry.last_updated = process_data.timestamp or 0
    return true
end
-- Update process heartbeat and metrics
function ProcessRegistry.update_heartbeat(state: any, process_id: string, heartbeat_data: any): boolean
    local process = state.registry.processes[process_id]
    if not process then
        return false
    end
    process.last_heartbeat = heartbeat_data.timestamp
    process.status = heartbeat_data.status or process.status
    -- Update performance metrics if provided
    if heartbeat_data.metrics then
        for key, value in pairs(heartbeat_data.metrics) do
            if process.performance_metrics[key] ~= nil then
                process.performance_metrics[key] = value
            end
        end
    end
    -- Update resource usage if provided
    if heartbeat_data.resource_usage then
        for key, value in pairs(heartbeat_data.resource_usage) do
            if process.resource_usage[key] ~= nil then
                process.resource_usage[key] = value
            end
        end
    end
    state.registry.last_updated = heartbeat_data.timestamp
    return true
end
-- Get process information by ID
function ProcessRegistry.get_process(state: any, process_id: string): any
    return state.registry.processes[process_id]
end
-- Get all processes of a specific type
function ProcessRegistry.get_processes_by_type(state: any, process_type: string): {any}
    local processes = {}
    for _, process in pairs(state.registry.processes) do
        if process.process_type == process_type then
            table.insert(processes, process)
        end
    end
    return processes
end
-- Get all processes with a specific status
function ProcessRegistry.get_processes_by_status(state: any, status: string): {any}
    local processes = {}
    for _, process in pairs(state.registry.processes) do
        if process.status == status then
            table.insert(processes, process)
        end
    end
    return processes
end
-- Remove a process from registry
function ProcessRegistry.deregister_process(state: any, process_id: string): boolean
    if state.registry.processes[process_id] then
        state.registry.processes[process_id] = nil
        return true
    end
    return false
end
-- Check for stale processes (no heartbeat within threshold)
function ProcessRegistry.check_stale_processes(state: any, current_timestamp: number, heartbeat_threshold: number): {string}
    local stale_processes = {}
    for process_id, process in pairs(state.registry.processes) do
        local time_since_heartbeat = current_timestamp - process.last_heartbeat
        if time_since_heartbeat > heartbeat_threshold then
            -- Mark as offline and add to stale list
            process.status = "offline"
            table.insert(stale_processes, process_id)
        end
    end
    if #stale_processes > 0 then
        state.registry.last_updated = current_timestamp
    end
    return stale_processes
end
-- Get registry statistics
function ProcessRegistry.get_stats(state: any): any
    local stats = {
        total_processes = 0,
        healthy_processes = 0,
        degraded_processes = 0,
        critical_processes = 0,
        offline_processes = 0,
        process_types = {}
    }
    for _, process in pairs(state.registry.processes) do
        stats.total_processes = stats.total_processes + 1
        -- Count by status
        if process.status == "healthy" then
            stats.healthy_processes = stats.healthy_processes + 1
        elseif process.status == "degraded" then
            stats.degraded_processes = stats.degraded_processes + 1
        elseif process.status == "critical" then
            stats.critical_processes = stats.critical_processes + 1
        elseif process.status == "offline" then
            stats.offline_processes = stats.offline_processes + 1
        end
        -- Count by type
        stats.process_types[process.process_type] = (stats.process_types[process.process_type] or 0) + 1
    end
    return stats
end
-- Get complete registry data for reporting
function ProcessRegistry.get_all_processes(state: any): {any}
    local processes = {}
    for _, process in pairs(state.registry.processes) do
        table.insert(processes, process)
    end
    return processes
end
-- Add error to process error log
function ProcessRegistry.log_error(state: any, process_id: string, error_data: any): boolean
    local process = state.registry.processes[process_id]
    if not process then
        return false
    end
    table.insert(process.error_log, {
        timestamp = error_data.timestamp,
        error_level = error_data.error_level or "ERROR",
        correlation_id = error_data.correlation_id or "",
        error_message = error_data.error_message or "",
        process_context = error_data.process_context or "",
        agent_context = error_data.agent_context or ""
    })
    -- Limit error log size
    if #process.error_log > MAX_ERROR_LOG_SIZE then
        table.remove(process.error_log, 1)
    end
    -- Update error rate
    process.performance_metrics.failed_requests = process.performance_metrics.failed_requests + 1
    return true
end
return ProcessRegistry