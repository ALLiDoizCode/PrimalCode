-- Tuxemon World Management Process
-- AO Process for handling world state, agent interactions, and environment management
local json = require('json')
-- Load shared framework utilities
local ProcessBase = require('shared.utils.process-base')
local ErrorHandler = require('shared.utils.error-handling')
local ADPValidator = require('shared.utils.adp-validation')
local HandlerMetadata = require('shared.utils.handler-metadata')
local SelfDocumenting = require('shared.utils.self-documenting')
-- Load message routing utilities
local MessageRouter = require('shared.utils.message-router')
local ProcessDiscovery = require('shared.utils.process-discovery')
local InterProcessErrors = require('shared.utils.inter-process-errors')
local MessageQueue = require('shared.utils.message-queue')

-- Load logging and tracing utilities
local MessageLogger = require('shared.utils.message-logger')
local TraceManager = require('shared.utils.trace-manager')
local LogRetention = require('shared.utils.log-retention')

-- Load performance monitoring utilities
local PerformanceMonitor = require('shared.utils.performance-monitor')
local PerformanceAlerts = require('shared.utils.performance-alerts')
local PerformanceHistory = require('shared.utils.performance-history')
-- Process state initialization
if not State then
    State = {
        world_id = "",
        process_type = "world",
        agents = {},
        environment = {
            weather = "sunny",
            time_of_day = "day",
            season = "spring"
        },
        locations = {},
        events = {},
        performance_metrics = {
            message_processing_time = 0,
            message_throughput = 0,
            error_rate = 0,
            successful_requests = 0,
            failed_requests = 0,
            average_response_time = 100
        },
        resource_usage = {
            memory_usage = 0,
            computational_load = 5,
            active_handlers = 6,
            message_queue_size = 0
        },
        uptime_start = 0
    }
end

-- Initialize routing systems
MessageRouter:initialize("world")
ProcessDiscovery:initialize("world", {"exploration", "battle-initiation", "agent-tracking"}, {port = 8080})
InterProcessErrors:initialize({max_retries = 3, agent_feedback_enabled = true})
MessageQueue:initialize({max_queue_size = 1000, persistence_enabled = false})

-- Initialize logging and tracing systems
MessageLogger:initialize(ao.id or "world-process", "world", {
    log_level = "INFO",
    retention_hours = 24,
    max_payload_size = 2048,
    sanitization_enabled = true
})
TraceManager:initialize(ao.id or "world-process", "world", {
    max_trace_depth = 10,
    trace_retention_minutes = 60,
    sample_rate = 1.0
})
LogRetention:initialize(ao.id or "world-process", {
    retention_hours = 24,
    max_log_entries = 10000,
    max_storage_mb = 100,
    rotation_interval_hours = 6,
    archive_enabled = true
}, {
    max_total_storage_mb = 500,
    quota_warning_threshold = 0.8
})

-- Initialize performance monitoring systems
State.performance_monitor = PerformanceMonitor.new({
    collection_interval_ms = 1000,
    max_metrics_buffer = 1000,
    enable_memory_tracking = true,
    enable_throughput_tracking = true,
    load_thresholds = {
        idle_threshold = 2,
        active_threshold = 8,
        overload_threshold = 15,
        max_queue_depth = 40
    }
})

State.performance_alerts = PerformanceAlerts.new({
    max_active_alerts = 25,
    alert_cooldown_ms = 60000,
    auto_resolve_after_ms = 300000,
    notification_enabled = true,
    correlation_enabled = true
})

State.performance_history = PerformanceHistory.new({
    minute_retention_hours = 24,
    hour_retention_days = 7,
    day_retention_months = 3,
    enable_trend_analysis = true,
    trend_analysis_window = 168,
    auto_cleanup_enabled = true
})

