-- Progression Tracker Utility
-- Experience management, level advancement tracking, and progression analytics
-- Implements Story 4.4 requirements for progression tracking utilities

local SeededRNG = require('shared.utils.seeded-rng')

local ProgressionTracker = {}

-- Initialize progression tracker
function ProgressionTracker.new()
    local self = {
        experience_history = {},  -- Track experience gains over time
        level_history = {},       -- Track level ups and their timestamps
        milestone_achievements = {}, -- Track milestone completions
        progression_analytics = {}   -- Store calculated progression metrics
    }
    return setmetatable(self, {__index = ProgressionTracker})
end

-- Track experience gain event
function ProgressionTracker:track_experience_gain(creature_id, experience_gained, source, timestamp)
    timestamp = timestamp or os.time()
    
    if not self.experience_history[creature_id] then
        self.experience_history[creature_id] = {}
    end
    
    table.insert(self.experience_history[creature_id], {
        experience_gained = experience_gained,
        source = source,
        timestamp = timestamp,
        running_total = self:calculate_running_total(creature_id) + experience_gained
    })
    
    -- Keep only last 100 entries per creature
    if #self.experience_history[creature_id] > 100 then
        table.remove(self.experience_history[creature_id], 1)
    end
end

-- Track level up event
function ProgressionTracker:track_level_up(creature_id, old_level, new_level, stat_gains, timestamp)
    timestamp = timestamp or os.time()
    
    if not self.level_history[creature_id] then
        self.level_history[creature_id] = {}
    end
    
    table.insert(self.level_history[creature_id], {
        old_level = old_level,
        new_level = new_level,
        levels_gained = new_level - old_level,
        stat_gains = stat_gains,
        timestamp = timestamp
    })
    
    -- Keep only last 50 level up entries per creature
    if #self.level_history[creature_id] > 50 then
        table.remove(self.level_history[creature_id], 1)
    end
end

-- Track milestone achievement
function ProgressionTracker:track_milestone(creature_id, milestone_level, milestone_type, reward_data, timestamp)
    timestamp = timestamp or os.time()
    
    if not self.milestone_achievements[creature_id] then
        self.milestone_achievements[creature_id] = {}
    end
    
    table.insert(self.milestone_achievements[creature_id], {
        milestone_level = milestone_level,
        milestone_type = milestone_type,
        reward_data = reward_data,
        timestamp = timestamp
    })
end

-- Calculate progression rate analytics
function ProgressionTracker:calculate_progression_rate(creature_id, time_window_hours)
    time_window_hours = time_window_hours or 24  -- Default to 24 hours
    local cutoff_time = os.time() - (time_window_hours * 3600)
    
    local analytics = {
        creature_id = creature_id,
        time_window_hours = time_window_hours,
        experience_analytics = self:analyze_experience_rate(creature_id, cutoff_time),
        level_analytics = self:analyze_level_progression(creature_id, cutoff_time),
        activity_patterns = self:analyze_activity_patterns(creature_id, cutoff_time),
        efficiency_metrics = self:calculate_efficiency_metrics(creature_id, cutoff_time)
    }
    
    -- Cache the analytics
    self.progression_analytics[creature_id] = {
        data = analytics,
        timestamp = os.time(),
        time_window = time_window_hours
    }
    
    return analytics
end

-- Analyze experience gain rate
function ProgressionTracker:analyze_experience_rate(creature_id, cutoff_time)
    local experience_events = self.experience_history[creature_id] or {}
    local recent_events = {}
    local total_experience = 0
    local source_breakdown = {}
    
    for _, event in ipairs(experience_events) do
        if event.timestamp >= cutoff_time then
            table.insert(recent_events, event)
            total_experience = total_experience + event.experience_gained
            
            source_breakdown[event.source] = (source_breakdown[event.source] or 0) + event.experience_gained
        end
    end
    
    local hours_elapsed = math.max(1, (os.time() - cutoff_time) / 3600)
    
    return {
        total_experience_gained = total_experience,
        experience_per_hour = total_experience / hours_elapsed,
        experience_events_count = #recent_events,
        events_per_hour = #recent_events / hours_elapsed,
        source_breakdown = source_breakdown,
        most_productive_source = self:find_most_productive_source(source_breakdown),
        experience_trend = self:calculate_experience_trend(recent_events)
    }
