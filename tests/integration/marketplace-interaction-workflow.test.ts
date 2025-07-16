/**
 * Integration tests for marketplace interaction workflow
 * Tests all marketplace MCP tools with various scenarios and activity levels
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MarketplaceClient } from '../../src/marketplace/marketplace-client';
import { MarketplaceStatusTool } from '../../src/tools/marketplace-status';
import { ProviderAnalysisTool } from '../../src/tools/provider-analysis';
import { AIServiceRequestTool } from '../../src/tools/ai-service-request';
import { MarketplaceEconomicsTool } from '../../src/tools/marketplace-economics';
import { InfluencePointIntegrationTool } from '../../src/tools/influence-point-integration';
import { MarketplaceMCPIntegration } from '../../src/tools/marketplace-mcp-integration';

// Mock marketplace client
const createMockMarketplaceClient = () => {
  const mockClient = {
    isProcessAvailable: jest.fn(),
    healthCheck: jest.fn(),
    getMarketplaceStats: jest.fn(),
    submitInferenceRequest: jest.fn(),
    getRequestStatus: jest.fn(),
    registerProvider: jest.fn(),
    sendCreditNotice: jest.fn(),
    sendDebitNotice: jest.fn(),
    getProcessId: jest.fn(),
    setProcessId: jest.fn(),
    setApiEndpoint: jest.fn(),
    setTimeout: jest.fn()
  };
  return mockClient as jest.Mocked<MarketplaceClient>;
};

// Mock marketplace state data
const createMockMarketplaceState = (scenario: 'healthy' | 'degraded' | 'offline' = 'healthy') => {
  const baseState = {
    health: {
      is_healthy: scenario !== 'offline',
      last_heartbeat: Date.now() - (scenario === 'offline' ? 300000 : 30000),
      error_count: scenario === 'degraded' ? 15 : 2,
      uptime: scenario === 'offline' ? 0 : 86400,
      memory_usage: scenario === 'degraded' ? 0.9 : 0.4
    },
    queue_stats: {
      high: scenario === 'degraded' ? 25 : 5,
      medium: scenario === 'degraded' ? 40 : 10,
      low: scenario === 'degraded' ? 60 : 15,
      active: scenario === 'degraded' ? 8 : 3
    },
    total_providers: scenario === 'offline' ? 0 : 5,
    total_requests: scenario === 'offline' ? 0 : 1500,
    version: '1.0.0'
  };

  const statsState = {
    stats: {
      total_providers: baseState.total_providers,
      active_providers: scenario === 'offline' ? 0 : scenario === 'degraded' ? 2 : 4,
      total_requests: baseState.total_requests,
      active_requests: baseState.queue_stats.active,
      queued_requests: baseState.queue_stats.high + baseState.queue_stats.medium + baseState.queue_stats.low,
      recent_transactions: scenario === 'offline' ? 0 : 50,
      average_response_time: scenario === 'degraded' ? 4.5 : 1.8,
      success_rate: scenario === 'offline' ? 0 : scenario === 'degraded' ? 0.75 : 0.95
    }
  };

  return { baseState, statsState };
};

describe('Marketplace Interaction Workflow Integration Tests', () => {
  let mockMarketplaceClient: jest.Mocked<MarketplaceClient>;
  let marketplaceStatusTool: MarketplaceStatusTool;
  let providerAnalysisTool: ProviderAnalysisTool;
  let aiServiceRequestTool: AIServiceRequestTool;
  let marketplaceEconomicsTool: MarketplaceEconomicsTool;
  let influencePointIntegrationTool: InfluencePointIntegrationTool;

  beforeEach(() => {
    mockMarketplaceClient = createMockMarketplaceClient();
    marketplaceStatusTool = new MarketplaceStatusTool(mockMarketplaceClient);
    providerAnalysisTool = new ProviderAnalysisTool(mockMarketplaceClient);
    aiServiceRequestTool = new AIServiceRequestTool(mockMarketplaceClient);
    marketplaceEconomicsTool = new MarketplaceEconomicsTool(mockMarketplaceClient);
    influencePointIntegrationTool = new InfluencePointIntegrationTool(mockMarketplaceClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Marketplace Status Tool Integration', () => {
    it('should provide marketplace status with natural language summary for healthy marketplace', async () => {
      // Arrange
      const { baseState, statsState } = createMockMarketplaceState('healthy');
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, ...baseState });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, ...statsState });

      // Act
      const result = await marketplaceStatusTool.execute({});

      // Assert
      expect(result.summary).toContain('marketplace is running smoothly');
      expect(result.activeProviders).toBe(4);
      expect(result.recentTransactions).toBe(50);
      expect(result.healthIndicators.overallHealth).toBe('healthy');
      expect(result.providerActivity).toBeInstanceOf(Array);
      expect(result.providerActivity.length).toBeGreaterThan(0);
      expect(result.marketplaceInsights).toBeInstanceOf(Array);
      expect(result.marketplaceInsights.length).toBeGreaterThan(0);
    });

    it('should handle degraded marketplace performance scenarios', async () => {
      // Arrange
      const { baseState, statsState } = createMockMarketplaceState('degraded');
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, ...baseState });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, ...statsState });

      // Act
      const result = await marketplaceStatusTool.execute({});

      // Assert
      expect(result.healthIndicators.overallHealth).toBe('degraded');
      expect(result.queueStatus.high + result.queueStatus.medium + result.queueStatus.low).toBeGreaterThan(50);
      expect(result.marketplaceInsights).toContain(expect.stringContaining('High request volume'));
    });

    it('should handle marketplace unavailability scenarios', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(false);

      // Act
      const result = await marketplaceStatusTool.execute({});

      // Assert
      expect(result.summary).toContain('marketplace is currently unavailable');
      expect(result.activeProviders).toBe(0);
      expect(result.healthIndicators.overallHealth).toBe('unhealthy');
      expect(result.marketplaceInsights).toContain('Marketplace processes are offline');
    });

    it('should support route filtering for ecosystem integration', async () => {
      // Arrange
      const { baseState, statsState } = createMockMarketplaceState('healthy');
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, ...baseState });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, ...statsState });

      // Act
      const result = await marketplaceStatusTool.execute({
        filter_by_route: 'forest_path',
        include_detailed_stats: true
      });

      // Assert
      expect(result.summary).toContain('forest_path ecosystem area');
      expect(result.activeProviders).toBeGreaterThan(0);
    });

    it('should meet performance requirements (< 2 seconds)', async () => {
      // Arrange
      const { baseState, statsState } = createMockMarketplaceState('healthy');
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, ...baseState });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, ...statsState });

      // Act
      const startTime = Date.now();
      await marketplaceStatusTool.execute({});
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Provider Analysis Tool Integration', () => {
    it('should analyze provider performance tracking and reputation analysis', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const result = await providerAnalysisTool.execute({
        sort_by: 'reputation',
        include_historical_data: true
      });

      // Assert
      expect(result.summary).toContain('Analysis of');
      expect(result.providers).toBeInstanceOf(Array);
      expect(result.providers.length).toBeGreaterThan(0);
      expect(result.marketplaceRanking).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.insights).toBeInstanceOf(Array);
      
      // Check provider metrics structure
      if (result.providers.length > 0) {
        const provider = result.providers[0];
        expect(provider).toHaveProperty('provider_id');
        expect(provider).toHaveProperty('reputation_score');
        expect(provider).toHaveProperty('performance_metrics');
        expect(provider.performance_metrics).toHaveProperty('response_time_avg');
        expect(provider.performance_metrics).toHaveProperty('quality_score');
        expect(provider.performance_metrics).toHaveProperty('completion_rate');
      }
    });

    it('should provide provider comparison and recommendation engine', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const result = await providerAnalysisTool.execute({
        service_type: 'text-generation',
        sort_by: 'cost',
        limit: 5
      });

      // Assert
      expect(result.recommendations).toContain(expect.stringContaining('For highest quality'));
      expect(result.recommendations).toContain(expect.stringContaining('For fastest response'));
      expect(result.recommendations).toContain(expect.stringContaining('For cost efficiency'));
      expect(result.marketplaceRanking.length).toBeLessThanOrEqual(5);
    });

    it('should handle provider health monitoring and alert system', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const result = await providerAnalysisTool.execute({
        include_provider_breakdown: true
      });

      // Assert
      expect(result.providers).toBeInstanceOf(Array);
      result.providers.forEach(provider => {
        expect(provider.health_status).toMatch(/^(excellent|good|fair|poor|offline)$/);
        expect(provider.trends).toHaveProperty('reputation_trend');
        expect(provider.trends).toHaveProperty('performance_trend');
      });
    });

    it('should meet performance requirements (< 3 seconds for 20+ providers)', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const startTime = Date.now();
      await providerAnalysisTool.execute({ limit: 25 });
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('AI Service Request Tool Integration', () => {
    it('should handle manual request triggering and response monitoring', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.submitInferenceRequest.mockResolvedValue({
        success: true,
        request_id: 'test-request-123',
        provider_id: 'test-provider',
        queue_position: 1,
        estimated_completion: Date.now() + 30000,
        status: 'queued'
      });

      // Act
      const result = await aiServiceRequestTool.execute({
        service_type: 'text-generation',
        context_data: {
          prompt: 'Test prompt for marketplace integration',
          max_tokens: 100
        },
        payment_amount: '150',
        timeout: 30,
        priority: 'high',
        quality_tier: 'premium'
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.request_id).toBe('test-request-123');
      expect(result.status).toBe('submitted');
      expect(result.provider_id).toBe('test-provider');
      expect(result.queue_position).toBe(1);
      expect(result.cost_breakdown).toHaveProperty('total_cost');
      expect(result.cost_breakdown).toHaveProperty('provider_fee');
      expect(result.cost_breakdown).toHaveProperty('marketplace_fee');
      expect(result.monitoring_suggestions).toBeInstanceOf(Array);
      expect(result.next_steps).toBeInstanceOf(Array);
    });

    it('should validate request parameters and handle validation errors', async () => {
      // Act - invalid service type
      const result = await aiServiceRequestTool.execute({
        service_type: 'invalid-service',
        context_data: { prompt: 'test' },
        payment_amount: '100'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid service_type');
      expect(result.status).toBe('failed');
    });

    it('should handle provider targeting and X-prefix metadata', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.submitInferenceRequest.mockResolvedValue({
        success: true,
        request_id: 'test-request-456',
        provider_id: 'targeted-provider',
        queue_position: 0,
        estimated_completion: Date.now() + 15000,
        status: 'processing'
      });

      // Act
      const result = await aiServiceRequestTool.execute({
        service_type: 'analysis',
        provider_id: 'targeted-provider',
        context_data: {
          prompt: 'Analyze this data',
          additional_context: { type: 'financial' }
        },
        payment_amount: '200',
        x_metadata: {
          'X-Quality-Tier': 'premium',
          'X-Priority': 'urgent',
          'X-Context-Type': 'financial'
        }
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.provider_id).toBe('targeted-provider');
      expect(result.request_details.x_metadata_count).toBe(3);
      expect(result.queue_position).toBe(0);
    });

    it('should meet performance requirements (< 1 second)', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.submitInferenceRequest.mockResolvedValue({
        success: true,
        request_id: 'perf-test',
        status: 'submitted'
      });

      // Act
      const startTime = Date.now();
      await aiServiceRequestTool.execute({
        service_type: 'text-generation',
        context_data: { prompt: 'Performance test' },
        payment_amount: '100'
      });
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Marketplace Economics Tool Integration', () => {
    it('should analyze token flow analysis and financial health indicators', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const result = await marketplaceEconomicsTool.execute({
        time_range: 'day',
        include_token_flows: true,
        include_trend_analysis: true
      });

      // Assert
      expect(result.summary).toContain('Marketplace economics analysis');
      expect(result.financial_health).toHaveProperty('overall_score');
      expect(result.financial_health).toHaveProperty('status');
      expect(result.token_flows).toHaveProperty('total_volume');
      expect(result.token_flows).toHaveProperty('inbound_payments');
      expect(result.token_flows).toHaveProperty('outbound_payments');
      expect(result.token_flows).toHaveProperty('marketplace_fees');
      expect(result.token_flows).toHaveProperty('net_flow');
      expect(result.token_flows.flow_breakdown).toBeInstanceOf(Array);
    });

    it('should provide provider payment distribution analytics', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const result = await marketplaceEconomicsTool.execute({
        include_provider_breakdown: true,
        focus_area: 'revenue'
      });

      // Assert
      expect(result.provider_economics).toBeInstanceOf(Array);
      expect(result.provider_economics.length).toBeGreaterThan(0);
      result.provider_economics.forEach(provider => {
        expect(provider).toHaveProperty('provider_id');
        expect(provider).toHaveProperty('earnings');
        expect(provider).toHaveProperty('requests_served');
        expect(provider).toHaveProperty('average_earning_per_request');
        expect(provider).toHaveProperty('market_share');
        expect(provider).toHaveProperty('revenue_contribution');
      });
    });

    it('should generate optimization recommendations based on focus area', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const result = await marketplaceEconomicsTool.execute({
        focus_area: 'costs',
        include_trend_analysis: true
      });

      // Assert
      expect(result.optimization_recommendations).toBeInstanceOf(Array);
      expect(result.optimization_recommendations.length).toBeGreaterThan(0);
      expect(result.optimization_recommendations.some(rec => rec.includes('cost'))).toBe(true);
      expect(result.trend_analysis).toHaveProperty('volume_trend');
      expect(result.trend_analysis).toHaveProperty('revenue_trend');
      expect(result.trend_analysis).toHaveProperty('profitability_trend');
    });

    it('should meet performance requirements (< 4 seconds for 1000+ transactions)', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const startTime = Date.now();
      await marketplaceEconomicsTool.execute({
        time_range: 'month',
        include_provider_breakdown: true,
        include_token_flows: true,
        include_trend_analysis: true
      });
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(4000);
    });
  });

  describe('Influence Point Integration Tool Integration', () => {
    it('should track marketplace transaction monitoring and cost tracking', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const result = await influencePointIntegrationTool.execute({
        action: 'transaction_monitoring',
        time_range: 'day',
        include_predictions: true
      });

      // Assert
      expect(result.current_balance).toHaveProperty('total_influence_points');
      expect(result.current_balance).toHaveProperty('available_for_ai_services');
      expect(result.current_balance).toHaveProperty('reserved_for_ecosystem');
      expect(result.transaction_monitoring).toHaveProperty('recent_transactions');
      expect(result.transaction_monitoring).toHaveProperty('success_rate');
      expect(result.transaction_monitoring.recent_transactions).toBeInstanceOf(Array);
    });

    it('should provide budget management and spending analytics', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const result = await influencePointIntegrationTool.execute({
        action: 'budget_management',
        include_recommendations: true
      });

      // Assert
      expect(result.budget_management).toHaveProperty('daily_budget');
      expect(result.budget_management).toHaveProperty('weekly_budget');
      expect(result.budget_management).toHaveProperty('monthly_budget');
      expect(result.budget_management).toHaveProperty('current_usage');
      expect(result.budget_management).toHaveProperty('budget_alerts');
      expect(result.budget_management.budget_alerts).toBeInstanceOf(Array);
      expect(result.marketplace_spending).toHaveProperty('spending_by_service');
    });

    it('should generate cost optimization recommendations and spending alerts', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const result = await influencePointIntegrationTool.execute({
        action: 'optimization',
        include_recommendations: true,
        include_predictions: true
      });

      // Assert
      expect(result.cost_optimization).toHaveProperty('recommendations');
      expect(result.cost_optimization).toHaveProperty('potential_savings');
      expect(result.cost_optimization).toHaveProperty('efficiency_score');
      expect(result.cost_optimization).toHaveProperty('optimal_spending_patterns');
      expect(result.predictions).toHaveProperty('projected_monthly_spending');
      expect(result.predictions).toHaveProperty('estimated_balance_depletion');
      expect(result.predictions).toHaveProperty('recommended_top_up_amount');
    });

    it('should meet performance requirements (< 1 second with 500ms cache refresh)', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act
      const startTime = Date.now();
      await influencePointIntegrationTool.execute({
        action: 'balance'
      });
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Marketplace MCP Integration End-to-End', () => {
    it('should integrate seamlessly with existing MCP ecosystem tools', async () => {
      // Arrange
      const config = {
        marketplace_process_id: 'test-marketplace-process',
        ao_endpoint: 'http://localhost:8081',
        timeout: 5000
      };

      // Mock the marketplace client for integration
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, health: { is_healthy: true } });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, stats: {} });

      // Act - Test tool integration
      const integration = new MarketplaceMCPIntegration(config);
      const toolsResult = await integration['server'].request({
        method: 'tools/list',
        params: {}
      });

      // Assert
      expect(toolsResult.tools).toBeDefined();
      expect(toolsResult.tools.length).toBe(5);
      expect(toolsResult.tools.map((t: any) => t.name)).toContain('marketplace_status');
      expect(toolsResult.tools.map((t: any) => t.name)).toContain('provider_analysis');
      expect(toolsResult.tools.map((t: any) => t.name)).toContain('ai_service_request');
      expect(toolsResult.tools.map((t: any) => t.name)).toContain('marketplace_economics');
      expect(toolsResult.tools.map((t: any) => t.name)).toContain('influence_point_integration');
    });

    it('should handle error scenarios and recovery mechanisms', async () => {
      // Arrange
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(false);

      // Act - Test all tools during marketplace outage
      const statusResult = await marketplaceStatusTool.execute({});
      const analysisResult = await providerAnalysisTool.execute({});
      const requestResult = await aiServiceRequestTool.execute({
        service_type: 'text-generation',
        context_data: { prompt: 'test' },
        payment_amount: '100'
      });
      const economicsResult = await marketplaceEconomicsTool.execute({});
      const integrationResult = await influencePointIntegrationTool.execute({
        action: 'balance'
      });

      // Assert - All tools should handle unavailability gracefully
      expect(statusResult.healthIndicators.overallHealth).toBe('unhealthy');
      expect(analysisResult.summary).toContain('unavailable');
      expect(requestResult.success).toBe(false);
      expect(economicsResult.financial_health.status).toBe('poor');
      expect(integrationResult.current_balance.total_influence_points).toBe(0);
    });

    it('should provide natural language responses for user experience', async () => {
      // Arrange
      const { baseState, statsState } = createMockMarketplaceState('healthy');
      mockMarketplaceClient.isProcessAvailable.mockResolvedValue(true);
      mockMarketplaceClient.healthCheck.mockResolvedValue({ success: true, ...baseState });
      mockMarketplaceClient.getMarketplaceStats.mockResolvedValue({ success: true, ...statsState });

      // Act
      const statusResult = await marketplaceStatusTool.execute({});
      const analysisResult = await providerAnalysisTool.execute({});
      const economicsResult = await marketplaceEconomicsTool.execute({});
      const integrationResult = await influencePointIntegrationTool.execute({
        action: 'balance'
      });

      // Assert - All responses should be natural language
      expect(statusResult.summary).toMatch(/marketplace.*running.*smoothly/i);
      expect(analysisResult.summary).toMatch(/analysis.*providers.*shows/i);
      expect(economicsResult.summary).toMatch(/economics.*analysis.*shows/i);
      expect(integrationResult.summary).toMatch(/influence.*point.*balance/i);
    });
  });
});