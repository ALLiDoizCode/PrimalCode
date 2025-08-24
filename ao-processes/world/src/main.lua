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

-- Load state inspection utilities
local StateInspector = require('shared.utils.state-inspector')
local AgentStateViewer = require('shared.utils.agent-state-viewer')
local RealTimeStateManager = require('shared.utils.real-time-state-manager')

-- Load handler documentation utilities
local HandlerDocumentation = require('shared.utils.handler-documentation')
local InteractiveTester = require('shared.utils.interactive-tester')
local SchemaValidator = require('shared.utils.schema-validator')
local ResponseFormatDocs = require('shared.utils.response-format-docs')
local HandlerVersioning = require('shared.utils.handler-versioning')

-- Load world management utilities
local WorldAuthentication = require('shared.utils.world-authentication')
local WorldStatePersistence = require('shared.utils.world-state-persistence')

-- Load session management system (Story 3.4)
local SessionManagement = require('ao-processes.world.src.handlers.session-management')
local SessionCheckpoints = require('ao-processes.world.src.utils.session-checkpoints')
local SessionRecovery = require('ao-processes.world.src.utils.session-recovery')
local SessionTimeout = require('shared.utils.session-timeout')

-- Load movement system handlers
local MovementHandler = require('ao-processes.world.src.handlers.movement')
local WorldStateHandler = require('ao-processes.world.src.handlers.world-state')
local CollisionDetector = require('ao-processes.world.src.utils.collision')

-- Load encounter system (Story 4.1)
local EncountersHandler = require('ao-processes.world.src.handlers.encounters')

-- Load capture system (Story 4.2)
local CaptureHandler = require('ao-processes.world.src.handlers.captures')
local CapturedCreatureManager = require('ao-processes.world.src.utils.captured-creatures')

-- Load team management system (Story 4.3)
local TeamManagement = require('ao-processes.world.src.handlers.team-management')
local CreatureCollection = require('ao-processes.world.src.handlers.creature-collection')
local CreatureAnalyzer = require('ao-processes.world.src.utils.creature-analyzer')
local TeamOptimizer = require('ao-processes.world.src.utils.team-optimizer')

