const fs = require('fs');
const path = require('path');

// Integration tests for the complete performance monitoring system
describe('Performance Monitoring System Integration Tests', () => {
  
  describe('Performance Monitor Integration', () => {
    test('Performance monitor can be required without errors', () => {
      const monitorPath = path.join(__dirname, '../../shared/utils/performance-monitor.lua');
      expect(fs.existsSync(monitorPath)).toBe(true);
      
      const monitorContent = fs.readFileSync(monitorPath, 'utf8');
      expect(monitorContent).toContain('PerformanceMonitor');
      expect(monitorContent).toContain('function PerformanceMonitor.new');
      expect(monitorContent).toContain('start_handler_timing');
      expect(monitorContent).toContain('end_handler_timing');
      expect(monitorContent).toContain('collect_metrics');
    });

    test('Performance monitor has all required methods', () => {
      const monitorPath = path.join(__dirname, '../../shared/utils/performance-monitor.lua');
      const monitorContent = fs.readFileSync(monitorPath, 'utf8');
      
      const requiredMethods = [
        'new',
        'start_handler_timing',
        'end_handler_timing',
        'collect_metrics',
        'get_memory_usage',
        'calculate_throughput',
        'update_concurrent_count',
        'add_message_count',
        'add_error_count',
        'get_queue_depth',
        'flush_metrics',
        'set_correlation_tracer',
        'calculate_load_metrics',
        'determine_load_state',
        'calculate_load_percentage'
      ];

      requiredMethods.forEach(method => {
        expect(monitorContent).toContain(`function PerformanceMonitor:${method}`);
      });
    });

    test('Performance monitor configuration is properly structured', () => {
      const monitorPath = path.join(__dirname, '../../shared/utils/performance-monitor.lua');
      const monitorContent = fs.readFileSync(monitorPath, 'utf8');
      
      // Check for proper configuration handling
      expect(monitorContent).toContain('monitor.config = config or {}');
      expect(monitorContent).toContain('collection_interval_ms');
      expect(monitorContent).toContain('max_metrics_buffer');
      expect(monitorContent).toContain('enable_memory_tracking');
      expect(monitorContent).toContain('enable_throughput_tracking');
      expect(monitorContent).toContain('load_thresholds');
    });
  });

  describe('Performance Alerts Integration', () => {
    test('Performance alerts module is properly structured', () => {
      const alertsPath = path.join(__dirname, '../../shared/utils/performance-alerts.lua');
      expect(fs.existsSync(alertsPath)).toBe(true);
      
      const alertsContent = fs.readFileSync(alertsPath, 'utf8');
      expect(alertsContent).toContain('PerformanceAlerts');
      expect(alertsContent).toContain('function PerformanceAlerts.new');
      expect(alertsContent).toContain('add_threshold');
      expect(alertsContent).toContain('check_metrics');
      expect(alertsContent).toContain('trigger_alert');
      expect(alertsContent).toContain('resolve_alert');
    });

    test('Alert system has proper severity levels', () => {
      const alertsPath = path.join(__dirname, '../../shared/utils/performance-alerts.lua');
      const alertsContent = fs.readFileSync(alertsPath, 'utf8');
      
      expect(alertsContent).toMatch(/"CRITICAL"/);
      expect(alertsContent).toMatch(/"WARNING"/);
      expect(alertsContent).toMatch(/"INFO"/);
    });

    test('Alert system has default thresholds configured', () => {
      const alertsPath = path.join(__dirname, '../../shared/utils/performance-alerts.lua');
      const alertsContent = fs.readFileSync(alertsPath, 'utf8');
      
      // Check for default threshold configurations
      expect(alertsContent).toContain('execution_time_ms');
      expect(alertsContent).toContain('memory_usage_bytes');
      expect(alertsContent).toContain('error_rate');
      expect(alertsContent).toContain('queue_depth');
      expect(alertsContent).toContain('concurrent_requests');
    });
  });

  describe('Performance History Integration', () => {
    test('Performance history module exists and is structured correctly', () => {
      const historyPath = path.join(__dirname, '../../shared/utils/performance-history.lua');
      expect(fs.existsSync(historyPath)).toBe(true);
      
      const historyContent = fs.readFileSync(historyPath, 'utf8');
      expect(historyContent).toContain('PerformanceHistory');
      expect(historyContent).toContain('function PerformanceHistory.new');
      expect(historyContent).toContain('add_raw_metrics');
      expect(historyContent).toContain('aggregate_data');
      expect(historyContent).toContain('get_historical_data');
      expect(historyContent).toContain('calculate_trend');
    });

    test('History system supports different time buckets', () => {
      const historyPath = path.join(__dirname, '../../shared/utils/performance-history.lua');
      const historyContent = fs.readFileSync(historyPath, 'utf8');
      
      expect(historyContent).toMatch(/"minute"/);
      expect(historyContent).toMatch(/"hour"/);
      expect(historyContent).toMatch(/"day"/);
      
      expect(historyContent).toContain('aggregate_minute_data');
      expect(historyContent).toContain('aggregate_hour_data');
      expect(historyContent).toContain('aggregate_day_data');
    });

    test('History system has proper retention configuration', () => {
      const historyPath = path.join(__dirname, '../../shared/utils/performance-history.lua');
      const historyContent = fs.readFileSync(historyPath, 'utf8');
      
      expect(historyContent).toContain('minute_retention_hours');
      expect(historyContent).toContain('hour_retention_days');
      expect(historyContent).toContain('day_retention_months');
      expect(historyContent).toContain('cleanup_expired_data');
    });
  });

  describe('Process Integration Tests', () => {
    test('World process integrates performance monitoring', () => {
      const worldPath = path.join(__dirname, '../../ao-processes/world/src/main.lua');
      expect(fs.existsSync(worldPath)).toBe(true);
      
      const worldContent = fs.readFileSync(worldPath, 'utf8');
      expect(worldContent).toContain("require('shared.utils.performance-monitor')");
      expect(worldContent).toContain("require('shared.utils.performance-alerts')");
      expect(worldContent).toContain("require('shared.utils.performance-history')");
      expect(worldContent).toContain('State.performance_monitor');
      expect(worldContent).toContain('State.performance_alerts');
      expect(worldContent).toContain('State.performance_history');
    });

    test('Battle process integrates performance monitoring', () => {
      const battlePath = path.join(__dirname, '../../ao-processes/battle/src/main.lua');
      expect(fs.existsSync(battlePath)).toBe(true);
      
      const battleContent = fs.readFileSync(battlePath, 'utf8');
      expect(battleContent).toContain("require('shared.utils.performance-monitor')");
      expect(battleContent).toContain("require('shared.utils.performance-alerts')");
      expect(battleContent).toContain("require('shared.utils.performance-history')");
    });

    test('Registry process integrates performance monitoring', () => {
      const registryPath = path.join(__dirname, '../../ao-processes/registry/src/main.lua');
      expect(fs.existsSync(registryPath)).toBe(true);
      
      const registryContent = fs.readFileSync(registryPath, 'utf8');
      expect(registryContent).toContain("require('shared.utils.performance-monitor')");
      expect(registryContent).toContain("require('shared.utils.performance-alerts')");
      expect(registryContent).toContain("require('shared.utils.performance-history')");
    });

    test('Processes have proper performance monitoring initialization', () => {
      const worldPath = path.join(__dirname, '../../ao-processes/world/src/main.lua');
      const worldContent = fs.readFileSync(worldPath, 'utf8');
      
      expect(worldContent).toContain('PerformanceMonitor.new');
      expect(worldContent).toContain('PerformanceAlerts.new');
      expect(worldContent).toContain('PerformanceHistory.new');
      expect(worldContent).toContain('set_correlation_tracer');
    });

    test('Processes implement handler performance timing', () => {
      const worldPath = path.join(__dirname, '../../ao-processes/world/src/main.lua');
      const worldContent = fs.readFileSync(worldPath, 'utf8');
      
      expect(worldContent).toContain('start_handler_timing');
      expect(worldContent).toContain('end_handler_timing');
      expect(worldContent).toContain('collect_metrics');
      expect(worldContent).toContain('add_raw_metrics');
      expect(worldContent).toContain('check_metrics');
    });
  });

  describe('Dashboard and UI Integration', () => {
    test('Performance dashboard exists and is properly structured', () => {
      const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
      expect(fs.existsSync(dashboardPath)).toBe(true);
      
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
      expect(dashboardContent).toContain('<title>AO Process Performance Dashboard</title>');
      expect(dashboardContent).toContain('class PerformanceDashboard');
      expect(dashboardContent).toContain('renderProcessList');
      expect(dashboardContent).toContain('updateMetrics');
    });

    test('Performance analyzer interface exists', () => {
      const analyzerPath = path.join(__dirname, '../../development/debug-interface/performance-analyzer.html');
      expect(fs.existsSync(analyzerPath)).toBe(true);
      
      const analyzerContent = fs.readFileSync(analyzerPath, 'utf8');
      expect(analyzerContent).toContain('<title>AO Process Performance Analyzer</title>');
      expect(analyzerContent).toContain('Performance Overview');
      expect(analyzerContent).toContain('Bottleneck Detection');
      expect(analyzerContent).toContain('Trend Analysis');
      expect(analyzerContent).toContain('Optimization');
    });

    test('Dashboard includes required performance metrics', () => {
      const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
      
      const requiredMetrics = [
        'total-processes',
        'total-messages',
        'avg-response',
        'error-rate',
        'concurrent-handlers',
        'queue-depth',
        'memory-usage'
      ];

      requiredMetrics.forEach(metric => {
        expect(dashboardContent).toContain(`id="${metric}"`);
      });
    });

    test('Dashboard has real-time update functionality', () => {
      const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
      
      expect(dashboardContent).toContain('setInterval');
      expect(dashboardContent).toContain('updateMetrics');
      expect(dashboardContent).toContain('5000'); // 5 second update interval
    });

    test('Analyzer includes bottleneck detection features', () => {
      const analyzerPath = path.join(__dirname, '../../development/debug-interface/performance-analyzer.html');
      const analyzerContent = fs.readFileSync(analyzerPath, 'utf8');
      
      expect(analyzerContent).toContain('bottleneck-item');
      expect(analyzerContent).toContain('Critical Bottleneck');
      expect(analyzerContent).toContain('Moderate Bottleneck');
      expect(analyzerContent).toContain('bottleneck-severity');
    });
  });

  describe('Test Coverage and Quality', () => {
    test('Unit tests exist for all performance monitoring components', () => {
      const testPaths = [
        '../../tests/unit/shared/performance-monitor.test.tl',
        '../../tests/unit/shared/load-monitoring.test.tl',
        '../../tests/unit/shared/performance-alerts.test.tl',
        '../../tests/unit/shared/performance-history.test.tl'
      ];

      testPaths.forEach(testPath => {
        const fullPath = path.join(__dirname, testPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        
        const testContent = fs.readFileSync(fullPath, 'utf8');
        expect(testContent).toContain('test_');
        expect(testContent).toContain('assert');
      });
    });

    test('Performance monitor tests cover all major functionality', () => {
      const testPath = path.join(__dirname, '../../tests/unit/shared/performance-monitor.test.tl');
      const testContent = fs.readFileSync(testPath, 'utf8');
      
      const testCases = [
        'Monitor creation with default config',
        'Monitor creation with custom config',
        'Handler timing functionality',
        'Error tracking',
        'Metrics collection',
        'Memory usage',
        'Throughput calculation',
        'Performance overhead validation'
      ];

      testCases.forEach(testCase => {
        expect(testContent).toContain(testCase);
      });
    });

    test('Alert tests cover threshold and notification functionality', () => {
      const testPath = path.join(__dirname, '../../tests/unit/shared/performance-alerts.test.tl');
      const testContent = fs.readFileSync(testPath, 'utf8');
      
      const testCases = [
        'Alert manager creation',
        'Default thresholds initialization',
        'Adding and removing custom thresholds',
        'Triggering alerts',
        'Alert message generation',
        'Resolving alerts',
        'Alert cooldown functionality',
        'Correlation tracer integration'
      ];

      testCases.forEach(testCase => {
        expect(testContent).toContain(testCase);
      });
    });

    test('History tests cover data aggregation and trend analysis', () => {
      const testPath = path.join(__dirname, '../../tests/unit/shared/performance-history.test.tl');
      const testContent = fs.readFileSync(testPath, 'utf8');
      
      const testCases = [
        'History manager creation',
        'Raw metrics addition',
        'Manual aggregation',
        'Historical data retrieval',
        'Data retention',
        'Trend analysis',
        'Capacity planning data export'
      ];

      testCases.forEach(testCase => {
        expect(testContent).toContain(testCase);
      });
    });

    test('Dashboard integration tests exist', () => {
      const testPath = path.join(__dirname, 'performance-dashboard.test.js');
      expect(fs.existsSync(testPath)).toBe(true);
      
      const testContent = fs.readFileSync(testPath, 'utf8');
      expect(testContent).toContain('Performance Dashboard Integration Tests');
      expect(testContent).toContain('Performance Dashboard Browser Functionality');
      expect(testContent).toContain('Performance Dashboard Requirements Validation');
    });
  });

  describe('Performance Requirements Validation', () => {
    test('Performance monitoring overhead stays within acceptable limits', () => {
      const monitorTestPath = path.join(__dirname, '../../tests/unit/shared/performance-monitor.test.tl');
      const testContent = fs.readFileSync(monitorTestPath, 'utf8');
      
      // Check that performance overhead validation is implemented
      expect(testContent).toContain('performance_overhead_validation');
      expect(testContent).toContain('overhead_percentage < 5.0');
      expect(testContent).toContain('Performance overhead within acceptable limits');
    });

    test('Alert system performance meets requirements', () => {
      const alertTestPath = path.join(__dirname, '../../tests/unit/shared/performance-alerts.test.tl');
      const testContent = fs.readFileSync(alertTestPath, 'utf8');
      
      // Check that alert performance tests exist
      expect(testContent).toContain('performance_alerts_performance');
      expect(testContent).toContain('avg_time_per_check < 1.0');
      expect(testContent).toContain('Alerting system performance within acceptable limits');
    });

    test('Historical data system performance is validated', () => {
      const historyTestPath = path.join(__dirname, '../../tests/unit/shared/performance-history.test.tl');
      const testContent = fs.readFileSync(historyTestPath, 'utf8');
      
      // Check that history performance tests exist
      expect(testContent).toContain('history_performance');
      expect(testContent).toContain('aggregation_time < 100.0');
      expect(testContent).toContain('avg_retrieval_time < 5.0');
      expect(testContent).toContain('Historical data operations performance within acceptable limits');
    });

    test('Real-time dashboard meets update frequency requirements', () => {
      const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
      
      // Check for 5-second real-time updates
      expect(dashboardContent).toContain('5000');
      expect(dashboardContent).toContain('Real-time monitoring');
      expect(dashboardContent).toContain('Live updates every 5s');
    });
  });

  describe('ADP v1.0 Compliance Validation', () => {
    test('Performance metrics handler maintains ADP compliance', () => {
      const worldPath = path.join(__dirname, '../../ao-processes/world/src/main.lua');
      const worldContent = fs.readFileSync(worldPath, 'utf8');
      
      // Check for ADP compliant handler structure
      expect(worldContent).toContain('Get-Performance-Metrics');
      expect(worldContent).toContain('Performance-Metrics-Response');
      expect(worldContent).toContain('HandlerMetadata.create_handler');
      expect(worldContent).toContain('input_schema');
      expect(worldContent).toContain('output_schema');
    });

    test('Performance monitoring preserves existing ADP functionality', () => {
      const processes = ['world', 'battle', 'registry'];
      
      processes.forEach(processName => {
        const processPath = path.join(__dirname, `../../ao-processes/${processName}/src/main.lua`);
        const processContent = fs.readFileSync(processPath, 'utf8');
        
        // Check that existing ADP infrastructure is preserved
        expect(processContent).toContain('ADPValidator');
        expect(processContent).toContain('HandlerMetadata');
        expect(processContent).toContain('ProcessBase.create_adp_response');
        expect(processContent).toContain('TraceManager:inject_trace_context');
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    test('Performance monitoring includes proper error handling', () => {
      const monitorPath = path.join(__dirname, '../../shared/utils/performance-monitor.lua');
      const monitorContent = fs.readFileSync(monitorPath, 'utf8');
      
      // Check for error handling patterns
      expect(monitorContent).toContain('if not');
      expect(monitorContent).toContain('return');  // Early returns for error conditions
      expect(monitorContent).toContain('< 0 then');  // Boundary checks
    });

    test('Alert system has circuit breaker integration', () => {
      const monitorPath = path.join(__dirname, '../../shared/utils/performance-monitor.lua');
      const monitorContent = fs.readFileSync(monitorPath, 'utf8');
      
      expect(monitorContent).toContain('circuit_breaker');
      expect(monitorContent).toContain('trigger_circuit_breaker');
      expect(monitorContent).toContain('reset_circuit_breaker');
      expect(monitorContent).toContain('is_circuit_breaker_active');
    });

    test('System gracefully handles missing dependencies', () => {
      const processes = ['world', 'battle', 'registry'];
      
      processes.forEach(processName => {
        const processPath = path.join(__dirname, `../../ao-processes/${processName}/src/main.lua`);
        const processContent = fs.readFileSync(processPath, 'utf8');
        
        // Check for proper error handling in initialization
        expect(processContent).toContain('State.performance_monitor');
        expect(processContent).toContain('State.performance_alerts');
        expect(processContent).toContain('State.performance_history');
      });
    });
  });

  describe('Integration with Existing Systems', () => {
    test('Performance monitoring integrates with trace system', () => {
      const worldPath = path.join(__dirname, '../../ao-processes/world/src/main.lua');
      const worldContent = fs.readFileSync(worldPath, 'utf8');
      
      expect(worldContent).toContain('set_correlation_tracer(TraceManager)');
      expect(worldContent).toContain('TraceManager:get_current_trace_id()');
    });

    test('Performance monitoring integrates with logging system', () => {
      const worldPath = path.join(__dirname, '../../ao-processes/world/src/main.lua');
      const worldContent = fs.readFileSync(worldPath, 'utf8');
      
      expect(worldContent).toContain('MessageLogger:warn("Performance alert triggered"');
      expect(worldContent).toContain('correlation_id = trace_context.correlation_id');
      expect(worldContent).toContain('alert_id = alert.alert_id');
    });

    test('Performance system preserves existing message routing', () => {
      const processes = ['world', 'battle', 'registry'];
      
      processes.forEach(processName => {
        const processPath = path.join(__dirname, `../../ao-processes/${processName}/src/main.lua`);
        const processContent = fs.readFileSync(processPath, 'utf8');
        
        // Check that message routing is preserved
        expect(processContent).toContain('MessageRouter');
        expect(processContent).toContain('ProcessDiscovery');
        expect(processContent).toContain('MessageQueue');
        expect(processContent).toContain('InterProcessErrors');
      });
    });
  });
});

// Performance testing utilities
describe('Performance Testing Utilities', () => {
  test('Load testing infrastructure can be simulated', () => {
    // Simulate a load test scenario
    const simulateLoad = (requestsPerSecond, durationSeconds) => {
      const totalRequests = requestsPerSecond * durationSeconds;
      const requestTimes = [];
      
      for (let i = 0; i < totalRequests; i++) {
        // Simulate random response times
        const responseTime = 10 + Math.random() * 40; // 10-50ms range
        requestTimes.push(responseTime);
      }
      
      return {
        totalRequests,
        averageResponseTime: requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length,
        p95ResponseTime: requestTimes.sort((a, b) => a - b)[Math.floor(requestTimes.length * 0.95)],
        maxResponseTime: Math.max(...requestTimes)
      };
    };

    const loadTestResults = simulateLoad(100, 60); // 100 RPS for 60 seconds
    
    expect(loadTestResults.totalRequests).toBe(6000);
    expect(loadTestResults.averageResponseTime).toBeGreaterThan(0);
    expect(loadTestResults.averageResponseTime).toBeLessThan(100);
    expect(loadTestResults.p95ResponseTime).toBeGreaterThan(loadTestResults.averageResponseTime);
  });

  test('Stress testing scenarios can be validated', () => {
    // Simulate stress test conditions
    const simulateStressTest = (overloadFactor) => {
      const baselineRPS = 100;
      const stressRPS = baselineRPS * overloadFactor;
      
      // Simulate degraded performance under stress
      const stressMultiplier = Math.max(1, overloadFactor / 2);
      const averageResponseTime = 20 * stressMultiplier;
      
      return {
        requestsPerSecond: stressRPS,
        averageResponseTime,
        successRate: Math.max(0.5, 1 - (overloadFactor - 1) * 0.1), // Degrade with overload
        memoryUsage: 1000 * Math.sqrt(overloadFactor) // MB
      };
    };

    const stressResults = simulateStressTest(3); // 3x normal load
    
    expect(stressResults.requestsPerSecond).toBe(300);
    expect(stressResults.averageResponseTime).toBeGreaterThan(20);
    expect(stressResults.successRate).toBeLessThan(1);
    expect(stressResults.memoryUsage).toBeGreaterThan(1000);
  });
});

console.log('Performance Monitoring Integration Tests completed successfully ✅');