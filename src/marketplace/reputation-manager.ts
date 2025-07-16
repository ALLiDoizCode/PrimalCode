import { AOProcess } from '../ao/ao-process';
import { ProcessMessage } from '../ao/types';

export interface ServiceOutcome {
  provider_id: string;
  request_id: string;
  service_type: string;
  response_time: number;
  quality_score: number;
  success: boolean;
  timestamp: number;
}

export interface ReputationScore {
  overall_score: number;
  response_time_score: number;
  quality_score: number;
  reliability_score: number;
  trend_score: number;
  computed_at: number;
}

export interface QualityMetrics {
  avg_response_time: number;
  avg_quality_score: number;
  completion_rate: number;
  reliability_score: number;
  trend_direction: string;
  data_points: number;
}

export interface ProviderReputation {
  provider_id: string;
  reputation_score: number;
  quality_metrics: QualityMetrics;
  last_updated: number;
}

export interface RankingEntry {
  provider_id: string;
  score: number;
  last_updated: number;
}

export interface ProviderRanking {
  service_type: string;
  ranking: RankingEntry[];
  total_providers: number;
  generated_at: number;
}

export interface ReputationTrend {
  date: number;
  score: number;
}

export interface ReputationHistory {
  provider_id: string;
  history: ReputationTrend[];
  summary: {
    total_points: number;
    date_range: { start: number; end: number };
    avg_score: number;
    min_score: number;
    max_score: number;
    trend_direction: string;
  };
}

export interface PerformanceAlert {
  type: string;
  severity: string;
  message: string;
  value: number;
  threshold: number;
}

export interface TrendAnalysis {
  trend_direction: string;
  trend_strength: number;
  recent_performance: number;
  historical_average: number;
  recommendation: string;
}

export class ReputationManager extends AOProcess {
  constructor(processId: string) {
    super(processId);
  }

  /**
   * Track a service outcome for reputation calculation
   */
  async trackServiceOutcome(outcome: ServiceOutcome): Promise<void> {
    const message: ProcessMessage = {
      Action: 'Service-Outcome',
      Data: JSON.stringify(outcome),
      Tags: {
        'Provider-ID': outcome.provider_id,
        'Request-ID': outcome.request_id,
        'Service-Type': outcome.service_type
      }
    };

    const result = await this.sendMessage(message);
    
    if (result.Action === 'Service-Outcome-Error') {
      throw new Error(`Failed to track service outcome: ${JSON.parse(result.Data).message}`);
    }
  }

  /**
   * Get reputation information for a provider
   */
  async getProviderReputation(providerId: string): Promise<ProviderReputation> {
    const message: ProcessMessage = {
      Action: 'Get-Provider-Reputation',
      Data: '',
      Tags: {
        'Provider-ID': providerId
      }
    };

    const result = await this.sendMessage(message);
    
    if (result.Action === 'Provider-Reputation-Error') {
      throw new Error(`Failed to get provider reputation: ${JSON.parse(result.Data).message}`);
    }

    return JSON.parse(result.Data);
  }

  /**
   * Get provider ranking for a service type
   */
  async getProviderRanking(serviceType: string = 'default', limit: number = 10): Promise<ProviderRanking> {
    const message: ProcessMessage = {
      Action: 'Get-Provider-Ranking',
      Data: '',
      Tags: {
        'Service-Type': serviceType,
        'Limit': limit.toString()
      }
    };

    const result = await this.sendMessage(message);
    
    if (result.Action === 'Provider-Ranking-Error') {
      throw new Error(`Failed to get provider ranking: ${JSON.parse(result.Data).message}`);
    }

    return JSON.parse(result.Data);
  }

  /**
   * Get reputation history for a provider
   */
  async getReputationHistory(providerId: string): Promise<ReputationHistory> {
    const message: ProcessMessage = {
      Action: 'Get-Reputation-History',
      Data: '',
      Tags: {
        'Provider-ID': providerId
      }
    };

    const result = await this.sendMessage(message);
    
    if (result.Action === 'Reputation-History-Error') {
      throw new Error(`Failed to get reputation history: ${JSON.parse(result.Data).message}`);
    }

    return JSON.parse(result.Data);
  }

