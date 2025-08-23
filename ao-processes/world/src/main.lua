-- Tuxemon World Management Process
-- AO Process for handling world state, agent interactions, and environment management
local json = require('json')
-- Load shared framework utilities
local ProcessBase = require('shared.utils.process-base')
local ErrorHandler = require('shared.utils.error-handling')
local ADPValidator = require('shared.utils.adp-validation')
local HandlerMetadata = require('shared.utils.handler-metadata')
local SelfDocumenting = require('shared.utils.self-documenting')
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
        health_monitor = "",
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
    State.world_id = msg.Tags.WorldId or ("world_" .. tostring(msg.Timestamp))
    State.uptime_start = msg.Timestamp
    State.health_monitor = msg.Tags["Health-Monitor"] or ""
    print("World process initialized with ID: " .. State.world_id)
    -- Update metadata system with new process ID
    HandlerMetadata.init("world", State.world_id)
    -- Send registration to health monitor if specified
    if State.health_monitor ~= "" then
        ao.send({
            Target = State.health_monitor,
            Action = "Register-Process",
            ["Process-Id"] = State.world_id,
            ["Process-Type"] = "world",
            ["Process-Name"] = "World Process",
            Data = json.encode({
                process_id = State.world_id,
                process_type = "world",
                capabilities = {"agent_management", "environment_control", "location_management"},
                timestamp = msg.Timestamp
            })
        })
    end
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
    ao.send(response)
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
-- Handler for sending heartbeat to health monitor
local send_heartbeat = function()
    if State.health_monitor and State.health_monitor ~= "" then
        local agent_count = 0
        for _ in pairs(State.agents) do
            agent_count = agent_count + 1
        end
        State.resource_usage.memory_usage = agent_count
        ao.send({
            Target = State.health_monitor,
            Action = "Process-Heartbeat",
            ["Process-Id"] = State.world_id,
            ["Process-Type"] = "world",
            Data = json.encode({
                process_id = State.world_id,
                process_type = "world",
                status = "healthy",
                timestamp = os.time(),
                metrics = State.performance_metrics,
                resource_usage = State.resource_usage
            })
        })
    end
end
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
-- Main process entry point
print("Tuxemon World Process loaded with ADP v1.0 framework")