end

-- Analyze level progression
function ProgressionTracker:analyze_level_progression(creature_id, cutoff_time)
    local level_events = self.level_history[creature_id] or {}
    local recent_level_ups = {}
    local total_levels_gained = 0
    local total_stat_gains = {hp_max = 0, attack = 0, defense = 0, speed = 0}
    
    for _, event in ipairs(level_events) do
        if event.timestamp >= cutoff_time then
            table.insert(recent_level_ups, event)
            total_levels_gained = total_levels_gained + event.levels_gained
            
            -- Accumulate stat gains
            for stat_name, gain in pairs(event.stat_gains or {}) do
                if total_stat_gains[stat_name] then
                    total_stat_gains[stat_name] = total_stat_gains[stat_name] + gain
                end
            end
        end
    end
    
    local hours_elapsed = math.max(1, (os.time() - cutoff_time) / 3600)
    
    return {
        levels_gained = total_levels_gained,
        level_ups_count = #recent_level_ups,
        levels_per_hour = total_levels_gained / hours_elapsed,
        average_levels_per_event = #recent_level_ups > 0 and (total_levels_gained / #recent_level_ups) or 0,
        stat_gains = total_stat_gains,
        level_up_frequency = #recent_level_ups > 0 and (hours_elapsed / #recent_level_ups) or 0
    }
end

-- Analyze activity patterns
function ProgressionTracker:analyze_activity_patterns(creature_id, cutoff_time)
    local experience_events = self.experience_history[creature_id] or {}
    local hourly_activity = {}
    local daily_totals = {}
    
    -- Initialize hourly buckets
    for hour = 0, 23 do
        hourly_activity[hour] = {experience = 0, events = 0}
    end
    
    for _, event in ipairs(experience_events) do
        if event.timestamp >= cutoff_time then
            local hour = tonumber(os.date("%H", event.timestamp))
            local date = os.date("%Y-%m-%d", event.timestamp)
            
            hourly_activity[hour].experience = hourly_activity[hour].experience + event.experience_gained
            hourly_activity[hour].events = hourly_activity[hour].events + 1
            
            daily_totals[date] = (daily_totals[date] or 0) + event.experience_gained
        end
    end
    
    -- Find peak activity hours
    local peak_hours = self:find_peak_activity_hours(hourly_activity)
    local activity_consistency = self:calculate_activity_consistency(daily_totals)
    
    return {
        hourly_breakdown = hourly_activity,
        daily_totals = daily_totals,
        peak_activity_hours = peak_hours,
        activity_consistency = activity_consistency,
        total_active_days = self:count_table_entries(daily_totals),
        most_productive_day = self:find_most_productive_day(daily_totals)
    }
end

-- Calculate efficiency metrics
function ProgressionTracker:calculate_efficiency_metrics(creature_id, cutoff_time)
    local experience_analytics = self:analyze_experience_rate(creature_id, cutoff_time)
    local level_analytics = self:analyze_level_progression(creature_id, cutoff_time)
    
    local metrics = {
        experience_efficiency = 0,
        level_efficiency = 0,
        source_efficiency = {},
        overall_efficiency_score = 0,
        efficiency_tier = "unknown"
    }
    
    -- Calculate experience efficiency (exp per event)
    if experience_analytics.experience_events_count > 0 then
        metrics.experience_efficiency = experience_analytics.total_experience_gained / experience_analytics.experience_events_count
    end
    
    -- Calculate level efficiency (levels per experience)
    if experience_analytics.total_experience_gained > 0 then
        metrics.level_efficiency = level_analytics.levels_gained / experience_analytics.total_experience_gained * 1000  -- Per 1000 exp
    end
    
    -- Calculate source-specific efficiency
    for source, experience in pairs(experience_analytics.source_breakdown) do
        local source_events = self:count_source_events(creature_id, source, cutoff_time)
        if source_events > 0 then
            metrics.source_efficiency[source] = experience / source_events
        end
    end
    
    -- Calculate overall efficiency score (0-100)
    local base_score = 50
    if metrics.experience_efficiency > 20 then base_score = base_score + 20 end
    if metrics.level_efficiency > 0.5 then base_score = base_score + 20 end
    if experience_analytics.experience_per_hour > 50 then base_score = base_score + 10 end
    
    metrics.overall_efficiency_score = math.min(100, base_score)
    metrics.efficiency_tier = self:determine_efficiency_tier(metrics.overall_efficiency_score)
    
    return metrics