-- Link performance monitoring with trace system
State.performance_monitor:set_correlation_tracer(TraceManager)
State.performance_alerts:set_correlation_tracer(TraceManager)
-- Initialize metadata system
HandlerMetadata.init("world", State.world_id or "world_process")
-- Handler for initialization messages
local init_handler = HandlerMetadata.create_handler("init", {
    action = "Init",
    description = "Initialize the world process with a unique world ID",
    input_schema = {
        required_tags = {"Action"},
        tag_examples = {
            WorldId = "custom_world_id"
        }
    },
    output_schema = {
        response_action = "Init-Response",
        data_example = {
            status = "initialized",
            world_id = "world_12345",
            timestamp = 1640995200
        }
    }
}, function(msg)
    -- Start performance monitoring
    local timing_id = State.performance_monitor:start_handler_timing("init-handler", 
        TraceManager:get_current_trace_id() or "init-" .. os.time())
    
    -- Start message tracing
    local trace_id = MessageLogger:start_message_trace(msg, "init-handler")
    local trace_context = TraceManager:extract_trace_context(msg)
    TraceManager:register_trace_context(trace_context)
    
    MessageLogger:info("World process initialization started", {
        correlation_id = trace_context.correlation_id,
        trace_id = trace_id,
        agent_id = msg.From
    }, {
        world_id = msg.Tags.WorldId,
        requested_timestamp = msg.Timestamp
    })
    
    -- Check for circuit breaker
    if ErrorHandler.is_agent_blocked(msg.From) then
        MessageLogger:warn("Agent blocked due to rate limiting", {
            correlation_id = trace_context.correlation_id,
            trace_id = trace_id,
            agent_id = msg.From
        }, {
            reason = "circuit_breaker_active"
        })
        
        local response = ProcessBase.create_error_response(
            msg.From,
            "RATE_LIMITED",
            "Agent is temporarily blocked due to repeated failures"
        )
        TraceManager:inject_trace_context(response, trace_context, "error-response")
        MessageLogger:log_outgoing_message(msg.From, "Error", response.Data, response.Tags, trace_context.correlation_id)
        ao.send(response)
        MessageLogger:complete_message_trace(trace_id, "error", {error_code = "RATE_LIMITED"})
        
        -- End performance monitoring with failure
        State.performance_monitor:end_handler_timing(timing_id, false)
        
        -- Collect and check performance metrics
        local metrics = State.performance_monitor:collect_metrics(ao.id or "world-process")
        State.performance_history:add_raw_metrics(ao.id or "world-process", metrics)
        local alerts = State.performance_alerts:check_metrics(ao.id or "world-process", metrics)
        
        return
    end
    
    State.world_id = msg.Tags.WorldId or ("world_" .. tostring(msg.Timestamp))
    State.uptime_start = msg.Timestamp
    
    MessageLogger:info("World process initialized successfully", {
        correlation_id = trace_context.correlation_id,
        trace_id = trace_id,
        agent_id = msg.From
    }, {
        world_id = State.world_id,
        uptime_start = State.uptime_start
    })
    
    -- Update metadata system with new process ID
    HandlerMetadata.init("world", State.world_id)
    
    -- Send ADP-compliant response
    local response = ProcessBase.create_adp_response(
        msg.From,
        "Init-Response",
        {
            status = "initialized",
            world_id = State.world_id,
            timestamp = msg.Timestamp
        },
        { WorldId = State.world_id }
    )
    
    TraceManager:inject_trace_context(response, trace_context, "init-response")
    MessageLogger:log_outgoing_message(msg.From, "Init-Response", response.Data, response.Tags, trace_context.correlation_id)
    ao.send(response)
    MessageLogger:complete_message_trace(trace_id, "success", {})
    
    -- End performance monitoring with success
    State.performance_monitor:end_handler_timing(timing_id, true)
    
    -- Collect and check performance metrics
    local metrics = State.performance_monitor:collect_metrics(ao.id or "world-process")
    State.performance_history:add_raw_metrics(ao.id or "world-process", metrics)
    local alerts = State.performance_alerts:check_metrics(ao.id or "world-process", metrics)
    
    -- Log performance alerts if any
    if #alerts > 0 then
        for _, alert in ipairs(alerts) do
            MessageLogger:warn("Performance alert triggered", {
                correlation_id = trace_context.correlation_id,
                trace_id = trace_id,
                alert_id = alert.alert_id
            }, {
                metric_type = alert.metric_type,
                actual_value = alert.actual_value,
                threshold_value = alert.threshold_value,
                severity = alert.severity
            })
        end
    end
end)
Handlers.add("init", "Action", "Init", init_handler)
-- Handler for agent registration
local register_agent_handler = HandlerMetadata.create_handler("register-agent", {
    action = "Register-Agent",
    description = "Register an agent in the world at a specified location",
    validation_rules = ADPValidator.COMMON_RULES.agent_registration,
    input_schema = {
        required_tags = {"Action", "AgentId"},
        tag_examples = {
            AgentId = "agent_12345",
            Location = "spawn_point"
        }
    },
    output_schema = {
        response_action = "Registration-Response",
        data_example = {
            status = "registered",
            location = "spawn_point",
            world_id = "world_12345"
        }
    }
}, function(msg)
    -- Check for circuit breaker
    if ErrorHandler.is_agent_blocked(msg.From) then
        local response = ProcessBase.create_error_response(
            msg.From,
            "RATE_LIMITED",
            "Agent is temporarily blocked due to repeated failures"
        )
        ao.send(response)
        return
    end
    local agent_id = msg.From
    local location = msg.Tags.Location or "spawn_point"
    -- Check if agent already registered
    if State.agents[agent_id] then
        local response = ProcessBase.create_error_response(
            msg.From,
            "WORLD_002",
            "Agent is already registered in this world"
        )
        ao.send(response)
        return
    end
    State.agents[agent_id] = {
        id = agent_id,
        location = location,
        status = "active",
        joined_at = msg.Timestamp
    }
    print("Agent registered: " .. agent_id)
    -- Send ADP-compliant response
    local response = ProcessBase.create_adp_response(
        msg.From,
        "Registration-Response",
        {
            status = "registered",
            location = State.agents[agent_id].location,
            world_id = State.world_id
        },
        { AgentId = agent_id }
    )
    ao.send(response)
end)
Handlers.add("register-agent", "Action", "Register-Agent", register_agent_handler)
-- Handler for world state queries
local get_world_state_handler = HandlerMetadata.create_handler("get-world-state", {
    action = "Get-World-State",
    description = "Query the current state of the world including environment and agents",
    input_schema = {
        required_tags = {"Action"}
    },
    output_schema = {
        response_action = "World-State-Response",
        data_example = {
            world_id = "world_12345",
            environment = {
                weather = "sunny",
                time_of_day = "day",
                season = "spring"
            },
            agent_count = 0,
            locations = {}
        }
    }
}, function(msg)
    if ErrorHandler.is_agent_blocked(msg.From) then
        local response = ProcessBase.create_error_response(
            msg.From,
            "RATE_LIMITED",
            "Agent is temporarily blocked due to repeated failures"
        )
        ao.send(response)
        return
    end
    local agent_count = 0
    for _ in pairs(State.agents) do
        agent_count = agent_count + 1
    end
    local response = ProcessBase.create_adp_response(
        msg.From,
        "World-State-Response",
        {
            world_id = State.world_id,
            environment = State.environment,
            agent_count = agent_count,
            locations = State.locations
        }
    )
    ao.send(response)
end)
Handlers.add("get-world-state", "Action", "Get-World-State", get_world_state_handler)

