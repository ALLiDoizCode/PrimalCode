-- Monster Process Test Suite
-- Tests for the AO monster process functionality

local json = require('json')
local utils = require('../../../ao-processes/shared/utils')
local persistence = require('../../../ao-processes/shared/persistence')
local timer = require('../../../ao-processes/shared/timer')

-- Mock AO environment
local mockAO = {
    id = "test-process-id",
    messages = {},
    state = {}
}

-- Mock global functions
ao = mockAO
Handlers = {
    add = function(name, matcher, handler)
        -- Store handlers for testing
        mockAO.handlers = mockAO.handlers or {}
        mockAO.handlers[name] = handler
    end,
    utils = {
        hasMatchingTag = function(tag, value)
            return function(msg)
                return msg.Tags and msg.Tags[tag] == value
            end
        end
    }
}

-- Test framework
local TestFramework = {
    tests = {},
    passed = 0,
    failed = 0,
    current_test = nil
}

function TestFramework:describe(name, fn)
    print("\n=== " .. name .. " ===")
    fn()
end

function TestFramework:it(description, fn)
    self.current_test = description
    print("  • " .. description)
    
    local success, error = pcall(fn)
    if success then
        self.passed = self.passed + 1
        print("    ✓ PASSED")
    else
        self.failed = self.failed + 1
        print("    ✗ FAILED: " .. tostring(error))
    end
end

function TestFramework:assert_equal(actual, expected, message)
    if actual ~= expected then
        error(message or ("Expected " .. tostring(expected) .. " but got " .. tostring(actual)))
    end
end

function TestFramework:assert_not_nil(value, message)
    if value == nil then
        error(message or "Expected value to not be nil")
    end
end

function TestFramework:assert_true(condition, message)
    if not condition then
        error(message or "Expected condition to be true")
    end
end

function TestFramework:assert_false(condition, message)
    if condition then
        error(message or "Expected condition to be false")
    end
end

function TestFramework:assert_type(value, expected_type, message)
    if type(value) ~= expected_type then
        error(message or ("Expected type " .. expected_type .. " but got " .. type(value)))
    end
end

function TestFramework:print_summary()
    print("\n=== Test Summary ===")
    print("Total tests: " .. (self.passed + self.failed))
    print("Passed: " .. self.passed)
    print("Failed: " .. self.failed)
    
    if self.failed > 0 then
        print("❌ Some tests failed!")
        return false
    else
        print("✅ All tests passed!")
        return true
    end
end

-- Helper functions
local function create_mock_message(action, data, from)
    return {
        Action = action,
        Data = data and json.encode(data) or nil,
        From = from or "test-sender",
        Tags = {
            Action = action
        }
    }
end

local function create_test_monster_data()
    return {
        monster_id = "test_monster_123",
        species = "basic_monster",
        created_at = os.date("%Y-%m-%d %H:%M:%S"),
        stats = {
            health = 85,
            hunger = 30,
            energy = 70,
            position = {
                x = 15,
                y = 25,
                route = "forest_path"
            }
        },
        ai_personality = {
            aggression = 0.6,
            intelligence = 0.7,
            pack_tendency = 0.4
        },
        environmental_awareness = {
            detected_structures = {"tree", "rock"},
            resource_memory = {
                {type = "food", location = {x = 10, y = 20}, timestamp = os.time()}
            },
            weather_adaptation = 0.6
        },
        influence_resistance = {
            learned_patterns = {
                player_behavior = "aggressive"
            },
            adaptation_history = {
                {modification_type = "food_placed", timestamp = os.time(), response = "adapted"}
            }
        },
        state = "hunting",
        last_decision = {
            action = "hunt",
            reasoning = "High hunger level requires hunting",
            timestamp = os.time()
        },
        next_decision_at = os.time() + 60,
        process_health = {
            status = "healthy",
            last_heartbeat = os.time(),
            error_count = 0,
            restart_count = 0
        }
    }
end

-- Load the monster process
dofile('../../../ao-processes/monster-process.lua')

-- Test Suites

