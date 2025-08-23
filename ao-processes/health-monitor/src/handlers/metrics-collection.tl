-- Metrics collection handler for performance monitoring
local json = require('json')
local MetricsCollection = {}
-- Initialize metrics collection system
function MetricsCollection.init(monitor_state: any): any
    if not monitor_state.metrics_collection then
        monitor_state.metrics_collection = {
            collection_intervals = {
                performance = 30, -- seconds
                resource_usage = 60, -- seconds
                system_overview = 120 -- seconds
            },
            historical_data = {
                performance_metrics = {},
                resource_metrics = {},
                system_metrics = {}
            },
            active_collection_jobs = {},
            last_collection_timestamp = 0
        }
    end
    return {
        success = true,
        message = "Metrics collection system initialized"
    }
end
-- Collect performance metrics from a specific process
function MetricsCollection.collect_performance_metrics(process_id: string, monitor_state: any, timestamp: number): any
    local process_data = monitor_state.registry.processes[process_id]
    if not process_data then
        return {
            success = false,
            error = "Process not found in registry"
        }
    end
    -- Generate correlation ID for metrics collection
    local correlation_id = process_id .. "_" .. timestamp .. "_metrics"
    -- Send metrics collection request
    local metrics_request = {
        Target = process_id,
        Action = "Collect-Metrics",
        ["Monitor-Id"] = monitor_state.process_id,
        ["Correlation-Id"] = correlation_id,
        ["Collection-Timestamp"] = tostring(timestamp),
        Data = json.encode({
            metrics_types = {
                "message_processing_time",
                "message_throughput",
                "error_rate",
                "successful_requests",
                "failed_requests",
                "average_response_time"
            },
            collection_period = monitor_state.metrics_collection.collection_intervals.performance
        })
    }
    ao.send(metrics_request)
    -- Track collection request
    monitor_state.metrics_collection.active_collection_jobs[correlation_id] = {
        process_id = process_id,
        collection_type = "performance",
        requested_at = timestamp,
        status = "pending"
    }
    return {
        success = true,
        correlation_id = correlation_id,
        process_id = process_id
    }
end
-- Process metrics collection response
function MetricsCollection.process_metrics_response(msg: any, monitor_state: any): any
    local process_id = msg.From
    local correlation_id = msg.Tags["Correlation-Id"]
    if not correlation_id then
        return {
            success = false,
            error = "Missing correlation ID in metrics response"
        }
    end
    -- Find and update collection job
    local job = monitor_state.metrics_collection.active_collection_jobs[correlation_id]
    if not job then
        return {
            success = false,
            error = "Unknown metrics collection job"
        }
    end
    job.status = "completed"
    job.completed_at = msg.Timestamp
    -- Parse metrics data
    local metrics_data = {}
    if msg.Data then
        local success, parsed = pcall(json.decode, msg.Data)
        if success then
            metrics_data = parsed
        end
    end
    -- Update process metrics in registry
    local process_data = monitor_state.registry.processes[process_id]
    if process_data and metrics_data.performance_metrics then
        -- Calculate response time
        local response_time = msg.Timestamp - job.requested_at
        -- Update performance metrics
        for key, value in pairs(metrics_data.performance_metrics) do
            if process_data.performance_metrics[key] ~= nil then
                process_data.performance_metrics[key] = value
            end
        end
        -- Store historical performance data
        local historical_entry = {
            timestamp = msg.Timestamp,
            process_id = process_id,
            process_type = process_data.process_type,
            metrics = metrics_data.performance_metrics,
            collection_response_time = response_time
        }
        table.insert(monitor_state.metrics_collection.historical_data.performance_metrics, historical_entry)
        -- Limit historical data size (keep last 1000 entries)
        if #monitor_state.metrics_collection.historical_data.performance_metrics > 1000 then
            table.remove(monitor_state.metrics_collection.historical_data.performance_metrics, 1)
        end
    end
    -- Clean up completed job
    monitor_state.metrics_collection.active_collection_jobs[correlation_id] = nil
    return {
        success = true,
        process_id = process_id,
        correlation_id = correlation_id,
        metrics_collected = metrics_data.performance_metrics and true or false
    }
end
-- Collect resource usage metrics from a specific process
function MetricsCollection.collect_resource_metrics(process_id: string, monitor_state: any, timestamp: number): any
    local process_data = monitor_state.registry.processes[process_id]
    if not process_data then
        return {
            success = false,
            error = "Process not found in registry"
        }
    end
    -- Generate correlation ID for resource collection
    local correlation_id = process_id .. "_" .. timestamp .. "_resources"
    -- Send resource usage collection request
    local resource_request = {
        Target = process_id,
        Action = "Collect-Resources",
        ["Monitor-Id"] = monitor_state.process_id,
        ["Correlation-Id"] = correlation_id,
        ["Collection-Timestamp"] = tostring(timestamp),
        Data = json.encode({
            resource_types = {
                "memory_usage",
                "computational_load",
                "active_handlers",
                "message_queue_size"
            },
            collection_period = monitor_state.metrics_collection.collection_intervals.resource_usage
        })
    }
    ao.send(resource_request)
    -- Track collection request
    monitor_state.metrics_collection.active_collection_jobs[correlation_id] = {
        process_id = process_id,
        collection_type = "resource_usage",
        requested_at = timestamp,
        status = "pending"
    }
    return {
        success = true,
        correlation_id = correlation_id,
        process_id = process_id
    }
