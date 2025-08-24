-- Tuxemon Battle Resolution Process
-- AO Process for handling battle logic, turn management, and combat resolution
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
        process_id = "",
        process_type = "battle",
        active_battles = {},
        battle_history = {},
        stats = {
            total_battles = 0,
            battles_today = 0
        },
        performance_metrics = {
            message_processing_time = 0,
            message_throughput = 0,
            error_rate = 0,
            successful_requests = 0,
            failed_requests = 0,
            average_response_time = 150
        },
        resource_usage = {
            memory_usage = 0,
            computational_load = 15,
            active_handlers = 5,
            message_queue_size = 0
        },
        uptime_start = 0
    }
end

-- Initialize routing systems
MessageRouter:initialize("battle")
ProcessDiscovery:initialize("battle", {"combat", "turn-resolution", "battle-management"}, {battle_capacity = 100})
InterProcessErrors:initialize({max_retries = 3, agent_feedback_enabled = true})
MessageQueue:initialize({max_queue_size = 500, persistence_enabled = false})

-- Initialize logging and tracing systems
MessageLogger:initialize(ao.id or "battle-process", "battle", {
    log_level = "INFO",
    retention_hours = 24,
    max_payload_size = 2048,
    sanitization_enabled = true
})
TraceManager:initialize(ao.id or "battle-process", "battle", {
    max_trace_depth = 10,
    trace_retention_minutes = 60,
    sample_rate = 1.0
})
LogRetention:initialize(ao.id or "battle-process", {
    retention_hours = 24,
    max_log_entries = 5000,
    max_storage_mb = 50,
    rotation_interval_hours = 6,
    archive_enabled = true
}, {
    max_total_storage_mb = 250,
    quota_warning_threshold = 0.8
})

-- Initialize performance monitoring systems
State.performance_monitor = PerformanceMonitor.new({
    collection_interval_ms = 1000,
    max_metrics_buffer = 500,
    enable_memory_tracking = true,
    enable_throughput_tracking = true,
    load_thresholds = {
        idle_threshold = 3,
        active_threshold = 15,
        overload_threshold = 25,
        max_queue_depth = 60
    }
})

State.performance_alerts = PerformanceAlerts.new({
    max_active_alerts = 30,
    alert_cooldown_ms = 45000,
    auto_resolve_after_ms = 240000,
    notification_enabled = true,
    correlation_enabled = true
})

State.performance_history = PerformanceHistory.new({
    minute_retention_hours = 12,
    hour_retention_days = 3,
    day_retention_months = 2,
    enable_trend_analysis = true,
    trend_analysis_window = 72,
    auto_cleanup_enabled = true
})

-- Link performance monitoring with trace system
State.performance_monitor:set_correlation_tracer(TraceManager)
State.performance_alerts:set_correlation_tracer(TraceManager)