TestFramework:describe("Monster State Initialization", function()
    TestFramework:it("should initialize with default values", function()
        TestFramework:assert_not_nil(monster_id, "Monster ID should be initialized")
        TestFramework:assert_not_nil(species, "Species should be initialized")
        TestFramework:assert_not_nil(stats, "Stats should be initialized")
        TestFramework:assert_not_nil(ai_personality, "AI personality should be initialized")
        TestFramework:assert_not_nil(environmental_awareness, "Environmental awareness should be initialized")
        TestFramework:assert_not_nil(influence_resistance, "Influence resistance should be initialized")
        TestFramework:assert_not_nil(state, "State should be initialized")
        TestFramework:assert_not_nil(process_health, "Process health should be initialized")
    end)
    
    TestFramework:it("should have valid initial stats", function()
        TestFramework:assert_true(stats.health >= 0 and stats.health <= 100, "Health should be between 0 and 100")
        TestFramework:assert_true(stats.hunger >= 0 and stats.hunger <= 100, "Hunger should be between 0 and 100")
        TestFramework:assert_true(stats.energy >= 0 and stats.energy <= 100, "Energy should be between 0 and 100")
        TestFramework:assert_not_nil(stats.position, "Position should be initialized")
        TestFramework:assert_type(stats.position.x, "number", "Position X should be a number")
        TestFramework:assert_type(stats.position.y, "number", "Position Y should be a number")
    end)
    
    TestFramework:it("should have valid personality traits", function()
        TestFramework:assert_true(ai_personality.aggression >= 0 and ai_personality.aggression <= 1, "Aggression should be between 0 and 1")
        TestFramework:assert_true(ai_personality.intelligence >= 0 and ai_personality.intelligence <= 1, "Intelligence should be between 0 and 1")
        TestFramework:assert_true(ai_personality.pack_tendency >= 0 and ai_personality.pack_tendency <= 1, "Pack tendency should be between 0 and 1")
    end)
end)