  /**
   * Trigger reputation cleanup and maintenance
   */
  async triggerCleanup(): Promise<{ cleaned_providers: string[]; cleanup_time: number }> {
    const message: ProcessMessage = {
      Action: 'Reputation-Cleanup',
      Data: '',
      Tags: {}
    };

    const result = await this.sendMessage(message);
    
    if (result.Action === 'Reputation-Cleanup-Skipped') {
      const data = JSON.parse(result.Data);
      throw new Error(`Cleanup skipped: ${data.message}. Next cleanup at: ${data.next_cleanup}`);
    }

    return JSON.parse(result.Data);
  }

  /**
   * Get top providers by reputation score
   */
  async getTopProviders(serviceType: string = 'default', limit: number = 10): Promise<RankingEntry[]> {
    const ranking = await this.getProviderRanking(serviceType, limit);
    return ranking.ranking;
  }

  /**
   * Compare two providers by reputation
   */
  async compareProviders(providerId1: string, providerId2: string): Promise<{
    provider1: ProviderReputation;
    provider2: ProviderReputation;
    winner: string;
    score_difference: number;
  }> {
    const [reputation1, reputation2] = await Promise.all([
      this.getProviderReputation(providerId1),
      this.getProviderReputation(providerId2)
    ]);

    const scoreDiff = Math.abs(reputation1.reputation_score - reputation2.reputation_score);
    const winner = reputation1.reputation_score > reputation2.reputation_score ? providerId1 : providerId2;

    return {
      provider1: reputation1,
      provider2: reputation2,
      winner,
      score_difference: scoreDiff
    };
  }

  /**
   * Calculate provider selection bias based on reputation
   */
  calculateSelectionBias(reputationScore: number): number {
    // Higher reputation = higher selection probability
    const bias = reputationScore * reputationScore; // Quadratic scaling
    return Math.max(0.1, bias); // Minimum bias to ensure all providers have some chance
  }

  /**
   * Filter providers by minimum reputation threshold
   */
  async filterProvidersByThreshold(
    providers: string[], 
    threshold: number = 0.6
  ): Promise<string[]> {
    const filtered: string[] = [];
    
    for (const providerId of providers) {
      try {
        const reputation = await this.getProviderReputation(providerId);
        if (reputation.reputation_score >= threshold) {
          filtered.push(providerId);
        }
      } catch (error) {
        // Skip providers with no reputation data
        continue;
      }
    }
    
    return filtered;
  }

  /**
   * Calculate load balancing weights based on reputation
   */
  async calculateLoadBalancingWeights(providers: string[]): Promise<Record<string, number>> {
    const weights: Record<string, number> = {};
    let totalWeight = 0;
    
    for (const providerId of providers) {
      try {
        const reputation = await this.getProviderReputation(providerId);
        const weight = this.calculateSelectionBias(reputation.reputation_score);
        weights[providerId] = weight;
        totalWeight += weight;
      } catch (error) {
        // Default weight for providers without reputation data
        weights[providerId] = 0.5;
        totalWeight += 0.5;
      }
    }
    
    // Normalize weights to sum to 1
    if (totalWeight > 0) {
      for (const providerId in weights) {
        weights[providerId] = weights[providerId] / totalWeight;
      }
    }
    
    return weights;
  }