-- Initialize metadata system
HandlerMetadata.init("battle", State.process_id or "battle_process")
-- Handler for initialization messages
local init_handler = HandlerMetadata.create_handler("init", {
    action = "Init",
    description = "Initialize the battle process with a unique process ID",
    input_schema = {
        required_tags = {"Action"},
        tag_examples = {
            ProcessId = "custom_battle_id"
        }
    },
    output_schema = {
        response_action = "Init-Response",
        data_example = {
            status = "initialized",
            process_id = "battle_12345",
            timestamp = 1640995200
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
    State.process_id = msg.Tags.ProcessId or ("battle_" .. tostring(msg.Timestamp))
    State.uptime_start = msg.Timestamp
    State.health_monitor = msg.Tags["Health-Monitor"] or ""
    print("Battle process initialized with ID: " .. State.process_id)
    HandlerMetadata.init("battle", State.process_id)
    -- Send registration to health monitor if specified
    if State.health_monitor ~= "" then
        ao.send({
            Target = State.health_monitor,
            Action = "Register-Process",
            ["Process-Id"] = State.process_id,
            ["Process-Type"] = "battle",
            ["Process-Name"] = "Battle Process",
            Data = json.encode({
                process_id = State.process_id,
                process_type = "battle",
                capabilities = {"battle_management", "turn_resolution", "combat_mechanics"},
                timestamp = msg.Timestamp
            })
        })
    end
    local response = ProcessBase.create_adp_response(
        msg.From,
        "Init-Response",
        {
            status = "initialized",
            process_id = State.process_id,
            timestamp = msg.Timestamp
        },
        { ProcessId = State.process_id }
    )
    ao.send(response)
end)
Handlers.add("init", "Action", "Init", init_handler)
-- Handler for battle initiation (enhanced with routing support)
Handlers.add("start-battle", "Action", "Start-Battle",
    function(msg)
        if ErrorHandler.is_agent_blocked(msg.From) then
            local response = ProcessBase.create_error_response(
                msg.From,
                "RATE_LIMITED",
                "Agent is temporarily blocked due to repeated failures"
            )
            ao.send(response)
            return
        end
        
        local battle_id = "battle_" .. tostring(msg.Timestamp)
        local battle_data = msg.Data and json.decode(msg.Data)
        
        -- Handle both direct and routed battle requests
        local participant1, participant2, world_id
        if battle_data then
            -- Routed request from world process
            participant1 = battle_data.initiator or msg.From
            participant2 = battle_data.opponent or msg.Tags.Opponent or ""
            world_id = battle_data.world_id
        else
            -- Direct request
            participant1 = msg.From
            participant2 = msg.Tags.Opponent or ""
            world_id = msg.Tags.WorldId
        end
        
        State.active_battles[battle_id] = {
            id = battle_id,
            participants = {participant1, participant2},
            status = "active",
            turn = 1,
            current_player = participant1,
            started_at = msg.Timestamp,
            world_id = world_id,
            battle_type = (battle_data and battle_data.battle_type) or msg.Tags.BattleType or "standard"
        }
        State.stats.total_battles = State.stats.total_battles + 1
        print("Battle started: " .. battle_id)
        
        -- Queue notifications for participants
        for _, participant in ipairs({participant1, participant2}) do
            if participant ~= "" then
                MessageQueue:enqueue_message(
                    participant,
                    "Battle-Started",
                    {
                        battle_id = battle_id,
                        participants = State.active_battles[battle_id].participants,
                        your_turn = participant == participant1,
                        world_id = world_id
                    },
                    {
                        priority = MessageQueue.PRIORITY_HIGH,
                        tags = {BattleId = battle_id}
                    }
                )
            end
        end
        
        -- If this was a routed request, notify the world process of battle creation
        if msg.Tags["Source-World"] then
            MessageRouter:send_message(
                msg.Tags["Source-World"],
                "Battle-Created-Notification",
                {
                    battle_id = battle_id,
                    participants = {participant1, participant2},
                    status = "active"
                },
                {["Battle-ID"] = battle_id}
            )
        end
    end
)
-- Handler for battle actions (moves, attacks, etc.)
Handlers.add("battle-action", "Action", "Battle-Action",
    function(msg)
        local battle_id = msg.Tags.BattleId
        local action = msg.Tags.BattleAction
        local actor = msg.From
        if not battle_id or not State.active_battles[battle_id] then
            ao.send({
                Target = msg.From,
                Action = "Battle-Error",
                Data = json.encode({
                    error = "Invalid battle ID or battle not found"
                })
            })
            return
        end
        local battle = State.active_battles[battle_id]
        -- Validate it's the actor's turn
        if battle.current_player ~= actor then
            ao.send({
                Target = msg.From,
                Action = "Battle-Error",
                Data = json.encode({
                    error = "Not your turn"
                })
            })
            return
        end
        -- Process the action (simplified logic)
        battle.turn = battle.turn + 1
        -- Switch to next player
        local current_index = 1
        for i, participant in ipairs(battle.participants) do
            if participant == actor then
                current_index = i
                break
            end
        end
        local next_index = (current_index % #battle.participants) + 1
        battle.current_player = battle.participants[next_index]
        -- Notify participants of the action
        for _, participant in ipairs(battle.participants) do
            ao.send({
                Target = participant,
                Action = "Battle-Action-Result",
                BattleId = battle_id,
                Data = json.encode({
                    action = action,
                    actor = actor,
                    turn = battle.turn,
                    next_player = battle.current_player
                })
            })
        end
    end
)

-- Handler for battle completion with result routing
Handlers.add("complete-battle", "Action", "Complete-Battle",
    function(msg)
        local battle_id = msg.Tags.BattleId
        local winner = msg.Tags.Winner
        
        if not battle_id or not State.active_battles[battle_id] then
            local response = ProcessBase.create_error_response(
                msg.From,
                "BATTLE_101",
                "Invalid battle ID or battle not found"
            )
            ao.send(response)
            return
        end
        
        local battle = State.active_battles[battle_id]
        battle.status = "completed"
        battle.completed_at = msg.Timestamp
        battle.winner = winner
        
        -- Move to battle history
        State.battle_history[battle_id] = battle
        State.active_battles[battle_id] = nil
        
        print("Battle completed: " .. battle_id .. " Winner: " .. (winner or "draw"))
        
        local battle_result = {
            battle_id = battle_id,
            participants = battle.participants,
            winner = winner,
            completed_at = msg.Timestamp,
            world_id = battle.world_id,
            battle_type = battle.battle_type
        }
        
        -- Route completion notification to world process
        if battle.world_id then
            local routing_result = MessageRouter:send_message(
                battle.world_id,
                "Battle-Complete",
                battle_result,
                {
                    ["Battle-ID"] = battle_id,
                    ["Battle-Result"] = "completed"
                }
            )
            
            if not routing_result.success then
                print("Failed to route battle completion to world: " .. routing_result.error_message)
            end
        end
        
        -- Queue notifications for participants
        for _, participant in ipairs(battle.participants) do
            MessageQueue:enqueue_message(
                participant,
                "Battle-Completed",
                battle_result,
                {
                    priority = MessageQueue.PRIORITY_HIGH,
                    tags = {BattleId = battle_id, Winner = winner or "draw"}
                }
            )
        end
        
        -- Send confirmation to requester
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Battle-Complete-Response",
            {
                status = "completed",
                battle_id = battle_id,
                result = battle_result
            }
        )
        ao.send(response)
    end
)
-- Handler for health checks
local health_check_handler = HandlerMetadata.create_handler("health-check", {
    action = "Health-Check",
    description = "Check the health status of the battle process",
    input_schema = {
        required_tags = {"Action"}
    },
    output_schema = {
        response_action = "Health-Response",
        data_example = {
            status = "healthy",
            process_id = "battle_12345",
            active_battles = 0,
            total_battles = 0
        }
    }
}, function(msg)
    local correlation_id = msg.Tags["Correlation-Id"]
    local active_battle_count = 0
    for _ in pairs(State.active_battles) do
        active_battle_count = active_battle_count + 1
    end
    -- Update performance metrics
    State.performance_metrics.successful_requests = State.performance_metrics.successful_requests + 1
    State.resource_usage.memory_usage = active_battle_count
    local process_info = ProcessBase.get_process_info("battle", State.process_id)
    local health_data = {
        process_id = State.process_id,
        process_type = "battle",
        status = process_info.status,
        timestamp = msg.Timestamp,
        uptime = msg.Timestamp - (State.uptime_start or msg.Timestamp),
        performance_metrics = State.performance_metrics,
        resource_usage = State.resource_usage,
        handler_status = {
            {handler_name = "start-battle", is_available = true, execution_count = State.stats.total_battles},
            {handler_name = "battle-action", is_available = true, execution_count = 0},
            {handler_name = "health-check", is_available = true, execution_count = 1}
        },
        battle_specific_metrics = {
            active_battles = active_battle_count,
            total_battles = State.stats.total_battles,
            battles_today = State.stats.battles_today,
            battle_history_size = table_length(State.battle_history or {})
        }
    }
    local response_msg = {
        Target = msg.From,
        Action = "Health-Response",
        ["Process-Type"] = "battle",
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
        local active_battle_count = 0
        for _ in pairs(State.active_battles) do
            active_battle_count = active_battle_count + 1
        end
        State.resource_usage.memory_usage = active_battle_count
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
        local active_battle_count = table_length(State.active_battles)
        local total_participants = 0
        for _, battle in pairs(State.active_battles) do
            total_participants = total_participants + #battle.participants
        end
        -- ADP v1.0 Extended Info Response
        local adp_info = {
            -- Standard AO process fields
            Name = "Tuxemon Battle Process",
            Process = State.process_id,
            -- ADP-specific fields
            protocolVersion = "1.0",
            lastUpdated = current_time,
            -- Handler definitions with full metadata
            handlers = {
                {
                    action = "Init",
                    pattern = "Action",
                    description = "Initialize the battle process with a unique process ID",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "ProcessId",
                            type = "string",
                            required = false,
                            description = "Custom process identifier",
                            examples = {"battle_12345", "custom_battle_id"}
                        }
                    }
                },
                {
                    action = "Start-Battle",
                    pattern = "Action",
                    description = "Initiate a new battle between participants",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "Opponent",
                            type = "address",
                            required = false,
                            description = "Address of the opponent participant"
                        }
                    }
                },
                {
                    action = "Battle-Action",
                    pattern = "Action",
                    description = "Execute a battle action during combat",
                    category = "core",
                    version = "1.0",
                    tags = {
                        {
                            name = "BattleId",
                            type = "string",
                            required = true,
                            description = "Unique identifier for the battle",
                            examples = {"battle_1640995200"}
                        },
                        {
                            name = "BattleAction",
                            type = "string",
                            required = true,
                            description = "Type of battle action to perform",
                            examples = {"attack", "defend", "special"}
                        }
                    }
                },
                {
                    action = "Info",
                    pattern = "Action",
                    description = "Get comprehensive process information and capabilities",
                    category = "utility",
                    version = "1.0",
                    tags = {}
                }
            },
            -- Process capabilities and metadata
            capabilities = {
                "battle_management",
                "turn_resolution",
                "combat_mechanics",
                "participant_coordination",
                "battle_history_tracking"
            },
            -- Current state information
            state = {
                status = "healthy",
                uptime = uptime,
                timestamp = current_time,
                statistics = {
                    active_battles = active_battle_count,
                    total_battles = State.stats.total_battles or 0,
                    battles_today = State.stats.battles_today or 0,
                    total_participants_active = total_participants
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
    MessageQueue:process_pending_messages(5)
    
    -- Cleanup timed out processing messages
    MessageQueue:cleanup_timed_out_messages()
    
    -- Cleanup inactive processes from router
    MessageRouter:cleanup_inactive_processes()
    
    -- Cleanup old errors
    InterProcessErrors:cleanup_old_errors(24)
    
    -- Send heartbeat for process discovery
    ProcessDiscovery:send_heartbeat()
    
    print("Battle process maintenance cycle completed")
end

-- Main process entry point
print("Tuxemon Battle Process loaded with ADP v1.0 framework and message routing")