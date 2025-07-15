import { healthCheck } from '../../../src/tools/health-check';
import packageJson from '../../../package.json';

describe('Health Check Tool', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });

  describe('Basic Health Check', () => {
    it('should return healthy status by default', async () => {
      const resultString = await healthCheck.execute({ detailed: false });
      const result = JSON.parse(resultString);
      
      expect(result.status).toBe('healthy');
      expect(result.server).toBe('PrimalCode MCP Server');
      expect(result.version).toBe(packageJson.version);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.memory).toBeUndefined();
      expect(result.system).toBeUndefined();
    });

    it('should return valid timestamp in ISO format', async () => {
      const resultString = await healthCheck.execute({ detailed: false });
      const result = JSON.parse(resultString);
      
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should return formatted uptime', async () => {
      const resultString = await healthCheck.execute({ detailed: false });
      const result = JSON.parse(resultString);
      
      expect(result.uptime).toMatch(/^\d+[hms](\s\d+[hms])*$/);
    });
  });

  describe('Detailed Health Check', () => {
    it('should include memory information when detailed is true', async () => {
      const resultString = await healthCheck.execute({ detailed: true });
      const result = JSON.parse(resultString);
      
      expect(result.status).toBe('healthy');
      expect(result.memory).toBeDefined();
      expect(result.memory?.used).toBeDefined();
      expect(result.memory?.total).toBeDefined();
      expect(result.memory?.percentage).toBeDefined();
      expect(result.memory?.percentage).toMatch(/^\d+\.\d{2}%$/);
    });

    it('should include system information when detailed is true', async () => {
      const resultString = await healthCheck.execute({ detailed: true });
      const result = JSON.parse(resultString);
      
      expect(result.system).toBeDefined();
      expect(result.system?.platform).toBeDefined();
      expect(result.system?.nodeVersion).toBeDefined();
      expect(result.system?.architecture).toBeDefined();
    });

    it('should format memory usage correctly', async () => {
      const resultString = await healthCheck.execute({ detailed: true });
      const result = JSON.parse(resultString);
      
      expect(result.memory?.used).toMatch(/^\d+(\.\d{1,2})?\s(B|KB|MB|GB)$/);
      expect(result.memory?.total).toMatch(/^\d+(\.\d{1,2})?\s(B|KB|MB|GB)$/);
    });
  });

  describe('Input Schema Validation', () => {
    it('should handle undefined detailed parameter', async () => {
      const resultString = await healthCheck.execute({});
      const result = JSON.parse(resultString);
      
      expect(result.status).toBe('healthy');
      expect(result.memory).toBeUndefined();
      expect(result.system).toBeUndefined();
    });

    it('should validate input schema', () => {
      const schema = healthCheck.parameters;
      
      expect(schema.parse({ detailed: true })).toEqual({ detailed: true });
      expect(schema.parse({ detailed: false })).toEqual({ detailed: false });
      expect(schema.parse({})).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Mock error');
      });

      const resultString = await healthCheck.execute({ detailed: false });
      const result = JSON.parse(resultString);
      
      expect(result.status).toBe('healthy');
      expect(result.uptime).toBe('unknown');
      expect(result.timestamp).toBeDefined();
      expect(result.server).toBe('PrimalCode MCP Server');
      expect(result.version).toBe(packageJson.version);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].component).toBe('process');
      expect(result.errors[0].recoverable).toBe(true);

      // Restore original function
      process.uptime = originalUptime;
    });

    it('should include error diagnostics in detailed mode', async () => {
      // Mock process.memoryUsage to throw an error
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockImplementation(() => {
        throw new Error('Memory access error');
      });

      const resultString = await healthCheck.execute({ detailed: true });
      const result = JSON.parse(resultString);
      
      expect(result.status).toBe('healthy');
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((error: any) => error.component === 'memory')).toBe(true);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect high memory usage', async () => {
      // Mock process.memoryUsage to return high memory usage
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockImplementation(() => ({
        heapUsed: 950 * 1024 * 1024, // 950MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (95% usage)
        external: 0,
        arrayBuffers: 0,
        rss: 1000 * 1024 * 1024
      }));

      const resultString = await healthCheck.execute({ detailed: true });
      const result = JSON.parse(resultString);
      
      expect(result.status).toBe('healthy');
      expect(result.errors).toBeDefined();
      expect(result.errors.some((error: any) => 
        error.component === 'memory' && error.details.includes('High memory usage')
      )).toBe(true);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Enhanced System Metrics', () => {
    it('should include CPU usage in detailed mode', async () => {
      const resultString = await healthCheck.execute({ detailed: true });
      const result = JSON.parse(resultString);
      
      expect(result.system).toBeDefined();
      expect(result.system.cpuUsage).toBeDefined();
      expect(result.system.cpuUsage.cores).toBeGreaterThan(0);
      expect(result.system.cpuUsage.percentage).toBeDefined();
    });

    it('should include disk space in detailed mode', async () => {
      const resultString = await healthCheck.execute({ detailed: true });
      const result = JSON.parse(resultString);
      
      expect(result.system).toBeDefined();
      expect(result.system.diskSpace).toBeDefined();
      expect(result.system.diskSpace.total).toBeDefined();
      expect(result.system.diskSpace.used).toBeDefined();
      expect(result.system.diskSpace.available).toBeDefined();
      expect(result.system.diskSpace.percentage).toBeDefined();
    });

    it('should include network connectivity in detailed mode', async () => {
      const resultString = await healthCheck.execute({ detailed: true });
      const result = JSON.parse(resultString);
      
      expect(result.system).toBeDefined();
      expect(result.system.network).toBeDefined();
      expect(typeof result.system.network.connectivity).toBe('boolean');
      
      if (result.system.network.connectivity) {
        expect(result.system.network.latency).toBeDefined();
      }
    });
  });

  describe('Tool Configuration', () => {
    it('should have correct tool name and description', () => {
      expect(healthCheck.name).toBe('health_check');
      expect(healthCheck.description).toContain('health status');
      expect(healthCheck.description).toContain('PrimalCode MCP server');
    });

    it('should have valid input schema', () => {
      expect(healthCheck.parameters).toBeDefined();
      expect(typeof healthCheck.execute).toBe('function');
    });
  });
});