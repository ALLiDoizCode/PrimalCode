local record PerformanceAlerts
  type AlertSeverity = "CRITICAL" | "WARNING" | "INFO"
  
  type PerformanceThreshold = record
    metric_name: string
    threshold_value: number
    severity: AlertSeverity
    comparison: "greater_than" | "less_than" | "equals"
    enabled: boolean
  end
  
  type PerformanceAlert = record
    alert_id: string
    process_id: string
    metric_type: string
    threshold_value: number
    actual_value: number
    severity: AlertSeverity
    timestamp: number
    resolution_timestamp: number?
    correlation_id: string
    message: string
    resolved: boolean
  end
  
  type AlertConfig = record
    max_active_alerts: number
    alert_cooldown_ms: number
    auto_resolve_after_ms: number
    notification_enabled: boolean
    correlation_enabled: boolean
  end
  
  active_alerts: {PerformanceAlert}
  alert_history: {PerformanceAlert}
  thresholds: {PerformanceThreshold}
  config: AlertConfig
  alert_cooldowns: {string: number} -- metric_type -> last_alert_time
  correlation_tracer: any -- Links to trace-manager from Story 2.1
  
  new: function(config: AlertConfig?): PerformanceAlerts
  add_threshold: function(self: PerformanceAlerts, threshold: PerformanceThreshold)
  remove_threshold: function(self: PerformanceAlerts, metric_name: string): boolean
  check_metrics: function(self: PerformanceAlerts, process_id: string, metrics: any): {PerformanceAlert}
  trigger_alert: function(self: PerformanceAlerts, process_id: string, metric_type: string, threshold_value: number, actual_value: number, severity: AlertSeverity, correlation_id: string?): PerformanceAlert
  resolve_alert: function(self: PerformanceAlerts, alert_id: string): boolean
  auto_resolve_alerts: function(self: PerformanceAlerts)
  get_active_alerts: function(self: PerformanceAlerts): {PerformanceAlert}
  get_alert_history: function(self: PerformanceAlerts): {PerformanceAlert}
  clear_old_alerts: function(self: PerformanceAlerts)
  is_in_cooldown: function(self: PerformanceAlerts, metric_type: string): boolean
  set_correlation_tracer: function(self: PerformanceAlerts, tracer: any)
  generate_alert_message: function(self: PerformanceAlerts, metric_type: string, actual_value: number, threshold_value: number, severity: AlertSeverity): string
  get_alerts_by_severity: function(self: PerformanceAlerts, severity: AlertSeverity): {PerformanceAlert}
  get_alerts_by_process: function(self: PerformanceAlerts, process_id: string): {PerformanceAlert}
end

local PerformanceAlerts = {}
PerformanceAlerts.__index = PerformanceAlerts

-- Create new performance alerts manager
function PerformanceAlerts.new(config: PerformanceAlerts.AlertConfig?): PerformanceAlerts
  local alerts = setmetatable({} as PerformanceAlerts, PerformanceAlerts)
  
  alerts.active_alerts = {}
  alerts.alert_history = {}
  alerts.thresholds = {}
  alerts.alert_cooldowns = {}
  
  -- Default configuration
  alerts.config = config or {
    max_active_alerts = 50,
    alert_cooldown_ms = 60000, -- 1 minute cooldown between same metric alerts
    auto_resolve_after_ms = 300000, -- Auto-resolve after 5 minutes
    notification_enabled = true,
    correlation_enabled = true
  }
  
  -- Initialize default thresholds
  alerts:add_threshold({
    metric_name = "execution_time_ms",
    threshold_value = 2000, -- 2 second handler timeout limit
    severity = "CRITICAL",
    comparison = "greater_than",
    enabled = true
  })
  
  alerts:add_threshold({
    metric_name = "memory_usage_bytes",
    threshold_value = 1073741824, -- 1GB memory usage
    severity = "WARNING",
    comparison = "greater_than",
    enabled = true
  })
  
  alerts:add_threshold({
    metric_name = "error_rate",
    threshold_value = 5.0, -- 5% error rate
    severity = "WARNING",
    comparison = "greater_than",
    enabled = true
  })
  
  alerts:add_threshold({
    metric_name = "queue_depth",
    threshold_value = 50, -- Max acceptable queue depth
    severity = "CRITICAL",
    comparison = "greater_than",
    enabled = true
  })
  
  alerts:add_threshold({
    metric_name = "concurrent_requests",
    threshold_value = 20, -- Overload threshold
    severity = "WARNING",
    comparison = "greater_than",
    enabled = true
  })
  
  return alerts