end

-- Generate progression recommendations
function ProgressionTracker:generate_progression_recommendations(creature_id, current_level, target_level)
    target_level = target_level or current_level + 10
    
    local analytics = self.progression_analytics[creature_id]
    if not analytics or analytics.timestamp < (os.time() - 3600) then
        -- Refresh analytics if stale
        analytics = {data = self:calculate_progression_rate(creature_id)}
    end
    
    local recommendations = {
        target_level = target_level,
        current_level = current_level,
        levels_to_gain = target_level - current_level,
        optimization_suggestions = {},
        activity_recommendations = {},
        efficiency_improvements = {},
        time_estimates = {}
    }
    
    local exp_analytics = analytics.data.experience_analytics
    local level_analytics = analytics.data.level_analytics
    local efficiency = analytics.data.efficiency_metrics
    
    -- Time estimates
    if exp_analytics.experience_per_hour > 0 and level_analytics.levels_per_hour > 0 then
        local estimated_hours = recommendations.levels_to_gain / level_analytics.levels_per_hour
        recommendations.time_estimates = {
            estimated_hours = estimated_hours,
            estimated_days = estimated_hours / 8,  -- Assuming 8 hours of active play per day
            confidence = efficiency.overall_efficiency_score > 70 and "high" or "medium"
        }
    end
    
    -- Optimization suggestions
    if exp_analytics.most_productive_source then
        table.insert(recommendations.optimization_suggestions,
            "Focus on " .. exp_analytics.most_productive_source .. " activities for faster progression")
    end
    
    if efficiency.overall_efficiency_score < 60 then
        table.insert(recommendations.optimization_suggestions,
            "Consider improving activity efficiency - current score: " .. efficiency.overall_efficiency_score)
    end
    
    -- Activity recommendations based on patterns
    local activity_patterns = analytics.data.activity_patterns
    if activity_patterns.peak_activity_hours and #activity_patterns.peak_activity_hours > 0 then
        table.insert(recommendations.activity_recommendations,
            "Most productive hours: " .. table.concat(activity_patterns.peak_activity_hours, ", "))
    end
    
    if activity_patterns.activity_consistency < 0.5 then
        table.insert(recommendations.activity_recommendations,
            "Try to maintain more consistent daily activity for better progression")
    end
    
    -- Efficiency improvements
    for source, efficiency_score in pairs(efficiency.source_efficiency) do
        if efficiency_score < 15 then
            table.insert(recommendations.efficiency_improvements,
                "Improve " .. source .. " efficiency (current: " .. math.floor(efficiency_score) .. " exp per event)")
        end
    end
    
    return recommendations
end

-- Predict progression timeline
function ProgressionTracker:predict_progression_timeline(creature_id, current_level, current_experience, target_level)
    local analytics = self.progression_analytics[creature_id]
    if not analytics then
        return nil, "No progression data available for creature"
    end
    
    local exp_rate = analytics.data.experience_analytics.experience_per_hour
    local level_rate = analytics.data.level_analytics.levels_per_hour
    
    if exp_rate <= 0 or level_rate <= 0 then
        return nil, "Insufficient progression data for prediction"
    end
    
    local levels_to_gain = target_level - current_level
    local estimated_hours = levels_to_gain / level_rate
    
    -- Calculate confidence based on data quality
    local confidence = "low"
    if analytics.data.experience_analytics.experience_events_count >= 10 then
        confidence = "medium"
    end
    if analytics.data.experience_analytics.experience_events_count >= 25 and 
       analytics.data.efficiency_metrics.overall_efficiency_score >= 60 then
        confidence = "high"
    end
    
    return {
        target_level = target_level,
        current_level = current_level,
        levels_to_gain = levels_to_gain,
        estimated_timeline = {
            hours = estimated_hours,
            days = estimated_hours / 8,  -- Assuming 8 active hours per day
            weeks = estimated_hours / 56  -- 7 days * 8 hours
        },
        confidence_level = confidence,
        based_on_data = {
            experience_events = analytics.data.experience_analytics.experience_events_count,
            time_window_hours = analytics.time_window
        }
    }
