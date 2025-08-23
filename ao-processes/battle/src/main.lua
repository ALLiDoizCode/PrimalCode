-- Tuxemon Battle Resolution Process
-- AO Process for handling battle logic, turn management, and combat resolution
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
        process_id = "",
        process_type = "battle",
        active_battles = {},
        battle_history = {},
        stats = {
            total_battles = 0,
            battles_today = 0
        },
        health_monitor = "",
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
-- Handler for battle initiation
Handlers.add("start-battle", "Action", "Start-Battle",
    function(msg)
        local battle_id = "battle_" .. tostring(msg.Timestamp)
        local participant1 = msg.From
        local participant2 = msg.Tags.Opponent or ""
        State.active_battles[battle_id] = {
            id = battle_id,
            participants = {participant1, participant2},
            status = "active",
            turn = 1,
            current_player = participant1,
            started_at = msg.Timestamp
        }
        State.stats.total_battles = State.stats.total_battles + 1
        print("Battle started: " .. battle_id)
        -- Notify both participants
        for _, participant in ipairs({participant1, participant2}) do
            if participant ~= "" then
                ao.send({
                    Target = participant,
                    Action = "Battle-Started",
                    BattleId = battle_id,
                    Data = json.encode({
                        battle_id = battle_id,
                        participants = State.active_battles[battle_id].participants,
                        your_turn = participant == participant1
                    })
                })
            end
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
-- Main process entry point
print("Tuxemon Battle Process loaded with ADP v1.0 framework")