-- Load creature stats and progression system (Story 4.4)
local CreatureStats = require('ao-processes.world.src.handlers.creature-stats')
local CreatureProgression = require('ao-processes.world.src.handlers.creature-progression')
local StatCalculator = require('ao-processes.world.src.utils.stat-calculator')
local CreatureComparator = require('ao-processes.world.src.utils.creature-comparator')
local HealthManager = require('ao-processes.world.src.utils.health-manager')
local ProgressionTracker = require('ao-processes.world.src.utils.progression-tracker')
-- Process state initialization
if not State then
    State = {
        world_id = "",
        owner_agent_id = "",
        process_type = "world",
        agents = {},
        environment = {
            weather = "sunny",
            time_of_day = "day",
            season = "spring"
        },
        locations = {},
        events = {},
        -- Enhanced world state for inspection
        WorldState = {
            agents = {},
            terrain_map = {},
            item_spawns = {},
            encounter_zones = {},
            bounds = { width = 100, height = 100, min_x = 0, min_y = 0, max_x = 99, max_y = 99 },
            action_history = {},
            collision_system = nil  -- Will be initialized after state setup
        },
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

-- Initialize handler documentation systems
HandlerDocumentation.init({
    include_live_examples = true,
    track_response_patterns = true,
    correlate_with_tests = true,
    correlation_with_traces = true
})

InteractiveTester.init({
    max_concurrent_tests = 5,
    track_performance = true,
    enable_test_history = true,
    max_history_entries = 50
})

SchemaValidator.init({
    strict_mode = false,
    allow_additional_properties = true,
    validate_examples = true,
    provide_suggestions = true
})

ResponseFormatDocs.init({
    include_live_examples = true,
    track_response_patterns = true,
    correlate_with_tests = true,
    generate_error_examples = true,
    include_performance_data = true
})

HandlerVersioning.init({
    track_schema_changes = true,
    track_response_changes = true,
    maintain_compatibility_matrix = true,
    auto_detect_breaking_changes = true,
    max_versions_per_handler = 10
})

-- Initialize world authentication system
WorldAuthentication:initialize({
    token_expiry_hours = 24,
    max_failed_attempts = 5,
    lockout_duration_minutes = 15
})

-- Initialize world state persistence system
WorldStatePersistence:initialize({
    checkpoint_interval_seconds = 300,  -- 5 minutes
    backup_retention_count = 10,
    integrity_check_interval_seconds = 900,  -- 15 minutes
    auto_recovery_enabled = true,
    versioning_enabled = true
})

-- Initialize collision detection system
State.WorldState.collision_system = CollisionDetector.initialize(
    State.WorldState.bounds,
    State.WorldState.terrain_map
)

-- Update terrain map with generated terrain if empty
if next(State.WorldState.terrain_map) == nil then
    State.WorldState.terrain_map = State.WorldState.collision_system.terrain_map
end

-- Initialize state change notifier system (Story 3.3)
local StateChangeNotifier = require('shared.utils.state-change-notifier')
StateChangeNotifier.initialize(ao.id or "world-process")

-- Initialize session management system (Story 3.4)
SessionManagement.initialize({
    default_checkpoint_interval_ms = 300000,    -- 5 minutes
    session_timeout_ms = 1800000,               -- 30 minutes
    max_concurrent_sessions = 100,
    enable_auto_recovery = true,
    enable_state_validation = true
})

SessionCheckpoints.initialize({
    checkpoint_interval_ms = 300000,            -- 5 minutes
    significant_action_checkpoint = true,
    incremental_checkpoints = true,
    max_checkpoints_per_session = 50,
    checkpoint_versioning = true,
    integrity_validation = true
})

SessionRecovery.initialize({
    crash_detection_enabled = true,
    max_recovery_attempts = 3,
    recovery_timeout_ms = 30000,               -- 30 seconds
    auto_recovery_enabled = true,
    multi_level_recovery = true,
    recovery_validation = true
})

SessionTimeout.initialize({
    default_timeout_ms = 1800000,              -- 30 minutes
    activity_check_interval_ms = 60000,        -- 1 minute
    warning_threshold_ms = 300000,             -- 5 minutes
    grace_period_ms = 120000,                  -- 2 minutes
    timeout_policies = {
        exploring = 1800000,                    -- 30 minutes
        battling = 3600000,                     -- 60 minutes for battles
        idle = 900000                           -- 15 minutes for idle
    }
})

-- Initialize encounter system (Story 4.1)
State.encounters_system = EncountersHandler.initialize(State.WorldState, os.time())

-- Initialize capture system (Story 4.2)
State.capture_system = CaptureHandler.initialize(State.WorldState, {
    max_capture_attempts = 5,
    capture_timeout_minutes = 10,
    allow_encounter_damage = false
})

-- Initialize captured creature management
State.captured_creature_manager = CapturedCreatureManager.new()

-- Initialize team management system (Story 4.3)
State.team_management = TeamManagement.initialize(State.captured_creature_manager)
State.creature_collection = CreatureCollection.initialize(State.captured_creature_manager)
State.creature_analyzer = CreatureAnalyzer.new()
State.team_optimizer = TeamOptimizer.new(State.captured_creature_manager)

-- Initialize creature stats and progression system (Story 4.4)
State.creature_stats = CreatureStats.initialize(State)
State.creature_progression = CreatureProgression.initialize(State.captured_creature_manager)
State.creature_comparator = CreatureComparator.new(State.captured_creature_manager)
State.health_manager = HealthManager.new(State.captured_creature_manager)
State.progression_tracker = ProgressionTracker.new()

-- Handler for initialization messages
local init_handler = HandlerMetadata.create_handler("init", {
    action = "Init",
    description = "Initialize the world process with a unique world ID and environment settings",
    category = "core",
    version = "1.2",
    tags = {
        {
            name = "WorldId",
            type = "string",
            required = false,
            description = "Custom world identifier for the process",
            examples = {"world_12345", "custom_world_id", "test_world"},
            validation_rules = {
                min_length = 3,
                max_length = 50,
                pattern = "^[a-zA-Z0-9_-]+$"
            }
        },
        {
            name = "Owner-Agent-Id",
            type = "address",
            required = false,
            description = "Agent ID that owns this world instance",
            examples = {"agent_12345", "player_agent_001"},
            validation_rules = {
                min_length = 5,
                max_length = 100
            }
        }
    },
    input_schema = {
        required_tags = {"Action"},
        optional_tags = {"WorldId", "Owner-Agent-Id"},
        tag_examples = {
            WorldId = "custom_world_id",
            ["Owner-Agent-Id"] = "agent_12345"
        }
    },
    output_schema = {
        response_action = "Init-Response",
        data_example = {
            status = "initialized",
            world_id = "world_12345",
            timestamp = 1640995200,
            environment = {
                weather = "sunny",
                time_of_day = "day",
                season = "spring"
            }
        },
        data_schema = {
            type = "object",
            required = ["status", "world_id", "timestamp"],
            properties = {
                status = {type = "string", examples = ["initialized"]},
                world_id = {type = "string"},
                timestamp = {type = "number"},
                environment = {type = "object"}
            }
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
    State.owner_agent_id = msg.Tags["Owner-Agent-Id"] or msg.From
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
    
    -- Track response pattern for documentation
    ResponseFormatDocs.track_response_pattern("Init", response)
    
    -- Register handler version for documentation
    HandlerVersioning.register_handler_version({
        action = "Init",
        description = "Initialize the world process with a unique world ID and environment settings",
        version = "1.2",
        tags = {{
            name = "WorldId",
            type = "string",
            required = false,
            description = "Custom world identifier for the process",
            examples = {"world_12345", "custom_world_id", "test_world"}
        }}
    }, ao.id or "world-process")
    
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

-- Helper function to validate world access authentication
local function validate_world_access(agent_id, auth_token, required_permission, world_id, timestamp)
    -- Owner agent always has access
    if agent_id == State.owner_agent_id then
        return {success = true, agent_id = agent_id}
    end
    
    -- Require authentication token for non-owner agents
    if not auth_token then
        return {
            success = false,
            error_code = "AUTH_REQUIRED",
            error_message = "Authentication token required for world access"
        }
    end
    
    local auth_result = WorldAuthentication:validate_access(auth_token, world_id, required_permission, timestamp)
    if not auth_result.success then
        return auth_result
    end
    
    -- Ensure token is for this agent
    if auth_result.agent_id ~= agent_id then
        return {
            success = false,
            error_code = "AUTH_MISMATCH",
            error_message = "Authentication token does not match agent ID"
        }
    end
    
    return auth_result
end

-- Handler for agent registration
local register_agent_handler = HandlerMetadata.create_handler("register-agent", {
    action = "Register-Agent",
    description = "Register an agent in the world environment at a specified location with initial state setup",
    category = "core",
    version = "1.3",
    validation_rules = ADPValidator.COMMON_RULES.agent_registration,
    tags = {
        {
            name = "AgentId",
            type = "address",
            required = true,
            description = "Unique identifier for the agent to be registered",
            examples = {"agent_12345", "player_agent_001", "bot_explorer_42"}
        },
        {
            name = "Location",
            type = "string",
            required = false,
            description = "Initial spawn location for the agent in the world",
            examples = {"spawn_point", "forest", "town", "mountain", "beach"},
            default_value = "spawn_point",
            validation_rules = {
                min_length = 3,
                max_length = 30
            }
        }
    },
    input_schema = {
        required_tags = {"Action", "AgentId"},
        optional_tags = {"Location"},
        tag_examples = {
            AgentId = "agent_12345",
            Location = "spawn_point"
        }
    },
    output_schema = {
        response_action = "Registration-Response",
        data_example = {
            status = "registered",
            agent_id = "agent_12345",
            location = "spawn_point",
            world_id = "world_12345",
            initial_state = {
                position = {x = 50, y = 50},
                inventory = {},
                team = []
            },
            timestamp = 1640995200
        },
        data_schema = {
            type = "object",
            required = ["status", "agent_id", "world_id", "timestamp"],
            properties = {
                status = {type = "string", examples = ["registered", "already_registered"]},
                agent_id = {type = "string"},
                location = {type = "string"},
                world_id = {type = "string"},
                initial_state = {type = "object"},
                timestamp = {type = "number"}
            }
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
    local auth_token = msg.Tags["Auth-Token"]
    local location = msg.Tags.Location or "spawn_point"
    
    -- Validate world access authentication
    local auth_result = validate_world_access(agent_id, auth_token, "move", State.world_id, msg.Timestamp)
    if not auth_result.success then
        local response = ProcessBase.create_error_response(
            msg.From,
            auth_result.error_code,
            auth_result.error_message
        )
        ao.send(response)
        return
    end
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
    
    -- Update WorldState for inspection
    State.WorldState.agents[agent_id] = {
        position = { x = math.random(0, 99), y = math.random(0, 99) },
        status = "exploring",
        inventory = {},
        active_tuxemon_team = {},
        last_action = "joined_world"
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
    
    -- Validate world access authentication
    local agent_id = msg.From
    local auth_token = msg.Tags["Auth-Token"]
    local auth_result = validate_world_access(agent_id, auth_token, "query", State.world_id, msg.Timestamp)
    if not auth_result.success then
        local response = ProcessBase.create_error_response(
            msg.From,
            auth_result.error_code,
            auth_result.error_message
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
    
    -- Validate world access authentication
    local agent_id = msg.From
    local auth_token = msg.Tags["Auth-Token"]
    local auth_result = validate_world_access(agent_id, auth_token, "battle", State.world_id, msg.Timestamp)
    if not auth_result.success then
        local response = ProcessBase.create_error_response(
            msg.From,
            auth_result.error_code,
            auth_result.error_message
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
                    action = "Get-Handler-Documentation",
                    pattern = "Action",
                    description = "Retrieve comprehensive handler documentation with examples and validation rules",
                    category = "utility",
                    version = "1.0",
                    tags = {
                        {
                            name = "QueryType",
                            type = "string",
                            required = false,
                            description = "Type of documentation query",
                            examples = {"process", "all", "discover"}
                        },
                        {
                            name = "ProcessId",
                            type = "string",
                            required = false,
                            description = "Specific process ID for documentation",
                            examples = {"world_process_001"}
                        }
                    }
                },
                {
                    action = "Interactive-Test",
                    pattern = "Action",
                    description = "Send interactive test messages to handlers with real-time validation",
                    category = "utility",
                    version = "1.0",
                    tags = {
                        {
                            name = "TestAction",
                            type = "string",
                            required = true,
                            description = "Type of testing action to perform",
                            examples = {"create_session", "send_test", "validate_message"}
                        }
                    }
                },
                {
                    action = "Validate-Schema",
                    pattern = "Action", 
                    description = "Validate message schemas against handler requirements with detailed feedback",
                    category = "utility",
                    version = "1.0",
                    tags = {
                        {
                            name = "ValidationAction",
                            type = "string",
                            required = true,
                            description = "Type of validation to perform",
                            examples = {"validate_message", "generate_preview", "validate_incremental"}
                        }
                    }
                },
                {
                    action = "Move-Agent",
                    pattern = "Action",
                    description = "Move agent in specified direction with collision detection",
                    category = "movement",
                    version = "1.0",
                    tags = {
                        {
                            name = "Direction",
                            type = "string",
                            required = true,
                            description = "Direction to move (north, south, east, west)",
                            examples = {"north", "south", "east", "west"}
                        }
                    }
                },
                {
                    action = "Query-Position",
                    pattern = "Action",
                    description = "Get current agent position and surrounding environment information",
                    category = "world_state",
                    version = "1.0",
                    tags = {
                        {
                            name = "Agent-Id",
                            type = "address",
                            required = false,
                            description = "Agent to query position for"
                        }
                    }
                },
                {
                    action = "Query-World-Environment",
                    pattern = "Action",
                    description = "Get comprehensive world environment and state information",
                    category = "world_state",
                    version = "1.0",
                    tags = {
                        {
                            name = "Query-Type",
                            type = "string",
                            required = false,
                            description = "Type of world information to retrieve",
                            examples = {"overview", "detailed", "statistics"}
                        }
                    }
                },
                {
                    action = "Check-Movement-Encounter",
                    pattern = "Action", 
                    description = "Check if agent movement triggers a Tuxemon encounter",
                    category = "encounters",
                    version = "1.0",
                    tags = {
                        {
                            name = "Agent-Id",
                            type = "address",
                            required = true,
                            description = "Agent who moved and might encounter a Tuxemon"
                        },
                        {
                            name = "Position-X",
                            type = "number",
                            required = true,
                            description = "Agent's current X position"
                        },
                        {
                            name = "Position-Y",
                            type = "number", 
                            required = true,
                            description = "Agent's current Y position"
                        }
                    }
                },
                {
                    action = "Engage-Encounter",
                    pattern = "Action",
                    description = "Engage with an active encounter to start capture sequence",
                    category = "encounters",
                    version = "1.0",
                    tags = {
                        {
                            name = "Encounter-Id",
                            type = "string",
                            required = true,
                            description = "ID of the encounter to engage with"
                        },
                        {
                            name = "Action-Type",
                            type = "string",
                            required = true,
                            description = "Type of engagement action (capture, flee)",
                            examples = {"capture", "flee"}
                        }
                    }
                },
                {
                    action = "Get-Encounter-Info",
                    pattern = "Action",
                    description = "Get detailed information about an active encounter", 
                    category = "encounters",
                    version = "1.0",
                    tags = {
                        {
                            name = "Encounter-Id",
                            type = "string",
                            required = true,
                            description = "ID of the encounter to get information about"
                        }
                    }
                },
                {
                    action = "Get-Zone-Encounter-Rates",
                    pattern = "Action",
                    description = "Get encounter rates and species information for zones",
                    category = "encounters",
                    version = "1.0",
                    tags = {
                        {
                            name = "Zone-Id",
                            type = "string", 
                            required = false,
                            description = "Specific zone to query (all zones if not specified)"
                        },
                        {
                            name = "Position-X",
                            type = "number",
                            required = false,
                            description = "X position to find zone at location"
                        },
                        {
                            name = "Position-Y",
                            type = "number",
                            required = false,
                            description = "Y position to find zone at location"
                        }
                    }
                },
                {
                    action = "Get-Encounter-History",
                    pattern = "Action",
                    description = "Get agent's encounter history for strategic analysis",
                    category = "encounters",
                    version = "1.0",
                    tags = {
                        {
                            name = "Agent-Id",
                            type = "address",
                            required = false,
                            description = "Agent to get history for (defaults to sender)"
                        },
                        {
                            name = "Limit",
                            type = "number",
                            required = false,
                            description = "Maximum number of recent encounters to return"
                        }
                    }
                },
                {
                    action = "Attempt-Capture",
                    pattern = "Action",
                    description = "Attempt to capture a creature from an active encounter using a capture item",
                    category = "captures",
                    version = "1.0",
                    tags = {
                        {
                            name = "Encounter-Id",
                            type = "string",
                            required = true,
                            description = "ID of the active encounter containing the creature to capture"
                        },
                        {
                            name = "Item-Id",
                            type = "string",
                            required = true,
                            description = "ID of the capture item to use for the attempt"
                        }
                    }
                },
                {
                    action = "Get-Capture-Items",
                    pattern = "Action",
                    description = "Query available capture items and their effectiveness",
                    category = "captures",
                    version = "1.0",
                    tags = {
                        {
                            name = "Species-Id",
                            type = "string",
                            required = false,
                            description = "Species ID to calculate item effectiveness for"
                        },
                        {
                            name = "Creature-Level",
                            type = "number",
                            required = false,
                            description = "Creature level for effectiveness calculation"
                        }
                    }
                },
                {
                    action = "Get-Captured-Creatures",
                    pattern = "Action",
                    description = "Get agent's collection of captured creatures",
                    category = "captures",
                    version = "1.0",
                    tags = {
                        {
                            name = "Filter-Species",
                            type = "string",
                            required = false,
                            description = "Filter by specific species"
                        },
                        {
                            name = "Sort-By",
                            type = "string",
                            required = false,
                            description = "Sort criteria (level, capture_timestamp, species_id)"
                        }
                    }
                },
                {
                    action = "Set-Active-Team",
                    pattern = "Action",
                    description = "Set agent's active team roster by selecting up to 6 creatures from owned collection",
                    category = "team_management",
                    version = "1.0",
                    tags = {
                        {
                            name = "Team-Composition",
                            type = "string",
                            required = true,
                            description = "JSON array of creature IDs for team slots"
                        }
                    }
                },
                {
                    action = "Get-Team-Composition",
                    pattern = "Action", 
                    description = "Query current active team and their combat readiness",
                    category = "team_management",
                    version = "1.0",
                    tags = {}
                },
                {
                    action = "Save-Team-Preset",
                    pattern = "Action",
                    description = "Save current active team composition as a named preset",
                    category = "team_management",
                    version = "1.0",
                    tags = {
                        {
                            name = "Preset-Name",
                            type = "string",
                            required = true,
                            description = "Name for the team preset"
                        }
                    }
                },
                {
                    action = "Load-Team-Preset",
                    pattern = "Action",
                    description = "Load a saved team preset as the current active team",
                    category = "team_management",
                    version = "1.0",
                    tags = {
                        {
                            name = "Preset-Name",
                            type = "string",
                            required = true,
                            description = "Name of the preset to load"
                        }
                    }
                },
                {
                    action = "List-Team-Presets",
                    pattern = "Action",
                    description = "Get list of all saved team presets for the agent",
                    category = "team_management",
                    version = "1.0",
                    tags = {}
                },
                {
                    action = "Get-Creature-Collection",
                    pattern = "Action",
                    description = "Query comprehensive creature collection with filtering and sorting",
                    category = "creature_collection",
                    version = "1.0",
                    tags = {
                        {
                            name = "Filter-Species",
                            type = "string",
                            required = false,
                            description = "Filter by specific species ID"
                        },
                        {
                            name = "Sort-By",
                            type = "string",
                            required = false,
                            description = "Sort criteria for results"
                        }
                    }
                },
                {
                    action = "Get-Creature-Details",
                    pattern = "Action",
                    description = "Get comprehensive information about a specific captured creature",
                    category = "creature_collection",
                    version = "1.0",
                    tags = {
                        {
                            name = "Creature-Id",
                            type = "string",
                            required = true,
                            description = "ID of the creature to get details for"
                        }
                    }
                },
                {
                    action = "Search-Creatures",
                    pattern = "Action",
                    description = "Search creatures using advanced criteria including stats and abilities",
                    category = "creature_collection",
                    version = "1.0",
                    tags = {
                        {
                            name = "Search-Query",
                            type = "string",
                            required = false,
                            description = "Text search in creature names/species"
                        }
                    }
                },
                {
                    action = "Analyze-Team-Composition",
                    pattern = "Action",
                    description = "Analyze current team composition for effectiveness and strategic value",
                    category = "team_optimization",
                    version = "1.0",
                    tags = {}
                },
                {
                    action = "Get-Team-Recommendations",
                    pattern = "Action",
                    description = "Get strategic team composition recommendations",
                    category = "team_optimization",
                    version = "1.0",
                    tags = {
                        {
                            name = "Formation-Strategy",
                            type = "string",
                            required = false,
                            description = "Desired formation strategy",
                            examples = {"balanced", "offensive", "defensive", "speed"}
                        }
                    }
                },
                {
                    action = "Analyze-Creature-Stats",
                    pattern = "Action",
                    description = "Perform comprehensive analysis of creature stats and combat potential",
                    category = "creature_analysis",
                    version = "1.0",
                    tags = {
                        {
                            name = "Creature-Id",
                            type = "string",
                            required = true,
                            description = "ID of the creature to analyze"
                        }
                    }
                },
                {
                    action = "Calculate-Creature-Stats",
                    pattern = "Action",
                    description = "Calculate comprehensive creature stats including final values and combat effectiveness",
                    category = "creature_stats",
                    version = "1.0",
                    tags = {
                        {
                            name = "Creature-Id",
                            type = "string",
                            required = true,
                            description = "ID of the creature to calculate stats for"
                        }
                    }
                },
                {
                    action = "Compare-Creatures",
                    pattern = "Action",
                    description = "Compare two creatures for strategic analysis and battle recommendations",
                    category = "creature_comparison",
                    version = "1.0",
                    tags = {
                        {
                            name = "Creature-1-Id",
                            type = "string",
                            required = true,
                            description = "ID of the first creature to compare"
                        },
                        {
                            name = "Creature-2-Id",
                            type = "string",
                            required = true,
                            description = "ID of the second creature to compare"
                        },
                        {
                            name = "Scenario",
                            type = "string",
                            required = false,
                            description = "Battle scenario for comparison analysis",
                            examples = {"balanced", "offense_focused", "defense_focused", "speed_focused"}
                        }
                    }
                },
                {
                    action = "Analyze-Creature-Health",
                    pattern = "Action",
                    description = "Analyze creature health status and combat readiness",
                    category = "health_management",
                    version = "1.0",
                    tags = {
                        {
                            name = "Creature-Id",
                            type = "string",
                            required = true,
                            description = "ID of the creature to analyze health for"
                        }
                    }
                },
                {
                    action = "Query-Creature-Progression",
                    pattern = "Action",
                    description = "Get comprehensive creature progression analysis and projections",
                    category = "creature_progression",
                    version = "1.0",
                    tags = {
                        {
                            name = "Creature-Id",
                            type = "string",
                            required = true,
                            description = "ID of the creature to analyze progression for"
                        },
                        {
                            name = "Include-Projections",
                            type = "boolean",
                            required = false,
                            description = "Whether to include long-term progression projections"
                        }
                    }
                },
                {
                    action = "Award-Creature-Experience",
                    pattern = "Action",
                    description = "Award experience points to creature and handle level advancement",
                    category = "creature_progression",
                    version = "1.0",
                    tags = {
                        {
                            name = "Creature-Id",
                            type = "string",
                            required = true,
                            description = "ID of the creature to award experience to"
                        },
                        {
                            name = "Experience-Amount",
                            type = "number",
                            required = true,
                            description = "Amount of experience points to award"
                        },
                        {
                            name = "Experience-Source",
                            type = "string",
                            required = false,
                            description = "Source of the experience (battle, training, etc.)",
                            examples = {"battle", "training", "exploration", "quest"}
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
                "event_coordination",
                "movement_system",
                "collision_detection",
                "position_tracking",
                "movement_validation",
                "movement_history",
                "handler_documentation",
                "interactive_testing",
                "schema_validation",
                "response_format_documentation",
                "handler_versioning",
                "real_time_monitoring",
                "performance_analytics",
                "encounter_system",
                "tuxemon_encounters",
                "encounter_probability_calculation",
                "encounter_zone_management",
                "species_availability_queries",
                "encounter_history_tracking",
                "capture_mechanics",
                "capture_probability_calculation",
                "capture_item_management",
                "captured_creature_collection",
                "deterministic_capture_results",
                "inventory_integration",
                "creature_stat_management",
                "team_composition_management",
                "active_team_management",
                "team_preset_system", 
                "creature_collection_queries",
                "creature_stats_analysis",
                "team_optimization",
                "strategic_team_planning",
                "combat_effectiveness_analysis",
                "type_synergy_calculation",
                "creature_stat_calculation",
                "individual_value_generation",
                "stat_modification_tracking",
                "creature_comparison_analysis",
                "strategic_battle_recommendations",
                "health_status_monitoring",
                "combat_readiness_assessment",
                "healing_recommendation_engine",
                "experience_point_management",
                "level_progression_tracking",
                "milestone_achievement_system",
                "evolution_potential_analysis",
                "progression_rate_analytics",
                "long_term_growth_projections"
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
    
    -- Automatic state persistence maintenance
    local current_time = os.time()
    
    -- Create automatic checkpoint if needed
    if WorldStatePersistence:should_create_checkpoint(current_time) then
        local checkpoint_result = WorldStatePersistence:create_checkpoint(State.world_id, State, current_time)
        if checkpoint_result.success then
            MessageLogger:info("Automatic checkpoint created", {}, {
                checkpoint_id = checkpoint_result.checkpoint_id,
                state_version = checkpoint_result.state_version
            })
        else
            MessageLogger:warn("Automatic checkpoint failed", {}, {
                world_id = State.world_id
            })
        end
    end
    
    -- Create periodic backup
    local backup_result = WorldStatePersistence:create_backup(State.world_id, State, current_time)
    if backup_result.success then
        MessageLogger:debug("Automatic backup created", {}, {
            backup_id = backup_result.backup_id,
            size_bytes = backup_result.size_bytes
        })
    end
    
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

-- Handler for state inspection
local state_inspection_handler = HandlerMetadata.create_handler("state-inspection", {
    action = "Get-State-Snapshot",
    description = "Capture and return current process state for inspection and debugging",
    input_schema = {
        required_tags = {"Action"},
        optional_tags = {"Include-Performance", "Max-Depth", "Filter-Sensitive"}
    },
    output_schema = {
        response_action = "State-Snapshot-Response",
        data_example = {
            snapshot_id = "snap_12345",
            process_id = "world_12345",
            process_type = "world",
            timestamp = 1640995200,
            state_data = {},
            agent_context = {},
            performance_metrics = {}
        }
    }
}, function(msg)
    local timing_id = State.performance_monitor:start_handler_timing("state-inspection", 
        TraceManager:get_current_trace_id() or "state-" .. os.time())
    
    local include_performance = msg.Tags["Include-Performance"] == "true"
    local max_depth = tonumber(msg.Tags["Max-Depth"]) or 10
    local filter_sensitive = msg.Tags["Filter-Sensitive"] ~= "false"
    
    local config = {
        include_performance = include_performance,
        max_depth = max_depth,
        filter_sensitive = filter_sensitive,
        correlation_enabled = true
    }
    
    local snapshot = StateInspector.capture_process_state(
        ao.id or "world-process",
        "world",
        config
    )
    
    local response = ProcessBase.create_adp_response(
        msg.From,
        "State-Snapshot-Response",
        snapshot
    )
    
    ao.send(response)
    State.performance_monitor:end_handler_timing(timing_id, true)
end)
Handlers.add("state-inspection", "Action", "Get-State-Snapshot", state_inspection_handler)

-- Handler for agent state visualization
local agent_state_handler = HandlerMetadata.create_handler("agent-state", {
    action = "Get-Agent-State",
    description = "Get detailed state view for a specific agent including position, inventory, and team",
    input_schema = {
        required_tags = {"Action", "Agent-Id"},
        optional_tags = {"Include-History", "Include-Performance"}
    },
    output_schema = {
        response_action = "Agent-State-Response",
        data_example = {
            agent_id = "agent_12345",
            world_process_id = "world_12345",
            current_position = {x = 10, y = 20},
            inventory_items = {},
            active_team = {},
            session_status = "exploring"
        }
    }
}, function(msg)
    local agent_id = msg.Tags["Agent-Id"]
    
    if not agent_id then
        local response = ProcessBase.create_error_response(
            msg.From,
            "VALIDATION_ERROR",
            "Agent-Id is required"
        )
        ao.send(response)
        return
    end
    
    local agent_state = AgentStateViewer.get_agent_state_view(
        agent_id,
        ao.id or "world-process"
    )
    
    local response = ProcessBase.create_adp_response(
        msg.From,
        "Agent-State-Response",
        agent_state
    )
    
    ao.send(response)
end)
Handlers.add("agent-state", "Action", "Get-Agent-State", agent_state_handler)

-- Handler for world visualization data
local world_visualization_handler = HandlerMetadata.create_handler("world-visualization", {
    action = "Get-World-Visualization",
    description = "Get world map data for visualization including terrain, agents, and items",
    input_schema = {
        required_tags = {"Action"},
        optional_tags = {"Include-History", "Detail-Level"}
    },
    output_schema = {
        response_action = "World-Visualization-Response",
        data_example = {
            world_id = "world_12345",
            terrain_map = [],
            agent_positions = [],
            item_spawns = [],
            encounter_zones = [],
            world_bounds = {}
        }
    }
}, function(msg)
    local visualization_data = AgentStateViewer.get_world_visualization_data(
        ao.id or "world-process"
    )
    
    local response = ProcessBase.create_adp_response(
        msg.From,
        "World-Visualization-Response",
        visualization_data
    )
    
    ao.send(response)
end)
Handlers.add("world-visualization", "Action", "Get-World-Visualization", world_visualization_handler)

-- Handler for real-time state subscriptions
local subscribe_state_handler = HandlerMetadata.create_handler("subscribe-state", {
    action = "Subscribe-State-Updates",
    description = "Subscribe to real-time state change notifications",
    input_schema = {
        required_tags = {"Action"},
        optional_tags = {"Filters", "Update-Interval"}
    },
    output_schema = {
        response_action = "Subscription-Response",
        data_example = {
            subscription_id = "sub_12345",
            status = "active",
            filters = [],
            update_interval = 1000
        }
    }
}, function(msg)
    local filters = {}
    if msg.Tags.Filters then
        -- Parse comma-separated filter list
        for filter in string.gmatch(msg.Tags.Filters, "([^,]+)") do
            table.insert(filters, filter:match("^%s*(.-)%s*$"))  -- trim whitespace
        end
    end
    
    local subscription_id = RealTimeStateManager.subscribe_to_process(
        ao.id or "world-process",
        msg.From,
        function(update_event)
            -- Send state update notification to subscriber
            local notification = ProcessBase.create_adp_response(
                msg.From,
                "State-Update-Notification",
                update_event
            )
            ao.send(notification)
        end,
        filters
    )
    
    local response = ProcessBase.create_adp_response(
        msg.From,
        "Subscription-Response",
        {
            subscription_id = subscription_id,
            status = "active",
            process_id = ao.id or "world-process",
            filters = filters,
            timestamp = os.time()
        }
    )
    
    ao.send(response)
end)
Handlers.add("subscribe-state", "Action", "Subscribe-State-Updates", subscribe_state_handler)

-- Handler for unsubscribing from state updates
local unsubscribe_state_handler = HandlerMetadata.create_handler("unsubscribe-state", {
    action = "Unsubscribe-State-Updates",
    description = "Unsubscribe from real-time state change notifications",
    category = "utility",
    version = "1.0",
    tags = {
        {
            name = "Subscription-Id",
            type = "string",
            required = true,
            description = "ID of the subscription to cancel",
            examples = {"sub_12345", "subscription_789"}
        }
    },
    input_schema = {
        required_tags = {"Action", "Subscription-Id"}
    },
    output_schema = {
        response_action = "Unsubscription-Response",
        data_example = {
            subscription_id = "sub_12345",
            status = "cancelled"
        }
    }
}, function(msg)
    local subscription_id = msg.Tags["Subscription-Id"]
    
    if not subscription_id then
        local response = ProcessBase.create_error_response(
            msg.From,
            "VALIDATION_ERROR",
            "Subscription-Id is required"
        )
        ao.send(response)
        return
    end
    
    RealTimeStateManager.unsubscribe(subscription_id)
    
    local response = ProcessBase.create_adp_response(
        msg.From,
        "Unsubscription-Response",
        {
            subscription_id = subscription_id,
            status = "cancelled",
            timestamp = os.time()
        }
    )
    
    ao.send(response)
end)
Handlers.add("unsubscribe-state", "Action", "Unsubscribe-State-Updates", unsubscribe_state_handler)

-- Handler for manual state checkpoint creation
local create_checkpoint_handler = HandlerMetadata.create_handler("create-checkpoint", {
    action = "Create-Checkpoint",
    description = "Manually create a state checkpoint for backup and recovery",
    category = "persistence",
    version = "1.0",
    tags = {
        {
            name = "Backup-Type",
            type = "string",
            required = false,
            description = "Type of backup to create",
            examples = {"manual", "scheduled", "recovery"},
            default_value = "manual"
        }
    },
    input_schema = {
        required_tags = {"Action"},
        optional_tags = {"Backup-Type", "Auth-Token"}
    },
    output_schema = {
        response_action = "Checkpoint-Response",
        data_example = {
            checkpoint_id = "checkpoint_world_12345_1640995200",
            state_version = "v5",
            timestamp = 1640995200
        }
    }
}, function(msg)
    -- Validate world access authentication
    local agent_id = msg.From
    local auth_token = msg.Tags["Auth-Token"]
    local auth_result = validate_world_access(agent_id, auth_token, "state_access", State.world_id, msg.Timestamp)
    if not auth_result.success then
        local response = ProcessBase.create_error_response(
            msg.From,
            auth_result.error_code,
            auth_result.error_message
        )
        ao.send(response)
        return
    end
    
    -- Create checkpoint
    local checkpoint_result = WorldStatePersistence:create_checkpoint(State.world_id, State, msg.Timestamp)
    
    if checkpoint_result.success then
        ao.send({
            Target = msg.From,
            Action = "Checkpoint-Response",
            ["Checkpoint-Id"] = checkpoint_result.checkpoint_id,
            Data = json.encode({
                status = "checkpoint_created",
                checkpoint_id = checkpoint_result.checkpoint_id,
                state_version = checkpoint_result.state_version,
                state_checksum = checkpoint_result.state_checksum,
                timestamp = msg.Timestamp
            })
        })
    else
        local response = ProcessBase.create_error_response(
            msg.From,
            "CHECKPOINT_FAILED",
            "Failed to create state checkpoint"
        )
        ao.send(response)
    end
end)
Handlers.add("create-checkpoint", "Action", "Create-Checkpoint", create_checkpoint_handler)

-- Handler for state recovery from checkpoint
local restore_checkpoint_handler = HandlerMetadata.create_handler("restore-checkpoint", {
    action = "Restore-Checkpoint",
    description = "Restore world state from a specific checkpoint",
    category = "persistence",
    version = "1.0",
    tags = {
        {
            name = "Checkpoint-Id",
            type = "string",
            required = false,
            description = "Specific checkpoint to restore from (latest if not specified)",
            examples = {"checkpoint_world_12345_1640995200"}
        }
    },
    input_schema = {
        required_tags = {"Action"},
        optional_tags = {"Checkpoint-Id", "Auth-Token"}
    },
    output_schema = {
        response_action = "Restore-Response",
        data_example = {
            status = "restored",
            checkpoint_id = "checkpoint_world_12345_1640995200",
            state_version = "v5"
        }
    }
}, function(msg)
    -- Validate world access authentication (only owner can restore)
    local agent_id = msg.From
    local auth_token = msg.Tags["Auth-Token"]
    
    -- Only owner agent can restore state
    if agent_id ~= State.owner_agent_id then
        local response = ProcessBase.create_error_response(
            msg.From,
            "UNAUTHORIZED",
            "Only world owner can restore state from checkpoint"
        )
        ao.send(response)
        return
    end
    
    local checkpoint_id = msg.Tags["Checkpoint-Id"]
    
    -- Restore from checkpoint
    local restore_result = WorldStatePersistence:restore_from_checkpoint(State.world_id, checkpoint_id, State)
    
    if restore_result.success then
        MessageLogger:info("World state restored from checkpoint", {}, {
            world_id = State.world_id,
            checkpoint_id = restore_result.checkpoint_id,
            restored_by = agent_id
        })
        
        ao.send({
            Target = msg.From,
            Action = "Restore-Response",
            ["Checkpoint-Id"] = restore_result.checkpoint_id,
            Data = json.encode({
                status = "restored",
                checkpoint_id = restore_result.checkpoint_id,
                state_version = restore_result.state_version,
                recovery_timestamp = restore_result.recovery_timestamp
            })
        })
    else
        local response = ProcessBase.create_error_response(
            msg.From,
            restore_result.error_code,
            restore_result.error_message
        )
        ao.send(response)
    end
end)
Handlers.add("restore-checkpoint", "Action", "Restore-Checkpoint", restore_checkpoint_handler)

-- Handler for persistence statistics
local persistence_stats_handler = HandlerMetadata.create_handler("persistence-stats", {
    action = "Get-Persistence-Stats",
    description = "Get world state persistence statistics and backup information",
    category = "utility",
    version = "1.0",
    input_schema = {
        required_tags = {"Action"},
        optional_tags = {"Auth-Token"}
    },
    output_schema = {
        response_action = "Persistence-Stats-Response",
        data_example = {
            total_checkpoints = 5,
            total_backups = 8,
            total_recoveries = 1,
            last_checkpoint_timestamp = 1640995200
        }
    }
}, function(msg)
    -- Validate world access authentication
    local agent_id = msg.From
    local auth_token = msg.Tags["Auth-Token"]
    local auth_result = validate_world_access(agent_id, auth_token, "query", State.world_id, msg.Timestamp)
    if not auth_result.success then
        local response = ProcessBase.create_error_response(
            msg.From,
            auth_result.error_code,
            auth_result.error_message
        )
        ao.send(response)
        return
    end
    
    local stats = WorldStatePersistence:get_persistence_statistics()
    
    ao.send({
        Target = msg.From,
        Action = "Persistence-Stats-Response",
        Data = json.encode(stats)
    })
end)
Handlers.add("persistence-stats", "Action", "Get-Persistence-Stats", persistence_stats_handler)

-- Handler documentation and testing handlers
-- Movement system handlers
Handlers.add("move-agent", "Action", "Move-Agent", MovementHandler.create_move_handler(State))
Handlers.add("query-position", "Action", "Query-Position", WorldStateHandler.create_position_query_handler(State))
Handlers.add("query-world-environment", "Action", "Query-World-Environment", WorldStateHandler.create_world_query_handler(State))

-- World state query system handlers (Story 3.3)
Handlers.add("scan-environment", "Action", "Scan-Environment", WorldStateHandler.create_environment_scan_handler(State))
Handlers.add("inspect-object", "Action", "Inspect-Object", WorldStateHandler.create_object_inspection_handler(State))
Handlers.add("query-available-actions", "Action", "Query-Available-Actions", WorldStateHandler.create_available_actions_handler(State))
Handlers.add("query-world-boundaries", "Action", "Query-World-Boundaries", WorldStateHandler.create_world_boundaries_handler(State))
Handlers.add("subscribe-state-notifications", "Action", "Subscribe-State-Notifications", WorldStateHandler.create_state_notifications_handler(State))
Handlers.add("query-recent-changes", "Action", "Query-Recent-Changes", WorldStateHandler.create_recent_changes_handler(State))

-- Handler documentation and testing handlers
Handlers.add("handler-documentation", "Action", "Get-Handler-Documentation", HandlerDocumentation.create_documentation_handler())
Handlers.add("interactive-testing", "Action", "Interactive-Test", InteractiveTester.create_testing_handler())
Handlers.add("schema-validation", "Action", "Validate-Schema", SchemaValidator.create_validation_handler())
Handlers.add("response-format-docs", "Action", "Get-Response-Format-Docs", ResponseFormatDocs.create_response_docs_handler())
Handlers.add("handler-versioning", "Action", "Handler-Versioning", HandlerVersioning.create_versioning_handler())

-- Session Management handlers (Story 3.4)
Handlers.add("session-init", "Action", "Init-Session", SessionManagement.create_session_init_handler(State))
Handlers.add("session-checkpoint", "Action", "Create-Session-Checkpoint", SessionManagement.create_checkpoint_handler(State))
Handlers.add("session-status", "Action", "Get-Session-Status", SessionManagement.create_session_status_handler(State))
Handlers.add("session-history", "Action", "Get-Session-History", SessionManagement.create_session_history_handler(State))

-- Encounter System handlers (Story 4.1)
Handlers.add("movement-encounter-check", "Action", "Check-Movement-Encounter", EncountersHandler.create_movement_encounter_handler(State.encounters_system))
Handlers.add("encounter-engagement", "Action", "Engage-Encounter", EncountersHandler.create_encounter_engagement_handler(State.encounters_system))
Handlers.add("encounter-info", "Action", "Get-Encounter-Info", EncountersHandler.create_encounter_info_handler(State.encounters_system))
Handlers.add("zone-encounter-rates", "Action", "Get-Zone-Encounter-Rates", EncountersHandler.create_zone_encounter_rates_handler(State.encounters_system))
Handlers.add("encounter-history", "Action", "Get-Encounter-History", EncountersHandler.create_encounter_history_handler(State.encounters_system))

-- Capture System handlers (Story 4.2)
Handlers.add("capture-attempt", "Action", "Attempt-Capture", CaptureHandler.create_capture_attempt_handler(State.capture_system))
Handlers.add("capture-items-query", "Action", "Get-Capture-Items", CaptureHandler.create_capture_items_query_handler(State.capture_system))

-- Captured creature management handlers
Handlers.add("get-captured-creatures", "Action", "Get-Captured-Creatures", 
    function(msg)
        local agent_id = msg.From
        local filter_species = msg.Tags["Filter-Species"]
        local sort_by = msg.Tags["Sort-By"]
        local limit = tonumber(msg.Tags["Limit"]) or nil
        
        local filter_options = {}
        if filter_species then
            filter_options.species_id = filter_species
        end
        if sort_by then
            filter_options.sort_by = sort_by
        end
        if limit then
            filter_options.limit = limit
        end
        
        local collection_data = State.captured_creature_manager:get_agent_collection(agent_id, filter_options)
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Captured-Creatures-Response",
            collection_data
        )
        ao.send(response)
    end
)

Handlers.add("get-collection-stats", "Action", "Get-Collection-Stats",
    function(msg)
        local agent_id = msg.From
        local stats = State.captured_creature_manager:get_collection_statistics(agent_id)
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Collection-Stats-Response",
            stats
        )
        ao.send(response)
    end
)

-- Team Management System handlers (Story 4.3)
Handlers.add("set-active-team", "Action", "Set-Active-Team", 
    TeamManagement.create_set_active_team_handler(State.team_management))

Handlers.add("get-team-composition", "Action", "Get-Team-Composition",
    TeamManagement.create_get_team_composition_handler(State.team_management))

Handlers.add("save-team-preset", "Action", "Save-Team-Preset",
    TeamManagement.create_save_team_preset_handler(State.team_management))

Handlers.add("load-team-preset", "Action", "Load-Team-Preset",
    TeamManagement.create_load_team_preset_handler(State.team_management))

Handlers.add("list-team-presets", "Action", "List-Team-Presets",
    TeamManagement.create_list_team_presets_handler(State.team_management))

-- Creature Collection System handlers (Story 4.3)
Handlers.add("get-creature-collection", "Action", "Get-Creature-Collection",
    CreatureCollection.create_get_collection_handler(State.creature_collection))

Handlers.add("get-creature-details", "Action", "Get-Creature-Details",
    CreatureCollection.create_get_creature_details_handler(State.creature_collection))

Handlers.add("search-creatures", "Action", "Search-Creatures",
    CreatureCollection.create_search_creatures_handler(State.creature_collection))

-- Team Optimization handlers (Story 4.3)
Handlers.add("analyze-team-composition", "Action", "Analyze-Team-Composition",
    function(msg)
        local agent_id = msg.From
        local analysis = State.team_optimizer:analyze_team_composition(agent_id)
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Team-Analysis-Response",
            analysis
        )
        ao.send(response)
    end
)

Handlers.add("get-team-recommendations", "Action", "Get-Team-Recommendations",
    function(msg)
        local agent_id = msg.From
        local formation_strategy = msg.Tags["Formation-Strategy"] or "balanced"
        local recommendations = State.team_optimizer:generate_team_recommendations(agent_id, formation_strategy)
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Team-Recommendations-Response",
            recommendations
        )
        ao.send(response)
    end
)

Handlers.add("analyze-creature-stats", "Action", "Analyze-Creature-Stats",
    function(msg)
        local agent_id = msg.From
        local creature_id = msg.Tags["Creature-Id"]
        
        if not creature_id then
            local response = ProcessBase.create_error_response(
                msg.From,
                "VALIDATION_ERROR",
                "Creature-Id is required"
            )
            ao.send(response)
            return
        end
        
        local creature, error_msg = State.captured_creature_manager:get_creature_by_id(agent_id, creature_id)
        if not creature then
            local response = ProcessBase.create_error_response(
                msg.From,
                "CREATURE_NOT_FOUND",
                error_msg or "Creature not found"
            )
            ao.send(response)
            return
        end
        
        local analysis = State.creature_analyzer:analyze_creature(creature)
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Creature-Analysis-Response",
            analysis
        )
        ao.send(response)
    end
)

-- Story 4.4: Creature Stats & Progression System handlers
Handlers.add("calculate-creature-stats", "Action", "Calculate-Creature-Stats", 
    State.creature_stats:create_calculate_stats_handler())

Handlers.add("compare-creatures", "Action", "Compare-Creatures",
    function(msg)
        local agent_id = msg.From
        local creature1_id = msg.Tags["Creature-1-Id"]
        local creature2_id = msg.Tags["Creature-2-Id"]
        local scenario = msg.Tags["Scenario"] or "balanced"
        
        if not creature1_id or not creature2_id then
            local response = ProcessBase.create_error_response(
                msg.From,
                "VALIDATION_ERROR",
                "Both Creature-1-Id and Creature-2-Id are required"
            )
            ao.send(response)
            return
        end
        
        local comparison, error_msg = State.creature_comparator:compare_creatures(
            agent_id, creature1_id, creature2_id, {scenario = scenario}
        )
        
        if not comparison then
            local response = ProcessBase.create_error_response(
                msg.From,
                "COMPARISON_ERROR",
                error_msg or "Failed to compare creatures"
            )
            ao.send(response)
            return
        end
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Creature-Comparison-Response",
            comparison
        )
        ao.send(response)
    end
)

Handlers.add("analyze-creature-health", "Action", "Analyze-Creature-Health",
    function(msg)
        local agent_id = msg.From
        local creature_id = msg.Tags["Creature-Id"]
        
        if not creature_id then
            local response = ProcessBase.create_error_response(
                msg.From,
                "VALIDATION_ERROR",
                "Creature-Id is required"
            )
            ao.send(response)
            return
        end
        
        local health_analysis, error_msg = State.health_manager:analyze_health_status(agent_id, creature_id)
        
        if not health_analysis then
            local response = ProcessBase.create_error_response(
                msg.From,
                "HEALTH_ANALYSIS_ERROR",
                error_msg or "Failed to analyze creature health"
            )
            ao.send(response)
            return
        end
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Creature-Health-Analysis-Response",
            health_analysis
        )
        ao.send(response)
    end
)

Handlers.add("query-creature-progression", "Action", "Query-Creature-Progression",
    State.creature_progression:create_progression_query_handler())

Handlers.add("award-creature-experience", "Action", "Award-Creature-Experience",
    function(msg)
        local agent_id = msg.From
        local creature_id = msg.Tags["Creature-Id"]
        local experience_amount = tonumber(msg.Tags["Experience-Amount"])
        local experience_source = msg.Tags["Experience-Source"] or "manual"
        
        if not creature_id or not experience_amount then
            local response = ProcessBase.create_error_response(
                msg.From,
                "VALIDATION_ERROR",
                "Creature-Id and Experience-Amount are required"
            )
            ao.send(response)
            return
        end
        
        if experience_amount <= 0 then
            local response = ProcessBase.create_error_response(
                msg.From,
                "VALIDATION_ERROR",
                "Experience-Amount must be positive"
            )
            ao.send(response)
            return
        end
        
        local result = State.creature_progression:award_experience(
            agent_id, creature_id, experience_amount, experience_source
        )
        
        if not result.success then
            local response = ProcessBase.create_error_response(
                msg.From,
                "EXPERIENCE_AWARD_ERROR",
                "Failed to award experience"
            )
            ao.send(response)
            return
        end
        
        -- Track progression analytics
        State.progression_tracker:track_experience_gain(
            creature_id, experience_amount, experience_source, msg.Timestamp
        )
        
        if result.leveled_up then
            State.progression_tracker:track_level_up(
                creature_id, result.old_level, result.new_level, 
                result.level_up_data.stat_increases, msg.Timestamp
            )
        end
        
        local response = ProcessBase.create_adp_response(
            msg.From,
            "Experience-Award-Response",
            result
        )
        ao.send(response)
    end
)

-- Enhanced agent registration with session integration
local enhanced_register_agent = function(msg)
    -- Call original registration handler logic
    register_agent_handler(msg)
    
    -- Update session activity if session exists
    local agent_id = msg.From
    local session = SessionManagement.get_agent_session(agent_id)
    if session then
        SessionManagement.update_session_activity(agent_id, msg.Timestamp, "agent_registration", "exploring")
        SessionTimeout.update_activity(session.session_id, agent_id, "agent_registration", "exploring")
    end
end

-- Override movement handler to integrate with session management
local enhanced_movement_handler = function(msg)
    local agent_id = msg.From
    
    -- Update session activity before movement
    local session = SessionManagement.get_agent_session(agent_id)
    if session then
        SessionManagement.update_session_activity(agent_id, msg.Timestamp, "movement", "exploring")
        SessionTimeout.update_activity(session.session_id, agent_id, "movement", "exploring")
        
        -- Check if significant action checkpoint should be created
        local agent_state = State.WorldState.agents[agent_id]
        if agent_state then
            local should_checkpoint = SessionCheckpoints.should_create_checkpoint(
                agent_id,
                session.session_id,
                session.last_checkpoint_time,
                msg.Timestamp,
                "movement"
            )
            
            if should_checkpoint.should_checkpoint and should_checkpoint.trigger_type == "significant_action" then
                local checkpoint_result = SessionCheckpoints.create_session_checkpoint(
                    agent_id,
                    session.session_id,
                    agent_state,
                    msg.Timestamp,
                    "movement_milestone"
                )
                
                if checkpoint_result.success then
                    session.last_checkpoint_time = msg.Timestamp
                    MessageLogger:info("Movement milestone checkpoint created", {}, {
                        agent_id = agent_id,
                        checkpoint_id = checkpoint_result.checkpoint_id
                    })
                end
            end
        end
    end
    
    -- Call original movement handler
    MovementHandler.create_move_handler(State)(msg)
    
    -- After movement, check for potential encounters (Story 4.1)
    local agent_state = State.WorldState.agents[agent_id]
    if agent_state and agent_state.position then
        -- Trigger encounter check with current position
        local encounter_handler = EncountersHandler.create_movement_encounter_handler(State.encounters_system)
        local encounter_check_msg = {
            From = agent_id,
            Tags = {
                Action = "Check-Movement-Encounter",
                ["Agent-Id"] = agent_id,
                ["Position-X"] = tostring(agent_state.position.x),
                ["Position-Y"] = tostring(agent_state.position.y),
                ["Movement-Type"] = msg.Tags["Movement-Type"] or "walking"
            },
            Timestamp = msg.Timestamp
        }
        
        -- Process encounter check internally (no need to send message)
        pcall(encounter_handler, encounter_check_msg)
    end
end

-- Periodic session maintenance function
local function session_maintenance_cycle()
    local current_time = os.time()
    
    -- Process automatic checkpoints
    local checkpoint_results = SessionManagement.process_automatic_checkpoints(State, current_time)
    
    -- Process session timeouts
    local timeout_results = SessionTimeout.check_timeouts(function(notification)
        if notification.type == "timeout_warning" then
            -- Send warning to agent
            ao.send({
                Target = notification.agent_id,
                Action = "Session-Timeout-Warning",
                ["Session-Id"] = notification.session_id,
                Data = json.encode({
                    warning_type = "session_timeout_approaching",
                    time_until_timeout_ms = notification.time_until_timeout_ms,
                    grace_period_ms = notification.grace_period_ms
                })
            })
        elseif notification.type == "session_disconnected" then
            -- Handle session disconnection
            SessionManagement.terminate_session(notification.agent_id, "timeout")
            
            ao.send({
                Target = notification.agent_id,
                Action = "Session-Disconnected",
                ["Session-Id"] = notification.session_id,
                Data = json.encode({
                    disconnection_reason = "timeout",
                    disconnection_record = notification.disconnection_record
                })
            })
        end
    end)
    
    -- Cleanup old session data
    SessionTimeout.cleanup_old_history(24)  -- Keep 24 hours of history
    
    MessageLogger:debug("Session maintenance completed", {}, {
        checkpoints_created = checkpoint_results.checkpoints_created,
        checkpoints_failed = checkpoint_results.checkpoints_failed,
        timeout_warnings = #timeout_results.warning_sessions,
        timeouts_processed = #timeout_results.timed_out_sessions,
        active_sessions = checkpoint_results.total_active_sessions
    })
end

-- Add session maintenance to periodic maintenance
local original_periodic_maintenance = periodic_maintenance
periodic_maintenance = function()
    -- Call original maintenance
    original_periodic_maintenance()
    
    -- Add session-specific maintenance
    session_maintenance_cycle()
end

-- Main process entry point
print("Tuxemon World Process loaded with ADP v1.0 framework, comprehensive session management, tile-based movement system, collision detection, position tracking, random encounter system, and comprehensive observability")