TestFramework:describe("Message Handlers", function()
    TestFramework:it("should handle Get-State messages", function()
        local msg = create_mock_message("Get-State", nil, "test-client")
        local handler = mockAO.handlers["Get-State"]
        
        TestFramework:assert_not_nil(handler, "Get-State handler should exist")
        
        -- Mock ao.send to capture response
        local captured_response = nil
        mockAO.send = function(response)
            captured_response = response
        end
        
        handler(msg)
        
        TestFramework:assert_not_nil(captured_response, "Response should be sent")
        TestFramework:assert_equal(captured_response.Action, "State-Response", "Should respond with State-Response")
        TestFramework:assert_not_nil(captured_response.Data, "Response should contain data")
        
        -- Parse and validate response data
        local response_data = json.decode(captured_response.Data)
        TestFramework:assert_not_nil(response_data.monster_id, "Response should contain monster_id")
        TestFramework:assert_not_nil(response_data.stats, "Response should contain stats")
        TestFramework:assert_not_nil(response_data.ai_personality, "Response should contain ai_personality")
    end)
    
    TestFramework:it("should handle Update-State messages", function()
        local update_data = {
            stats = {
                health = 95,
                hunger = 20,
                energy = 85
            },
            state = "resting"
        }
        
        local msg = create_mock_message("Update-State", update_data, "test-client")
        local handler = mockAO.handlers["Update-State"]
        
        TestFramework:assert_not_nil(handler, "Update-State handler should exist")
        
        -- Mock ao.send to capture response
        local captured_response = nil
        mockAO.send = function(response)
            captured_response = response
        end
        
        handler(msg)
        
        TestFramework:assert_not_nil(captured_response, "Response should be sent")
        TestFramework:assert_equal(captured_response.Action, "Update-State-Response", "Should respond with Update-State-Response")
        TestFramework:assert_equal(captured_response.Success, "true", "Update should succeed")
    end)
    
    TestFramework:it("should handle Environment-Change messages", function()
        local change_data = {
            route_id = "forest_path",
            modification_type = "food_placed",
            location = {x = 15, y = 25}
        }
        
        local msg = create_mock_message("Environment-Change", change_data, "test-client")
        local handler = mockAO.handlers["Environment-Change"]
        
        TestFramework:assert_not_nil(handler, "Environment-Change handler should exist")
        
        -- Mock ao.send to capture response
        local captured_response = nil
        mockAO.send = function(response)
            captured_response = response
        end
        
        handler(msg)
        
        TestFramework:assert_not_nil(captured_response, "Response should be sent")
        TestFramework:assert_equal(captured_response.Action, "Environment-Change-Response", "Should respond with Environment-Change-Response")
        TestFramework:assert_equal(captured_response.Success, "true", "Environment change should succeed")
    end)
    
    TestFramework:it("should handle Monster-Communication messages", function()
        local comm_data = {
            message_type = "territory_warning",
            sender_id = "other_monster_456",
            content = "This is my territory"
        }
        
        local msg = create_mock_message("Monster-Communication", comm_data, "test-client")
        local handler = mockAO.handlers["Monster-Communication"]
        
        TestFramework:assert_not_nil(handler, "Monster-Communication handler should exist")
        
        -- Mock ao.send to capture response
        local captured_response = nil
        mockAO.send = function(response)
            captured_response = response
        end
        
        handler(msg)
        
        TestFramework:assert_not_nil(captured_response, "Response should be sent")
        TestFramework:assert_equal(captured_response.Action, "Monster-Communication-Response", "Should respond with Monster-Communication-Response")
        TestFramework:assert_equal(captured_response.Success, "true", "Communication should succeed")
    end)
    
    TestFramework:it("should handle Health-Check messages", function()
        local msg = create_mock_message("Health-Check", nil, "test-client")
        local handler = mockAO.handlers["Health-Check"]
        
        TestFramework:assert_not_nil(handler, "Health-Check handler should exist")
        
        -- Mock ao.send to capture response
        local captured_response = nil
        mockAO.send = function(response)
            captured_response = response
        end
        
        handler(msg)
        
        TestFramework:assert_not_nil(captured_response, "Response should be sent")
        TestFramework:assert_equal(captured_response.Action, "Health-Check-Response", "Should respond with Health-Check-Response")
        TestFramework:assert_not_nil(captured_response.Status, "Response should contain status")
        TestFramework:assert_not_nil(captured_response.Uptime, "Response should contain uptime")
    end)
end)

TestFramework:describe("State Persistence", function()
    TestFramework:it("should create valid state snapshots", function()
        local monster_data = create_test_monster_data()
        local snapshot = persistence.create_snapshot(monster_data)
        
        TestFramework:assert_not_nil(snapshot, "Snapshot should be created")
        TestFramework:assert_equal(snapshot.monster_id, monster_data.monster_id, "Monster ID should match")
        TestFramework:assert_equal(snapshot.species, monster_data.species, "Species should match")
        TestFramework:assert_not_nil(snapshot.stats, "Stats should be included")
        TestFramework:assert_not_nil(snapshot.ai_personality, "AI personality should be included")
        TestFramework:assert_not_nil(snapshot.version, "Version should be included")
        TestFramework:assert_not_nil(snapshot.timestamp, "Timestamp should be included")
    end)
    
    TestFramework:it("should validate state integrity", function()
        local monster_data = create_test_monster_data()
        local valid, error = persistence.validate_state(monster_data)
        
        TestFramework:assert_true(valid, "Valid state should pass validation: " .. (error or ""))
        
        -- Test invalid state
        local invalid_data = {
            monster_id = "test",
            -- Missing required fields
        }
        
        local invalid_valid, invalid_error = persistence.validate_state(invalid_data)
        TestFramework:assert_false(invalid_valid, "Invalid state should fail validation")
        TestFramework:assert_not_nil(invalid_error, "Error message should be provided")
    end)
    
    TestFramework:it("should prepare Arweave backup data", function()
        local monster_data = create_test_monster_data()
        local backup_data, error = persistence.prepare_arweave_backup(monster_data)
        
        TestFramework:assert_not_nil(backup_data, "Backup data should be prepared: " .. (error or ""))
        TestFramework:assert_not_nil(backup_data.backup_metadata, "Backup metadata should be included")
        TestFramework:assert_not_nil(backup_data.backup_metadata.backup_id, "Backup ID should be generated")
        TestFramework:assert_not_nil(backup_data.backup_metadata.backup_type, "Backup type should be set")
    end)
end)

