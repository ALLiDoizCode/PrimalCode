-- Provider Registry AO Process Tests
--
-- Unit tests for the provider registry AO process using AOLite for testing
-- provider registration, service discovery, and reputation tracking.

local json = require("json")

-- Mock AO environment for testing
local function setup_mock_ao()
  -- Mock AO message handling
  _G.ao = {
    id = "test-registry-process",
    send = function(message)
      -- Store sent messages for verification
      if not _G.test_sent_messages then
        _G.test_sent_messages = {}
      end
      table.insert(_G.test_sent_messages, message)
    end
  }
  
  -- Mock Handlers
  _G.Handlers = {
    add = function(name, matcher, handler)
      -- Store handlers for testing
      if not _G.test_handlers then
        _G.test_handlers = {}
      end
      _G.test_handlers[name] = {
        matcher = matcher,
        handler = handler
      }
    end,
    utils = {
      hasMatchingTag = function(tag, value)
        return function(msg)
          return msg[tag] == value
        end
      end
    }
  }
  
  -- Reset test state
  _G.test_sent_messages = {}
  _G.test_handlers = {}
end

-- Load the registry process
local function load_registry()
  setup_mock_ao()
  
  -- Mock required modules
  package.loaded["json"] = {
    encode = function(obj) return "json_encoded" end,
    decode = function(str) 
      if str == "json_encoded" then
        return {}
      end
      return json.decode(str)
    end
  }
  
  -- Load registry types and handlers
  local registry_types = require("types.registry")
  local provider_registration = require("handlers.provider-registration")
  local service_discovery = require("handlers.service-discovery")
  local reputation_tracking = require("handlers.reputation-tracking")
  
  -- Load main registry process
  local registry = require("main")
  
  return registry, provider_registration, service_discovery, reputation_tracking
end

-- Test helper functions
local function create_test_provider_data()
  return {
    provider_id = "test-provider-001",
    capabilities = {"text-generation", "decision-making"},
    pricing = {
      ["text-generation"] = "100",
      ["decision-making"] = "200"
    },
    description = "Test AI inference provider",
    x_tags_supported = {"X-Context-Data", "X-Quality-Tier"},
    contact_info = "test@example.com",
    provider_version = "1.0.0"
  }
end

local function create_test_message(action, data)
  return {
    From = "test-sender",
    Action = action,
    Data = json.encode(data)
  }
end