end
-- Process resource usage collection response
function MetricsCollection.process_resource_response(msg: any, monitor_state: any): any
    local process_id = msg.From
    local correlation_id = msg.Tags["Correlation-Id"]
    if not correlation_id then
        return {
            success = false,
            error = "Missing correlation ID in resource response"
        }
    end
    -- Find and update collection job
    local job = monitor_state.metrics_collection.active_collection_jobs[correlation_id]
    if not job then
        return {
            success = false,
            error = "Unknown resource collection job"
        }
    end
    job.status = "completed"
    job.completed_at = msg.Timestamp
    -- Parse resource data
    local resource_data = {}
    if msg.Data then
        local success, parsed = pcall(json.decode, msg.Data)
        if success then
            resource_data = parsed
        end
    end
    -- Update process resource usage in registry
    local process_data = monitor_state.registry.processes[process_id]
    if process_data and resource_data.resource_usage then
        -- Update resource usage metrics
        for key, value in pairs(resource_data.resource_usage) do
            if process_data.resource_usage[key] ~= nil then
                process_data.resource_usage[key] = value
            end
        end
        -- Store historical resource data
        local historical_entry = {
            timestamp = msg.Timestamp,
            process_id = process_id,
            process_type = process_data.process_type,
            resource_usage = resource_data.resource_usage,
            collection_response_time = msg.Timestamp - job.requested_at
        }
        table.insert(monitor_state.metrics_collection.historical_data.resource_metrics, historical_entry)
        -- Limit historical data size
        if #monitor_state.metrics_collection.historical_data.resource_metrics > 1000 then
            table.remove(monitor_state.metrics_collection.historical_data.resource_metrics, 1)
        end
    end
    -- Clean up completed job
    monitor_state.metrics_collection.active_collection_jobs[correlation_id] = nil
    return {
        success = true,
        process_id = process_id,
        correlation_id = correlation_id,
        resources_collected = resource_data.resource_usage and true or false
    }
end
-- Get aggregated metrics for system overview
function MetricsCollection.get_system_metrics_overview(monitor_state: any, time_range: number): any
    local current_time = os.time()
    local cutoff_time = current_time - (time_range or 3600) -- Default 1 hour
    -- Aggregate performance metrics
    local performance_summary = {
        total_messages_processed = 0,
        average_processing_time = 0,
        total_errors = 0,
        error_rate = 0,
        processes_reporting = 0
    }
    -- Aggregate resource metrics
    local resource_summary = {
        total_memory_usage = 0,
        average_computational_load = 0,
        total_active_handlers = 0,
        average_queue_size = 0,
        processes_reporting = 0
    }
    -- Process performance history
    local processing_times = {}
    for _, entry in ipairs(monitor_state.metrics_collection.historical_data.performance_metrics) do
        if entry.timestamp >= cutoff_time then
            if entry.metrics then
                performance_summary.total_messages_processed = performance_summary.total_messages_processed +
                    (entry.metrics.successful_requests or 0) + (entry.metrics.failed_requests or 0)
                performance_summary.total_errors = performance_summary.total_errors +
                    (entry.metrics.failed_requests or 0)
                if entry.metrics.message_processing_time then
                    table.insert(processing_times, entry.metrics.message_processing_time)
                end
                performance_summary.processes_reporting = performance_summary.processes_reporting + 1
            end
        end
    end
    -- Calculate averages
    if #processing_times > 0 then
        local total_time = 0
        for _, time in ipairs(processing_times) do
            total_time = total_time + time
        end
        performance_summary.average_processing_time = total_time / #processing_times
    end
    if performance_summary.total_messages_processed > 0 then
        performance_summary.error_rate = performance_summary.total_errors / performance_summary.total_messages_processed
    end
    -- Process resource history
    local resource_count = 0
    for _, entry in ipairs(monitor_state.metrics_collection.historical_data.resource_metrics) do
        if entry.timestamp >= cutoff_time then
            if entry.resource_usage then
                resource_summary.total_memory_usage = resource_summary.total_memory_usage +
                    (entry.resource_usage.memory_usage or 0)
                resource_summary.average_computational_load = resource_summary.average_computational_load +
                    (entry.resource_usage.computational_load or 0)
                resource_summary.total_active_handlers = resource_summary.total_active_handlers +
                    (entry.resource_usage.active_handlers or 0)
                resource_summary.average_queue_size = resource_summary.average_queue_size +
                    (entry.resource_usage.message_queue_size or 0)
                resource_count = resource_count + 1
            end
        end
    end
    -- Calculate resource averages
    if resource_count > 0 then
        resource_summary.average_computational_load = resource_summary.average_computational_load / resource_count
        resource_summary.average_queue_size = resource_summary.average_queue_size / resource_count
        resource_summary.processes_reporting = resource_count
    end
    return {
        time_range_seconds = time_range or 3600,
        generated_at = current_time,
        performance_summary = performance_summary,
        resource_summary = resource_summary,
        active_collection_jobs = table_length(monitor_state.metrics_collection.active_collection_jobs or {}),
        total_historical_entries = {
            performance = #monitor_state.metrics_collection.historical_data.performance_metrics,
            resources = #monitor_state.metrics_collection.historical_data.resource_metrics
        }
    }
end
-- Utility function to get table length
function table_length(t)
    local count = 0
    for _ in pairs(t) do count = count + 1 end
    return count
end
return MetricsCollection