TestFramework:describe("Utility Functions", function()
    TestFramework:it("should validate number ranges", function()
        TestFramework:assert_equal(utils.validate_number_range(50, 0, 100, 0), 50, "Valid number should pass through")
        TestFramework:assert_equal(utils.validate_number_range(-10, 0, 100, 0), 0, "Negative number should be clamped to minimum")
        TestFramework:assert_equal(utils.validate_number_range(150, 0, 100, 0), 100, "Large number should be clamped to maximum")
        TestFramework:assert_equal(utils.validate_number_range("invalid", 0, 100, 25), 25, "Non-number should return default")
    end)
    
    TestFramework:it("should validate stats structure", function()
        local valid_stats = {
            health = 85,
            hunger = 30,
            energy = 70,
            position = {x = 10, y = 20, route = "test"}
        }
        
        local validated = utils.validate_stats(valid_stats)
        TestFramework:assert_equal(validated.health, 85, "Health should be preserved")
        TestFramework:assert_equal(validated.hunger, 30, "Hunger should be preserved")
        TestFramework:assert_equal(validated.energy, 70, "Energy should be preserved")
        TestFramework:assert_not_nil(validated.position, "Position should be preserved")
        
        local invalid_stats = {
            health = 150,
            hunger = -10,
            energy = "invalid"
        }
        
        local validated_invalid = utils.validate_stats(invalid_stats)
        TestFramework:assert_equal(validated_invalid.health, 100, "Health should be clamped to maximum")
        TestFramework:assert_equal(validated_invalid.hunger, 0, "Hunger should be clamped to minimum")
        TestFramework:assert_equal(validated_invalid.energy, 100, "Energy should use default for invalid value")
    end)
    
    TestFramework:it("should handle JSON safely", function()
        local valid_data = {test = "value", number = 42}
        local json_result, error = utils.safe_json_encode(valid_data)
        
        TestFramework:assert_not_nil(json_result, "Valid data should encode successfully")
        TestFramework:assert_equal(error, nil, "No error should be returned for valid data")
        
        local decoded_result, decode_error = utils.safe_json_decode(json_result)
        TestFramework:assert_not_nil(decoded_result, "Valid JSON should decode successfully")
        TestFramework:assert_equal(decode_error, nil, "No error should be returned for valid JSON")
        TestFramework:assert_equal(decoded_result.test, "value", "Decoded data should match original")
    end)
end)

TestFramework:describe("Timer System", function()
    TestFramework:it("should create and manage timers", function()
        local callback_count = 0
        local test_callback = function()
            callback_count = callback_count + 1
        end
        
        local timer_obj = timer.start("test_timer", 1, test_callback)
        TestFramework:assert_not_nil(timer_obj, "Timer should be created")
        TestFramework:assert_equal(timer_obj.id, "test_timer", "Timer ID should match")
        TestFramework:assert_true(timer.is_active("test_timer"), "Timer should be active")
        
        -- Process timers (simulate time passing)
        timer.process_all()
        
        timer.stop("test_timer")
        TestFramework:assert_false(timer.is_active("test_timer"), "Timer should be inactive after stopping")
    end)
    
    TestFramework:it("should handle timer health checks", function()
        local health_info = timer.health_check()
        TestFramework:assert_not_nil(health_info, "Health info should be returned")
        TestFramework:assert_type(health_info.total_timers, "number", "Total timers should be a number")
        TestFramework:assert_type(health_info.active_timers, "number", "Active timers should be a number")
        TestFramework:assert_type(health_info.total_executions, "number", "Total executions should be a number")
    end)
end)

-- Run all tests
local success = TestFramework:print_summary()

-- Exit with appropriate code
if success then
    os.exit(0)
else
    os.exit(1)
end