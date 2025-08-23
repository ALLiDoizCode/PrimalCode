-- Standardized Error Handling for AO Processes
-- Provides structured error codes and circuit breaker functionality
local json = require('json')
-- Error Code Ranges by Process Type
local ERROR_CODES = {
    -- World Process: WORLD_001 to WORLD_099
    WORLD = {
        INVALID_LOCATION = "WORLD_001",
        AGENT_NOT_FOUND = "WORLD_002",
        LOCATION_OCCUPIED = "WORLD_003",
        INVALID_MOVEMENT = "WORLD_004",
        ENVIRONMENT_ERROR = "WORLD_005"
        -- Reserved: WORLD_006 to WORLD_099
    },
    -- Battle Process: BATTLE_100 to BATTLE_199
    BATTLE = {
        BATTLE_NOT_FOUND = "BATTLE_100",
        INVALID_ACTION = "BATTLE_101",
        PLAYER_NOT_IN_BATTLE = "BATTLE_102",
        BATTLE_ALREADY_ENDED = "BATTLE_103",
        INVALID_TUXEMON = "BATTLE_104",
        ACTION_NOT_ALLOWED = "BATTLE_105"
        -- Reserved: BATTLE_106 to BATTLE_199
    },
    -- Registry Process: REGISTRY_200 to REGISTRY_299
    REGISTRY = {
        AGENT_ALREADY_REGISTERED = "REGISTRY_200",
        AGENT_NOT_REGISTERED = "REGISTRY_201",
        INVALID_AGENT_DATA = "REGISTRY_202",
        REPUTATION_ERROR = "REGISTRY_203",
        SERVICE_UNAVAILABLE = "REGISTRY_204"
        -- Reserved: REGISTRY_205 to REGISTRY_299
    },
    -- Health Monitor Process: HEALTH_300 to HEALTH_399
    HEALTH = {
        SYSTEM_OVERLOAD = "HEALTH_300",
        SERVICE_DOWN = "HEALTH_301",
        METRICS_ERROR = "HEALTH_302",
        HEARTBEAT_TIMEOUT = "HEALTH_303"
        -- Reserved: HEALTH_304 to HEALTH_399
    },
    -- Common Errors: COMMON_400 to COMMON_500
    COMMON = {
        INVALID_INPUT = "COMMON_400",
        VALIDATION_FAILED = "COMMON_401",
        TIMEOUT = "COMMON_402",
        RATE_LIMITED = "COMMON_403",
        INTERNAL_ERROR = "COMMON_500"
    }
}
-- Circuit Breaker State
local CircuitBreaker = {
    failed_agents = {},
    failure_threshold = 5,
    reset_timeout = 300 -- 5 minutes
}
-- Error Handling Module
local ErrorHandler = {}
-- Get error codes for a specific process type
function ErrorHandler.get_codes(process_type)
    return ERROR_CODES[string.upper(process_type)] or ERROR_CODES.COMMON
end
-- Create structured error response
function ErrorHandler.create_error(error_code, message, details, agent_id)
    local error_response = {
        error = {
            code = error_code,
            message = message,
            timestamp = os.time()
        }
    }
    if details then
        error_response.error.details = details
    end
    -- Track agent failures for circuit breaker
    if agent_id then
        ErrorHandler.track_agent_failure(agent_id)
    end
    return error_response
end
-- Track agent failures for circuit breaker
function ErrorHandler.track_agent_failure(agent_id)
    if not CircuitBreaker.failed_agents[agent_id] then
        CircuitBreaker.failed_agents[agent_id] = {
            count = 0,
            last_failure = 0,
            blocked_until = 0
        }
    end
    local agent_record = CircuitBreaker.failed_agents[agent_id]
    agent_record.count = agent_record.count + 1
    agent_record.last_failure = os.time()
    -- Block agent if threshold exceeded
    if agent_record.count >= CircuitBreaker.failure_threshold then
        agent_record.blocked_until = os.time() + CircuitBreaker.reset_timeout
        print("Circuit breaker activated for agent: " .. agent_id)
    end
end
-- Check if agent is blocked by circuit breaker
function ErrorHandler.is_agent_blocked(agent_id)
    local agent_record = CircuitBreaker.failed_agents[agent_id]
    if not agent_record then
        return false
    end
    local current_time = os.time()
    -- Reset if timeout has passed
    if agent_record.blocked_until > 0 and current_time >= agent_record.blocked_until then
        agent_record.count = 0
        agent_record.blocked_until = 0
        print("Circuit breaker reset for agent: " .. agent_id)
        return false
    end
    return agent_record.blocked_until > current_time
end
-- Reset circuit breaker for an agent
function ErrorHandler.reset_circuit_breaker(agent_id)
    if CircuitBreaker.failed_agents[agent_id] then
        CircuitBreaker.failed_agents[agent_id] = {
            count = 0,
            last_failure = 0,
            blocked_until = 0
        }
        print("Circuit breaker manually reset for agent: " .. agent_id)
    end
end
-- Get circuit breaker status
function ErrorHandler.get_circuit_breaker_status()
    local status = {
        blocked_agents = {},
        total_blocked = 0
    }
    local current_time = os.time()
    for agent_id, record in pairs(CircuitBreaker.failed_agents) do
        if record.blocked_until > current_time then
            status.blocked_agents[agent_id] = {
                failure_count = record.count,
                blocked_until = record.blocked_until,
                time_remaining = record.blocked_until - current_time
            }
            status.total_blocked = status.total_blocked + 1
        end
    end
    return status
end
-- Validate handler timeout (2 seconds per NFR requirements)
function ErrorHandler.with_timeout(handler_func, timeout_seconds)
    timeout_seconds = timeout_seconds or 2
    return function(msg)
        local start_time = os.time()
        -- Execute handler
        local success, result = pcall(handler_func, msg)
        local execution_time = os.time() - start_time
        if execution_time > timeout_seconds then
            return ErrorHandler.create_error(
                ERROR_CODES.COMMON.TIMEOUT,
                "Handler execution exceeded timeout",
                {
                    timeout = timeout_seconds,
                    actual_time = execution_time
                },
                msg.From
            )
        end
        if not success then
            return ErrorHandler.create_error(
                ERROR_CODES.COMMON.INTERNAL_ERROR,
                "Handler execution failed",
                { error = tostring(result) },
                msg.From
            )
        end
        return result
    end
end
-- Format error for ADP response
function ErrorHandler.format_adp_error(error_code, message, details)
    return {
        error = {
            code = error_code,
            message = message,
            details = details or {},
            timestamp = os.time(),
            adp_version = "1.0"
        }
    }
end
return ErrorHandler