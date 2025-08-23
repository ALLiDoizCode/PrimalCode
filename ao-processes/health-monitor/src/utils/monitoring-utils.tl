-- Monitoring utilities for health check operations
-- Note: In AO processes, json is available globally, using json directly
local health_types = require('shared.types.health')
local MonitoringUtils = {}
-- Generate correlation IDs for tracking requests
function MonitoringUtils.generate_correlation_id(process_id: string, timestamp: number, operation_type: string): string
    return process_id .. "_" .. timestamp .. "_" .. operation_type
end
-- ADP message structure type
local record ADPMessage
    Tags: {string: string}
    Data: string
    Target: string
    Action: string
end
-- Validation result type
local record ValidationResult
    is_valid: boolean
    errors: {string}
    warnings: {string}
end
-- Validate ADP message compliance for health monitoring
function MonitoringUtils.validate_health_message(msg: ADPMessage): ValidationResult
    local validation_result = {
        is_valid = true,
        errors = {},
        warnings = {}
    }
    -- Check required tags
    local required_tags = {"Action"}
    for _, tag in ipairs(required_tags) do
        if not msg.Tags[tag] then
            validation_result.is_valid = false
            table.insert(validation_result.errors, "Missing required tag: " .. tag)
        end
    end
    -- Validate specific health monitoring actions
    local action = msg.Tags.Action
    if action == "Health-Check" then
        if not msg.Tags["Monitor-Id"] then
            table.insert(validation_result.warnings, "Health check missing Monitor-Id tag")
        end
        if not msg.Tags["Check-Timestamp"] then
            table.insert(validation_result.warnings, "Health check missing Check-Timestamp tag")
        end
    elseif action == "Health-Response" then
        if not msg.Data then
            table.insert(validation_result.errors, "Health response missing data payload")
            validation_result.is_valid = false
        end
    end
    -- Validate correlation ID format for trackable messages
    if msg.Tags["Correlation-Id"] then
        local correlation_id = msg.Tags["Correlation-Id"]
        if not correlation_id:match("^[%w_]+_[%d]+_[%w_]+$") then
            table.insert(validation_result.warnings, "Correlation ID format may not be optimal for tracking")
        end
    end
    return validation_result
end
-- Calculate response time between request and response
function MonitoringUtils.calculate_response_time(request_timestamp: number, response_timestamp: number): number
    return response_timestamp - request_timestamp
end
-- Health status mapping type
local enum HealthStatus
    "healthy"
    "degraded"
    "critical"
    "offline"
    "unknown"
end
-- Format health status for reporting
function MonitoringUtils.format_health_status(status: string): string
    local status_map = {
        healthy = "✅ Healthy",
        degraded = "⚠️ Degraded",
        critical = "❌ Critical",
        offline = "🔴 Offline",
        unknown = "❓ Unknown"
    }
    return status_map[status as HealthStatus] or ("❓ " .. status)
end
-- Health check request message type
local record HealthCheckRequestMessage
    Target: string
    Action: string
    Data: string
end
-- Create standardized health check request message
function MonitoringUtils.create_health_check_request(target_process_id: string, monitor_id: string, timestamp: number): any
    local correlation_id = MonitoringUtils.generate_correlation_id(target_process_id, timestamp, "hc")
    return {
        Target = target_process_id,
        Action = "Health-Check",
        ["Monitor-Id"] = monitor_id,
        ["Correlation-Id"] = correlation_id,
        ["Check-Timestamp"] = tostring(timestamp),
        Data = json.encode({
            monitor_id = monitor_id,
            correlation_id = correlation_id,
            timestamp = timestamp,
            check_type = "comprehensive",
            requested_metrics = {
                "status",
                "uptime",
                "performance_metrics",
                "resource_usage",
                "handler_status"
            }
        })
    }
end
-- Create standardized health check response message
function MonitoringUtils.create_health_check_response(target_address: string, process_data: any, correlation_id: string): any
    return {
        Target = target_address,
        Action = "Health-Response",
        ["Correlation-Id"] = correlation_id,
        ["Process-Type"] = process_data.process_type or "unknown",
        Data = json.encode({
            process_id = process_data.process_id,
            process_type = process_data.process_type,
            status = process_data.status or "healthy",
            timestamp = os.time(),
            uptime = process_data.uptime or 0,
            performance_metrics = process_data.performance_metrics or {},
            resource_usage = process_data.resource_usage or {},
            handler_status = process_data.handler_status or {}
        })
    }
end
-- Create standardized heartbeat message
function MonitoringUtils.create_heartbeat_message(monitor_id: string, process_data: any): any
    return {
        Target = monitor_id,
        Action = "Process-Heartbeat",
        ["Process-Id"] = process_data.process_id,
        ["Process-Type"] = process_data.process_type,
        Data = json.encode({
            process_id = process_data.process_id,
            process_type = process_data.process_type,
            status = process_data.status or "healthy",
            timestamp = os.time(),
            metrics = process_data.performance_metrics or {},
            resource_usage = process_data.resource_usage or {}
        })
    }
end
-- Parse result type
local record ParseResult
    success: boolean
    data: {string: any}
    errors: {string}
