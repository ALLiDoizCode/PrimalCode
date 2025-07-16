-- Monster AO Process Main Entry Point
-- Autonomous monster behavior with Teal type safety

-- Import required modules
local state_manager = require('utils.state-manager')
local decision_engine = require('utils.decision-engine')
local get_state_handler = require('handlers.get-state')
local environment_handler = require('handlers.environment-update')
local health_handler = require('handlers.health-check')
local communication_handler = require('handlers.monster-communication')

-- Global process state
local PROCESS_VERSION = "1.0.0"
local DECISION_INTERVAL = 60 -- 60 seconds

-- Initialize process on startup
local function initialize_process()
    print("🦾 Initializing Monster AO Process v" .. PROCESS_VERSION)
    
    -- Load or create monster state
    local process_state = state_manager.load_state()
    print("👹 Monster ID: " .. process_state.monster.id)
    print("🧬 Species: " .. process_state.monster.species)
    print("❤️ Health: " .. process_state.monster.stats.health)
    print("🍖 Hunger: " .. process_state.monster.stats.hunger)
    print("⚡ Energy: " .. process_state.monster.stats.energy)
    print("🧠 State: " .. process_state.monster.state)
    
    return process_state
end

-- Autonomous decision cycle (runs every 60 seconds)
local function autonomous_cycle()
    local process_state = state_manager.load_state()
    local monster = process_state.monster
    local current_time = os.time()
    
    -- Check if it's time for a decision
    if current_time >= monster.next_decision_at then
        print("🤔 Making autonomous decision for monster: " .. monster.id)
        
        -- Make decision based on current state
        local decision = decision_engine.make_decision(monster)
        print("📋 Decision: " .. decision.action .. " -> " .. decision.target)
        print("💭 Reasoning: " .. decision.reasoning)
        
        -- Apply decision to monster state
        monster = decision_engine.apply_decision(monster, decision)
        
        -- Save updated state
        local success = state_manager.save_state(monster)
        if success then
            print("💾 State saved successfully")
        else
            print("❌ Failed to save state")
        end
        
        print("⏰ Next decision in " .. decision.next_decision_delay .. " seconds")
    end
    
    -- Perform health check
    local health_ok = health_handler.perform_self_check()
    if not health_ok then
        print("⚠️ Health check failed - monitoring for issues")
    end
end

-- Message handler dispatcher
local function handle_message(msg)
    local action = msg.Action
    local response = ""
    
    print("📨 Received message: " .. action)
    
    if action == "Get-State" then
        response = get_state_handler.handle(msg)
    elseif action == "Get-Stats" then
        response = get_state_handler.handle_stats_only(msg)
    elseif action == "Get-Personality" then
        response = get_state_handler.handle_personality(msg)
    elseif action == "Environment-Change" then
        response = environment_handler.handle(msg)
    elseif action == "Health-Check" then
        response = health_handler.handle(msg)
    elseif action == "Process-Restart" then
        response = health_handler.handle_restart(msg)
    elseif action == "Emergency-Stop" then
        response = health_handler.handle_emergency_stop(msg)
    elseif action == "Monster-Communication" then
        response = communication_handler.handle(msg)
    else
        response = '{"success": false, "error": "Unknown action: ' .. action .. '", "timestamp": ' .. os.time() .. '}'
    end
    
    return response
end

-- AO Process Event Handlers
Handlers.add(
    "autonomous-cycle",
    Handlers.utils.hasMatchingTag("Action", "Cron"),
    function(msg)
        autonomous_cycle()
    end
)

Handlers.add(
    "get-state",
    Handlers.utils.hasMatchingTag("Action", "Get-State"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "get-stats",
    Handlers.utils.hasMatchingTag("Action", "Get-Stats"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "get-personality",
    Handlers.utils.hasMatchingTag("Action", "Get-Personality"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "environment-change",
    Handlers.utils.hasMatchingTag("Action", "Environment-Change"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "health-check",
    Handlers.utils.hasMatchingTag("Action", "Health-Check"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "process-restart",
    Handlers.utils.hasMatchingTag("Action", "Process-Restart"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "emergency-stop",
    Handlers.utils.hasMatchingTag("Action", "Emergency-Stop"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

Handlers.add(
    "monster-communication",
    Handlers.utils.hasMatchingTag("Action", "Monster-Communication"),
    function(msg)
        local response = handle_message(msg)
        Handlers.utils.reply(response)(msg)
    end
)

-- Initialize the process
local process_state = initialize_process()

-- Set up automatic decision cycle (every 60 seconds)
-- Note: In a real AO process, this would use AO's cron functionality
-- For testing, we'll implement a simple timer

print("✅ Monster AO Process initialized successfully!")
print("🔄 Autonomous decision cycle started (60 second intervals)")
print("📡 Listening for messages...")

-- Export for testing
return {
    handle_message = handle_message,
    autonomous_cycle = autonomous_cycle,
    initialize_process = initialize_process,
    version = PROCESS_VERSION
}