end

-- Add performance threshold
function PerformanceAlerts:add_threshold(threshold: PerformanceAlerts.PerformanceThreshold)
  self.thresholds[threshold.metric_name] = threshold
end

-- Remove performance threshold
function PerformanceAlerts:remove_threshold(metric_name: string): boolean
  if self.thresholds[metric_name] then
    self.thresholds[metric_name] = nil
    return true
  end
  return false
end

-- Check metrics against thresholds and trigger alerts
function PerformanceAlerts:check_metrics(process_id: string, metrics: any): {PerformanceAlerts.PerformanceAlert}
  local triggered_alerts: {PerformanceAlerts.PerformanceAlert} = {}
  
  for metric_name, threshold in pairs(self.thresholds) do
    if not threshold.enabled then
      goto continue
    end
    
    local metric_value = metrics[metric_name]
    if not metric_value then
      goto continue
    end
    
    -- Check if threshold is violated
    local threshold_violated = false
    if threshold.comparison == "greater_than" and metric_value > threshold.threshold_value then
      threshold_violated = true
    elseif threshold.comparison == "less_than" and metric_value < threshold.threshold_value then
      threshold_violated = true
    elseif threshold.comparison == "equals" and metric_value == threshold.threshold_value then
      threshold_violated = true
    end
    
    if threshold_violated and not self:is_in_cooldown(metric_name) then
      local correlation_id = self.correlation_tracer and 
                            self.correlation_tracer:get_current_trace_id() or 
                            "alert_" .. os.time()
      
      local alert = self:trigger_alert(
        process_id,
        metric_name,
        threshold.threshold_value,
        metric_value,
        threshold.severity,
        correlation_id
      )
      
      table.insert(triggered_alerts, alert)
      
      -- Set cooldown for this metric type
      self.alert_cooldowns[metric_name] = os.time() * 1000
    end
    
    ::continue::
  end
  
  return triggered_alerts
end

-- Trigger performance alert
function PerformanceAlerts:trigger_alert(
  process_id: string,
  metric_type: string,
  threshold_value: number,
  actual_value: number,
  severity: PerformanceAlerts.AlertSeverity,
  correlation_id: string?
): PerformanceAlerts.PerformanceAlert
  
  local alert_id = process_id .. "_" .. metric_type .. "_" .. os.time() .. "_" .. math.random(1000, 9999)
  local timestamp = os.time()
  
  local alert: PerformanceAlerts.PerformanceAlert = {
    alert_id = alert_id,
    process_id = process_id,
    metric_type = metric_type,
    threshold_value = threshold_value,
    actual_value = actual_value,
    severity = severity,
    timestamp = timestamp,
    correlation_id = correlation_id or "none",
    message = self:generate_alert_message(metric_type, actual_value, threshold_value, severity),
    resolved = false
  }
  
  -- Add to active alerts
  table.insert(self.active_alerts, alert)
  table.insert(self.alert_history, alert)
  
  -- Limit active alerts to configured maximum
  if #self.active_alerts > self.config.max_active_alerts then
    -- Remove oldest unresolved alert
    for i = 1, #self.active_alerts do
      if not self.active_alerts[i].resolved then
        table.remove(self.active_alerts, i)
        break
      end
    end
  end
  
  return alert
end

-- Resolve performance alert
function PerformanceAlerts:resolve_alert(alert_id: string): boolean
  for i, alert in ipairs(self.active_alerts) do
    if alert.alert_id == alert_id then
      alert.resolved = true
      alert.resolution_timestamp = os.time()
      
      -- Remove from active alerts
      table.remove(self.active_alerts, i)
      return true
    end
  end
  return false
end

