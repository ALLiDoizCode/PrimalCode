-- Error logging handler for centralized error tracking
local json = require('json')
local ErrorLogging = {}
-- Initialize error logging system
function ErrorLogging.init(monitor_state: any): any
    if not monitor_state.error_logging then
        monitor_state.error_logging = {
            centralized_errors = {},
            error_statistics = {
                total_errors = 0,
                errors_by_level = {
                    ERROR = 0,
                    WARN = 0,
                    INFO = 0,
                    DEBUG = 0
                },
                errors_by_process_type = {},
                errors_by_hour = {}
            },
            error_patterns = {},
            circuit_breaker_status = {}
        }
    end
    return {
        success = true,
        message = "Error logging system initialized"
    }
end
-- Log error from a process
function ErrorLogging.log_error(process_id: string, error_data: any, monitor_state: any): any
    if not error_data then
        return {
            success = false,
            error = "Error data is required"
        }
    end
    -- Generate correlation ID if not provided
    local correlation_id = error_data.correlation_id or
        (process_id .. "_" .. (error_data.timestamp or os.time()) .. "_err")
    -- Create standardized error entry
    local error_entry = {
        timestamp = error_data.timestamp or os.time(),
        process_id = process_id,
        correlation_id = correlation_id,
        error_level = error_data.error_level or "ERROR",
        error_message = error_data.error_message or "Unknown error",
        process_context = error_data.process_context or "",
        agent_context = error_data.agent_context or "",
        error_code = error_data.error_code,
        stack_trace = error_data.stack_trace,
        additional_data = error_data.additional_data
    }
    -- Add to centralized error log
    table.insert(monitor_state.error_logging.centralized_errors, error_entry)
    -- Update error statistics
    monitor_state.error_logging.error_statistics.total_errors =
        monitor_state.error_logging.error_statistics.total_errors + 1
    -- Update error level statistics
    local level = error_entry.error_level
    if monitor_state.error_logging.error_statistics.errors_by_level[level] then
        monitor_state.error_logging.error_statistics.errors_by_level[level] =
            monitor_state.error_logging.error_statistics.errors_by_level[level] + 1
    else
        monitor_state.error_logging.error_statistics.errors_by_level[level] = 1
    end
    -- Update process type statistics
    local process_data = monitor_state.registry.processes[process_id]
    if process_data then
        local process_type = process_data.process_type
        if not monitor_state.error_logging.error_statistics.errors_by_process_type[process_type] then
            monitor_state.error_logging.error_statistics.errors_by_process_type[process_type] = 0
        end
        monitor_state.error_logging.error_statistics.errors_by_process_type[process_type] =
            monitor_state.error_logging.error_statistics.errors_by_process_type[process_type] + 1
    end
    -- Update hourly statistics
    local hour_key = os.date("%Y-%m-%d-%H", error_entry.timestamp)
    if not monitor_state.error_logging.error_statistics.errors_by_hour[hour_key] then
        monitor_state.error_logging.error_statistics.errors_by_hour[hour_key] = 0
    end
    monitor_state.error_logging.error_statistics.errors_by_hour[hour_key] =
        monitor_state.error_logging.error_statistics.errors_by_hour[hour_key] + 1
    -- Add to process-specific error log in registry
    if process_data then
        table.insert(process_data.error_log, error_entry)
        -- Update process error rate
        process_data.performance_metrics.failed_requests =
            process_data.performance_metrics.failed_requests + 1
        -- Limit process error log size
        if #process_data.error_log > 100 then
            table.remove(process_data.error_log, 1)
        end
    end
    -- Check for error patterns and circuit breaker conditions
    ErrorLogging.analyze_error_patterns(process_id, error_entry, monitor_state)
    -- Limit centralized error log size
    if #monitor_state.error_logging.centralized_errors > 5000 then
        table.remove(monitor_state.error_logging.centralized_errors, 1)
    end
    return {
        success = true,
        correlation_id = correlation_id,
        error_logged = true
    }
