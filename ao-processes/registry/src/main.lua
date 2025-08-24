-- Tuxemon Registry Management Process
-- AO Process for handling agent registration, discovery, and metadata management
local json = require('json')
-- Load shared framework utilities
local ProcessBase = require('shared.utils.process-base')
-- local ErrorHandler = require('shared.utils.error-handling')
-- local ADPValidator = require('shared.utils.adp-validation')
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
        process_id = "",
        registered_agents = {},
        registered_processes = {},
        metadata = {
            total_registrations = 0,
            active_agents = 0
        }
    }
end

-- Initialize routing systems
MessageRouter:initialize("registry")
ProcessDiscovery:initialize("registry", {"agent-registration", "process-discovery", "matchmaking"}, {capacity = 10000})
InterProcessErrors:initialize({max_retries = 3, agent_feedback_enabled = true})
MessageQueue:initialize({max_queue_size = 2000, persistence_enabled = false})

-- Initialize logging and tracing systems
MessageLogger:initialize(ao.id or "registry-process", "registry", {
    log_level = "INFO",
    retention_hours = 48,
    max_payload_size = 2048,
    sanitization_enabled = true
})
TraceManager:initialize(ao.id or "registry-process", "registry", {
    max_trace_depth = 10,
    trace_retention_minutes = 60,
    sample_rate = 1.0
})
LogRetention:initialize(ao.id or "registry-process", {
    retention_hours = 48,
    max_log_entries = 20000,
    max_storage_mb = 200,
    rotation_interval_hours = 6,
    archive_enabled = true
}, {
    max_total_storage_mb = 1000,
    quota_warning_threshold = 0.8
})

-- Initialize performance monitoring systems
State.performance_monitor = PerformanceMonitor.new({
    collection_interval_ms = 1000,
    max_metrics_buffer = 2000,
    enable_memory_tracking = true,
    enable_throughput_tracking = true,
    load_thresholds = {
        idle_threshold = 5,
        active_threshold = 25,
        overload_threshold = 50,
        max_queue_depth = 100
    }
})

State.performance_alerts = PerformanceAlerts.new({
    max_active_alerts = 40,
    alert_cooldown_ms = 30000,
    auto_resolve_after_ms = 180000,
    notification_enabled = true,
    correlation_enabled = true
})

State.performance_history = PerformanceHistory.new({
    minute_retention_hours = 48,
    hour_retention_days = 14,
    day_retention_months = 6,
    enable_trend_analysis = true,
    trend_analysis_window = 336, -- 14 days in hours
    auto_cleanup_enabled = true
})

-- Link performance monitoring with trace system
State.performance_monitor:set_correlation_tracer(TraceManager)
State.performance_alerts:set_correlation_tracer(TraceManager)