  /**
   * Check for performance alerts
   */
  async checkPerformanceAlerts(
    providerId: string, 
    thresholds: {
      max_response_time?: number;
      min_quality_score?: number;
      min_completion_rate?: number;
    } = {}
  ): Promise<PerformanceAlert[]> {
    const reputation = await this.getProviderReputation(providerId);
    const alerts: PerformanceAlert[] = [];
    
    const defaultThresholds = {
      max_response_time: 5.0,
      min_quality_score: 0.7,
      min_completion_rate: 0.9,
      ...thresholds
    };
    
    // Check response time
    if (reputation.quality_metrics.avg_response_time > defaultThresholds.max_response_time) {
      alerts.push({
        type: 'response_time',
        severity: 'warning',
        message: 'Average response time exceeds threshold',
        value: reputation.quality_metrics.avg_response_time,
        threshold: defaultThresholds.max_response_time
      });
    }
    
    // Check quality score
    if (reputation.quality_metrics.avg_quality_score < defaultThresholds.min_quality_score) {
      alerts.push({
        type: 'quality_score',
        severity: 'warning',
        message: 'Average quality score below threshold',
        value: reputation.quality_metrics.avg_quality_score,
        threshold: defaultThresholds.min_quality_score
      });
    }
    
    // Check completion rate
    if (reputation.quality_metrics.completion_rate < defaultThresholds.min_completion_rate) {
      alerts.push({
        type: 'completion_rate',
        severity: 'critical',
        message: 'Completion rate below threshold',
        value: reputation.quality_metrics.completion_rate,
        threshold: defaultThresholds.min_completion_rate
      });
    }
    
    return alerts;
  }

  /**
   * Analyze provider performance trend
   */
  async analyzeProviderTrend(providerId: string): Promise<TrendAnalysis> {
    const history = await this.getReputationHistory(providerId);
    
    if (history.history.length < 2) {
      return {
        trend_direction: 'neutral',
        trend_strength: 0,
        recent_performance: 0.5,
        historical_average: 0.5,
        recommendation: 'Insufficient data for trend analysis'
      };
    }
    
    const recentScores = history.history.slice(-5).map(h => h.score);
    const historicalScores = history.history.map(h => h.score);
    
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const historicalAvg = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length;
    
    const trendStrength = Math.abs(recentAvg - historicalAvg);
    
    let recommendation = 'Monitor performance';
    if (history.summary.trend_direction === 'improving') {
      recommendation = 'Consider increasing provider priority';
    } else if (history.summary.trend_direction === 'declining') {
      recommendation = 'Consider reducing provider priority or investigation';
    }
    
    return {
      trend_direction: history.summary.trend_direction,
      trend_strength: trendStrength,
      recent_performance: recentAvg,
      historical_average: historicalAvg,
      recommendation
    };
  }

  /**
   * Get comprehensive provider analysis
   */
  async getProviderAnalysis(providerId: string): Promise<{
    reputation: ProviderReputation;
    history: ReputationHistory;
    trend_analysis: TrendAnalysis;
    alerts: PerformanceAlert[];
  }> {
    const [reputation, history, trendAnalysis, alerts] = await Promise.all([
      this.getProviderReputation(providerId),
      this.getReputationHistory(providerId),
      this.analyzeProviderTrend(providerId),
      this.checkPerformanceAlerts(providerId)
    ]);

    return {
      reputation,
      history,
      trend_analysis: trendAnalysis,
      alerts
    };
  }

  /**
   * Get marketplace-wide reputation statistics
   */
  async getMarketplaceStats(): Promise<{
    total_providers: number;
    avg_reputation_score: number;
    top_performer: string | null;
    bottom_performer: string | null;
    performance_distribution: {
      excellent: number; // 0.8+
      good: number; // 0.6-0.8
      average: number; // 0.4-0.6
      poor: number; // <0.4
    };
  }> {
    const ranking = await this.getProviderRanking('default', 1000);
    
    if (ranking.ranking.length === 0) {
      return {
        total_providers: 0,
        avg_reputation_score: 0,
        top_performer: null,
        bottom_performer: null,
        performance_distribution: {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0
        }
      };
    }
    
    const scores = ranking.ranking.map(r => r.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const distribution = {
      excellent: scores.filter(s => s >= 0.8).length,
      good: scores.filter(s => s >= 0.6 && s < 0.8).length,
      average: scores.filter(s => s >= 0.4 && s < 0.6).length,
      poor: scores.filter(s => s < 0.4).length
    };
    
    return {
      total_providers: ranking.total_providers,
      avg_reputation_score: avgScore,
      top_performer: ranking.ranking[0]?.provider_id || null,
      bottom_performer: ranking.ranking[ranking.ranking.length - 1]?.provider_id || null,
      performance_distribution: distribution
    };
  }
}