-- Provider Registration Handler
-- Handles provider registration and service discovery

local types = require('types.marketplace')
local json = require('utils.json')
local state_manager = require('utils.state-manager')

local provider_handler = {}

-- Validate provider registration message
function provider_handler.validate_registration(msg): boolean, string
    if not msg.Data then
        return false, "Missing message data"
    end
    
    local data = msg.Data
    
    if not data.provider_id or type(data.provider_id) ~= "string" then
        return false, "Invalid or missing provider_id"
    end
    
    if not data.capabilities or type(data.capabilities) ~= "table" then
        return false, "Invalid or missing capabilities"
    end
    
    -- Validate capabilities array is not empty
    if #data.capabilities == 0 then
        return false, "Capabilities array cannot be empty"
    end
    
    -- Validate each capability is a string
    for _, capability in ipairs(data.capabilities) do
        if type(capability) ~= "string" then
            return false, "All capabilities must be strings"
        end
    end
    
    if data.pricing and type(data.pricing) ~= "table" then
        return false, "Invalid pricing - must be an object"
    end
    
    -- Validate pricing values are strings representing numbers
    if data.pricing then
        for service_type, price in pairs(data.pricing) do
            if type(price) ~= "string" or not tonumber(price) then
                return false, "Invalid pricing for " .. service_type .. " - must be a string number"
            end
        end
    end
    
    return true, ""
end

-- Create provider from registration data
function provider_handler.create_provider(msg): types.InferenceProvider
    local data = msg.Data
    
    -- Set default pricing for capabilities if not provided
    local pricing: types.ProviderPricing = data.pricing or {}
    if not data.pricing then
        for _, capability in ipairs(data.capabilities) do
            pricing[capability] = "100"  -- Default price
        end
    end
    
    -- Create provider record
    local provider: types.InferenceProvider = {
        provider_id = data.provider_id,
        capabilities = data.capabilities,
        pricing = pricing,
        reputation = {
            response_time_avg = 5000,  -- 5 seconds default
            quality_score = 0.8,       -- 80% default
            completion_rate = 0.95,    -- 95% default
            total_requests = 0
        },
        metadata = {
            last_seen = os.time(),
            x_tags_supported = data.x_tags_supported or {},
            description = data.description or "AI inference provider"
        },
        status = "active"
    }
    
    return provider
end

-- Handle provider registration
function provider_handler.handle_registration(msg): string
    print("👥 Processing provider registration from: " .. msg.From)
    
    -- Validate the registration
    local is_valid, error_message = provider_handler.validate_registration(msg)
    if not is_valid then
        print("❌ Invalid registration: " .. error_message)
        
        return json.encode({
            success = false,
            error = error_message,
            timestamp = os.time()
        })
    end
    
    local data = msg.Data
    
    print("👥 Provider registration details:")
    print("  - Provider ID: " .. data.provider_id)
    print("  - Capabilities: " .. table.concat(data.capabilities, ", "))
    print("  - Description: " .. (data.description or "N/A"))
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Check if provider already exists
    local existing_provider = state_manager.get_provider(marketplace_state, data.provider_id)
    if existing_provider then
        print("📝 Updating existing provider: " .. data.provider_id)
        
        -- Update existing provider
        existing_provider.capabilities = data.capabilities
        existing_provider.pricing = data.pricing or existing_provider.pricing
        existing_provider.metadata.last_seen = os.time()
        existing_provider.metadata.description = data.description or existing_provider.metadata.description
        existing_provider.metadata.x_tags_supported = data.x_tags_supported or existing_provider.metadata.x_tags_supported
        existing_provider.status = "active"
        
        local success = state_manager.update_provider(marketplace_state, existing_provider)
        
        if success then
            print("✅ Provider updated successfully: " .. data.provider_id)
            
            return json.encode({
                success = true,
                provider_id = data.provider_id,
                status = "updated",
                capabilities = data.capabilities,
                timestamp = os.time()
            })
        else
            print("❌ Provider update failed")
            
            return json.encode({
                success = false,
                error = "Failed to update provider",
                timestamp = os.time()
            })
        end
    else
        print("➕ Registering new provider: " .. data.provider_id)
        
        -- Create new provider
        local provider = provider_handler.create_provider(msg)
        
        -- Save provider
        local success = state_manager.update_provider(marketplace_state, provider)
        
        if success then
            print("✅ Provider registered successfully: " .. data.provider_id)
            
            return json.encode({
                success = true,
                provider_id = data.provider_id,
                status = "registered",
                capabilities = data.capabilities,
                timestamp = os.time()
            })
        else
            print("❌ Provider registration failed")
            
            return json.encode({
                success = false,
                error = "Failed to register provider",
                timestamp = os.time()
            })
        end
    end
