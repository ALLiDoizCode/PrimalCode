-- Tuxemon Health Monitor Process
-- AO Process for monitoring system health, performance metrics, and alerting
local json = require('json')
-- Load shared framework utilities
local ProcessBase = require('shared.utils.process-base')
local ErrorHandler = require('shared.utils.error-handling')
local ADPValidator = require('shared.utils.adp-validation')
local HandlerMetadata = require('shared.utils.handler-metadata')
local SelfDocumenting = require('shared.utils.self-documenting')
local ProcessRegistry = require('shared.utils.process-registry')
-- Load health monitoring handlers
local HealthCheck = require('handlers.health-check')
local MetricsCollection = require('handlers.metrics-collection')
local ErrorLogging = require('handlers.error-logging')
local MonitoringUtils = require('utils.monitoring-utils')
-- Process state initialization
if not State then
    State = {
        process_id = "",
        process_type = "health-monitor",
        registry = {},
        health_history = {},
        alerts = {},
        metrics = {
            total_checks = 0,
            failed_checks = 0,
            uptime_start = 0
        },
        heartbeat_config = {
            interval = 30, -- seconds
            timeout_threshold = 300 -- 5 minutes
        }
    }
end
-- Initialize subsystems
ProcessRegistry.init(State)
MetricsCollection.init(State)
ErrorLogging.init(State)
-- Initialize metadata system
HandlerMetadata.init("health-monitor", State.process_id or "health_monitor_process")
-- Handler for initialization messages
Handlers.add("init", "Action", "Init",
    function(msg)
        -- Validate ADP compliance
        local validation = MonitoringUtils.validate_health_message(msg)
        if not validation.is_valid then
            ErrorLogging.log_error(State.process_id, {
                timestamp = msg.Timestamp,
                error_level = "ERROR",
                error_message = "Invalid init message: " .. table.concat(validation.errors, ", "),
                process_context = "message_validation",
                agent_context = msg.From
            }, State)
            return
        end
        State.process_id = msg.Tags.ProcessId or ("monitor_" .. tostring(msg.Timestamp))
        State.metrics.uptime_start = msg.Timestamp
        -- Register self in process registry
        ProcessRegistry.register_process(State, {
            process_id = State.process_id,
            process_type = "health-monitor",
            status = "healthy",
            timestamp = msg.Timestamp,
            metadata = {
                version = "1.0",
                capabilities = {"health_checks", "metrics_collection", "error_logging", "process_registry"}
            }
        })
        print("Health Monitor process initialized with ID: " .. State.process_id)
        ao.send({
            Target = msg.From,
            Action = "Init-Response",
            ["Process-Id"] = State.process_id,
            ["Process-Type"] = "health-monitor",
            Data = json.encode({
                status = "initialized",
                process_id = State.process_id,
                process_type = "health-monitor",
                timestamp = msg.Timestamp,
                capabilities = {"health_checks", "metrics_collection", "error_logging", "process_registry"}
            })
        })
    end
)
-- Handler for registering processes to monitor
Handlers.add("register-process", "Action", "Register-Process",
    function(msg)
        -- Validate ADP compliance
        local validation = MonitoringUtils.validate_health_message(msg)
        if not validation.is_valid then
            ErrorLogging.log_error(State.process_id, {
                timestamp = msg.Timestamp,
                error_level = "ERROR",
                error_message = "Invalid registration message: " .. table.concat(validation.errors, ", "),
                process_context = "message_validation",
                agent_context = msg.From
            }, State)
            return
        end
        local target_process = msg.Tags["Target-Process"] or msg.Tags.TargetProcess
        local process_type = msg.Tags["Process-Type"] or "unknown"
        local process_name = msg.Tags["Process-Name"] or "Unknown"
        if not target_process then
            ao.send({
                Target = msg.From,
                Action = "Registration-Error",
                ["Error-Code"] = "MISSING_TARGET",
                Data = json.encode({
                    error = "Target-Process tag required",
                    timestamp = msg.Timestamp
                })
            })
            return
        end
        -- Register process in registry
        local success = ProcessRegistry.register_process(State, {
            process_id = target_process,
            process_type = process_type,
            status = "healthy",
            timestamp = msg.Timestamp,
            metadata = {
                name = process_name,
                registered_by = msg.From,
                registration_timestamp = msg.Timestamp
            }
        })
        if success then
            print("Registered process for monitoring: " .. process_name .. " (" .. target_process .. ")")
            ao.send({
                Target = msg.From,
                Action = "Registration-Success",
                ["Process-Id"] = target_process,
                ["Process-Type"] = process_type,
                Data = json.encode({
                    process_id = target_process,
                    process_type = process_type,
                    process_name = process_name,
                    registered_at = msg.Timestamp,
                    monitor_id = State.process_id
                })
            })
        else
            ao.send({
                Target = msg.From,
                Action = "Registration-Error",
                ["Error-Code"] = "REGISTRATION_FAILED",
                Data = json.encode({
                    error = "Failed to register process in registry",
                    process_id = target_process
                })
            })
        end
    end
)
-- Handler for performing health checks
Handlers.add("perform-health-check", "Action", "Perform-Health-Check",
    function(msg)
        local target_process = msg.Tags["Target-Process"]
        local check_results = {}
        if target_process then
            -- Check specific process
            if State.registry.processes[target_process] then
                local result = HealthCheck.perform_check(target_process, State, msg.Timestamp)
                table.insert(check_results, result)
            else
                ErrorLogging.log_error(State.process_id, {
                    timestamp = msg.Timestamp,
                    error_level = "WARN",
                    error_message = "Requested health check for unknown process: " .. target_process,
                    process_context = "health_check_request",
                    agent_context = msg.From
                }, State)
            end
        else
            -- Check all registered processes
            for process_id, _ in pairs(State.registry.processes) do
                if process_id ~= State.process_id then -- Don't check self
                    local result = HealthCheck.perform_check(process_id, State, msg.Timestamp)
                    table.insert(check_results, result)
                end
            end
        end
        ao.send({
            Target = msg.From,
            Action = "Health-Check-Initiated",
            ["Check-Count"] = tostring(#check_results),
            Data = json.encode({
                timestamp = msg.Timestamp,
                checks_initiated = #check_results,
                results = check_results
            })
        })
    end
)
-- Handler for health check responses
Handlers.add("health-response", "Action", "Health-Response",
    function(msg)
        local process_id = msg.From
        local correlation_id = msg.Tags["Correlation-Id"]
        -- Process the health check response
        local result = HealthCheck.process_response(msg, State)
        if result.success then
            print("Health response processed for: " .. process_id .. " (" .. result.status .. ")")
        else
            ErrorLogging.log_error(State.process_id, {
                timestamp = msg.Timestamp,
                error_level = "ERROR",
                error_message = "Failed to process health response: " .. (result.error or "unknown error"),
                process_context = "health_response_processing",
                agent_context = process_id,
                correlation_id = correlation_id
            }, State)
        end
    end
)
-- Handler for getting comprehensive system status
Handlers.add("get-system-status", "Action", "Get-System-Status",
    function(msg)
        -- Create comprehensive status report
        local status_report = MonitoringUtils.create_status_report(State)
        ao.send({
            Target = msg.From,
            Action = "System-Status-Report",
            ["Report-Id"] = MonitoringUtils.generate_correlation_id(State.process_id, msg.Timestamp, "status"),
            Data = json.encode(status_report)
        })
    end
)
-- Handler for getting specific process health
Handlers.add("get-process-health", "Action", "Get-Process-Health",
    function(msg)
        local process_id = msg.Tags["Process-Id"]
        if not process_id then
            ao.send({
                Target = msg.From,
                Action = "Process-Health-Error",
                ["Error-Code"] = "MISSING_PROCESS_ID",
                Data = json.encode({
                    error = "Process-Id tag required",
                    timestamp = msg.Timestamp
                })
            })
            return
        end
        local health_data = HealthCheck.get_process_health(process_id, State)
        ao.send({
            Target = msg.From,
            Action = "Process-Health-Report",
            ["Process-Id"] = process_id,
            Data = json.encode(health_data)
        })
    end
)
-- Handler for health checks on this monitor itself
Handlers.add("health-check", "Action", "Health-Check",
    function(msg)
        local correlation_id = msg.Tags["Correlation-Id"]
        local monitor_id = msg.Tags["Monitor-Id"]
        -- Create comprehensive health response
        local health_response = {
            process_id = State.process_id,
            process_type = "health-monitor",
            status = "healthy",
            timestamp = msg.Timestamp,
            uptime = msg.Timestamp - (State.metrics.uptime_start or msg.Timestamp),
            performance_metrics = {
                message_processing_time = 50, -- milliseconds (estimated)
                message_throughput = State.metrics.total_checks or 0,
                error_rate = 0, -- Health monitor itself should have minimal errors
                successful_requests = State.metrics.total_checks - (State.metrics.failed_checks or 0),
                failed_requests = State.metrics.failed_checks or 0,
                average_response_time = 100 -- milliseconds (estimated)
            },
            resource_usage = {
                memory_usage = table_length(State.registry.processes or {}),
                computational_load = 10, -- Low computational load
                active_handlers = 12, -- Number of active handlers
                message_queue_size = 0 -- Estimated queue size
            },
            handler_status = {
                {handler_name = "health-check", is_available = true, execution_count = State.metrics.total_checks or 0},
                {handler_name = "register-process", is_available = true, execution_count = table_length(State.registry.processes or {})},
                {handler_name = "get-system-status", is_available = true, execution_count = 0},
                {handler_name = "process-heartbeat", is_available = true, execution_count = 0}
            },
            monitoring_statistics = {
                registered_processes = table_length(State.registry.processes or {}),
                health_history_entries = #(State.health_history or {}),
                active_alerts = #(State.alerts or {})
            }
        }
        local response_msg = {
            Target = msg.From,
            Action = "Health-Response",
            ["Process-Type"] = "health-monitor",
            Data = json.encode(health_response)
        }
        -- Include correlation ID if provided
        if correlation_id then
            response_msg["Correlation-Id"] = correlation_id
        end
        ao.send(response_msg)
    end
)
-- Handler for process heartbeat messages
Handlers.add("process-heartbeat", "Action", "Process-Heartbeat",
    function(msg)
        local process_id = msg.Tags["Process-Id"] or msg.From
        local process_type = msg.Tags["Process-Type"] or "unknown"
        -- Parse heartbeat data
        local heartbeat_data = {
            timestamp = msg.Timestamp,
            status = "healthy"
        }
        if msg.Data then
            local success, parsed = pcall(json.decode, msg.Data)
            if success then
                heartbeat_data = parsed
                heartbeat_data.timestamp = msg.Timestamp
            end
        end
        -- Update process registry with heartbeat
        local success = ProcessRegistry.update_heartbeat(State, process_id, heartbeat_data)
        if success then
            print("Heartbeat received from: " .. process_id .. " (" .. process_type .. ")")
        else
            -- Process not registered, auto-register it
            ProcessRegistry.register_process(State, {
                process_id = process_id,
                process_type = process_type,
                status = heartbeat_data.status or "healthy",
                timestamp = msg.Timestamp,
                metadata = {
                    auto_registered = true,
                    first_heartbeat = msg.Timestamp
                }
            })
            print("Auto-registered process from heartbeat: " .. process_id)
        end
    end
)
-- Handler for metrics collection responses
Handlers.add("metrics-response", "Action", "Metrics-Response",
    function(msg)
        local result = MetricsCollection.process_metrics_response(msg, State)
        if result.success then
            print("Metrics collected from: " .. result.process_id)
        else
            ErrorLogging.log_error(State.process_id, {
                timestamp = msg.Timestamp,
                error_level = "ERROR",
                error_message = "Failed to process metrics response: " .. (result.error or "unknown error"),
                process_context = "metrics_collection",
                agent_context = msg.From,
                correlation_id = msg.Tags["Correlation-Id"]
            }, State)
        end
    end
)
-- Handler for resource usage collection responses
Handlers.add("resources-response", "Action", "Resources-Response",
    function(msg)
        local result = MetricsCollection.process_resource_response(msg, State)
        if result.success then
            print("Resource metrics collected from: " .. result.process_id)
        else
            ErrorLogging.log_error(State.process_id, {
                timestamp = msg.Timestamp,
                error_level = "ERROR",
                error_message = "Failed to process resource response: " .. (result.error or "unknown error"),
                process_context = "resource_collection",
                agent_context = msg.From,
                correlation_id = msg.Tags["Correlation-Id"]
            }, State)
        end
    end
)
-- Handler for getting error reports
Handlers.add("get-error-report", "Action", "Get-Error-Report",
    function(msg)
        local time_range = tonumber(msg.Tags["Time-Range"]) or 3600 -- Default 1 hour
        local error_report = ErrorLogging.get_error_report(State, time_range)
        ao.send({
            Target = msg.From,
            Action = "Error-Report",
            ["Time-Range"] = tostring(time_range),
            Data = json.encode(error_report)
        })
    end
)
-- Handler for getting metrics overview
Handlers.add("get-metrics-overview", "Action", "Get-Metrics-Overview",
    function(msg)
        local time_range = tonumber(msg.Tags["Time-Range"]) or 3600 -- Default 1 hour
        local metrics_overview = MetricsCollection.get_system_metrics_overview(State, time_range)
        ao.send({
            Target = msg.From,
            Action = "Metrics-Overview",
            ["Time-Range"] = tostring(time_range),
            Data = json.encode(metrics_overview)
        })
    end
)
-- Periodic maintenance handler (to be called by scheduler)
Handlers.add("maintenance", "Action", "Maintenance",
    function(msg)
        local current_time = msg.Timestamp
        -- Check for stale processes
        local stale_processes = ProcessRegistry.check_stale_processes(
            State, current_time, State.heartbeat_config.timeout_threshold
        )
        if #stale_processes > 0 then
            print("Found " .. #stale_processes .. " stale processes")
            for _, process_id in ipairs(stale_processes) do
                ErrorLogging.log_error(process_id, {
                    timestamp = current_time,
                    error_level = "WARN",
                    error_message = "Process marked as offline due to missing heartbeat",
                    process_context = "heartbeat_timeout",
                    agent_context = "health_monitor"
                }, State)
            end
        end
        -- Cleanup old health history entries
        if #State.health_history > 1000 then
            local to_remove = #State.health_history - 1000
            for i = 1, to_remove do
                table.remove(State.health_history, 1)
            end
        end
        -- Send maintenance completion response
        ao.send({
            Target = msg.From,
            Action = "Maintenance-Complete",
            Data = json.encode({
                timestamp = current_time,
                stale_processes_found = #stale_processes,
                health_history_size = #State.health_history,
                registered_processes = table_length(State.registry.processes or {})
            })
        })
    end
)
-- Utility function to get table length
function table_length(t)
    local count = 0
    for _ in pairs(t) do count = count + 1 end
    return count
end
-- Add self-documenting handlers
Handlers.add("help", "Action", "Help", SelfDocumenting.create_help_handler())
Handlers.add("metadata", "Action", "Get-Metadata", HandlerMetadata.create_metadata_handler())
Handlers.add("schema", "Action", "Get-Schema", SelfDocumenting.create_schema_handler())
-- ADP v1.0 compliant Info handler
Handlers.add("info", "Action", "Info",
    function(msg)
        local current_time = msg.Timestamp or os.time()
        local uptime = current_time - (State.metrics.uptime_start or current_time)
        -- Calculate statistics
        local registered_process_count = table_length(State.registry.processes or {})
        local health_history_count = #(State.health_history or {})
        local active_alerts_count = #(State.alerts or {})
        -- ADP v1.0 Extended Info Response
        local adp_info = {
            -- Standard AO process fields
            Name = "Tuxemon Health Monitor Process",
            Process = State.process_id,
            -- ADP-specific fields
            protocolVersion = "1.0",
            lastUpdated = current_time,
            -- Handler definitions with full metadata
            handlers = {
                {
                    action = "Init",
                    pattern = "Action",
                    description = "Initialize the health monitoring process",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "ProcessId",
                            type = "string",
                            required = false,
                            description = "Custom health monitor process identifier",
                            examples = {"monitor_12345", "custom_monitor_id"}
                        }
                    }
                },
                {
                    action = "Register-Process",
                    pattern = "Action",
                    description = "Register a process for health monitoring",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "Target-Process",
                            type = "address",
                            required = true,
                            description = "Process ID to monitor"
                        },
                        {
                            name = "Process-Type",
                            type = "string",
                            required = false,
                            description = "Type of process being registered",
                            examples = {"battle", "world", "registry"}
                        }
                    }
                },
                {
                    action = "Perform-Health-Check",
                    pattern = "Action",
                    description = "Execute health checks on registered processes",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "Target-Process",
                            type = "address",
                            required = false,
                            description = "Specific process to check (optional - checks all if not provided)"
                        }
                    }
                },
                {
                    action = "Health-Check",
                    pattern = "Action",
                    description = "Respond to health check requests with current status",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "Correlation-Id",
                            type = "string",
                            required = false,
                            description = "Correlation identifier for tracking requests"
                        }
                    }
                },
                {
                    action = "Info",
                    pattern = "Action",
                    description = "Get comprehensive health monitor state and capabilities",
                    category = "utility",
                    version = "1.0",
                    tags = {}
                }
            },
            -- Process capabilities and metadata
            capabilities = {
                "health_checks",
                "metrics_collection",
                "error_logging",
                "process_registry",
                "heartbeat_monitoring",
                "system_alerting"
            },
            -- Current state information
            state = {
                status = "healthy",
                uptime = uptime,
                timestamp = current_time,
                heartbeat_config = State.heartbeat_config,
                statistics = {
                    registered_processes = registered_process_count,
                    total_health_checks = State.metrics.total_checks or 0,
                    failed_health_checks = State.metrics.failed_checks or 0,
                    health_history_entries = health_history_count,
                    active_alerts = active_alerts_count
                }
            }
        }
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Info-Response",
            adp_info
        )
        ao.send(response)
    end
)
-- Main process entry point
print("Tuxemon Health Monitor Process loaded with comprehensive monitoring capabilities")
print("- Health checking with ADP compliance")
print("- Performance metrics collection")
print("- Centralized error logging")
print("- Process registry management")
print("- Heartbeat monitoring system")