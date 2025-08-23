-- Tuxemon Registry Management Process
-- AO Process for handling agent registration, discovery, and metadata management
local json = require('json')
-- Load shared framework utilities
local ProcessBase = require('shared.utils.process-base')
-- local ErrorHandler = require('shared.utils.error-handling')
-- local ADPValidator = require('shared.utils.adp-validation')
local HandlerMetadata = require('shared.utils.handler-metadata')
local SelfDocumenting = require('shared.utils.self-documenting')
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
-- Main process entry point
print("Tuxemon Registry Process loaded with ADP v1.0 framework")