-- Initialize metadata system
HandlerMetadata.init("registry", State.process_id or "registry_process")
-- Handler for initialization messages
Handlers.add("init", "Action", "Init",
    function(msg)
        State.process_id = msg.Tags.ProcessId or ("registry_" .. tostring(msg.Timestamp))
        State.uptime_start = msg.Timestamp
        State.health_monitor = msg.Tags["Health-Monitor"] or ""
        print("Registry process initialized with ID: " .. State.process_id)
        -- Send registration to health monitor if specified
        if State.health_monitor ~= "" then
            ao.send({
                Target = State.health_monitor,
                Action = "Register-Process",
                ["Process-Id"] = State.process_id,
                ["Process-Type"] = "registry",
                ["Process-Name"] = "Registry Process",
                Data = json.encode({
                    process_id = State.process_id,
                    process_type = "registry",
                    capabilities = {"agent_registration", "process_discovery", "metadata_management"},
                    timestamp = msg.Timestamp
                })
            })
        end
        ao.send({
            Target = msg.From,
            Action = "Init-Response",
            ["Process-Id"] = State.process_id,
            ["Process-Type"] = "registry",
            Data = json.encode({
                status = "initialized",
                process_id = State.process_id,
                process_type = "registry",
                timestamp = msg.Timestamp
            })
        })
    end
)
-- Handler for agent registration
Handlers.add("register-agent", "Action", "Register-Agent",
    function(msg)
        local agent_id = msg.From
        local agent_type = msg.Tags.AgentType or "player"
        local agent_name = msg.Tags.AgentName or "Unknown"
        State.registered_agents[agent_id] = {
            id = agent_id,
            name = agent_name,
            type = agent_type,
            status = "active",
            registered_at = msg.Timestamp,
            last_seen = msg.Timestamp,
            metadata = {}
        }
        State.metadata.total_registrations = State.metadata.total_registrations + 1
        State.metadata.active_agents = State.metadata.active_agents + 1
        print("Agent registered: " .. agent_name .. " (" .. agent_id .. ")")
        ao.send({
            Target = msg.From,
            Action = "Registration-Success",
            AgentId = agent_id,
            Data = json.encode({
                status = "registered",
                agent_id = agent_id,
                agent_name = agent_name,
                registry_id = State.process_id
            })
        })
    end
)
-- Handler for process registration
Handlers.add("register-process", "Action", "Register-Process",
    function(msg)
        local process_id = msg.From
        local process_type = msg.Tags.ProcessType or "unknown"
        local process_name = msg.Tags.ProcessName or "Unknown Process"
        State.registered_processes[process_id] = {
            id = process_id,
            name = process_name,
            type = process_type,
            status = "active",
            registered_at = msg.Timestamp,
            last_heartbeat = msg.Timestamp
        }
        print("Process registered: " .. process_name .. " (" .. process_id .. ")")
        ao.send({
            Target = msg.From,
            Action = "Process-Registration-Success",
            ProcessId = process_id,
            Data = json.encode({
                status = "registered",
                process_id = process_id,
                process_name = process_name,
                registry_id = State.process_id
            })
        })
    end
)
-- Handler for discovery queries
Handlers.add("discover", "Action", "Discover",
    function(msg)
        local query_type = msg.Tags.QueryType or "all"
        local results = {}
        if query_type == "agents" or query_type == "all" then
            for agent_id, agent_data in pairs(State.registered_agents) do
                if agent_data.status == "active" then
                    table.insert(results, {
                        type = "agent",
                        id = agent_id,
                        name = agent_data.name,
                        agent_type = agent_data.type
                    })
                end
            end
        end
        if query_type == "processes" or query_type == "all" then
            for process_id, process_data in pairs(State.registered_processes) do
                if process_data.status == "active" then
                    table.insert(results, {
                        type = "process",
                        id = process_id,
                        name = process_data.name,
                        process_type = process_data.type
                    })
                end
            end
        end
        ao.send({
            Target = msg.From,
            Action = "Discovery-Response",
            Data = json.encode({
                query_type = query_type,
                results = results,
                total_results = #results
            })
        })
    end
)

