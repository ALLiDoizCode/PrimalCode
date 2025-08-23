-- Health check handler for monitoring AO processes
local json = require('json')
local HealthCheck = {}
-- Perform comprehensive health check on a process
function HealthCheck.perform_check(process_id: string, monitor_state: any, timestamp: number): any
    local process_data = monitor_state.registry.processes[process_id]
    if not process_data then
        return {
            success = false,
            error = "Process not found in registry"
        }
    end
    -- Generate correlation ID for this health check
    local correlation_id = process_id .. "_" .. timestamp .. "_hc"
    -- Update check statistics
    monitor_state.metrics.total_checks = monitor_state.metrics.total_checks + 1
    process_data.last_check_timestamp = timestamp
    -- Send health check message with ADP compliance
    local health_check_msg = {
        Target = process_id,
        Action = "Health-Check",
        ["Monitor-Id"] = monitor_state.process_id,
        ["Correlation-Id"] = correlation_id,
        ["Check-Timestamp"] = tostring(timestamp),
        Data = json.encode({
            monitor_id = monitor_state.process_id,
            correlation_id = correlation_id,
            timestamp = timestamp,
            check_type = "comprehensive",
            requested_metrics = {
                "performance",
                "resource_usage",
                "handler_status",
                "error_log"
            }
        })
    }
    ao.send(health_check_msg)
    return {
        success = true,
        correlation_id = correlation_id,
        process_id = process_id,
        timestamp = timestamp
    }
end
-- Process health check response and update registry
function HealthCheck.process_response(msg: any, monitor_state: any): any
    local process_id = msg.From
    local correlation_id = msg.Tags["Correlation-Id"]
    -- Validate ADP compliance
    if not correlation_id then
        return {
            success = false,
            error = "Missing correlation ID in health check response"
        }
    end
    local response_data = {}
    if msg.Data then
        local success, parsed = pcall(json.decode, msg.Data)
        if success then
            response_data = parsed
        end
    end
    -- Update process in registry
    local process_data = monitor_state.registry.processes[process_id]
    if process_data then
        -- Update basic status
        process_data.last_heartbeat = msg.Timestamp
        process_data.status = response_data.status or "healthy"
        process_data.last_response_timestamp = msg.Timestamp
        -- Reset consecutive failures on successful response
        process_data.consecutive_failures = 0
        -- Update performance metrics if provided
        if response_data.performance_metrics then
            for key, value in pairs(response_data.performance_metrics) do
                if process_data.performance_metrics[key] ~= nil then
                    process_data.performance_metrics[key] = value
                end
            end
        end
        -- Update resource usage if provided
        if response_data.resource_usage then
            for key, value in pairs(response_data.resource_usage) do
                if process_data.resource_usage[key] ~= nil then
                    process_data.resource_usage[key] = value
                end
            end
        end
        -- Update handler status if provided
        if response_data.handler_status then
            process_data.handler_status = response_data.handler_status
        end
        -- Add to health history
        table.insert(monitor_state.health_history, {
            process_id = process_id,
            timestamp = msg.Timestamp,
            correlation_id = correlation_id,
            status = response_data.status or "healthy",
            response_time = msg.Timestamp - (response_data.check_timestamp or msg.Timestamp),
            performance_metrics = response_data.performance_metrics,
            resource_usage = response_data.resource_usage
        })
        -- Limit history size
        if #monitor_state.health_history > 1000 then
            table.remove(monitor_state.health_history, 1)
        end
    end
    return {
        success = true,
        process_id = process_id,
        correlation_id = correlation_id,
        status = response_data.status or "healthy"
    }
end
-- Handle health check timeout (no response received)
function HealthCheck.handle_timeout(process_id: string, monitor_state: any, timestamp: number): any
    local process_data = monitor_state.registry.processes[process_id]
    if not process_data then
        return {
            success = false,
            error = "Process not found in registry"
        }
    end
    -- Increment consecutive failures
    process_data.consecutive_failures = process_data.consecutive_failures + 1
    -- Update metrics
    monitor_state.metrics.failed_checks = monitor_state.metrics.failed_checks + 1
    -- Determine status based on consecutive failures
    local new_status = "degraded"
    if process_data.consecutive_failures >= 3 then
        new_status = "critical"
    elseif process_data.consecutive_failures >= 5 then
        new_status = "offline"
    end
    process_data.status = new_status
    process_data.last_failure_timestamp = timestamp
    -- Log the timeout error
    table.insert(process_data.error_log, {
        timestamp = timestamp,
        error_level = "ERROR",
        correlation_id = process_id .. "_" .. timestamp .. "_timeout",
        error_message = "Health check timeout - no response received",
        process_context = "health_check_timeout",
        agent_context = "monitor_" .. monitor_state.process_id
    })
    -- Add to health history
    table.insert(monitor_state.health_history, {
        process_id = process_id,
        timestamp = timestamp,
        status = new_status,
        error = "health_check_timeout",
        consecutive_failures = process_data.consecutive_failures
    })
    return {
        success = true,
        process_id = process_id,
        status = new_status,
        consecutive_failures = process_data.consecutive_failures
    }
end
-- Get health status for a specific process
function HealthCheck.get_process_health(process_id: string, monitor_state: any): any
    local process_data = monitor_state.registry.processes[process_id]
    if not process_data then
        return {
            success = false,
            error = "Process not found in registry"
        }
    end
    return {
        success = true,
        process_id = process_id,
        process_type = process_data.process_type,
        status = process_data.status,
        last_heartbeat = process_data.last_heartbeat,
        consecutive_failures = process_data.consecutive_failures,
        performance_metrics = process_data.performance_metrics,
        resource_usage = process_data.resource_usage,
        handler_status = process_data.handler_status or {},
        recent_errors = #process_data.error_log
    }
end
-- Get overall system health status
function HealthCheck.get_system_health(monitor_state: any): any
    local stats = {
        total_processes = 0,
        healthy_processes = 0,
        degraded_processes = 0,
        critical_processes = 0,
        offline_processes = 0
    }
    for _, process in pairs(monitor_state.registry.processes) do
        stats.total_processes = stats.total_processes + 1
        if process.status == "healthy" then
            stats.healthy_processes = stats.healthy_processes + 1
        elseif process.status == "degraded" then
            stats.degraded_processes = stats.degraded_processes + 1
        elseif process.status == "critical" then
            stats.critical_processes = stats.critical_processes + 1
        elseif process.status == "offline" then
            stats.offline_processes = stats.offline_processes + 1
        end
    end
    -- Determine overall system status
    local overall_status = "healthy"
    if stats.critical_processes > 0 or stats.offline_processes > 0 then
        overall_status = "critical"
    elseif stats.degraded_processes > 0 then
        overall_status = "degraded"
    end
    return {
        monitor_id = monitor_state.process_id,
        overall_status = overall_status,
        system_uptime = monitor_state.metrics.uptime_start and
            (os.time() - monitor_state.metrics.uptime_start) or 0,
        total_checks_performed = monitor_state.metrics.total_checks,
        failed_checks = monitor_state.metrics.failed_checks,
        process_statistics = stats,
        last_updated = monitor_state.registry.last_updated
    }
end
return HealthCheck