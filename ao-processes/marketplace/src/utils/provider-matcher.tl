-- Provider Matching Algorithm
-- Handles provider selection based on capabilities, availability, and performance

local types = require("types.marketplace")

local provider_matcher = {}

-- Calculate match score between request and provider
function provider_matcher.calculate_match_score(request: types.InferenceRequest, provider: types.InferenceProvider): number
    local score = 0.0
    
    -- Service type capability check (essential)
    local has_capability = false
    for _, capability in ipairs(provider.capabilities) do
        if capability == request.service_type then
            has_capability = true
            break
        end
    end
    
    if not has_capability then
        return 0.0  -- No match if provider doesn't support the service type
    end
    
    -- Base score for capability match
    score = score + 40.0
    
    -- Reputation scoring (0-30 points)
    local reputation = provider.reputation
    if reputation then
        -- Quality score contribution (0-10 points)
        score = score + (reputation.quality_score * 10.0)
        
        -- Completion rate contribution (0-10 points)  
        score = score + (reputation.completion_rate * 10.0)
        
        -- Response time contribution (0-10 points, inverted - faster is better)
        local response_time_score = math.max(0, 10.0 - (reputation.response_time_avg / 1000.0))
        score = score + response_time_score
    end
    
    -- Provider status bonus (0-10 points)
    if provider.status == "active" then
        score = score + 10.0
    elseif provider.status == "inactive" then
        score = score + 5.0
    end
    
    -- X-metadata tag support bonus (0-10 points)
    if provider.metadata and provider.metadata.x_tags_supported then
        local supported_tags = 0
        for x_tag, _ in pairs(request.x_metadata) do
            for _, supported_tag in ipairs(provider.metadata.x_tags_supported) do
                if supported_tag == x_tag then
                    supported_tags = supported_tags + 1
                    break
                end
            end
        end
        
        local tag_total = 0
        for _ in pairs(request.x_metadata) do
            tag_total = tag_total + 1
        end
        
        if tag_total > 0 then
            score = score + (supported_tags / tag_total) * 10.0
        end
    end
    
    -- Recency bonus (0-10 points)
    if provider.metadata and provider.metadata.last_seen then
        local current_time = os.time()
        local time_since_seen = current_time - provider.metadata.last_seen
        local recency_score = math.max(0, 10.0 - (time_since_seen / 3600.0))  -- 1 hour decay
        score = score + recency_score
    end
    
    return math.min(100.0, score)  -- Cap at 100
end

-- Check if provider is available for request
function provider_matcher.is_provider_available(provider: types.InferenceProvider): boolean
    if provider.status ~= "active" then
        return false
    end
    
    -- Check if provider has been seen recently (within last hour)
    if provider.metadata and provider.metadata.last_seen then
        local current_time = os.time()
        local time_since_seen = current_time - provider.metadata.last_seen
        if time_since_seen > 3600 then  -- 1 hour
            return false
        end
    end
    
    return true
end

-- Estimate cost for provider service
function provider_matcher.estimate_cost(request: types.InferenceRequest, provider: types.InferenceProvider): string
    if provider.pricing and provider.pricing[request.service_type] then
        return provider.pricing[request.service_type]
    end
    
    -- Default fallback cost
    return "100"
end

-- Estimate completion time based on provider reputation
function provider_matcher.estimate_completion_time(provider: types.InferenceProvider): number
    if provider.reputation and provider.reputation.response_time_avg then
        return provider.reputation.response_time_avg
    end
    
    -- Default estimate: 5 seconds
    return 5000
end

-- Find best matching provider for request
function provider_matcher.find_best_provider(request: types.InferenceRequest, providers: {types.InferenceProvider}): types.ProviderMatchResult | nil
    local best_match: types.ProviderMatchResult | nil = nil
    local best_score = 0.0
    
    for _, provider in ipairs(providers) do
        local is_available = provider_matcher.is_provider_available(provider)
        local match_score = provider_matcher.calculate_match_score(request, provider)
        
        if match_score > best_score then
            best_score = match_score
            best_match = {
                provider_id = provider.provider_id,
                match_score = match_score,
                available = is_available,
                estimated_cost = provider_matcher.estimate_cost(request, provider),
                estimated_time = provider_matcher.estimate_completion_time(provider)
            }
        end
    end
    
    return best_match
end

-- Find top N matching providers
function provider_matcher.find_top_providers(request: types.InferenceRequest, providers: {types.InferenceProvider}, count: number): {types.ProviderMatchResult}
    local matches = {}
    
    for _, provider in ipairs(providers) do
        local is_available = provider_matcher.is_provider_available(provider)
        local match_score = provider_matcher.calculate_match_score(request, provider)
        
        if match_score > 0 then
            table.insert(matches, {
                provider_id = provider.provider_id,
                match_score = match_score,
                available = is_available,
                estimated_cost = provider_matcher.estimate_cost(request, provider),
                estimated_time = provider_matcher.estimate_completion_time(provider)
            })
        end
    end
    
    -- Sort by match score (descending)
    table.sort(matches, function(a, b)
        return a.match_score > b.match_score
    end)
    
    -- Return top N matches
    local result = {}
    for i = 1, math.min(count, #matches) do
        table.insert(result, matches[i])
    end
    
    return result
end

-- Filter providers by service type
function provider_matcher.filter_by_service_type(providers: {types.InferenceProvider}, service_type: string): {types.InferenceProvider}
    local filtered = {}
    
    for _, provider in ipairs(providers) do
        for _, capability in ipairs(provider.capabilities) do
            if capability == service_type then
                table.insert(filtered, provider)
                break
            end
        end
    end
    
    return filtered
end

-- Load balance requests across providers
function provider_matcher.select_load_balanced_provider(request: types.InferenceRequest, providers: {types.InferenceProvider}): types.ProviderMatchResult | nil
    local capable_providers = provider_matcher.filter_by_service_type(providers, request.service_type)
    
    if #capable_providers == 0 then
        return nil
    end
    
    -- Get available providers
    local available_providers = {}
    for _, provider in ipairs(capable_providers) do
        if provider_matcher.is_provider_available(provider) then
            table.insert(available_providers, provider)
        end
    end
    
    if #available_providers == 0 then
        return nil
    end
    
    -- Simple round-robin selection based on total requests
    local selected_provider = available_providers[1]
    local min_requests = selected_provider.reputation.total_requests
    
    for _, provider in ipairs(available_providers) do
        if provider.reputation.total_requests < min_requests then
            min_requests = provider.reputation.total_requests
            selected_provider = provider
        end
    end
    
    return {
        provider_id = selected_provider.provider_id,
        match_score = provider_matcher.calculate_match_score(request, selected_provider),
        available = true,
        estimated_cost = provider_matcher.estimate_cost(request, selected_provider),
        estimated_time = provider_matcher.estimate_completion_time(selected_provider)
    }
end

return provider_matcher