-- Auto-resolve old alerts
function PerformanceAlerts:auto_resolve_alerts()
  local current_time = os.time()
  
  for i = #self.active_alerts, 1, -1 do
    local alert = self.active_alerts[i]
    local alert_age = (current_time - alert.timestamp) * 1000 -- Convert to milliseconds
    
    if alert_age > self.config.auto_resolve_after_ms then
      alert.resolved = true
      alert.resolution_timestamp = current_time
      table.remove(self.active_alerts, i)
    end
  end
end

-- Get active alerts
function PerformanceAlerts:get_active_alerts(): {PerformanceAlerts.PerformanceAlert}
  -- Auto-resolve expired alerts before returning
  self:auto_resolve_alerts()
  return self.active_alerts
end

-- Get alert history
function PerformanceAlerts:get_alert_history(): {PerformanceAlerts.PerformanceAlert}
  return self.alert_history
end

-- Clear old alerts from history
function PerformanceAlerts:clear_old_alerts()
  local cutoff_time = os.time() - (24 * 60 * 60) -- 24 hours ago
  
  for i = #self.alert_history, 1, -1 do
    local alert = self.alert_history[i]
    if alert.timestamp < cutoff_time then
      table.remove(self.alert_history, i)
    end
  end
end

-- Check if metric type is in cooldown period
function PerformanceAlerts:is_in_cooldown(metric_type: string): boolean
  local last_alert_time = self.alert_cooldowns[metric_type]
  if not last_alert_time then
    return false
  end
  
  local current_time = os.time() * 1000 -- Convert to milliseconds
  return (current_time - last_alert_time) < self.config.alert_cooldown_ms
end

-- Set correlation tracer for linking to trace system
function PerformanceAlerts:set_correlation_tracer(tracer: any)
  self.correlation_tracer = tracer
end

-- Generate human-readable alert message
function PerformanceAlerts:generate_alert_message(
  metric_type: string,
  actual_value: number,
  threshold_value: number,
  severity: PerformanceAlerts.AlertSeverity
): string
  
  local message_templates = {
    execution_time_ms = string.format(
      "Handler execution time %.1fms exceeds %s threshold of %.1fms",
      actual_value, severity, threshold_value
    ),
    memory_usage_bytes = string.format(
      "Memory usage %.1fMB exceeds %s threshold of %.1fMB",
      actual_value / 1048576, severity, threshold_value / 1048576
    ),
    error_rate = string.format(
      "Error rate %.1f%% exceeds %s threshold of %.1f%%",
      actual_value, severity, threshold_value
    ),
    queue_depth = string.format(
      "Message queue depth %d exceeds %s threshold of %d",
      actual_value, severity, threshold_value
    ),
    concurrent_requests = string.format(
      "Concurrent requests %d exceeds %s threshold of %d",
      actual_value, severity, threshold_value
    ),
    throughput_per_second = string.format(
      "Throughput %.1f msg/s below %s threshold of %.1f msg/s",
      actual_value, severity, threshold_value
    )
  }
  
  return message_templates[metric_type] or string.format(
    "Metric %s value %.2f violates %s threshold of %.2f",
    metric_type, actual_value, severity, threshold_value
  )
end

-- Get alerts by severity level
function PerformanceAlerts:get_alerts_by_severity(severity: PerformanceAlerts.AlertSeverity): {PerformanceAlerts.PerformanceAlert}
  local filtered_alerts: {PerformanceAlerts.PerformanceAlert} = {}
  
  for _, alert in ipairs(self.active_alerts) do
    if alert.severity == severity then
      table.insert(filtered_alerts, alert)
    end
  end
  
  return filtered_alerts
end

-- Get alerts by process ID
function PerformanceAlerts:get_alerts_by_process(process_id: string): {PerformanceAlerts.PerformanceAlert}
  local filtered_alerts: {PerformanceAlerts.PerformanceAlert} = {}
  
  for _, alert in ipairs(self.active_alerts) do
    if alert.process_id == process_id then
      table.insert(filtered_alerts, alert)
    end
  end
  
  return filtered_alerts
end

return PerformanceAlerts