end

-- Handle provider deregistration
function provider_handler.handle_deregistration(msg): string
    print("👥 Processing provider deregistration from: " .. msg.From)
    
    local data = msg.Data
    if not data or not data.provider_id then
        return json.encode({
            success = false,
            error = "Invalid deregistration - missing provider_id",
            timestamp = os.time()
        })
    end
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Get provider
    local provider = state_manager.get_provider(marketplace_state, data.provider_id)
    if not provider then
        return json.encode({
            success = false,
            error = "Provider not found",
            timestamp = os.time()
        })
    end
    
    -- Update provider status to inactive
    provider.status = "inactive"
    provider.metadata.last_seen = os.time()
    
    local success = state_manager.update_provider(marketplace_state, provider)
    
    if success then
        print("✅ Provider deregistered successfully: " .. data.provider_id)
        
        return json.encode({
            success = true,
            provider_id = data.provider_id,
            status = "deregistered",
            timestamp = os.time()
        })
    else
        print("❌ Provider deregistration failed")
        
        return json.encode({
            success = false,
            error = "Failed to deregister provider",
            timestamp = os.time()
        })
    end
end

-- Handle provider status update
function provider_handler.handle_status_update(msg): string
    print("📊 Processing provider status update from: " .. msg.From)
    
    local data = msg.Data
    if not data or not data.provider_id then
        return json.encode({
            success = false,
            error = "Invalid status update - missing provider_id",
            timestamp = os.time()
        })
    end
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Get provider
    local provider = state_manager.get_provider(marketplace_state, data.provider_id)
    if not provider then
        return json.encode({
            success = false,
            error = "Provider not found",
            timestamp = os.time()
        })
    end
    
    -- Update provider status
    if data.status and (data.status == "active" or data.status == "inactive" or data.status == "suspended") then
        provider.status = data.status
    end
    
    -- Update metadata
    provider.metadata.last_seen = os.time()
    
    -- Update reputation if provided
    if data.reputation then
        if data.reputation.response_time_avg then
            provider.reputation.response_time_avg = data.reputation.response_time_avg
        end
        if data.reputation.quality_score then
            provider.reputation.quality_score = data.reputation.quality_score
        end
        if data.reputation.completion_rate then
            provider.reputation.completion_rate = data.reputation.completion_rate
        end
    end
    
    local success = state_manager.update_provider(marketplace_state, provider)
    
    if success then
        print("✅ Provider status updated successfully: " .. data.provider_id)
        
        return json.encode({
            success = true,
            provider_id = data.provider_id,
            status = provider.status,
            timestamp = os.time()
        })
    else
        print("❌ Provider status update failed")
        
        return json.encode({
            success = false,
            error = "Failed to update provider status",
            timestamp = os.time()
        })
    end
end

-- Handle provider discovery/listing
function provider_handler.handle_discovery(msg): string
    print("🔍 Processing provider discovery from: " .. msg.From)
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    local data = msg.Data
    local service_type = data and data.service_type
    
    -- Get active providers
    local active_providers = state_manager.get_active_providers(marketplace_state)
    
    -- Filter by service type if specified
    if service_type then
        local filtered_providers = {}
        for _, provider in ipairs(active_providers) do
            for _, capability in ipairs(provider.capabilities) do
                if capability == service_type then
                    table.insert(filtered_providers, provider)
                    break
                end
            end
        end
        active_providers = filtered_providers
    end
    
    -- Create response with provider summary
    local provider_list = {}
    for _, provider in ipairs(active_providers) do
        table.insert(provider_list, {
            provider_id = provider.provider_id,
            capabilities = provider.capabilities,
            pricing = provider.pricing,
            reputation = provider.reputation,
            status = provider.status,
            last_seen = provider.metadata.last_seen,
            description = provider.metadata.description
        })
    end
    
    print("🔍 Found " .. #provider_list .. " providers" .. (service_type and " for service: " .. service_type or ""))
    
    return json.encode({
        success = true,
        providers = provider_list,
        total_count = #provider_list,
        service_type = service_type,
        timestamp = os.time()
    })
end

return provider_handler