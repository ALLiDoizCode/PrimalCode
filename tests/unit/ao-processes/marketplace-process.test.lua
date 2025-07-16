-- Marketplace AO Process Unit Tests
-- AOLite-based tests for marketplace process functionality

local marketplace = require('../../ao-processes/marketplace/src/main')
local json = require('../../ao-processes/marketplace/src/utils/json')

-- Mock AOLite test framework
local function describe(name, fn)
    print("🧪 " .. name)
    fn()
end

local function it(name, fn)
    print("  ✓ " .. name)
    local success, err = pcall(fn)
    if not success then
        print("  ❌ " .. err)
        error(err)
    end
end

local function expect(actual)
    return {
        toBe = function(expected)
            if actual ~= expected then
                error("Expected " .. tostring(expected) .. " but got " .. tostring(actual))
            end
        end,
        toContain = function(substring)
            if not string.find(tostring(actual), substring) then
                error("Expected string to contain '" .. substring .. "' but got '" .. tostring(actual) .. "'")
            end
        end,
        toEqual = function(expected)
            if type(actual) == "table" and type(expected) == "table" then
                -- Simple table comparison
                for k, v in pairs(expected) do
                    if actual[k] ~= v then
                        error("Expected table key '" .. k .. "' to be " .. tostring(v) .. " but got " .. tostring(actual[k]))
                    end
                end
            else
                if actual ~= expected then
                    error("Expected " .. tostring(expected) .. " but got " .. tostring(actual))
                end
            end
        end
    }
end

