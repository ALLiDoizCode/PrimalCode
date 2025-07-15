-- Timer System for AO Processes
-- Provides interval-based execution for autonomous behaviors

local utils = require('.utils')

local timer = {}
local active_timers = {}

-- Timer structure
local function create_timer(id, interval, callback, initial_delay)
    return {
        id = id,
        interval = interval,
        callback = callback,
        next_execution = os.time() + (initial_delay or interval),
        active = true,
        execution_count = 0,
        last_execution = 0,
        created_at = os.time()
    }
end

-- Start a recurring timer
function timer.start(id, interval_seconds, callback, initial_delay)
    if active_timers[id] then
        utils.log_debug("Timer " .. id .. " already exists, stopping previous instance")
        timer.stop(id)
    end
    
    local timer_obj = create_timer(id, interval_seconds, callback, initial_delay)
    active_timers[id] = timer_obj
    
    utils.log_debug("Timer " .. id .. " started with " .. interval_seconds .. "s interval")
    return timer_obj
end

-- Stop a timer
function timer.stop(id)
    if active_timers[id] then
        active_timers[id].active = false
        active_timers[id] = nil
        utils.log_debug("Timer " .. id .. " stopped")
        return true
    end
    return false
end

-- Check if timer is active
function timer.is_active(id)
    return active_timers[id] and active_timers[id].active
end

-- Get timer info
function timer.get_info(id)
    return active_timers[id]
end

-- Process all active timers - should be called regularly
function timer.process_all()
    local current_time = os.time()
    local executed_count = 0
    
    for id, timer_obj in pairs(active_timers) do
        if timer_obj.active and current_time >= timer_obj.next_execution then
            -- Execute callback
            local success, result = pcall(timer_obj.callback)
            
            if success then
                timer_obj.execution_count = timer_obj.execution_count + 1
                timer_obj.last_execution = current_time
                timer_obj.next_execution = current_time + timer_obj.interval
                executed_count = executed_count + 1
                
                utils.log_debug("Timer " .. id .. " executed successfully (count: " .. timer_obj.execution_count .. ")")
            else
                utils.log_error("Timer " .. id .. " callback failed: " .. tostring(result))
                -- Don't stop timer on callback failure, just log and continue
                timer_obj.next_execution = current_time + timer_obj.interval
            end
        end
    end
    
    if executed_count > 0 then
        utils.log_debug("Processed " .. executed_count .. " timer executions")
    end
    
    return executed_count
end

-- Get all active timers
function timer.get_all_active()
    local active_list = {}
    for id, timer_obj in pairs(active_timers) do
        if timer_obj.active then
            table.insert(active_list, {
                id = id,
                interval = timer_obj.interval,
                next_execution = timer_obj.next_execution,
                execution_count = timer_obj.execution_count,
                last_execution = timer_obj.last_execution,
                created_at = timer_obj.created_at
            })
        end
    end
    return active_list
end

-- Stop all timers
function timer.stop_all()
    local count = 0
    for id, _ in pairs(active_timers) do
        timer.stop(id)
        count = count + 1
    end
    utils.log_debug("Stopped " .. count .. " timers")
    return count
end

-- Reschedule a timer (change interval)
function timer.reschedule(id, new_interval_seconds)
    local timer_obj = active_timers[id]
    if timer_obj then
        timer_obj.interval = new_interval_seconds
        timer_obj.next_execution = os.time() + new_interval_seconds
        utils.log_debug("Timer " .. id .. " rescheduled to " .. new_interval_seconds .. "s interval")
        return true
    end
    return false
end

-- Pause a timer
function timer.pause(id)
    local timer_obj = active_timers[id]
    if timer_obj then
        timer_obj.active = false
        utils.log_debug("Timer " .. id .. " paused")
        return true
    end
    return false
end

-- Resume a paused timer
function timer.resume(id)
    local timer_obj = active_timers[id]
    if timer_obj then
        timer_obj.active = true
        timer_obj.next_execution = os.time() + timer_obj.interval
        utils.log_debug("Timer " .. id .. " resumed")
        return true
    end
    return false
end

-- Get time until next execution
function timer.time_until_next(id)
    local timer_obj = active_timers[id]
    if timer_obj then
        return math.max(0, timer_obj.next_execution - os.time())
    end
    return nil
end

-- Health check for timer system
function timer.health_check()
    local current_time = os.time()
    local health_info = {
        total_timers = 0,
        active_timers = 0,
        overdue_timers = 0,
        total_executions = 0
    }
    
    for id, timer_obj in pairs(active_timers) do
        health_info.total_timers = health_info.total_timers + 1
        health_info.total_executions = health_info.total_executions + timer_obj.execution_count
        
        if timer_obj.active then
            health_info.active_timers = health_info.active_timers + 1
            
            if current_time > timer_obj.next_execution + timer_obj.interval then
                health_info.overdue_timers = health_info.overdue_timers + 1
            end
        end
    end
    
    return health_info
end

return timer