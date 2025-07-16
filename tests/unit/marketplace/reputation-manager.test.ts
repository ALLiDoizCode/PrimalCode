import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReputationManager, ServiceOutcome } from '../../../src/marketplace/reputation-manager';
import { AOProcess } from '../../../src/ao/ao-process';
import { ProcessMessage, ProcessResponse } from '../../../src/ao/types';

// Mock the AOProcess class
jest.mock('../../../src/ao/ao-process');

describe('ReputationManager', () => {
  let reputationManager: ReputationManager;
  let mockSendMessage: any;

  // Helper to create mock responses
  const createMockResponse = (action: string, data: any): ProcessResponse => ({
    Action: action,
    Data: JSON.stringify(data),
    From: 'test-process-id'
  });

  beforeEach(() => {
    mockSendMessage = jest.fn();
    (AOProcess as jest.Mock).mockImplementation(() => ({
      sendMessage: mockSendMessage
    }));
    
    reputationManager = new ReputationManager('test-process-id');
  });

  describe('trackServiceOutcome', () => {
    it('should send service outcome to AO process', async () => {
      const outcome: ServiceOutcome = {
        provider_id: 'test-provider',
        request_id: 'test-request',
        service_type: 'text-generation',
        response_time: 2.5,
        quality_score: 0.8,
        success: true,
        timestamp: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Service-Outcome-Tracked', {
        provider_id: outcome.provider_id,
        request_id: outcome.request_id,
        tracked_at: Date.now()
      }));

      await reputationManager.trackServiceOutcome(outcome);

      expect(mockSendMessage).toHaveBeenCalledWith({
        Action: 'Service-Outcome',
        Data: JSON.stringify(outcome),
        Tags: {
          'Provider-ID': outcome.provider_id,
          'Request-ID': outcome.request_id,
          'Service-Type': outcome.service_type
        }
      });
    });

    it('should throw error on service outcome tracking failure', async () => {
      const outcome: ServiceOutcome = {
        provider_id: 'test-provider',
        request_id: 'test-request',
        service_type: 'text-generation',
        response_time: 2.5,
        quality_score: 0.8,
        success: true,
        timestamp: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Service-Outcome-Error', {
        error: 'Invalid data',
        message: 'Failed to track service outcome'
      }));

      await expect(reputationManager.trackServiceOutcome(outcome)).rejects.toThrow('Failed to track service outcome');
    });
  });

  describe('getProviderReputation', () => {
    it('should retrieve provider reputation data', async () => {
      const providerId = 'test-provider';
      const mockReputation = {
        provider_id: providerId,
        reputation_score: 0.85,
        quality_metrics: {
          avg_response_time: 2.3,
          avg_quality_score: 0.8,
          completion_rate: 0.95,
          reliability_score: 0.9,
          trend_direction: 'improving',
          data_points: 50
        },
        last_updated: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Provider-Reputation-Response', mockReputation));

      const result = await reputationManager.getProviderReputation(providerId);

      expect(mockSendMessage).toHaveBeenCalledWith({
        Action: 'Get-Provider-Reputation',
        Data: '',
        Tags: {
          'Provider-ID': providerId
        }
      });

      expect(result).toEqual(mockReputation);
    });

    it('should handle provider not found error', async () => {
      const providerId = 'nonexistent-provider';

      mockSendMessage.mockResolvedValue(createMockResponse('Provider-Reputation-Error', {
        error: 'Provider not found',
        message: 'No reputation data available'
      }));

      await expect(reputationManager.getProviderReputation(providerId)).rejects.toThrow('No reputation data available');
    });
  });

  describe('getProviderRanking', () => {
    it('should retrieve provider ranking for service type', async () => {
      const serviceType = 'text-generation';
      const mockRanking = {
        service_type: serviceType,
        ranking: [
          { provider_id: 'provider-1', score: 0.95, last_updated: Date.now() },
          { provider_id: 'provider-2', score: 0.85, last_updated: Date.now() },
          { provider_id: 'provider-3', score: 0.75, last_updated: Date.now() }
        ],
        total_providers: 3,
        generated_at: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Provider-Ranking-Response', mockRanking));

      const result = await reputationManager.getProviderRanking(serviceType, 10);

      expect(mockSendMessage).toHaveBeenCalledWith({
        Action: 'Get-Provider-Ranking',
        Data: '',
        Tags: {
          'Service-Type': serviceType,
          'Limit': '10'
        }
      });

      expect(result).toEqual(mockRanking);
      expect(result.ranking).toHaveLength(3);
      expect(result.ranking[0].score).toBeGreaterThan(result.ranking[1].score);
    });

    it('should use default values for optional parameters', async () => {
      const mockRanking = {
        service_type: 'default',
        ranking: [],
        total_providers: 0,
        generated_at: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Provider-Ranking-Response', mockRanking));

      await reputationManager.getProviderRanking();

      expect(mockSendMessage).toHaveBeenCalledWith({
        Action: 'Get-Provider-Ranking',
        Data: '',
        Tags: {
          'Service-Type': 'default',
          'Limit': '10'
        }
      });
    });
  });

  describe('getReputationHistory', () => {
    it('should retrieve reputation history for provider', async () => {
      const providerId = 'test-provider';
      const mockHistory = {
        provider_id: providerId,
        history: [
          { date: Date.now() - 86400000, score: 0.7 },
          { date: Date.now() - 43200000, score: 0.8 },
          { date: Date.now(), score: 0.9 }
        ],
        summary: {
          total_points: 3,
          date_range: { start: Date.now() - 86400000, end: Date.now() },
          avg_score: 0.8,
          min_score: 0.7,
          max_score: 0.9,
          trend_direction: 'improving'
        }
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Reputation-History-Response', mockHistory));

      const result = await reputationManager.getReputationHistory(providerId);

      expect(mockSendMessage).toHaveBeenCalledWith({
        Action: 'Get-Reputation-History',
        Data: '',
        Tags: {
          'Provider-ID': providerId
        }
      });

      expect(result).toEqual(mockHistory);
      expect(result.history).toHaveLength(3);
      expect(result.summary.trend_direction).toBe('improving');
    });
  });

  describe('triggerCleanup', () => {
    it('should trigger reputation cleanup successfully', async () => {
      const mockCleanupResult = {
        cleaned_providers: ['provider-1', 'provider-2'],
        cleanup_time: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Reputation-Cleanup-Complete', mockCleanupResult));

      const result = await reputationManager.triggerCleanup();

      expect(mockSendMessage).toHaveBeenCalledWith({
        Action: 'Reputation-Cleanup',
        Data: '',
        Tags: {}
      });

      expect(result).toEqual(mockCleanupResult);
    });

    it('should handle cleanup skip scenario', async () => {
      mockSendMessage.mockResolvedValue(createMockResponse('Reputation-Cleanup-Skipped', {
        message: 'Cleanup performed recently',
        next_cleanup: Date.now() + 300000
      }));

      await expect(reputationManager.triggerCleanup()).rejects.toThrow('Cleanup skipped');
    });
  });

  describe('getTopProviders', () => {
    it('should return top providers from ranking', async () => {
      const mockRanking = {
        service_type: 'text-generation',
        ranking: [
          { provider_id: 'top-provider-1', score: 0.95, last_updated: Date.now() },
          { provider_id: 'top-provider-2', score: 0.85, last_updated: Date.now() }
        ],
        total_providers: 2,
        generated_at: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Provider-Ranking-Response', mockRanking));

      const result = await reputationManager.getTopProviders('text-generation', 2);

      expect(result).toHaveLength(2);
      expect(result[0].provider_id).toBe('top-provider-1');
      expect(result[1].provider_id).toBe('top-provider-2');
    });
  });

  describe('compareProviders', () => {
    it('should compare two providers and return winner', async () => {
      const provider1 = 'provider-1';
      const provider2 = 'provider-2';

      const mockReputation1 = {
        provider_id: provider1,
        reputation_score: 0.9,
        quality_metrics: {
          avg_response_time: 1.5,
          avg_quality_score: 0.85,
          completion_rate: 0.95,
          reliability_score: 0.9,
          trend_direction: 'improving',
          data_points: 100
        },
        last_updated: Date.now()
      };

      const mockReputation2 = {
        provider_id: provider2,
        reputation_score: 0.7,
        quality_metrics: {
          avg_response_time: 2.5,
          avg_quality_score: 0.75,
          completion_rate: 0.85,
          reliability_score: 0.8,
          trend_direction: 'stable',
          data_points: 80
        },
        last_updated: Date.now()
      };

      mockSendMessage
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', mockReputation1))
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', mockReputation2));

      const result = await reputationManager.compareProviders(provider1, provider2);

      expect(result.winner).toBe(provider1);
      expect(result.score_difference).toBe(0.2);
      expect(result.provider1).toEqual(mockReputation1);
      expect(result.provider2).toEqual(mockReputation2);
    });
  });

  describe('calculateSelectionBias', () => {
    it('should calculate selection bias with quadratic scaling', () => {
      expect(reputationManager.calculateSelectionBias(0.9)).toBeCloseTo(0.81, 2);
      expect(reputationManager.calculateSelectionBias(0.5)).toBeCloseTo(0.25, 2);
      expect(reputationManager.calculateSelectionBias(0.1)).toBeCloseTo(0.1, 2); // Minimum bias
    });

    it('should ensure minimum bias of 0.1', () => {
      expect(reputationManager.calculateSelectionBias(0.0)).toBe(0.1);
      expect(reputationManager.calculateSelectionBias(0.05)).toBe(0.1);
    });
  });

  describe('filterProvidersByThreshold', () => {
    it('should filter providers by reputation threshold', async () => {
      const providers = ['provider-1', 'provider-2', 'provider-3'];
      
      const mockReputations = [
        { reputation_score: 0.8 },
        { reputation_score: 0.5 },
        { reputation_score: 0.9 }
      ];

      mockSendMessage
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', mockReputations[0]))
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', mockReputations[1]))
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', mockReputations[2]));

      const result = await reputationManager.filterProvidersByThreshold(providers, 0.7);

      expect(result).toHaveLength(2);
      expect(result).toContain('provider-1');
      expect(result).toContain('provider-3');
      expect(result).not.toContain('provider-2');
    });

    it('should handle providers with no reputation data', async () => {
      const providers = ['provider-1', 'provider-no-data'];
      
      mockSendMessage
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', { reputation_score: 0.8 }))
        .mockRejectedValueOnce(new Error('No reputation data'));

      const result = await reputationManager.filterProvidersByThreshold(providers, 0.7);

      expect(result).toHaveLength(1);
      expect(result).toContain('provider-1');
    });
  });

  describe('calculateLoadBalancingWeights', () => {
    it('should calculate normalized load balancing weights', async () => {
      const providers = ['provider-1', 'provider-2'];
      
      const mockReputations = [
        { reputation_score: 0.8 },
        { reputation_score: 0.6 }
      ];

      mockSendMessage
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', mockReputations[0]))
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', mockReputations[1]));

      const result = await reputationManager.calculateLoadBalancingWeights(providers);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['provider-1']).toBeGreaterThan(result['provider-2']);
      
      // Weights should sum to 1
      const totalWeight = Object.values(result).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });

    it('should handle providers with no reputation data', async () => {
      const providers = ['provider-1', 'provider-no-data'];
      
      mockSendMessage
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', { reputation_score: 0.8 }))
        .mockRejectedValueOnce(new Error('No reputation data'));

      const result = await reputationManager.calculateLoadBalancingWeights(providers);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['provider-1']).toBeGreaterThan(result['provider-no-data']);
      expect(result['provider-no-data']).toBe(0.5); // Default weight
    });
  });

  describe('checkPerformanceAlerts', () => {
    it('should check performance alerts with default thresholds', async () => {
      const providerId = 'test-provider';
      const mockReputation = {
        provider_id: providerId,
        reputation_score: 0.6,
        quality_metrics: {
          avg_response_time: 6.0, // Exceeds default threshold
          avg_quality_score: 0.6, // Below default threshold
          completion_rate: 0.8,   // Below default threshold
          reliability_score: 0.7,
          trend_direction: 'declining',
          data_points: 50
        },
        last_updated: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Provider-Reputation-Response', mockReputation));

      const result = await reputationManager.checkPerformanceAlerts(providerId);

      expect(result).toHaveLength(3);
      expect(result.some(alert => alert.type === 'response_time')).toBeTruthy();
      expect(result.some(alert => alert.type === 'quality_score')).toBeTruthy();
      expect(result.some(alert => alert.type === 'completion_rate')).toBeTruthy();
    });

    it('should return no alerts for good performance', async () => {
      const providerId = 'good-provider';
      const mockReputation = {
        provider_id: providerId,
        reputation_score: 0.9,
        quality_metrics: {
          avg_response_time: 2.0,
          avg_quality_score: 0.85,
          completion_rate: 0.95,
          reliability_score: 0.9,
          trend_direction: 'improving',
          data_points: 100
        },
        last_updated: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Provider-Reputation-Response', mockReputation));

      const result = await reputationManager.checkPerformanceAlerts(providerId);

      expect(result).toHaveLength(0);
    });
  });

  describe('analyzeProviderTrend', () => {
    it('should analyze provider trend with sufficient data', async () => {
      const providerId = 'trend-provider';
      const mockHistory = {
        provider_id: providerId,
        history: [
          { date: Date.now() - 86400000, score: 0.7 },
          { date: Date.now() - 43200000, score: 0.8 },
          { date: Date.now(), score: 0.9 }
        ],
        summary: {
          total_points: 3,
          date_range: { start: Date.now() - 86400000, end: Date.now() },
          avg_score: 0.8,
          min_score: 0.7,
          max_score: 0.9,
          trend_direction: 'improving'
        }
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Reputation-History-Response', mockHistory));

      const result = await reputationManager.analyzeProviderTrend(providerId);

      expect(result.trend_direction).toBe('improving');
      expect(result.recent_performance).toBeGreaterThan(result.historical_average);
      expect(result.recommendation).toContain('increasing provider priority');
    });

    it('should handle insufficient data for trend analysis', async () => {
      const providerId = 'new-provider';
      const mockHistory = {
        provider_id: providerId,
        history: [{ date: Date.now(), score: 0.5 }],
        summary: {
          total_points: 1,
          date_range: { start: Date.now(), end: Date.now() },
          avg_score: 0.5,
          min_score: 0.5,
          max_score: 0.5,
          trend_direction: 'neutral'
        }
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Reputation-History-Response', mockHistory));

      const result = await reputationManager.analyzeProviderTrend(providerId);

      expect(result.trend_direction).toBe('neutral');
      expect(result.trend_strength).toBe(0);
      expect(result.recommendation).toBe('Insufficient data for trend analysis');
    });
  });

  describe('getProviderAnalysis', () => {
    it('should return comprehensive provider analysis', async () => {
      const providerId = 'analysis-provider';
      
      const mockReputation = {
        provider_id: providerId,
        reputation_score: 0.85,
        quality_metrics: {
          avg_response_time: 2.0,
          avg_quality_score: 0.8,
          completion_rate: 0.95,
          reliability_score: 0.9,
          trend_direction: 'improving',
          data_points: 100
        },
        last_updated: Date.now()
      };

      const mockHistory = {
        provider_id: providerId,
        history: [
          { date: Date.now() - 86400000, score: 0.7 },
          { date: Date.now(), score: 0.9 }
        ],
        summary: {
          total_points: 2,
          date_range: { start: Date.now() - 86400000, end: Date.now() },
          avg_score: 0.8,
          min_score: 0.7,
          max_score: 0.9,
          trend_direction: 'improving'
        }
      };

      mockSendMessage
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', mockReputation))
        .mockResolvedValueOnce(createMockResponse('Reputation-History-Response', mockHistory))
        .mockResolvedValueOnce(createMockResponse('Reputation-History-Response', mockHistory))
        .mockResolvedValueOnce(createMockResponse('Provider-Reputation-Response', mockReputation));

      const result = await reputationManager.getProviderAnalysis(providerId);

      expect(result.reputation).toEqual(mockReputation);
      expect(result.history).toEqual(mockHistory);
      expect(result.trend_analysis).toBeDefined();
      expect(result.alerts).toBeDefined();
    });
  });

  describe('getMarketplaceStats', () => {
    it('should return marketplace statistics', async () => {
      const mockRanking = {
        service_type: 'default',
        ranking: [
          { provider_id: 'provider-1', score: 0.9, last_updated: Date.now() },
          { provider_id: 'provider-2', score: 0.7, last_updated: Date.now() },
          { provider_id: 'provider-3', score: 0.5, last_updated: Date.now() },
          { provider_id: 'provider-4', score: 0.3, last_updated: Date.now() }
        ],
        total_providers: 4,
        generated_at: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Provider-Ranking-Response', mockRanking));

      const result = await reputationManager.getMarketplaceStats();

      expect(result.total_providers).toBe(4);
      expect(result.avg_reputation_score).toBeCloseTo(0.6, 1);
      expect(result.top_performer).toBe('provider-1');
      expect(result.bottom_performer).toBe('provider-4');
      expect(result.performance_distribution.excellent).toBe(1); // 0.9 >= 0.8
      expect(result.performance_distribution.good).toBe(1);       // 0.7 >= 0.6 && < 0.8
      expect(result.performance_distribution.average).toBe(1);    // 0.5 >= 0.4 && < 0.6
      expect(result.performance_distribution.poor).toBe(1);       // 0.3 < 0.4
    });

    it('should handle empty marketplace', async () => {
      const mockRanking = {
        service_type: 'default',
        ranking: [],
        total_providers: 0,
        generated_at: Date.now()
      };

      mockSendMessage.mockResolvedValue(createMockResponse('Provider-Ranking-Response', mockRanking));

      const result = await reputationManager.getMarketplaceStats();

      expect(result.total_providers).toBe(0);
      expect(result.avg_reputation_score).toBe(0);
      expect(result.top_performer).toBeNull();
      expect(result.bottom_performer).toBeNull();
      expect(result.performance_distribution.excellent).toBe(0);
      expect(result.performance_distribution.good).toBe(0);
      expect(result.performance_distribution.average).toBe(0);
      expect(result.performance_distribution.poor).toBe(0);
    });
  });
});