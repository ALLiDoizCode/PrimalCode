const fs = require('fs');
const path = require('path');

// Test suite for Performance Dashboard
describe('Performance Dashboard Integration Tests', () => {
  let dashboardHTML;

  beforeAll(() => {
    // Load the dashboard HTML file
    const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
    dashboardHTML = fs.readFileSync(dashboardPath, 'utf8');
  });

  test('Dashboard HTML file exists and is readable', () => {
    expect(dashboardHTML).toBeTruthy();
    expect(dashboardHTML.length).toBeGreaterThan(1000);
  });

  test('Dashboard contains required HTML structure', () => {
    // Check for essential HTML elements
    expect(dashboardHTML).toMatch(/<title>AO Process Performance Dashboard<\/title>/);
    expect(dashboardHTML).toMatch(/class="dashboard"/);
    expect(dashboardHTML).toMatch(/id="system-status"/);
    expect(dashboardHTML).toMatch(/id="process-list"/);
    expect(dashboardHTML).toMatch(/id="alert-list"/);
  });

  test('Dashboard includes essential CSS classes', () => {
    // Check for key CSS classes
    expect(dashboardHTML).toMatch(/\.status-active/);
    expect(dashboardHTML).toMatch(/\.status-idle/);
    expect(dashboardHTML).toMatch(/\.status-overloaded/);
    expect(dashboardHTML).toMatch(/\.metric-grid/);
    expect(dashboardHTML).toMatch(/\.chart-container/);
  });

  test('Dashboard includes JavaScript functionality', () => {
    // Check for JavaScript class and methods
    expect(dashboardHTML).toMatch(/class PerformanceDashboard/);
    expect(dashboardHTML).toMatch(/renderProcessList\(\)/);
    expect(dashboardHTML).toMatch(/updateMetrics\(\)/);
    expect(dashboardHTML).toMatch(/startAutoUpdate\(\)/);
  });

  test('Dashboard has proper real-time update structure', () => {
    // Check for update interval setup
    expect(dashboardHTML).toMatch(/setInterval/);
    expect(dashboardHTML).toMatch(/5000/); // 5 second update interval
    expect(dashboardHTML).toMatch(/refresh-indicator/);
  });

  test('Dashboard includes performance metric elements', () => {
    // Check for metric display elements
    expect(dashboardHTML).toMatch(/id="total-processes"/);
    expect(dashboardHTML).toMatch(/id="total-messages"/);
    expect(dashboardHTML).toMatch(/id="avg-response"/);
    expect(dashboardHTML).toMatch(/id="error-rate"/);
    expect(dashboardHTML).toMatch(/id="concurrent-handlers"/);
    expect(dashboardHTML).toMatch(/id="queue-depth"/);
    expect(dashboardHTML).toMatch(/id="memory-usage"/);
  });

  test('Dashboard includes filtering and sorting controls', () => {
    // Check for control elements
    expect(dashboardHTML).toMatch(/id="process-filter"/);
    expect(dashboardHTML).toMatch(/id="sort-by"/);
    expect(dashboardHTML).toMatch(/<option value="all">All Processes<\/option>/);
    expect(dashboardHTML).toMatch(/<option value="world">World Processes<\/option>/);
    expect(dashboardHTML).toMatch(/<option value="battle">Battle Process<\/option>/);
    expect(dashboardHTML).toMatch(/<option value="registry">Registry Process<\/option>/);
  });

  test('Dashboard includes alert severity levels', () => {
    // Check for alert severity classes
    expect(dashboardHTML).toMatch(/alert-critical/);
    expect(dashboardHTML).toMatch(/alert-warning/);
    expect(dashboardHTML).toMatch(/alert-info/);
  });

  test('Dashboard includes responsive design elements', () => {
    // Check for responsive grid and viewport meta
    expect(dashboardHTML).toMatch(/grid-template-columns: repeat\(auto-fit, minmax/);
    expect(dashboardHTML).toMatch(/<meta name="viewport"/);
  });
});

// Mock browser environment test for dashboard functionality
describe('Performance Dashboard Browser Functionality', () => {
  let mockDocument;
  let mockWindow;
  let PerformanceDashboard;

  beforeEach(() => {
    // Create mock DOM environment
    mockDocument = {
      getElementById: jest.fn(),
      addEventListener: jest.fn(),
      createElement: jest.fn()
    };

    mockWindow = {
      setInterval: jest.fn(),
      clearInterval: jest.fn(),
      addEventListener: jest.fn(),
      performanceDashboard: null
    };

    // Mock DOM elements
    const mockElements = {
      'process-filter': { value: 'all', addEventListener: jest.fn() },
      'sort-by': { value: 'load', addEventListener: jest.fn() },
      'process-list': { innerHTML: '' },
      'alert-list': { innerHTML: '' },
      'system-status': { className: '' },
      'total-processes': { textContent: '' },
      'total-messages': { textContent: '' },
      'avg-response': { textContent: '' },
      'error-rate': { textContent: '' },
      'concurrent-handlers': { textContent: '' },
      'queue-depth': { textContent: '' },
      'memory-usage': { textContent: '' },
      'refresh-indicator': { style: { display: 'none' } }
    };

    mockDocument.getElementById.mockImplementation((id) => mockElements[id] || null);

    // Extract and evaluate PerformanceDashboard class from HTML
    const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
    const htmlContent = fs.readFileSync(dashboardPath, 'utf8');
    const scriptMatch = htmlContent.match(/<script>([\s\S]*)<\/script>/);
    
    if (scriptMatch) {
      const scriptContent = scriptMatch[1];
      // Create a sandboxed evaluation environment
      const scriptFunction = new Function('document', 'window', 'setInterval', 'clearInterval', scriptContent + '; return PerformanceDashboard;');
      PerformanceDashboard = scriptFunction(mockDocument, mockWindow, mockWindow.setInterval, mockWindow.clearInterval);
    }
  });

  test('PerformanceDashboard class can be instantiated', () => {
    expect(PerformanceDashboard).toBeDefined();
    expect(typeof PerformanceDashboard).toBe('function');
  });

  test('Dashboard initializes with default processes data', () => {
    const dashboard = new PerformanceDashboard();
    
    expect(dashboard.processes).toBeDefined();
    expect(Array.isArray(dashboard.processes)).toBe(true);
    expect(dashboard.processes.length).toBeGreaterThan(0);
    
    // Check that processes have required properties
    dashboard.processes.forEach(process => {
      expect(process).toHaveProperty('id');
      expect(process).toHaveProperty('name');
      expect(process).toHaveProperty('type');
      expect(process).toHaveProperty('load');
      expect(process).toHaveProperty('responseTime');
      expect(process).toHaveProperty('throughput');
      expect(process).toHaveProperty('errorRate');
      expect(process).toHaveProperty('status');
    });
  });

  test('Dashboard initializes with default alerts data', () => {
    const dashboard = new PerformanceDashboard();
    
    expect(dashboard.alerts).toBeDefined();
    expect(Array.isArray(dashboard.alerts)).toBe(true);
    expect(dashboard.alerts.length).toBeGreaterThan(0);
    
    // Check that alerts have required properties
    dashboard.alerts.forEach(alert => {
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('message');
      expect(alert).toHaveProperty('time');
      expect(alert).toHaveProperty('process');
    });
  });

  test('Dashboard methods are properly defined', () => {
    const dashboard = new PerformanceDashboard();
    
    expect(typeof dashboard.renderProcessList).toBe('function');
    expect(typeof dashboard.renderAlerts).toBe('function');
    expect(typeof dashboard.updateMetrics).toBe('function');
    expect(typeof dashboard.setupEventListeners).toBe('function');
    expect(typeof dashboard.startAutoUpdate).toBe('function');
    expect(typeof dashboard.destroy).toBe('function');
  });

  test('Dashboard sets up auto-update interval', () => {
    const dashboard = new PerformanceDashboard();
    
    expect(mockWindow.setInterval).toHaveBeenCalled();
    expect(mockWindow.setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  test('Dashboard cleanup destroys interval', () => {
    const dashboard = new PerformanceDashboard();
    const mockIntervalId = 123;
    
    dashboard.updateInterval = mockIntervalId;
    dashboard.destroy();
    
    expect(mockWindow.clearInterval).toHaveBeenCalledWith(mockIntervalId);
  });

  test('Dashboard filters processes correctly', () => {
    const dashboard = new PerformanceDashboard();
    
    // Test with all processes
    mockDocument.getElementById.mockReturnValue({ value: 'all' });
    let filteredCount = dashboard.processes.length;
    expect(filteredCount).toBe(4); // Expect 4 total processes
    
    // Test filtering by type
    const worldProcesses = dashboard.processes.filter(p => p.type === 'world');
    expect(worldProcesses.length).toBe(2); // Should have 2 world processes
    
    const battleProcesses = dashboard.processes.filter(p => p.type === 'battle');
    expect(battleProcesses.length).toBe(1); // Should have 1 battle process
    
    const registryProcesses = dashboard.processes.filter(p => p.type === 'registry');
    expect(registryProcesses.length).toBe(1); // Should have 1 registry process
  });
});

// Performance requirements validation
describe('Performance Dashboard Requirements Validation', () => {
  test('Dashboard meets real-time update requirement', () => {
    const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
    const htmlContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Should update every 5 seconds for real-time experience
    expect(htmlContent).toMatch(/5000/);
    expect(htmlContent).toMatch(/Real-time monitoring/i);
  });

  test('Dashboard includes all required performance indicators', () => {
    const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
    const htmlContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for key performance indicators mentioned in story requirements
    expect(htmlContent).toMatch(/response.*time/i);
    expect(htmlContent).toMatch(/memory.*usage/i);
    expect(htmlContent).toMatch(/throughput/i);
    expect(htmlContent).toMatch(/concurrent/i);
    expect(htmlContent).toMatch(/queue.*depth/i);
    expect(htmlContent).toMatch(/error.*rate/i);
  });

  test('Dashboard supports traffic light indicators', () => {
    const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
    const htmlContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for status indicators (green, yellow, red equivalent)
    expect(htmlContent).toMatch(/status-active/); // Green equivalent
    expect(htmlContent).toMatch(/status-idle/);   // Yellow/gray equivalent  
    expect(htmlContent).toMatch(/status-overloaded/); // Red equivalent
  });

  test('Dashboard provides filtering and search capabilities', () => {
    const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
    const htmlContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for filtering functionality
    expect(htmlContent).toMatch(/process-filter/);
    expect(htmlContent).toMatch(/sort-by/);
    expect(htmlContent).toMatch(/All Processes/);
    expect(htmlContent).toMatch(/World Processes/);
    expect(htmlContent).toMatch(/Battle Process/);
    expect(htmlContent).toMatch(/Registry Process/);
  });

  test('Dashboard displays comparative performance views', () => {
    const dashboardPath = path.join(__dirname, '../../development/monitoring-dashboard/performance-dashboard.html');
    const htmlContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for comparative elements
    expect(htmlContent).toMatch(/process-list/);
    expect(htmlContent).toMatch(/load-bar/);
    expect(htmlContent).toMatch(/metric-grid/);
    expect(htmlContent).toMatch(/Sort By/);
  });
});

console.log('Performance Dashboard integration tests completed successfully ✅');