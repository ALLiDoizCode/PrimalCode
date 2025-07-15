import { HealthCheckTool } from '../../../src/tools/health-check';
import { HealthCheckResult } from '../../../src/types/health';

describe('HealthCheckTool', () => {
  let healthCheckTool: HealthCheckTool;

  beforeEach(() => {
    healthCheckTool = new HealthCheckTool('TestServer', '1.0.0');
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const tool = new HealthCheckTool();
      expect(tool).toBeDefined();
    });

    it('should initialize with custom values', () => {
      const tool = new HealthCheckTool('CustomServer', '2.0.0');
      expect(tool).toBeDefined();
    });
  });

  describe('registerTool', () => {
    it('should register a tool successfully', () => {
      healthCheckTool.registerTool('test_tool');
      
      const result = healthCheckTool.checkHealth({ includeDetails: true });
      
      expect(result).resolves.toMatchObject({
        status: 'healthy',
        tools: {
          registered: 1,
          available: ['test_tool'],
        },
      });
    });

    it('should not register duplicate tools', () => {
      healthCheckTool.registerTool('test_tool');
      healthCheckTool.registerTool('test_tool');
      
      const result = healthCheckTool.checkHealth({ includeDetails: true });
      
      expect(result).resolves.toMatchObject({
        tools: {
          registered: 1,
          available: ['test_tool'],
        },
      });
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when tools are registered', async () => {
      healthCheckTool.registerTool('test_tool');
      
      const result = await healthCheckTool.checkHealth();
      
      expect(result.status).toBe('healthy');
      expect(result.serverInfo.name).toBe('TestServer');
      expect(result.serverInfo.version).toBe('1.0.0');
      expect(result.tools.registered).toBe(1);
      expect(result.tools.available).toContain('test_tool');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should return unhealthy status when no tools are registered', async () => {
      const result = await healthCheckTool.checkHealth();
      
      expect(result.status).toBe('unhealthy');
      expect(result.errors).toContain('No tools registered');
      expect(result.tools.registered).toBe(0);
    });

    it('should exclude details when includeDetails is false', async () => {
      healthCheckTool.registerTool('test_tool');
      
      const result = await healthCheckTool.checkHealth({ includeDetails: false });
      
      expect(result.tools.available).toEqual([]);
    });

    it('should include uptime in server info', async () => {
      // Add a small delay to ensure uptime is > 0
      await new Promise(resolve => setTimeout(resolve, 1));
      const result = await healthCheckTool.checkHealth();
      
      expect(result.serverInfo.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should handle timeout option', async () => {
      healthCheckTool.registerTool('test_tool');
      
      const result = await healthCheckTool.checkHealth({ timeout: 100 });
      
      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeGreaterThan(0);
    }, 10000);
  });

  describe('getToolDefinition', () => {
    it('should return valid tool definition', () => {
      const definition = healthCheckTool.getToolDefinition();
      
      expect(definition.name).toBe('health_check');
      expect(definition.description).toBeDefined();
      expect(definition.inputSchema).toBeDefined();
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should execute health check and return formatted response', async () => {
      healthCheckTool.registerTool('test_tool');
      
      const result = await healthCheckTool.execute({ includeDetails: true });
      
      expect(typeof result).toBe('string');
      expect(result).toContain('PrimalCode MCP Server Health Check');
      expect(result).toContain('HEALTHY');
      expect(result).toContain('TestServer v1.0.0');
      expect(result).toContain('Tools Registered:** 1');
      expect(result).toContain('test_tool');
    });

    it('should handle missing arguments gracefully', async () => {
      const result = await healthCheckTool.execute({});
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Health Check');
    });

    it('should format uptime correctly', async () => {
      const result = await healthCheckTool.execute({});
      
      expect(result).toContain('Uptime:');
      expect(result).toMatch(/\d+[smhd]/);
    });
  });
});