end
-- Analyze error patterns for circuit breaker and alerting
function ErrorLogging.analyze_error_patterns(process_id: string, error_entry: any, monitor_state: any): any
    local current_time = error_entry.timestamp
    local time_window = 300 -- 5 minutes
    local error_threshold = 10 -- errors per time window
    -- Count recent errors for this process
    local recent_errors = 0
    for _, error in ipairs(monitor_state.error_logging.centralized_errors) do
        if error.process_id == process_id and
           (current_time - error.timestamp) <= time_window then
            recent_errors = recent_errors + 1
        end
    end
    -- Check if circuit breaker should be triggered
    local circuit_breaker = monitor_state.error_logging.circuit_breaker_status[process_id]
    if not circuit_breaker then
        circuit_breaker = {
            status = "closed", -- closed, open, half_open
            failure_count = 0,
            last_failure_time = 0,
            next_retry_time = 0
        }
        monitor_state.error_logging.circuit_breaker_status[process_id] = circuit_breaker
    end
    -- Update circuit breaker based on error patterns
    if recent_errors >= error_threshold then
        if circuit_breaker.status == "closed" then
            circuit_breaker.status = "open"
            circuit_breaker.failure_count = recent_errors
            circuit_breaker.last_failure_time = current_time
            circuit_breaker.next_retry_time = current_time + 60 -- Retry after 1 minute
            -- Update process status to critical
            local process_data = monitor_state.registry.processes[process_id]
            if process_data then
                process_data.status = "critical"
            end
            -- Log circuit breaker activation
            table.insert(monitor_state.error_logging.centralized_errors, {
                timestamp = current_time,
                process_id = process_id,
                correlation_id = process_id .. "_" .. current_time .. "_cb",
                error_level = "WARN",
                error_message = "Circuit breaker opened due to high error rate",
                process_context = "circuit_breaker",
                agent_context = "health_monitor",
                additional_data = {
                    recent_errors = recent_errors,
                    time_window = time_window,
                    threshold = error_threshold
                }
            })
        end
    end
    -- Check for specific error patterns
    local error_message = error_entry.error_message:lower()
    local patterns = monitor_state.error_logging.error_patterns
    -- Common error patterns to track
    local pattern_checks = {
        timeout = error_message:find("timeout") ~= nil,
        connection = error_message:find("connection") ~= nil or error_message:find("network") ~= nil,
        memory = error_message:find("memory") ~= nil or error_message:find("out of memory") ~= nil,
        validation = error_message:find("validation") ~= nil or error_message:find("invalid") ~= nil
    }
    for pattern_name, found in pairs(pattern_checks) do
        if found then
            if not patterns[pattern_name] then
                patterns[pattern_name] = {
                    count = 0,
                    recent_occurrences = {},
                    affected_processes = {}
                }
            end
            patterns[pattern_name].count = patterns[pattern_name].count + 1
            table.insert(patterns[pattern_name].recent_occurrences, {
                timestamp = current_time,
                process_id = process_id,
                correlation_id = error_entry.correlation_id
            })
            -- Track affected processes
            if not patterns[pattern_name].affected_processes[process_id] then
                patterns[pattern_name].affected_processes[process_id] = 0
            end
            patterns[pattern_name].affected_processes[process_id] =
                patterns[pattern_name].affected_processes[process_id] + 1
            -- Limit recent occurrences tracking
            if #patterns[pattern_name].recent_occurrences > 100 then
                table.remove(patterns[pattern_name].recent_occurrences, 1)
            end
        end
    end
    return {
        recent_errors = recent_errors,
        circuit_breaker_status = circuit_breaker.status,
        patterns_detected = pattern_checks
    }
end
-- Get error statistics and reports
function ErrorLogging.get_error_report(monitor_state: any, time_range: number): any
    local current_time = os.time()
    local cutoff_time = current_time - (time_range or 3600) -- Default 1 hour
    -- Filter errors by time range
    local recent_errors = {}
    local error_count_by_level = {
        ERROR = 0,
        WARN = 0,
        INFO = 0,
        DEBUG = 0
    }
    local error_count_by_process = {}
    for _, error_entry in ipairs(monitor_state.error_logging.centralized_errors) do
        if error_entry.timestamp >= cutoff_time then
            table.insert(recent_errors, error_entry)
            -- Count by level
            local level = error_entry.error_level
            if error_count_by_level[level] then
                error_count_by_level[level] = error_count_by_level[level] + 1
            end
            -- Count by process
            if not error_count_by_process[error_entry.process_id] then
                error_count_by_process[error_entry.process_id] = 0
            end
            error_count_by_process[error_entry.process_id] =
                error_count_by_process[error_entry.process_id] + 1
        end
    end
    -- Get circuit breaker status summary
    local circuit_breaker_summary = {}
    for process_id, cb_status in pairs(monitor_state.error_logging.circuit_breaker_status) do
        if cb_status.status ~= "closed" then
            circuit_breaker_summary[process_id] = {
                status = cb_status.status,
                failure_count = cb_status.failure_count,
                last_failure_time = cb_status.last_failure_time
            }
        end
    end
    return {
        report_generated_at = current_time,
        time_range_seconds = time_range or 3600,
        total_errors_in_range = #recent_errors,
        error_count_by_level = error_count_by_level,
        error_count_by_process = error_count_by_process,
        error_patterns = monitor_state.error_logging.error_patterns,
        circuit_breaker_summary = circuit_breaker_summary,
        overall_statistics = monitor_state.error_logging.error_statistics,
        recent_errors = recent_errors
    }
end
-- Get errors for a specific process
function ErrorLogging.get_process_errors(process_id: string, monitor_state: any, limit: number): any
    local process_errors = {}
    local count = 0
    local max_errors = limit or 50
    -- Get errors from centralized log (most recent first)
    for i = #monitor_state.error_logging.centralized_errors, 1, -1 do
        local error_entry = monitor_state.error_logging.centralized_errors[i]
        if error_entry.process_id == process_id then
            table.insert(process_errors, error_entry)
            count = count + 1
            if count >= max_errors then
                break
            end
        end
    end
    return {
        process_id = process_id,
        error_count = count,
        errors = process_errors,
        circuit_breaker_status = monitor_state.error_logging.circuit_breaker_status[process_id]
    }
end
return ErrorLogging