end
-- Parse and validate health check response data
function MonitoringUtils.parse_health_response(msg: ADPMessage): ParseResult
    local result = {
        success = false,
        data = {},
        errors = {}
    }
    -- Validate message structure
    if not msg.Data then
        table.insert(result.errors, "Health response missing data payload")
        return result
    end
    -- Parse JSON data
    local success, parsed_data = pcall(json.decode, msg.Data)
    if not success then
        table.insert(result.errors, "Invalid JSON in health response data: " .. tostring(parsed_data))
        return result
    end
    -- Validate required fields
    local required_fields = {"process_id", "status", "timestamp"}
    for _, field in ipairs(required_fields) do
        if not parsed_data[field] then
            table.insert(result.errors, "Missing required field: " .. field)
        end
    end
    if #result.errors == 0 then
        result.success = true
        result.data = parsed_data
    end
    return result
end
-- Check if a process should be considered stale based on last heartbeat
function MonitoringUtils.is_process_stale(last_heartbeat: number, current_time: number, threshold: number): boolean
    local time_since_heartbeat = current_time - last_heartbeat
    return time_since_heartbeat > (threshold or 300) -- Default 5 minutes
end
-- Calculate health score based on multiple factors
function MonitoringUtils.calculate_health_score(process_data: any): number
    local score = 100 -- Start with perfect score
    -- Deduct points for status
    if process_data.status == "degraded" then
        score = score - 20
    elseif process_data.status == "critical" then
        score = score - 50
    elseif process_data.status == "offline" then
        score = 0
    end
    -- Deduct points for consecutive failures (if available in extended data)
    local extended_data = process_data as {string: any}
    if extended_data.consecutive_failures then
        score = score - (extended_data.consecutive_failures as number * 5)
    end
    -- Deduct points for high error rate
    if process_data.performance_metrics and process_data.performance_metrics.error_rate then
        local error_rate = process_data.performance_metrics.error_rate
        if error_rate > 0.1 then -- > 10% error rate
            score = score - (error_rate * 100)
        end
    end
    -- Deduct points for high response time
    if process_data.performance_metrics and process_data.performance_metrics.average_response_time then
        local avg_response_time = process_data.performance_metrics.average_response_time
        if avg_response_time > 2000 then -- > 2 seconds (above NFR threshold)
            score = score - 15
        end
    end
    -- Deduct points for recent errors
    if process_data.error_log and #process_data.error_log > 0 then
        local recent_errors = 0
        local current_time = os.time()
        for _, error in ipairs(process_data.error_log) do
            if (current_time - error.timestamp) <= 300 then -- Last 5 minutes
                recent_errors = recent_errors + 1
            end
        end
        score = score - (recent_errors * 2)
    end
    -- Ensure score doesn't go below 0
    return math.max(0, score)
end
-- Create comprehensive status report
function MonitoringUtils.create_status_report(monitor_state: any): any
    local current_time = os.time()
    local report = {
        generated_at = current_time,
        monitor_id = monitor_state.process_id,
        system_uptime = monitor_state.metrics.uptime_start and
            (current_time - monitor_state.metrics.uptime_start) or 0,
        total_processes = 0,
        processes_by_status = {
            healthy = 0,
            degraded = 0,
            critical = 0,
            offline = 0
        },
        processes_by_type = {},
        overall_health_score = 0,
        monitoring_statistics = {
            total_health_checks = monitor_state.metrics.total_checks or 0,
            failed_health_checks = monitor_state.metrics.failed_checks or 0,
            active_monitoring_jobs = 0
        },
        recent_issues = {}
    }
    -- Process all registered processes
    local total_health_score = 0
    local processes = monitor_state.registry and monitor_state.registry.processes or {}
    for process_id, process_data in pairs(processes) do
        report.total_processes = report.total_processes + 1
        -- Count by status
        local status = process_data.status or "unknown"
        if report.processes_by_status[status] then
            report.processes_by_status[status] = report.processes_by_status[status] + 1
        end
        -- Count by type
        local process_type = process_data.process_type or "unknown"
        report.processes_by_type[process_type] = (report.processes_by_type[process_type] or 0) + 1
        -- Calculate health score
        local health_score = MonitoringUtils.calculate_health_score(process_data)
        total_health_score = total_health_score + health_score
        -- Track recent issues
        if status ~= "healthy" or health_score < 80 then
            local extended_data = process_data as {string: any}
            table.insert(report.recent_issues, {
                process_id = process_id,
                process_type = process_type,
                status = status,
                health_score = health_score,
                consecutive_failures = extended_data.consecutive_failures as number or 0,
                last_heartbeat = process_data.last_heartbeat
            })
        end
    end
    -- Calculate overall health score
    if report.total_processes > 0 then
        report.overall_health_score = total_health_score / report.total_processes
    end
    -- Count active monitoring jobs
    if monitor_state.metrics_collection and monitor_state.metrics_collection.active_collection_jobs then
        report.monitoring_statistics.active_monitoring_jobs =
            MonitoringUtils.table_length(monitor_state.metrics_collection.active_collection_jobs)
    end
    return report
end
-- Utility function to get table length
function MonitoringUtils.table_length(t: {any: any}): number
    local count = 0
    for _ in pairs(t) do count = count + 1 end
    return count
end
-- Utility function to deep copy a table
function MonitoringUtils.deep_copy(orig: any): any
    local orig_type = type(orig)
    local copy: any
    if orig_type == 'table' then
        copy = {}
        local orig_table = orig as {any: any}
        for orig_key, orig_value in pairs(orig_table) do
            copy[MonitoringUtils.deep_copy(orig_key)] = MonitoringUtils.deep_copy(orig_value)
        end
        -- Note: setmetatable not available in all AO environments, commenting out
        -- setmetatable(copy, MonitoringUtils.deep_copy(getmetatable(orig)))
    else
        copy = orig
    end
    return copy
end
return MonitoringUtils