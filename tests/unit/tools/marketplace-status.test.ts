/**
 * Unit tests for marketplace status tool
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MarketplaceStatusTool } from '../../../src/tools/marketplace-status.js';
import { MarketplaceClient } from '../../../src/marketplace/marketplace-client.js';

const createMockMarketplaceClient = () => {
  return {
    isProcessAvailable: jest.fn(),
    healthCheck: jest.fn(),
    getMarketplaceStats: jest.fn(),
    getProcessId: jest.fn().mockReturnValue('test-process-id')
  } as jest.Mocked<MarketplaceClient>;
};

describe('MarketplaceStatusTool', () => {
  let tool: MarketplaceStatusTool;
  let mockClient: jest.Mocked<MarketplaceClient>;

  beforeEach(() => {
    mockClient = createMockMarketplaceClient();
    tool = new MarketplaceStatusTool(mockClient);
  });

  describe('getTool', () => {
    it('should return correct tool definition', () => {
      const toolDef = tool.getTool();
      
      expect(toolDef.name).toBe('marketplace_status');
      expect(toolDef.description).toContain('natural language marketplace activity');
      expect(toolDef.inputSchema.type).toBe('object');
      expect(toolDef.inputSchema.properties).toHaveProperty('filter_by_route');
      expect(toolDef.inputSchema.properties).toHaveProperty('include_detailed_stats');
      expect(toolDef.inputSchema.properties).toHaveProperty('time_range');
    });
  });

  describe('execute', () => {
    it('should handle healthy marketplace scenario', async () => {
      // Arrange
      mockClient.isProcessAvailable.mockResolvedValue(true);
      mockClient.healthCheck.mockResolvedValue({
        success: true,
        health: {
          is_healthy: true,
          last_heartbeat: Date.now(),
          error_count: 2,
          uptime: 86400,
          memory_usage: 0.4
        },
        queue_stats: {
          high: 5,
          medium: 10,
          low: 15,
          active: 3
        },
        total_providers: 5,
        total_requests: 1500
      });
      
      mockClient.getMarketplaceStats.mockResolvedValue({
        success: true,
        stats: {
          total_providers: 5,
          active_providers: 4,
          total_requests: 1500,
          active_requests: 3,
          queued_requests: 30,
          recent_transactions: 50,
          average_response_time: 1.8,
          success_rate: 0.95
        }
      });

      // Act
      const result = await tool.execute({});

      // Assert
      expect(result.summary).toContain('running smoothly');
      expect(result.activeProviders).toBe(4);
      expect(result.recentTransactions).toBe(50);
      expect(result.healthIndicators.overallHealth).toBe('healthy');
      expect(result.queueStatus.high).toBe(5);
      expect(result.queueStatus.medium).toBe(10);
      expect(result.queueStatus.low).toBe(15);
      expect(result.queueStatus.active).toBe(3);
    });

    it('should handle unavailable marketplace', async () => {
      // Arrange
      mockClient.isProcessAvailable.mockResolvedValue(false);

      // Act
      const result = await tool.execute({});

      // Assert
      expect(result.summary).toContain('currently unavailable');
      expect(result.activeProviders).toBe(0);
      expect(result.healthIndicators.overallHealth).toBe('unhealthy');
      expect(result.marketplaceInsights).toContain('Marketplace processes are offline');
    });

    it('should handle error scenarios', async () => {
      // Arrange
      mockClient.isProcessAvailable.mockResolvedValue(true);
      mockClient.healthCheck.mockRejectedValue(new Error('Connection timeout'));

      // Act
      const result = await tool.execute({});

      // Assert
      expect(result.summary).toContain('encountered an error');
      expect(result.healthIndicators.overallHealth).toBe('unhealthy');
      expect(result.error).toBe('Connection timeout');
    });

    it('should support route filtering', async () => {
      // Arrange
      mockClient.isProcessAvailable.mockResolvedValue(true);
      mockClient.healthCheck.mockResolvedValue({
        success: true,
        health: { is_healthy: true, uptime: 3600 },
        queue_stats: { high: 1, medium: 2, low: 3, active: 1 }
      });
      mockClient.getMarketplaceStats.mockResolvedValue({
        success: true,
        stats: { active_providers: 2 }
      });

      // Act
      const result = await tool.execute({
        filter_by_route: 'forest_path'
      });

      // Assert
      expect(result.summary).toContain('forest_path ecosystem area');
    });
  });
});