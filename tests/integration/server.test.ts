import { healthCheck } from '../../src/tools/health-check';

describe('Server Integration Tests', () => {
  describe('Health Check Tool Integration', () => {
    it('should execute health check tool successfully', async () => {
      const result = await healthCheck.execute({ detailed: false });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('healthy');
      expect(parsed.server).toBe('PrimalCode MCP Server');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.uptime).toBeDefined();
    });

    it('should execute detailed health check successfully', async () => {
      const result = await healthCheck.execute({ detailed: true });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('healthy');
      expect(parsed.server).toBe('PrimalCode MCP Server');
      expect(parsed.memory).toBeDefined();
      expect(parsed.system).toBeDefined();
    });

    it('should handle health check errors gracefully', async () => {
      // Mock process.uptime to throw error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = await healthCheck.execute({ detailed: false });
      const parsed = JSON.parse(result);
      
      expect(parsed.status).toBe('healthy');
      expect(parsed.uptime).toBe('unknown');
      
      // Restore original function
      process.uptime = originalUptime;
    });
  });


  describe('Tool Configuration', () => {
    it('should have proper health check tool configuration', () => {
      expect(healthCheck.name).toBe('health_check');
      expect(healthCheck.description).toContain('health status');
      expect(healthCheck.parameters).toBeDefined();
      expect(healthCheck.execute).toBeDefined();
      expect(typeof healthCheck.execute).toBe('function');
    });

    it('should validate health check input schema', () => {
      const schema = healthCheck.parameters;
      
      expect(() => {
        schema.parse({ detailed: true });
        schema.parse({ detailed: false });
        schema.parse({});
      }).not.toThrow();
    });
  });

  describe('Server Dependencies', () => {
    it('should have all required dependencies available', () => {
      // Test that our dependencies are properly loaded
      expect(healthCheck).toBeDefined();
    });

    it('should handle process information access', () => {
      expect(() => {
        process.uptime();
        process.memoryUsage();
        process.platform;
        process.version;
        process.arch;
      }).not.toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle undefined inputs gracefully', async () => {
      const result = await healthCheck.execute({});
      const parsed = JSON.parse(result);
      
      expect(parsed.status).toBe('healthy');
      expect(parsed.memory).toBeUndefined();
      expect(parsed.system).toBeUndefined();
    });

    it('should handle malformed inputs gracefully', async () => {
      const result = await healthCheck.execute({ detailed: undefined } as any);
      const parsed = JSON.parse(result);
      
      expect(parsed.status).toBe('healthy');
    });
  });
});