-- Handler for battle matchmaking with routing
Handlers.add("request-battle-opponent", "Action", "Request-Battle-Opponent",
    function(msg)
        local agent_id = msg.From
        local battle_type = msg.Tags.BattleType or "standard"
        local agent_skill_level = msg.Tags.SkillLevel or "novice"
        
        -- Check if agent is registered
        if not State.registered_agents[agent_id] then
            local response = ProcessBase.create_error_response(
                msg.From,
                "REGISTRY_001",
                "Agent must be registered before requesting battle opponents"
            )
            ao.send(response)
            return
        end
        
        -- Find potential opponents
        local potential_opponents = {}
        for opponent_id, opponent_data in pairs(State.registered_agents) do
            if opponent_id ~= agent_id and opponent_data.status == "active" then
                -- Simple matching logic (can be enhanced)
                table.insert(potential_opponents, {
                    id = opponent_id,
                    name = opponent_data.name,
                    type = opponent_data.type
                })
            end
        end
        
        if #potential_opponents == 0 then
            local response = ProcessBase.create_error_response(
                msg.From,
                "REGISTRY_002",
                "No suitable opponents available at this time"
            )
            ao.send(response)
            return
        end
        
        -- Select random opponent (basic matchmaking)
        local selected_opponent = potential_opponents[math.random(#potential_opponents)]
        
        print("Matchmaking: " .. agent_id .. " vs " .. selected_opponent.id)
        
        -- Route battle initiation to battle process
        local battle_request = {
            initiator = agent_id,
            opponent = selected_opponent.id,
            battle_type = battle_type,
            matched_by = "registry",
            timestamp = msg.Timestamp
        }
        
        local routing_result = MessageRouter:send_to_process_type(
            "battle",
            "Start-Battle",
            battle_request,
            {
                ["Match-Type"] = "registry_matched",
                ["Battle-Type"] = battle_type
            }
        )
        
        if routing_result.success then
            -- Queue notifications for both participants
            MessageQueue:enqueue_message(
                agent_id,
                "Battle-Match-Found",
                {
                    opponent = selected_opponent,
                    battle_type = battle_type,
                    match_id = routing_result.route_id
                },
                {priority = MessageQueue.PRIORITY_HIGH}
            )
            
            MessageQueue:enqueue_message(
                selected_opponent.id,
                "Battle-Match-Invitation",
                {
                    challenger = {id = agent_id, name = State.registered_agents[agent_id].name},
                    battle_type = battle_type,
                    match_id = routing_result.route_id
                },
                {priority = MessageQueue.PRIORITY_HIGH}
            )
            
            print("Battle matchmaking routed successfully: " .. routing_result.route_id)
        else
            local response = ProcessBase.create_error_response(
                msg.From,
                routing_result.error_code,
                "Failed to initiate battle: " .. routing_result.error_message
            )
            ao.send(response)
        end
    end
)
-- Handler for health checks and heartbeats
Handlers.add("health-check", "Action", "Health-Check",
    function(msg)
        local correlation_id = msg.Tags["Correlation-Id"]
        -- Update performance metrics
        State.performance_metrics.successful_requests = State.performance_metrics.successful_requests + 1
        State.resource_usage.memory_usage = State.metadata.active_agents
        local health_data = {
            process_id = State.process_id,
            process_type = "registry",
            status = "healthy",
            timestamp = msg.Timestamp,
            uptime = msg.Timestamp - (State.uptime_start or msg.Timestamp),
            performance_metrics = State.performance_metrics,
            resource_usage = State.resource_usage,
            handler_status = {
                {handler_name = "register-agent", is_available = true, execution_count = State.metadata.total_registrations},
                {handler_name = "discovery", is_available = true, execution_count = 0},
                {handler_name = "health-check", is_available = true, execution_count = 1}
            },
            registry_specific_metrics = {
                active_agents = State.metadata.active_agents,
                registered_processes = table_length(State.registered_processes),
                total_registrations = State.metadata.total_registrations,
                registered_agents = table_length(State.registered_agents)
            }
        }
        local response_msg = {
            Target = msg.From,
            Action = "Health-Response",
            ["Process-Type"] = "registry",
            Data = json.encode(health_data)
        }
        if correlation_id then
            response_msg["Correlation-Id"] = correlation_id
        end
        ao.send(response_msg)
    end
)
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
        State.resource_usage.memory_usage = State.metadata.active_agents
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
local function table_length(t)
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
        local agent_count = table_length(State.registered_agents)
        local process_count = table_length(State.registered_processes)
        -- ADP v1.0 Extended Info Response
        local adp_info = {
            -- Standard AO process fields
            Name = "Tuxemon Registry Management Process",
            Process = State.process_id,
            -- ADP-specific fields
            protocolVersion = "1.0",
            lastUpdated = current_time,
            -- Handler definitions with full metadata
            handlers = {
                {
                    action = "Init",
                    pattern = "Action",
                    description = "Initialize the registry process",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "ProcessId",
                            type = "string",
                            required = false,
                            description = "Custom registry process identifier",
                            examples = {"registry_12345", "custom_registry_id"}
                        }
                    }
                },
                {
                    action = "Register-Agent",
                    pattern = "Action",
                    description = "Register a new agent in the registry",
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
                            name = "AgentType",
                            type = "string",
                            required = false,
                            description = "Type or category of the agent",
                            examples = {"player", "npc", "system"}
                        }
                    }
                },
                {
                    action = "Lookup-Agent",
                    pattern = "Action",
                    description = "Look up agent information from the registry",
                    category = "utility",
                    version = "1.0",
                    tags = {
                        {
                            name = "AgentId",
                            type = "address",
                            required = true,
                            description = "Agent identifier to look up"
                        }
                    }
                },
                {
                    action = "Info",
                    pattern = "Action",
                    description = "Get comprehensive registry state and process information",
                    category = "utility",
                    version = "1.0",
                    tags = {}
                }
            },
            -- Process capabilities and metadata
            capabilities = {
                "agent_registration",
                "process_discovery",
                "metadata_management",
                "registry_lookup",
                "agent_lifecycle_tracking"
            },
            -- Current state information
            state = {
                status = "healthy",
                uptime = uptime,
                timestamp = current_time,
                statistics = {
                    registered_agents = agent_count,
                    registered_processes = process_count,
                    total_registrations = State.metadata.total_registrations or 0,
                    active_agents = State.metadata.active_agents or 0
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
    local handled = MessageRouter:handle_incoming_message(msg)
    if handled then
        print("Processed routed message: " .. (msg.Tags["Route-ID"] or "unknown"))
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
    -- Process pending queued messages
    MessageQueue:process_pending_messages(20)
    
    -- Cleanup timed out processing messages
    MessageQueue:cleanup_timed_out_messages()
    
    -- Cleanup inactive processes from router
    MessageRouter:cleanup_inactive_processes()
    
    -- Cleanup old errors
    InterProcessErrors:cleanup_old_errors(24)
    
    -- Send heartbeat for process discovery
    ProcessDiscovery:send_heartbeat()
    
    print("Registry process maintenance cycle completed")
end

-- Main process entry point
print("Tuxemon Registry Process loaded with ADP v1.0 framework and message routing")