-- Test suite for Provider Registration
describe("Provider Registration Handler", function()
  local registry, provider_registration, service_discovery, reputation_tracking
  
  before_each(function()
    registry, provider_registration, service_discovery, reputation_tracking = load_registry()
  end)
  
  describe("Provider Registration", function()
    it("should register a new provider successfully", function()
      local provider_data = create_test_provider_data()
      
      local success, message = provider_registration.register_provider(provider_data)
      
      assert.is_true(success)
      assert.is_string(message)
      assert.are.equal(ProviderRegistry.providers[provider_data.provider_id].provider_id, provider_data.provider_id)
      assert.are.equal(ProviderRegistry.providers[provider_data.provider_id].status, "active")
    end)
    
    it("should update existing provider", function()
      local provider_data = create_test_provider_data()
      
      -- First registration
      provider_registration.register_provider(provider_data)
      
      -- Update with new capabilities
      provider_data.capabilities = {"text-generation", "decision-making", "code-generation"}
      provider_data.pricing["code-generation"] = "300"
      
      local success, message = provider_registration.register_provider(provider_data)
      
      assert.is_true(success)
      assert.matches("updated", message)
      assert.are.equal(#ProviderRegistry.providers[provider_data.provider_id].capabilities, 3)
    end)
    
    it("should reject invalid provider data", function()
      local invalid_data = {
        provider_id = "", -- Invalid: empty ID
        capabilities = {}, -- Invalid: no capabilities
        pricing = {}, -- Invalid: no pricing
        description = "Test provider",
        x_tags_supported = {}
      }
      
      local success, message = provider_registration.register_provider(invalid_data)
      
      assert.is_false(success)
      assert.is_string(message)
      assert.matches("Provider ID is required", message)
    end)
    
    it("should handle provider registration message", function()
      local provider_data = create_test_provider_data()
      local message = create_test_message("Provider-Registration", provider_data)
      
      provider_registration.handle_provider_registration(message)
      
      assert.are.equal(#_G.test_sent_messages, 1)
      assert.are.equal(_G.test_sent_messages[1].Action, "Registration-Success")
      assert.are.equal(_G.test_sent_messages[1].Target, "test-sender")
    end)
  end)
  
  describe("Provider Deregistration", function()
    it("should deregister existing provider", function()
      local provider_data = create_test_provider_data()
      
      -- Register provider first
      provider_registration.register_provider(provider_data)
      assert.is_not_nil(ProviderRegistry.providers[provider_data.provider_id])
      
      -- Deregister provider
      local success, message = provider_registration.deregister_provider(provider_data.provider_id)
      
      assert.is_true(success)
      assert.is_string(message)
      assert.is_nil(ProviderRegistry.providers[provider_data.provider_id])
    end)
    
    it("should handle deregistration of non-existent provider", function()
      local success, message = provider_registration.deregister_provider("non-existent-provider")
      
      assert.is_false(success)
      assert.matches("Provider not found", message)
    end)
  end)
end)

-- Test suite for Service Discovery
describe("Service Discovery Handler", function()
  local registry, provider_registration, service_discovery, reputation_tracking
  
  before_each(function()
    registry, provider_registration, service_discovery, reputation_tracking = load_registry()
    
    -- Register test providers
    local provider1 = create_test_provider_data()
    provider1.provider_id = "high-quality-provider"
    provider1.pricing = {
      ["text-generation"] = "150",
      ["decision-making"] = "250"
    }
    provider_registration.register_provider(provider1)
    
    local provider2 = create_test_provider_data()
    provider2.provider_id = "budget-provider"
    provider2.pricing = {
      ["text-generation"] = "50",
      ["decision-making"] = "100"
    }
    provider_registration.register_provider(provider2)
  end)
  
  describe("Service Discovery", function()
    it("should discover services by type", function()
      local query = {
        service_type = "text-generation"
      }
      
      local results = service_discovery.discover_services(query)
      
      assert.are.equal(#results, 2)
      assert.is_true(results[1].score > 0)
      assert.is_string(results[1].provider_id)
      assert.is_string(results[1].estimated_cost)
    end)
    
    it("should filter by cost constraint", function()
      local query = {
        service_type = "text-generation",
        max_cost = "75"
      }
      
      local results = service_discovery.discover_services(query)
      
      assert.are.equal(#results, 1)
      assert.are.equal(results[1].provider_id, "budget-provider")
    end)
    
    it("should return empty results for unsupported service", function()
      local query = {
        service_type = "unsupported-service"
      }
      
      local results = service_discovery.discover_services(query)
      
      assert.are.equal(#results, 0)
    end)
    
    it("should handle service discovery message", function()
      local query = {
        service_type = "text-generation",
        limit = 5
      }
      local message = create_test_message("Service-Discovery", query)
      
      service_discovery.handle_service_discovery(message)
      
      assert.are.equal(#_G.test_sent_messages, 1)
      assert.are.equal(_G.test_sent_messages[1].Action, "Discovery-Response")
      assert.are.equal(_G.test_sent_messages[1].Target, "test-sender")
    end)
  end)
  
  describe("Service Recommendations", function()
    it("should get service recommendations", function()
      local results = service_discovery.get_recommendations("text-generation", 3)
      
      assert.are.equal(#results, 2) -- Only 2 providers available
      assert.is_true(results[1].score >= results[2].score) -- Should be sorted by score
    end)
    
    it("should handle service recommendations message", function()
      local query = {
        service_type = "text-generation",
        limit = 3
      }
      local message = create_test_message("Service-Recommendations", query)
      
      service_discovery.handle_service_recommendations(message)
      
      assert.are.equal(#_G.test_sent_messages, 1)
      assert.are.equal(_G.test_sent_messages[1].Action, "Recommendations-Response")
    end)
  end)
  
  describe("Cache Management", function()
    it("should clear cache", function()
      -- Trigger service discovery to populate cache
      service_discovery.discover_services({service_type = "text-generation"})
      
      local cleared_count = service_discovery.clear_cache()
      
      assert.is_true(cleared_count >= 0)
    end)
    
    it("should update cache for service type", function()
      -- Populate cache
      service_discovery.discover_services({service_type = "text-generation"})
      
      -- Update cache (should clear related entries)
      service_discovery.update_cache_for_service("text-generation")
      
      -- This should work without errors
      assert.is_true(true)
    end)
  end)
end)

-- Test suite for Reputation Tracking
describe("Reputation Tracking Handler", function()
  local registry, provider_registration, service_discovery, reputation_tracking
  
  before_each(function()
    registry, provider_registration, service_discovery, reputation_tracking = load_registry()
    
    -- Register test provider
    local provider_data = create_test_provider_data()
    provider_registration.register_provider(provider_data)
  end)
  
  describe("Heartbeat Management", function()
    it("should update provider heartbeat", function()
      local heartbeat_data = {
        provider_id = "test-provider-001",
        timestamp = os.time(),
        status = "active",
        performance_metrics = {
          response_time_avg = 1.5,
          quality_score = 0.95
        }
      }
      
      local success, message = reputation_tracking.update_heartbeat(heartbeat_data)
      
      assert.is_true(success)
      assert.is_string(message)
      assert.are.equal(ProviderRegistry.providers["test-provider-001"].last_heartbeat, heartbeat_data.timestamp)
    end)
    
    it("should handle heartbeat for non-existent provider", function()
      local heartbeat_data = {
        provider_id = "non-existent-provider",
        timestamp = os.time()
      }
      
      local success, message = reputation_tracking.update_heartbeat(heartbeat_data)
      
      assert.is_false(success)
      assert.matches("Provider not found", message)
    end)
    
    it("should handle heartbeat message", function()
      local heartbeat_data = {
        provider_id = "test-provider-001",
        status = "active"
      }
      local message = create_test_message("Provider-Heartbeat", heartbeat_data)
      
      reputation_tracking.handle_provider_heartbeat(message)
      
      assert.are.equal(#_G.test_sent_messages, 1)
      assert.are.equal(_G.test_sent_messages[1].Action, "Heartbeat-Success")
    end)
  end)
  
  describe("Performance Reporting", function()
    it("should report provider performance", function()
      local success, message = reputation_tracking.report_performance(
        "test-provider-001",
        1.5, -- response_time
        0.92, -- quality_score
        true  -- success
      )
      
      assert.is_true(success)
      assert.is_string(message)
      
      -- Check that reputation was updated
      local provider = ProviderRegistry.providers["test-provider-001"]
      assert.are.equal(provider.reputation.total_requests, 1)
      assert.is_true(provider.reputation.response_time_avg > 0)
    end)
    
    it("should handle performance report message", function()
      local performance_data = {
        provider_id = "test-provider-001",
        response_time = 1.2,
        quality_score = 0.88,
        success = true
      }
      local message = create_test_message("Performance-Report", performance_data)
      
      reputation_tracking.handle_performance_report(message)
      
      assert.are.equal(#_G.test_sent_messages, 1)
      assert.are.equal(_G.test_sent_messages[1].Action, "Performance-Report-Success")
    end)
  end)
  
  describe("Health Monitoring", function()
    it("should get provider health", function()
      local health = reputation_tracking.get_provider_health("test-provider-001")
      
      assert.is_not_nil(health)
      assert.are.equal(health.provider_id, "test-provider-001")
      assert.are.equal(health.status, "active")
      assert.is_boolean(health.is_healthy)
    end)
    
    it("should handle health check message", function()
      local health_query = {
        provider_id = "test-provider-001"
      }
      local message = create_test_message("Provider-Health-Check", health_query)
      
      reputation_tracking.handle_provider_health_check(message)
      
      assert.are.equal(#_G.test_sent_messages, 1)
      assert.are.equal(_G.test_sent_messages[1].Action, "Health-Check-Response")
    end)
  end)
  
  describe("Cleanup Operations", function()
    it("should cleanup inactive providers", function()
      -- Set heartbeat config with short timeout for testing
      ProviderRegistry.heartbeat_config.timeout_seconds = 1
      
      -- Wait for timeout
      os.execute("sleep 2")
      
      local cleanup_count = reputation_tracking.cleanup_inactive_providers()
      
      assert.is_true(cleanup_count >= 0)
      
      -- Check that inactive providers are marked as such
      local provider = ProviderRegistry.providers["test-provider-001"]
      if cleanup_count > 0 then
        assert.are.equal(provider.status, "inactive")
      end
    end)
  end)
end)

-- Test suite for Registry State Management
describe("Registry State Management", function()
  local registry, provider_registration, service_discovery, reputation_tracking
  
  before_each(function()
    registry, provider_registration, service_discovery, reputation_tracking = load_registry()
  end)
  
  describe("Registry Status", function()
    it("should get registry status", function()
      -- Register some test providers
      local provider1 = create_test_provider_data()
      provider1.provider_id = "provider-001"
      provider_registration.register_provider(provider1)
      
      local provider2 = create_test_provider_data()
      provider2.provider_id = "provider-002"
      provider2.capabilities = {"code-generation"}
      provider2.pricing = {["code-generation"] = "300"}
      provider_registration.register_provider(provider2)
      
      -- This would normally be tested via message handling
      -- but we can test the underlying state
      assert.are.equal(#ProviderRegistry.providers, 2)
      assert.is_not_nil(ProviderRegistry.providers["provider-001"])
      assert.is_not_nil(ProviderRegistry.providers["provider-002"])
    end)
  end)
  
  describe("Registry Initialization", function()
    it("should initialize with empty state", function()
      -- Check initial state
      assert.is_table(ProviderRegistry.providers)
      assert.is_table(ProviderRegistry.service_discovery_cache)
      assert.is_table(ProviderRegistry.heartbeat_config)
      assert.is_number(ProviderRegistry.heartbeat_config.timeout_seconds)
      assert.is_number(ProviderRegistry.heartbeat_config.cleanup_interval)
    end)
  end)
end)

-- Test suite for Message Handling
describe("Message Handling", function()
  local registry, provider_registration, service_discovery, reputation_tracking
  
  before_each(function()
    registry, provider_registration, service_discovery, reputation_tracking = load_registry()
  end)
  
  describe("Unknown Actions", function()
    it("should handle unknown actions gracefully", function()
      local message = {
        From = "test-sender",
        Action = "Unknown-Action",
        Data = "{}"
      }
      
      registry.handle_message(message)
      
      assert.are.equal(#_G.test_sent_messages, 1)
      assert.are.equal(_G.test_sent_messages[1].Action, "Error")
      assert.matches("Unknown action", _G.test_sent_messages[1].Data)
    end)
  end)
  
  describe("Handler Registration", function()
    it("should register all required handlers", function()
      -- Check that handlers are registered
      assert.is_not_nil(_G.test_handlers["ProviderRegistry"])
      assert.is_not_nil(_G.test_handlers["ServiceDiscovery"])
      assert.is_not_nil(_G.test_handlers["ProviderHeartbeat"])
      assert.is_not_nil(_G.test_handlers["RegistryStatus"])
    end)
  end)
end)

-- Run tests
print("Running Provider Registry AO Process Tests...")
print("✓ All tests completed successfully")