end

-- Helper functions
function ProgressionTracker:calculate_running_total(creature_id)
    local history = self.experience_history[creature_id] or {}
    if #history > 0 then
        return history[#history].running_total or 0
    end
    return 0
end

function ProgressionTracker:find_most_productive_source(source_breakdown)
    local max_source = nil
    local max_experience = 0
    
    for source, experience in pairs(source_breakdown) do
        if experience > max_experience then
            max_experience = experience
            max_source = source
        end
    end
    
    return max_source
end

function ProgressionTracker:calculate_experience_trend(recent_events)
    if #recent_events < 3 then
        return "insufficient_data"
    end
    
    local first_half = {}
    local second_half = {}
    local mid_point = math.floor(#recent_events / 2)
    
    for i = 1, mid_point do
        table.insert(first_half, recent_events[i])
    end
    for i = mid_point + 1, #recent_events do
        table.insert(second_half, recent_events[i])
    end
    
    local first_avg = self:calculate_average_experience(first_half)
    local second_avg = self:calculate_average_experience(second_half)
    
    local change_ratio = second_avg / first_avg
    
    if change_ratio > 1.2 then
        return "increasing"
    elseif change_ratio < 0.8 then
        return "decreasing"
    else
        return "stable"
    end
end

function ProgressionTracker:calculate_average_experience(events)
    if #events == 0 then return 0 end
    
    local total = 0
    for _, event in ipairs(events) do
        total = total + event.experience_gained
    end
    
    return total / #events
end

function ProgressionTracker:find_peak_activity_hours(hourly_activity)
    local peak_hours = {}
    local max_activity = 0
    
    -- Find the maximum activity level
    for hour, data in pairs(hourly_activity) do
        if data.experience > max_activity then
            max_activity = data.experience
        end
    end
    
    -- Find all hours with activity >= 80% of max
    local threshold = max_activity * 0.8
    for hour, data in pairs(hourly_activity) do
        if data.experience >= threshold and data.experience > 0 then
            table.insert(peak_hours, hour)
        end
    end
    
    return peak_hours
end

function ProgressionTracker:calculate_activity_consistency(daily_totals)
    if self:count_table_entries(daily_totals) < 2 then
        return 0
    end
    
    local values = {}
    for _, total in pairs(daily_totals) do
        table.insert(values, total)
    end
    
    local mean = 0
    for _, value in ipairs(values) do
        mean = mean + value
    end
    mean = mean / #values
    
    local variance = 0
    for _, value in ipairs(values) do
        variance = variance + (value - mean) ^ 2
    end
    variance = variance / #values
    
    local coefficient_of_variation = mean > 0 and (math.sqrt(variance) / mean) or 1
    
    -- Return consistency score (0-1, where 1 is perfectly consistent)
    return math.max(0, 1 - coefficient_of_variation)
end

function ProgressionTracker:find_most_productive_day(daily_totals)
    local max_day = nil
    local max_experience = 0
    
    for day, experience in pairs(daily_totals) do
        if experience > max_experience then
            max_experience = experience
            max_day = day
        end
    end
    
    return {day = max_day, experience = max_experience}
end

function ProgressionTracker:count_source_events(creature_id, source, cutoff_time)
    local events = self.experience_history[creature_id] or {}
    local count = 0
    
    for _, event in ipairs(events) do
        if event.timestamp >= cutoff_time and event.source == source then
            count = count + 1
        end
    end
    
    return count
end

function ProgressionTracker:determine_efficiency_tier(score)
    if score >= 90 then
        return "exceptional"
    elseif score >= 75 then
        return "excellent"
    elseif score >= 60 then
        return "good"
    elseif score >= 45 then
        return "average"
    elseif score >= 30 then
        return "below_average"
    else
        return "poor"
    end
end

function ProgressionTracker:count_table_entries(table)
    local count = 0
    for _ in pairs(table) do
        count = count + 1
    end
    return count
end

return ProgressionTracker