-- Test setup
describe("Marketplace AO Process", function()
    
    describe("Initialization", function()
        it("should initialize process successfully", function()
            local process_state = marketplace.initialize_process()
            expect(process_state.version).toBe("1.0.0")
            expect(process_state.marketplace).toBe(table)
        end)
    end)
    
    describe("AI Inference Request Processing", function()
        it("should handle valid AI inference request", function()
            local test_message = {
                Action = "AI-Inference-Request",
                From = "test-requester",
                Data = {
                    request_id = "req_test_123",
                    service_type = "monster_decision",
                    context_data = {
                        monster_state = "hunting",
                        environment = "forest"
                    },
                    payment_amount = "100",
                    timeout = 30
                },
                Tags = {
                    ["X-Service-Type"] = "monster_decision",
                    ["X-Request-ID"] = "req_test_123",
                    ["X-Quality-Tier"] = "standard"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(true)
            expect(response_data.request_id).toBe("req_test_123")
        end)
        
        it("should reject invalid AI inference request", function()
            local test_message = {
                Action = "AI-Inference-Request",
                From = "test-requester",
                Data = {
                    -- Missing required fields
                    service_type = "monster_decision"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(false)
            expect(response_data.error).toContain("request_id")
        end)
        
        it("should handle X-metadata correctly", function()
            local test_message = {
                Action = "AI-Inference-Request",
                From = "test-requester",
                Data = {
                    request_id = "req_metadata_test",
                    service_type = "monster_decision",
                    context_data = { monster_state = "hunting" },
                    payment_amount = "100"
                },
                Tags = {
                    ["X-Service-Type"] = "monster_decision",
                    ["X-Request-ID"] = "req_metadata_test",
                    ["X-Quality-Tier"] = "premium",
                    ["X-Urgency"] = "high",
                    ["X-Context-Data"] = "encoded_context"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(true)
            expect(response_data.request_id).toBe("req_metadata_test")
        end)
    end)
    
    describe("Provider Registration", function()
        it("should register provider successfully", function()
            local test_message = {
                Action = "Provider-Registration",
                From = "test-provider",
                Data = {
                    provider_id = "claude-provider-test",
                    capabilities = {"monster_decision", "analysis"},
                    pricing = {
                        monster_decision = "50",
                        analysis = "75"
                    },
                    description = "Test AI provider"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(true)
            expect(response_data.provider_id).toBe("claude-provider-test")
            expect(response_data.status).toBe("registered")
        end)
        
        it("should reject invalid provider registration", function()
            local test_message = {
                Action = "Provider-Registration",
                From = "test-provider",
                Data = {
                    -- Missing required fields
                    provider_id = "invalid-provider"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(false)
            expect(response_data.error).toContain("capabilities")
        end)
    end)
    
    describe("Payment Processing", function()
        it("should process Credit-Notice successfully", function()
            local test_message = {
                Action = "Credit-Notice",
                From = "test-sender",
                Data = {
                    sender = "test-sender",
                    quantity = "100",
                    message = "Payment for AI service"
                },
                Tags = {
                    ["X-Request-ID"] = "req_payment_test",
                    ["X-Service-Type"] = "monster_decision",
                    ["X-Provider-ID"] = "claude-provider-test"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(true)
            expect(response_data.amount).toBe("100")
        end)
        
        it("should process Debit-Notice successfully", function()
            local test_message = {
                Action = "Debit-Notice",
                From = "marketplace",
                Data = {
                    recipient = "claude-provider-test",
                    quantity = "90",
                    message = "Provider payment"
                },
                Tags = {
                    ["X-Request-ID"] = "req_payment_test",
                    ["X-Service-Type"] = "monster_decision",
                    ["X-Provider-ID"] = "claude-provider-test"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(true)
            expect(response_data.amount).toBe("90")
        end)
        
        it("should reject invalid payment notices", function()
            local test_message = {
                Action = "Credit-Notice",
                From = "test-sender",
                Data = {
                    sender = "test-sender",
                    quantity = "invalid_amount",
                    message = "Invalid payment"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(false)
            expect(response_data.error).toContain("quantity")
        end)
    end)
    
    describe("Request Status Queries", function()
        it("should return request status for existing request", function()
            -- First submit a request
            local submit_message = {
                Action = "AI-Inference-Request",
                From = "test-requester",
                Data = {
                    request_id = "req_status_test",
                    service_type = "monster_decision",
                    context_data = { monster_state = "hunting" },
                    payment_amount = "100"
                },
                Tags = {
                    ["X-Service-Type"] = "monster_decision",
                    ["X-Request-ID"] = "req_status_test"
                },
                Timestamp = os.time()
            }
            
            marketplace.handle_message(submit_message)
            
            -- Then query status
            local status_message = {
                Action = "Request-Status",
                From = "test-requester",
                Data = {
                    request_id = "req_status_test"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(status_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(true)
            expect(response_data.request_id).toBe("req_status_test")
        end)
        
        it("should return error for non-existent request", function()
            local test_message = {
                Action = "Request-Status",
                From = "test-requester",
                Data = {
                    request_id = "req_nonexistent"
                },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(false)
            expect(response_data.error).toContain("not found")
        end)
    end)
    
    describe("Health Check", function()
        it("should return healthy status", function()
            local test_message = {
                Action = "Health-Check",
                From = "test-monitor",
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(true)
            expect(response_data.version).toBe("1.0.0")
        end)
    end)
    
    describe("Unknown Actions", function()
        it("should handle unknown actions gracefully", function()
            local test_message = {
                Action = "Unknown-Action",
                From = "test-sender",
                Data = { test = "data" },
                Timestamp = os.time()
            }
            
            local response = marketplace.handle_message(test_message)
            local response_data = json.decode(response)
            
            expect(response_data.success).toBe(false)
            expect(response_data.error).toContain("Unknown action")
        end)
    end)
    
    describe("Cleanup Operations", function()
        it("should perform cleanup cycle", function()
            -- Test cleanup functionality
            local cleanup_result = marketplace.cleanup_cycle()
            -- Cleanup should run without errors
            expect(type(cleanup_result)).toBe("nil") -- cleanup_cycle returns nothing
        end)
        
        it("should process queue cycle", function()
            -- Test queue processing
            local queue_result = marketplace.process_queue_cycle()
            -- Queue processing should run without errors
            expect(type(queue_result)).toBe("nil") -- process_queue_cycle returns nothing
        end)
    end)
end)

-- Test execution
describe("Marketplace State Management", function()
    
    it("should maintain consistent state across operations", function()
        -- Register a provider
        local provider_message = {
            Action = "Provider-Registration",
            From = "test-provider",
            Data = {
                provider_id = "state-test-provider",
                capabilities = {"monster_decision"},
                pricing = { monster_decision = "50" },
                description = "State test provider"
            },
            Timestamp = os.time()
        }
        
        marketplace.handle_message(provider_message)
        
        -- Submit a request
        local request_message = {
            Action = "AI-Inference-Request",
            From = "test-requester",
            Data = {
                request_id = "req_state_test",
                service_type = "monster_decision",
                context_data = { monster_state = "hunting" },
                payment_amount = "50"
            },
            Tags = {
                ["X-Service-Type"] = "monster_decision",
                ["X-Request-ID"] = "req_state_test"
            },
            Timestamp = os.time()
        }
        
        local response = marketplace.handle_message(request_message)
        local response_data = json.decode(response)
        
        -- Should successfully route to the registered provider
        expect(response_data.success).toBe(true)
        expect(response_data.provider_id).toBe("state-test-provider")
    end)
end)

print("🎉 All marketplace process tests completed!")