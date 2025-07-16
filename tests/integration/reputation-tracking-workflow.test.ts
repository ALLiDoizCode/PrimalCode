import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ReputationManager, ServiceOutcome } from '../../src/marketplace/reputation-manager';
import { QualityMetricsDashboardTool } from '../../src/marketplace/quality-metrics-dashboard';
import { AOProcess } from '../../src/ao/ao-process';
import { ProcessMessage, ProcessResponse } from '../../src/ao/types';

// Mock the AOProcess class for integration tests
jest.mock('../../src/ao/ao-process');

describe('Reputation Tracking Workflow Integration', () => {
  let reputationManager: ReputationManager;
  let qualityDashboard: QualityMetricsDashboardTool;
  let mockSendMessage: any;
  const testProcessId = 'test-reputation-manager-process';

  // Helper to create mock responses
  const createMockResponse = (action: string, data: any): ProcessResponse => ({
    Action: action,
    Data: JSON.stringify(data),
    From: testProcessId
  });

  beforeEach(() => {
    mockSendMessage = jest.fn();
    (AOProcess as jest.Mock).mockImplementation(() => ({
      sendMessage: mockSendMessage
    }));
    
    reputationManager = new ReputationManager(testProcessId);
    qualityDashboard = new QualityMetricsDashboardTool(testProcessId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Outcome Tracking', () => {
    it('should track service outcomes and update reputation scores', async () => {
      const providerId = 'test-provider-001';
      const serviceOutcome: ServiceOutcome = {
        provider_id: providerId,
        request_id: 'req-001',
        service_type: 'text-generation',
        response_time: 2.5,
        quality_score: 0.85,
        success: true,
        timestamp: Date.now()
      };

      // Mock the responses
      mockSendMessage
        .mockResolvedValueOnce(createMockResponse('Service-Outcome-Tracked', {
          provider_id: providerId,
          request_id: 'req-001',
          tracked_at: Date.now()
        }))
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', {
          provider_id: providerId,
          reputation_score: 0.85,
          quality_metrics: {
            avg_response_time: 2.5,
            avg_quality_score: 0.85,
            completion_rate: 1.0,
            reliability_score: 0.95,
            trend_direction: 'improving',
            data_points: 1
          },
          last_updated: Date.now()
        }));

      // Track service outcome
      await reputationManager.trackServiceOutcome(serviceOutcome);

      // Verify reputation is updated
      const reputation = await reputationManager.getProviderReputation(providerId);
      
      expect(reputation.provider_id).toBe(providerId);
      expect(reputation.reputation_score).toBeGreaterThan(0);
      expect(reputation.quality_metrics.data_points).toBeGreaterThan(0);
    });

    it('should handle multiple service outcomes and calculate accurate metrics', async () => {
      const providerId = 'test-provider-002';
      const serviceOutcomes: ServiceOutcome[] = [
        {
          provider_id: providerId,
          request_id: 'req-001',
          service_type: 'text-generation',
          response_time: 1.5,
          quality_score: 0.9,
          success: true,
          timestamp: Date.now()
        },
        {
          provider_id: providerId,
          request_id: 'req-002',
          service_type: 'text-generation',
          response_time: 2.0,
          quality_score: 0.8,
          success: true,
          timestamp: Date.now() + 1000
        },
        {
          provider_id: providerId,
          request_id: 'req-003',
          service_type: 'text-generation',
          response_time: 3.0,
          quality_score: 0.75,
          success: false,
          timestamp: Date.now() + 2000
        }
      ];

      // Track multiple outcomes
      for (const outcome of serviceOutcomes) {
        await reputationManager.trackServiceOutcome(outcome);
      }

      // Verify metrics are calculated correctly
      const reputation = await reputationManager.getProviderReputation(providerId);
      
      expect(reputation.quality_metrics.avg_response_time).toBeCloseTo(2.17, 1);
      expect(reputation.quality_metrics.avg_quality_score).toBeCloseTo(0.82, 1);
      expect(reputation.quality_metrics.completion_rate).toBeCloseTo(0.67, 1);
      expect(reputation.quality_metrics.data_points).toBe(3);
    });

    it('should handle service failures and timeout scenarios', async () => {
      const providerId = 'test-provider-003';
      const failureOutcome: ServiceOutcome = {
        provider_id: providerId,
        request_id: 'req-timeout',
        service_type: 'text-generation',
        response_time: 35.0, // Timeout scenario
        quality_score: 0.0,
        success: false,
        timestamp: Date.now()
      };

      await reputationManager.trackServiceOutcome(failureOutcome);

      const reputation = await reputationManager.getProviderReputation(providerId);
      
      expect(reputation.quality_metrics.completion_rate).toBe(0);
      expect(reputation.quality_metrics.avg_response_time).toBe(35.0);
      expect(reputation.reputation_score).toBeLessThan(0.5);
    });
  });

  describe('Provider Ranking and Selection', () => {
    it('should rank providers by reputation score', async () => {
      const providers = ['provider-high', 'provider-medium', 'provider-low'];
      const serviceType = 'text-generation';

      // Create service outcomes with different quality levels
      const outcomes: ServiceOutcome[] = [
        // High quality provider
        {
          provider_id: 'provider-high',
          request_id: 'req-high-1',
          service_type: serviceType,
          response_time: 1.0,
          quality_score: 0.95,
          success: true,
          timestamp: Date.now()
        },
        // Medium quality provider
        {
          provider_id: 'provider-medium',
          request_id: 'req-med-1',
          service_type: serviceType,
          response_time: 2.5,
          quality_score: 0.75,
          success: true,
          timestamp: Date.now()
        },
        // Low quality provider
        {
          provider_id: 'provider-low',
          request_id: 'req-low-1',
          service_type: serviceType,
          response_time: 5.0,
          quality_score: 0.5,
          success: false,
          timestamp: Date.now()
        }
      ];

      // Track outcomes
      for (const outcome of outcomes) {
        await reputationManager.trackServiceOutcome(outcome);
      }

      // Get ranking
      const ranking = await reputationManager.getProviderRanking(serviceType, 10);
      
      expect(ranking.ranking).toHaveLength(3);
      expect(ranking.ranking[0].provider_id).toBe('provider-high');
      expect(ranking.ranking[1].provider_id).toBe('provider-medium');
      expect(ranking.ranking[2].provider_id).toBe('provider-low');
      
      // Verify scores are in descending order
      expect(ranking.ranking[0].score).toBeGreaterThan(ranking.ranking[1].score);
      expect(ranking.ranking[1].score).toBeGreaterThan(ranking.ranking[2].score);
    });

    it('should filter providers by reputation threshold', async () => {
      const providers = ['provider-good', 'provider-bad'];
      
      // Create contrasting outcomes
      const goodOutcome: ServiceOutcome = {
        provider_id: 'provider-good',
        request_id: 'req-good',
        service_type: 'text-generation',
        response_time: 1.5,
        quality_score: 0.9,
        success: true,
        timestamp: Date.now()
      };

      const badOutcome: ServiceOutcome = {
        provider_id: 'provider-bad',
        request_id: 'req-bad',
        service_type: 'text-generation',
        response_time: 10.0,
        quality_score: 0.3,
        success: false,
        timestamp: Date.now()
      };

      await reputationManager.trackServiceOutcome(goodOutcome);
      await reputationManager.trackServiceOutcome(badOutcome);

      // Filter with threshold
      const filteredProviders = await reputationManager.filterProvidersByThreshold(providers, 0.6);
      
      expect(filteredProviders).toContain('provider-good');
      expect(filteredProviders).not.toContain('provider-bad');
    });

    it('should calculate load balancing weights based on reputation', async () => {
      const providers = ['provider-a', 'provider-b'];
      
      // Create different quality outcomes
      const outcomeA: ServiceOutcome = {
        provider_id: 'provider-a',
        request_id: 'req-a',
        service_type: 'text-generation',
        response_time: 1.0,
        quality_score: 0.9,
        success: true,
        timestamp: Date.now()
      };

      const outcomeB: ServiceOutcome = {
        provider_id: 'provider-b',
        request_id: 'req-b',
        service_type: 'text-generation',
        response_time: 3.0,
        quality_score: 0.7,
        success: true,
        timestamp: Date.now()
      };

      await reputationManager.trackServiceOutcome(outcomeA);
      await reputationManager.trackServiceOutcome(outcomeB);

      const weights = await reputationManager.calculateLoadBalancingWeights(providers);
      
      expect(Object.keys(weights)).toHaveLength(2);
      expect(weights['provider-a']).toBeGreaterThan(weights['provider-b']);
      
      // Weights should sum to 1
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });
  });

  describe('Quality Metrics Dashboard', () => {
    it('should provide comprehensive provider analysis', async () => {
      const providerId = 'test-analysis-provider';
      const serviceOutcome: ServiceOutcome = {
        provider_id: providerId,
        request_id: 'req-analysis',
        service_type: 'text-generation',
        response_time: 2.0,
        quality_score: 0.8,
        success: true,
        timestamp: Date.now()
      };

      await reputationManager.trackServiceOutcome(serviceOutcome);

      // Test dashboard analysis
      const analysisResult = await qualityDashboard.handleToolCall('analyze_provider_reputation', {
        provider_id: providerId,
        include_history: true,
        include_alerts: true
      });

      expect(analysisResult).toContain('Provider Reputation Analysis');
      expect(analysisResult).toContain(providerId);
      expect(analysisResult).toContain('Quality Metrics');
      expect(analysisResult).toContain('Response Time:');
      expect(analysisResult).toContain('Quality Score:');
      expect(analysisResult).toContain('Completion Rate:');
    });

    it('should generate provider rankings with natural language', async () => {
      const providers = ['dashboard-provider-1', 'dashboard-provider-2'];
      const serviceType = 'text-generation';

      // Create outcomes for ranking
      const outcomes: ServiceOutcome[] = [
        {
          provider_id: 'dashboard-provider-1',
          request_id: 'req-dash-1',
          service_type: serviceType,
          response_time: 1.5,
          quality_score: 0.85,
          success: true,
          timestamp: Date.now()
        },
        {
          provider_id: 'dashboard-provider-2',
          request_id: 'req-dash-2',
          service_type: serviceType,
          response_time: 2.5,
          quality_score: 0.75,
          success: true,
          timestamp: Date.now()
        }
      ];

      for (const outcome of outcomes) {
        await reputationManager.trackServiceOutcome(outcome);
      }

      const rankingResult = await qualityDashboard.handleToolCall('get_provider_rankings', {
        service_type: serviceType,
        limit: 10,
        min_reputation: 0.0
      });

      expect(rankingResult).toContain('Provider Rankings');
      expect(rankingResult).toContain('dashboard-provider-1');
      expect(rankingResult).toContain('dashboard-provider-2');
      expect(rankingResult).toContain('Score:');
    });

    it('should compare providers with detailed metrics', async () => {
      const provider1 = 'compare-provider-1';
      const provider2 = 'compare-provider-2';

      const outcome1: ServiceOutcome = {
        provider_id: provider1,
        request_id: 'req-comp-1',
        service_type: 'text-generation',
        response_time: 1.0,
        quality_score: 0.9,
        success: true,
        timestamp: Date.now()
      };

      const outcome2: ServiceOutcome = {
        provider_id: provider2,
        request_id: 'req-comp-2',
        service_type: 'text-generation',
        response_time: 3.0,
        quality_score: 0.7,
        success: true,
        timestamp: Date.now()
      };

      await reputationManager.trackServiceOutcome(outcome1);
      await reputationManager.trackServiceOutcome(outcome2);

      const comparisonResult = await qualityDashboard.handleToolCall('compare_providers', {
        provider_id_1: provider1,
        provider_id_2: provider2
      });

      expect(comparisonResult).toContain('Provider Comparison');
      expect(comparisonResult).toContain('Winner:');
      expect(comparisonResult).toContain(provider1);
      expect(comparisonResult).toContain(provider2);
      expect(comparisonResult).toContain('| Metric |');
    });

    it('should generate provider recommendations based on criteria', async () => {
      const recommendedProvider = 'recommended-provider';
      const outcome: ServiceOutcome = {
        provider_id: recommendedProvider,
        request_id: 'req-recommend',
        service_type: 'text-generation',
        response_time: 1.5,
        quality_score: 0.85,
        success: true,
        timestamp: Date.now()
      };

      await reputationManager.trackServiceOutcome(outcome);

      const recommendationResult = await qualityDashboard.handleToolCall('recommend_providers', {
        service_type: 'text-generation',
        max_response_time: 3.0,
        min_quality_score: 0.8,
        min_completion_rate: 0.9,
        limit: 5
      });

      expect(recommendationResult).toContain('Provider Recommendations');
      expect(recommendationResult).toContain('Criteria:');
      expect(recommendationResult).toContain('Max Response Time:');
      expect(recommendationResult).toContain('Min Quality Score:');
      expect(recommendationResult).toContain('Min Completion Rate:');
    });
  });

  describe('Reputation History and Trends', () => {
    it('should track reputation history over time', async () => {
      const providerId = 'history-provider';
      const baseTime = Date.now();

      // Create multiple outcomes over time
      const outcomes: ServiceOutcome[] = [
        {
          provider_id: providerId,
          request_id: 'req-hist-1',
          service_type: 'text-generation',
          response_time: 2.0,
          quality_score: 0.7,
          success: true,
          timestamp: baseTime
        },
        {
          provider_id: providerId,
          request_id: 'req-hist-2',
          service_type: 'text-generation',
          response_time: 1.8,
          quality_score: 0.8,
          success: true,
          timestamp: baseTime + 3600000 // 1 hour later
        },
        {
          provider_id: providerId,
          request_id: 'req-hist-3',
          service_type: 'text-generation',
          response_time: 1.5,
          quality_score: 0.9,
          success: true,
          timestamp: baseTime + 7200000 // 2 hours later
        }
      ];

      for (const outcome of outcomes) {
        await reputationManager.trackServiceOutcome(outcome);
      }

      const history = await reputationManager.getReputationHistory(providerId);
      
      expect(history.provider_id).toBe(providerId);
      expect(history.history.length).toBeGreaterThan(0);
      expect(history.summary.trend_direction).toBe('improving');
      expect(history.summary.total_points).toBeGreaterThan(0);
    });

    it('should analyze provider performance trends', async () => {
      const providerId = 'trend-provider';
      const baseTime = Date.now();

      // Create declining performance trend
      const decliningOutcomes: ServiceOutcome[] = [
        {
          provider_id: providerId,
          request_id: 'req-trend-1',
          service_type: 'text-generation',
          response_time: 1.0,
          quality_score: 0.9,
          success: true,
          timestamp: baseTime
        },
        {
          provider_id: providerId,
          request_id: 'req-trend-2',
          service_type: 'text-generation',
          response_time: 2.0,
          quality_score: 0.8,
          success: true,
          timestamp: baseTime + 3600000
        },
        {
          provider_id: providerId,
          request_id: 'req-trend-3',
          service_type: 'text-generation',
          response_time: 3.0,
          quality_score: 0.7,
          success: false,
          timestamp: baseTime + 7200000
        }
      ];

      for (const outcome of decliningOutcomes) {
        await reputationManager.trackServiceOutcome(outcome);
      }

      const trendAnalysis = await reputationManager.analyzeProviderTrend(providerId);
      
      expect(trendAnalysis.trend_direction).toBe('declining');
      expect(trendAnalysis.recent_performance).toBeLessThan(trendAnalysis.historical_average);
      expect(trendAnalysis.recommendation).toContain('reducing provider priority');
    });
  });

  describe('Performance Alerts and Monitoring', () => {
    it('should detect performance alerts based on thresholds', async () => {
      const providerId = 'alert-provider';
      const poorOutcome: ServiceOutcome = {
        provider_id: providerId,
        request_id: 'req-alert',
        service_type: 'text-generation',
        response_time: 10.0, // Very slow
        quality_score: 0.4,   // Low quality
        success: false,       // Failed
        timestamp: Date.now()
      };

      await reputationManager.trackServiceOutcome(poorOutcome);

      const alerts = await reputationManager.checkPerformanceAlerts(providerId, {
        max_response_time: 5.0,
        min_quality_score: 0.7,
        min_completion_rate: 0.9
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.type === 'response_time')).toBeTruthy();
      expect(alerts.some(a => a.type === 'quality_score')).toBeTruthy();
      expect(alerts.some(a => a.type === 'completion_rate')).toBeTruthy();
    });

    it('should provide marketplace-wide statistics', async () => {
      const providers = ['stats-provider-1', 'stats-provider-2'];
      
      // Create different performance levels
      const outcomes: ServiceOutcome[] = [
        {
          provider_id: 'stats-provider-1',
          request_id: 'req-stats-1',
          service_type: 'text-generation',
          response_time: 1.0,
          quality_score: 0.9,
          success: true,
          timestamp: Date.now()
        },
        {
          provider_id: 'stats-provider-2',
          request_id: 'req-stats-2',
          service_type: 'text-generation',
          response_time: 4.0,
          quality_score: 0.6,
          success: true,
          timestamp: Date.now()
        }
      ];

      for (const outcome of outcomes) {
        await reputationManager.trackServiceOutcome(outcome);
      }

      const marketplaceStats = await reputationManager.getMarketplaceStats();
      
      expect(marketplaceStats.total_providers).toBeGreaterThan(0);
      expect(marketplaceStats.avg_reputation_score).toBeGreaterThan(0);
      expect(marketplaceStats.performance_distribution).toBeDefined();
      expect(marketplaceStats.top_performer).toBeDefined();
    });
  });

  describe('Reputation Cleanup and Maintenance', () => {
    it('should perform reputation cleanup and maintenance', async () => {
      const providerId = 'cleanup-provider';
      const outcome: ServiceOutcome = {
        provider_id: providerId,
        request_id: 'req-cleanup',
        service_type: 'text-generation',
        response_time: 2.0,
        quality_score: 0.8,
        success: true,
        timestamp: Date.now()
      };

      await reputationManager.trackServiceOutcome(outcome);

      // Trigger cleanup
      const cleanupResult = await reputationManager.triggerCleanup();
      
      expect(cleanupResult.cleanup_time).toBeDefined();
      expect(Array.isArray(cleanupResult.cleaned_providers)).toBeTruthy();
    });
  });

  describe('Integration Verification Requirements', () => {
    it('should verify IV1: Reputation system accurately reflects provider performance', async () => {
      const highPerformanceProvider = 'iv1-high-provider';
      const lowPerformanceProvider = 'iv1-low-provider';

      // High performance outcomes
      const highOutcome: ServiceOutcome = {
        provider_id: highPerformanceProvider,
        request_id: 'req-iv1-high',
        service_type: 'text-generation',
        response_time: 1.0,
        quality_score: 0.95,
        success: true,
        timestamp: Date.now()
      };

      // Low performance outcomes
      const lowOutcome: ServiceOutcome = {
        provider_id: lowPerformanceProvider,
        request_id: 'req-iv1-low',
        service_type: 'text-generation',
        response_time: 8.0,
        quality_score: 0.4,
        success: false,
        timestamp: Date.now()
      };

      await reputationManager.trackServiceOutcome(highOutcome);
      await reputationManager.trackServiceOutcome(lowOutcome);

      const highReputation = await reputationManager.getProviderReputation(highPerformanceProvider);
      const lowReputation = await reputationManager.getProviderReputation(lowPerformanceProvider);

      // Verify reputation accurately reflects performance
      expect(highReputation.reputation_score).toBeGreaterThan(lowReputation.reputation_score);
      expect(highReputation.quality_metrics.avg_response_time).toBeLessThan(lowReputation.quality_metrics.avg_response_time);
      expect(highReputation.quality_metrics.avg_quality_score).toBeGreaterThan(lowReputation.quality_metrics.avg_quality_score);
      expect(highReputation.quality_metrics.completion_rate).toBeGreaterThan(lowReputation.quality_metrics.completion_rate);
    });

    it('should verify IV2: Provider selection incorporates reputation scores', async () => {
      const providers = ['iv2-provider-1', 'iv2-provider-2', 'iv2-provider-3'];
      const serviceType = 'text-generation';

      // Create different performance levels
      const outcomes: ServiceOutcome[] = [
        {
          provider_id: 'iv2-provider-1',
          request_id: 'req-iv2-1',
          service_type: serviceType,
          response_time: 1.0,
          quality_score: 0.9,
          success: true,
          timestamp: Date.now()
        },
        {
          provider_id: 'iv2-provider-2',
          request_id: 'req-iv2-2',
          service_type: serviceType,
          response_time: 2.0,
          quality_score: 0.8,
          success: true,
          timestamp: Date.now()
        },
        {
          provider_id: 'iv2-provider-3',
          request_id: 'req-iv2-3',
          service_type: serviceType,
          response_time: 5.0,
          quality_score: 0.6,
          success: false,
          timestamp: Date.now()
        }
      ];

      for (const outcome of outcomes) {
        await reputationManager.trackServiceOutcome(outcome);
      }

      const ranking = await reputationManager.getProviderRanking(serviceType);
      const weights = await reputationManager.calculateLoadBalancingWeights(providers);

      // Verify reputation-based selection
      expect(ranking.ranking[0].provider_id).toBe('iv2-provider-1');
      expect(weights['iv2-provider-1']).toBeGreaterThan(weights['iv2-provider-2']);
      expect(weights['iv2-provider-2']).toBeGreaterThan(weights['iv2-provider-3']);
    });

    it('should verify IV3: Quality tracking provides meaningful insights', async () => {
      const providerId = 'iv3-insights-provider';
      const baseTime = Date.now();

      // Create comprehensive service history
      const outcomes: ServiceOutcome[] = [
        {
          provider_id: providerId,
          request_id: 'req-iv3-1',
          service_type: 'text-generation',
          response_time: 2.0,
          quality_score: 0.7,
          success: true,
          timestamp: baseTime
        },
        {
          provider_id: providerId,
          request_id: 'req-iv3-2',
          service_type: 'text-generation',
          response_time: 1.8,
          quality_score: 0.8,
          success: true,
          timestamp: baseTime + 3600000
        },
        {
          provider_id: providerId,
          request_id: 'req-iv3-3',
          service_type: 'text-generation',
          response_time: 1.5,
          quality_score: 0.9,
          success: true,
          timestamp: baseTime + 7200000
        }
      ];

      for (const outcome of outcomes) {
        await reputationManager.trackServiceOutcome(outcome);
      }

      const analysis = await reputationManager.getProviderAnalysis(providerId);
      
      // Verify meaningful insights
      expect(analysis.reputation).toBeDefined();
      expect(analysis.history.summary.trend_direction).toBe('improving');
      expect(analysis.trend_analysis.recommendation).toBeDefined();
      expect(analysis.trend_analysis.recommendation.length).toBeGreaterThan(0);
      
      // Verify dashboard provides actionable insights
      const dashboardResult = await qualityDashboard.handleToolCall('analyze_provider_reputation', {
        provider_id: providerId
      });
      
      expect(dashboardResult).toContain('Performance Interpretation');
      expect(dashboardResult).toContain('Trend Analysis');
      expect(dashboardResult).toContain('Recommendation:');
    });
  });
});