-- Handler for battle initiation with routing
local initiate_battle_handler = HandlerMetadata.create_handler("initiate-battle", {
    action = "Initiate-Battle",
    description = "Initiate a battle by routing request to battle process",
    input_schema = {
        required_tags = {"Action", "Opponent"},
        tag_examples = {
            Opponent = "agent_12345",
            BattleType = "standard"
        }
    },
    output_schema = {
        response_action = "Battle-Initiation-Response",
        data_example = {
            status = "battle_initiated",
            battle_id = "battle_12345",
            participants = {"agent_1", "agent_2"}
        }
    }
}, function(msg)
    if ErrorHandler.is_agent_blocked(msg.From) then
        local response = ProcessBase.create_error_response(
            msg.From,
            "RATE_LIMITED",
            "Agent is temporarily blocked due to repeated failures"
        )
        ao.send(response)
        return
    end
    
    local opponent = msg.Tags.Opponent
    local battle_type = msg.Tags.BattleType or "standard"
    
    -- Check if both agents are registered in this world
    if not State.agents[msg.From] then
        local response = ProcessBase.create_error_response(
            msg.From,
            "WORLD_003",
            "Agent must be registered in world to initiate battles"
        )
        ao.send(response)
        return
    end
    
    if opponent and not State.agents[opponent] then
        local response = ProcessBase.create_error_response(
            msg.From,
            "WORLD_004",
            "Opponent agent not found in world"
        )
        ao.send(response)
        return
    end
    
    -- Route message to battle process
    local battle_data = {
        initiator = msg.From,
        opponent = opponent,
        world_id = State.world_id,
        battle_type = battle_type,
        timestamp = msg.Timestamp
    }
    
    local routing_result = MessageRouter:send_to_process_type(
        "battle",
        "Start-Battle",
        battle_data,
        {
            ["Source-World"] = State.world_id,
            ["Battle-Type"] = battle_type
        }
    )
    
    if routing_result.success then
        -- Queue agent notification for later delivery
        MessageQueue:enqueue_message(
            msg.From,
            "Battle-Routing-Started",
            {
                status = "routing_to_battle",
                route_id = routing_result.route_id,
                timestamp = msg.Timestamp
            },
            {priority = MessageQueue.PRIORITY_HIGH}
        )
        
        print("Battle initiation routed: " .. routing_result.route_id)
    else
        -- Send error response to agent
        local response = ProcessBase.create_error_response(
            msg.From,
            routing_result.error_code,
            "Failed to route battle request: " .. routing_result.error_message
        )
        ao.send(response)
    end
end)
Handlers.add("initiate-battle", "Action", "Initiate-Battle", initiate_battle_handler)
-- Handler for health checks
local health_check_handler = HandlerMetadata.create_handler("health-check", {
    action = "Health-Check",
    description = "Check the health status of the world process",
    input_schema = {
        required_tags = {"Action"}
    },
    output_schema = {
        response_action = "Health-Response",
        data_example = {
            status = "healthy",
            world_id = "world_12345",
            uptime = 1640995200,
            agents_active = 0
        }
    }
}, function(msg)
    local correlation_id = msg.Tags["Correlation-Id"]
    local agent_count = 0
    for _ in pairs(State.agents) do
        agent_count = agent_count + 1
    end
    -- Update performance metrics
    State.performance_metrics.successful_requests = State.performance_metrics.successful_requests + 1
    State.resource_usage.memory_usage = agent_count
    local process_info = ProcessBase.get_process_info("world", State.world_id)
    local health_data = {
        process_id = State.world_id,
        process_type = "world",
        status = process_info.status,
        timestamp = msg.Timestamp,
        uptime = msg.Timestamp - (State.uptime_start or msg.Timestamp),
        performance_metrics = State.performance_metrics,
        resource_usage = State.resource_usage,
        handler_status = {
            {handler_name = "register-agent", is_available = true, execution_count = agent_count},
            {handler_name = "get-world-state", is_available = true, execution_count = 0},
            {handler_name = "health-check", is_available = true, execution_count = 1}
        },
        world_specific_metrics = {
            active_agents = agent_count,
            environment_status = State.environment,
            total_locations = table_length(State.locations or {}),
            active_events = table_length(State.events or {})
        }
    }
    local response_msg = {
        Target = msg.From,
        Action = "Health-Response",
        ["Process-Type"] = "world",
        Data = json.encode(health_data)
    }
    if correlation_id then
        response_msg["Correlation-Id"] = correlation_id
    end
    ao.send(response_msg)
end)
Handlers.add("health-check", "Action", "Health-Check", health_check_handler)
-- Handler for metrics collection requests
Handlers.add("collect-metrics", "Action", "Collect-Metrics",
    function(msg)
        local correlation_id = msg.Tags["Correlation-Id"]
        ao.send({
            Target = msg.From,
            Action = "Metrics-Response",
            ["Correlation-Id"] = correlation_id or "",
            Data = json.encode({
                performance_metrics = State.performance_metrics,
                timestamp = msg.Timestamp
            })
        })
    end
)
-- Handler for resource usage collection requests
Handlers.add("collect-resources", "Action", "Collect-Resources",
    function(msg)
        local correlation_id = msg.Tags["Correlation-Id"]
        local agent_count = 0
        for _ in pairs(State.agents) do
            agent_count = agent_count + 1
        end
        State.resource_usage.memory_usage = agent_count
        ao.send({
            Target = msg.From,
            Action = "Resources-Response",
            ["Correlation-Id"] = correlation_id or "",
            Data = json.encode({
                resource_usage = State.resource_usage,
                timestamp = msg.Timestamp
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
        local uptime = current_time - (State.uptime_start or current_time)
        -- Calculate statistics
        local agent_count = table_length(State.agents)
        local location_count = table_length(State.locations)
        local active_events = table_length(State.events)
        -- ADP v1.0 Extended Info Response
        local adp_info = {
            -- Standard AO process fields
            Name = "Tuxemon World Management Process",
            Process = State.world_id,
            -- ADP-specific fields
            protocolVersion = "1.0",
            lastUpdated = current_time,
            -- Handler definitions with full metadata
            handlers = {
                {
                    action = "Init",
                    pattern = "Action",
                    description = "Initialize the world process with environment settings",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "WorldId",
                            type = "string",
                            required = false,
                            description = "Custom world identifier",
                            examples = {"world_12345", "custom_world_id"}
                        }
                    }
                },
                {
                    action = "Register-Agent",
                    pattern = "Action",
                    description = "Register an agent in the world environment",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "AgentId",
                            type = "address",
                            required = true,
                            description = "Unique identifier for the agent"
                        },
                        {
                            name = "Location",
                            type = "string",
                            required = false,
                            description = "Initial location for the agent",
                            examples = {"forest", "town", "mountain"}
                        }
                    }
                },
                {
                    action = "Update-Environment",
                    pattern = "Action",
                    description = "Modify world environment parameters",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "Weather",
                            type = "string",
                            required = false,
                            description = "Weather condition to set",
                            examples = {"sunny", "rainy", "stormy", "cloudy"}
                        },
                        {
                            name = "TimeOfDay",
                            type = "string",
                            required = false,
                            description = "Time of day setting",
                            examples = {"dawn", "day", "dusk", "night"}
                        }
                    }
                },
                {
                    action = "Info",
                    pattern = "Action",
                    description = "Get comprehensive world state and process information",
                    category = "utility",
                    version = "1.0",
                    tags = {}
                }
            },
            -- Process capabilities and metadata
            capabilities = {
                "world_management",
                "agent_tracking",
                "environment_control",
                "location_management",
                "event_coordination"
            },
            -- Current state information
            state = {
                status = "healthy",
                uptime = uptime,
                timestamp = current_time,
                environment = State.environment,
                statistics = {
                    active_agents = agent_count,
                    total_locations = location_count,
                    active_events = active_events
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
-- Handler for incoming routed messages
Handlers.add("routed-message", "Route-ID", "*", function(msg)
    -- Handle incoming routed message
    local handled = MessageRouter:handle_incoming_message(msg)
    if handled then
        print("Processed routed message: " .. (msg.Tags["Route-ID"] or "unknown"))
        
        -- Process the actual message based on action
        local action = msg.Tags.Action
        if action == "Battle-Complete" then
            -- Handle battle completion from battle process
            local battle_data = msg.Data and json.decode(msg.Data)
            if battle_data then
                print("Battle completed: " .. (battle_data.battle_id or "unknown"))
                
                -- Notify participants
                if battle_data.participants then
                    for _, participant in ipairs(battle_data.participants) do
                        MessageQueue:enqueue_message(
                            participant,
                            "Battle-Complete-Notification",
                            battle_data,
                            {priority = MessageQueue.PRIORITY_HIGH}
                        )
                    end
                end
            end
        end
    end
end)

-- Handler for process discovery messages
Handlers.add("discovery-ping", "Action", "DiscoveryPing", function(msg)
    ProcessDiscovery:handle_discovery_ping(msg)
end)

Handlers.add("discovery-response", "Action", "DiscoveryResponse", function(msg)
    ProcessDiscovery:handle_discovery_response(msg)
end)

Handlers.add("process-heartbeat", "Action", "ProcessHeartbeat", function(msg)
    ProcessDiscovery:handle_heartbeat(msg)
end)

-- Periodic tasks for message processing and cleanup
local function periodic_maintenance()
    MessageLogger:info("Starting periodic maintenance cycle", {}, {
        cycle_type = "routine_maintenance"
    })
    
    -- Process pending queued messages
    MessageQueue:process_pending_messages(10)
    
    -- Cleanup timed out processing messages
    MessageQueue:cleanup_timed_out_messages()
    
    -- Cleanup inactive processes from router
    MessageRouter:cleanup_inactive_processes()
    
    -- Cleanup old errors
    InterProcessErrors:cleanup_old_errors(24)
    
    -- Cleanup expired logs and traces
    MessageLogger:cleanup_expired_logs()
    TraceManager:cleanup_expired()
    LogRetention:force_cleanup()
    
    -- Cleanup old archives
    LogRetention:cleanup_old_archives()
    
    -- Send heartbeat for process discovery
    ProcessDiscovery:send_heartbeat()
    
    -- Log maintenance completion with statistics
    local retention_stats = LogRetention:get_retention_stats()
    local trace_stats = TraceManager:get_trace_stats()
    local logger_stats = MessageLogger:get_stats()
    
    MessageLogger:info("Maintenance cycle completed", {}, {
        retention_stats = retention_stats,
        trace_stats = trace_stats,
        logger_stats = logger_stats
    })
end

-- Schedule periodic maintenance (in real AO, this would use proper scheduling)
-- For now, this is just a placeholder for the maintenance function
-- periodic_maintenance()

-- Handler for performance metrics retrieval
local performance_metrics_handler = HandlerMetadata.create_handler("performance-metrics", {
    action = "Get-Performance-Metrics",
    description = "Retrieve current performance metrics and load statistics",
    input_schema = {
        required_tags = {"Action"},
        optional_tags = {"MetricType", "TimeRange"}
    },
    output_schema = {
        response_action = "Performance-Metrics-Response",
        data_example = {
            current_metrics = {},
            load_metrics = {},
            alerts = {},
            historical_data = {}
        }
    }
}, function(msg)
    local timing_id = State.performance_monitor:start_handler_timing("performance-metrics", 
        TraceManager:get_current_trace_id() or "perf-" .. os.time())
    
    -- Get current performance data
    local current_metrics = State.performance_monitor:collect_metrics(ao.id or "world-process")
    local load_metrics = State.performance_monitor:calculate_load_metrics()
    local active_alerts = State.performance_alerts:get_active_alerts()
    local storage_metrics = State.performance_history:get_storage_metrics()
    
    -- Get historical data if requested
    local historical_data = {}
    local time_range = msg.Tags.TimeRange or "hour"
    if time_range == "minute" then
        historical_data = State.performance_history:get_historical_data("minute", ao.id, 60)
    elseif time_range == "hour" then
        historical_data = State.performance_history:get_historical_data("hour", ao.id, 24)
    elseif time_range == "day" then
        historical_data = State.performance_history:get_historical_data("day", ao.id, 7)
    end
    
    -- Analyze trends if requested
    local trends = {}
    if msg.Tags.IncludeTrends == "true" then
        trends = State.performance_history:analyze_performance_trends(ao.id or "world-process")
    end
    
    local response = ProcessBase.create_adp_response(
        msg.From,
        "Performance-Metrics-Response",
        {
            current_metrics = current_metrics,
            load_metrics = load_metrics,
            active_alerts = active_alerts,
            storage_metrics = storage_metrics,
            historical_data = historical_data,
            trends = trends,
            timestamp = os.time()
        }
    )
    
    ao.send(response)
    State.performance_monitor:end_handler_timing(timing_id, true)
end)
Handlers.add("performance-metrics", "Action", "Get-Performance-Metrics", performance_metrics_handler)

-- Main process entry point
print("Tuxemon World Process loaded with ADP v1.0 framework, message routing, and performance monitoring")