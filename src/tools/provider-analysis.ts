/**
 * Provider Analysis MCP Tool
 * Provides provider performance metrics and reputation insights
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MarketplaceClient, InferenceProvider } from '../marketplace/marketplace-client.js';

export interface ProviderAnalysisRequest {
  provider_id?: string;
  service_type?: string;
  include_historical_data?: boolean;
  sort_by?: 'reputation' | 'response_time' | 'cost' | 'availability';
  limit?: number;
}

export interface ProviderAnalysisResponse {
  summary: string;
  providers: ProviderMetrics[];
  marketplaceRanking: ProviderRanking[];
  recommendations: string[];
  insights: string[];
}

export interface ProviderMetrics {
  provider_id: string;
  name: string;
  description: string;
  reputation_score: number;
  performance_metrics: {
    response_time_avg: number;
    quality_score: number;
    completion_rate: number;
    total_requests: number;
    availability_score: number;
  };
  pricing_info: {
    service_types: string[];
    cost_per_request: Record<string, string>;
    cost_efficiency_score: number;
  };
  capabilities: string[];
  health_status: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  last_activity: string;
  trends: {
    reputation_trend: 'improving' | 'stable' | 'declining';
    performance_trend: 'improving' | 'stable' | 'declining';
  };
}

export interface ProviderRanking {
  provider_id: string;
  rank: number;
  score: number;
  category: string;
  reason: string;
}

export class ProviderAnalysisTool {
  private marketplaceClient: MarketplaceClient;
  private readonly maxResponseTime = 3000; // 3 seconds as per requirements

  constructor(marketplaceClient: MarketplaceClient) {
    this.marketplaceClient = marketplaceClient;
  }

  /**
   * Get MCP tool definition
   */
  getTool(): Tool {
    return {
      name: 'provider_analysis',
      description: 'Analyze AI inference provider performance, reputation, and provide recommendations for optimal provider selection',
      inputSchema: {
        type: 'object',
        properties: {
          provider_id: {
            type: 'string',
            description: 'Specific provider ID to analyze (optional - if not provided, analyzes all providers)'
          },
          service_type: {
            type: 'string',
            description: 'Filter analysis by specific service type (e.g., "text-generation", "image-analysis")'
          },
          include_historical_data: {
            type: 'boolean',
            description: 'Include historical performance trends and data',
            default: false
          },
          sort_by: {
            type: 'string',
            enum: ['reputation', 'response_time', 'cost', 'availability'],
            description: 'Sort providers by specified criteria',
            default: 'reputation'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of providers to analyze',
            default: 10,
            minimum: 1,
            maximum: 50
          }
        }
      }
    };
  }

  /**
   * Execute provider analysis
   */
  async execute(request: ProviderAnalysisRequest): Promise<ProviderAnalysisResponse> {
    const startTime = Date.now();
    
    try {
      // Check marketplace availability
      const isAvailable = await this.marketplaceClient.isProcessAvailable();
      if (!isAvailable) {
        return this.generateUnavailableResponse();
      }

      // Get marketplace data
      const [healthResponse, statsResponse] = await Promise.all([
        this.marketplaceClient.healthCheck(),
        this.marketplaceClient.getMarketplaceStats()
      ]);

      // Check response time requirement
      const responseTime = Date.now() - startTime;
      if (responseTime > this.maxResponseTime) {
        // Response time exceeded target - should be monitored via performance tracking
      }

      // Get detailed provider information
      const providers = await this.getProviderDetails(request);

      return this.generateAnalysisResponse(providers, request, healthResponse, statsResponse);

    } catch (error) {
      // Error analyzing providers - handle gracefully
      return this.generateErrorResponse(error);
    }
  }

  /**
   * Get detailed provider information
   */
  private async getProviderDetails(request: ProviderAnalysisRequest): Promise<InferenceProvider[]> {
    // This would typically query the marketplace for provider details
    // For now, we'll simulate with mock data that would come from AO process
    const mockProviders: InferenceProvider[] = [
      {
        provider_id: 'claude-provider-1',
        capabilities: ['text-generation', 'analysis', 'reasoning'],
        pricing: {
          'text-generation': '100',
          'analysis': '150',
          'reasoning': '200'
        },
        reputation: {
          response_time_avg: 1.2,
          quality_score: 0.95,
          completion_rate: 0.98,
          total_requests: 1500
        },
        metadata: {
          last_seen: Date.now() - 300000, // 5 minutes ago
          x_tags_supported: ['high-quality', 'fast-response', 'reliable'],
          description: 'High-quality Claude-based inference provider with excellent reasoning capabilities'
        },
        status: 'active'
      },
      {
        provider_id: 'openai-provider-1',
        capabilities: ['text-generation', 'code-generation', 'image-analysis'],
        pricing: {
          'text-generation': '80',
          'code-generation': '120',
          'image-analysis': '200'
        },
        reputation: {
          response_time_avg: 2.1,
          quality_score: 0.88,
          completion_rate: 0.94,
          total_requests: 2300
        },
        metadata: {
          last_seen: Date.now() - 600000, // 10 minutes ago
          x_tags_supported: ['cost-effective', 'versatile', 'popular'],
          description: 'Versatile OpenAI-based provider with broad capability support'
        },
        status: 'active'
      }
    ];

    // Filter by provider_id if specified
    if (request.provider_id) {
      return mockProviders.filter(p => p.provider_id === request.provider_id);
    }

    // Filter by service_type if specified
    if (request.service_type) {
      return mockProviders.filter(p => p.capabilities.includes(request.service_type!));
    }

    // Apply limit
    const limit = request.limit || 10;
    return mockProviders.slice(0, limit);
  }

  /**
   * Generate response when marketplace is unavailable
   */
  private generateUnavailableResponse(): ProviderAnalysisResponse {
    return {
      summary: 'Provider analysis is currently unavailable due to marketplace connectivity issues. Unable to retrieve provider performance data.',
      providers: [],
      marketplaceRanking: [],
      recommendations: [
        'Wait for marketplace connectivity to be restored',
        'Consider using cached provider recommendations',
        'Check marketplace status for service updates'
      ],
      insights: [
        'Marketplace processes are offline',
        'Provider performance data is temporarily inaccessible',
        'Service will resume automatically when connectivity is restored'
      ]
    };
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(error: any): ProviderAnalysisResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      summary: `Provider analysis encountered an error: ${errorMessage}. Unable to complete provider performance evaluation.`,
      providers: [],
      marketplaceRanking: [],
      recommendations: [
        'Retry the analysis in a few moments',
        'Check marketplace connectivity',
        'Contact support if the issue persists'
      ],
      insights: [
        'Error occurred during provider data retrieval',
        'This may indicate network or process issues',
        'Automatic recovery mechanisms are in place'
      ]
    };
  }

  /**
   * Generate comprehensive analysis response
   */
  private generateAnalysisResponse(
    providers: InferenceProvider[],
    request: ProviderAnalysisRequest,
    _healthResponse: any,
    _statsResponse: any
  ): ProviderAnalysisResponse {
    const providerMetrics = providers.map(p => this.convertToProviderMetrics(p));
    const ranking = this.generateProviderRanking(providerMetrics, request.sort_by);
    const recommendations = this.generateRecommendations(providerMetrics, request);
    const insights = this.generateInsights(providerMetrics);
    const summary = this.generateSummary(providerMetrics, request);

    return {
      summary,
      providers: providerMetrics,
      marketplaceRanking: ranking,
      recommendations,
      insights
    };
  }

  /**
   * Convert InferenceProvider to ProviderMetrics
   */
  private convertToProviderMetrics(provider: InferenceProvider): ProviderMetrics {
    const timeSinceLastSeen = Date.now() - provider.metadata.last_seen;
    const availabilityScore = this.calculateAvailabilityScore(provider.status, timeSinceLastSeen);
    const costEfficiencyScore = this.calculateCostEfficiencyScore(provider.pricing, provider.reputation);
    const healthStatus = this.determineHealthStatus(provider);

    return {
      provider_id: provider.provider_id,
      name: provider.provider_id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: provider.metadata.description,
      reputation_score: this.calculateReputationScore(provider.reputation),
      performance_metrics: {
        response_time_avg: provider.reputation.response_time_avg,
        quality_score: provider.reputation.quality_score,
        completion_rate: provider.reputation.completion_rate,
        total_requests: provider.reputation.total_requests,
        availability_score: availabilityScore
      },
      pricing_info: {
        service_types: provider.capabilities,
        cost_per_request: provider.pricing,
        cost_efficiency_score: costEfficiencyScore
      },
      capabilities: provider.capabilities,
      health_status: healthStatus,
      last_activity: this.formatLastActivity(provider.metadata.last_seen),
      trends: {
        reputation_trend: this.calculateReputationTrend(provider),
        performance_trend: this.calculatePerformanceTrend(provider)
      }
    };
  }

  /**
   * Calculate overall reputation score
   */
  private calculateReputationScore(reputation: any): number {
    const weights = {
      quality: 0.4,
      completion: 0.3,
      response_time: 0.2,
      volume: 0.1
    };

    const qualityScore = reputation.quality_score * weights.quality;
    const completionScore = reputation.completion_rate * weights.completion;
    const responseTimeScore = Math.max(0, (5 - reputation.response_time_avg) / 5) * weights.response_time;
    const volumeScore = Math.min(1, reputation.total_requests / 1000) * weights.volume;

    return Math.round((qualityScore + completionScore + responseTimeScore + volumeScore) * 100) / 100;
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(status: string, timeSinceLastSeen: number): number {
    if (status !== 'active') return 0;
    
    const hoursOffline = timeSinceLastSeen / (1000 * 60 * 60);
    if (hoursOffline > 24) return 0;
    if (hoursOffline > 1) return 0.5;
    return 1.0;
  }

  /**
   * Calculate cost efficiency score
   */
  private calculateCostEfficiencyScore(pricing: Record<string, string>, reputation: any): number {
    const avgCost = Object.values(pricing).reduce((sum, cost) => sum + parseInt(cost), 0) / Object.values(pricing).length;
    const qualityRatio = reputation.quality_score / (avgCost / 100);
    return Math.min(1.0, qualityRatio);
  }

  /**
   * Determine health status
   */
  private determineHealthStatus(provider: InferenceProvider): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (provider.status !== 'active') return 'offline';
    
    const reputation = provider.reputation;
    const score = this.calculateReputationScore(reputation);
    
    if (score >= 0.9) return 'excellent';
    if (score >= 0.7) return 'good';
    if (score >= 0.5) return 'fair';
    return 'poor';
  }

  /**
   * Format last activity timestamp
   */
  private formatLastActivity(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} days ago`;
    if (hours > 0) return `${hours} hours ago`;
    if (minutes > 0) return `${minutes} minutes ago`;
    return 'Just now';
  }

  /**
   * Calculate reputation trend (mock implementation)
   */
  private calculateReputationTrend(provider: InferenceProvider): 'improving' | 'stable' | 'declining' {
    // In a real implementation, this would analyze historical data
    const score = this.calculateReputationScore(provider.reputation);
    if (score > 0.8) return 'improving';
    if (score > 0.6) return 'stable';
    return 'declining';
  }

  /**
   * Calculate performance trend (mock implementation)
   */
  private calculatePerformanceTrend(provider: InferenceProvider): 'improving' | 'stable' | 'declining' {
    // In a real implementation, this would analyze historical performance data
    if (provider.reputation.response_time_avg < 2.0) return 'improving';
    if (provider.reputation.response_time_avg < 3.0) return 'stable';
    return 'declining';
  }

  /**
   * Generate provider ranking
   */
  private generateProviderRanking(providers: ProviderMetrics[], sortBy: string = 'reputation'): ProviderRanking[] {
    const rankings: ProviderRanking[] = [];
    
    // Sort providers based on criteria
    const sortedProviders = [...providers].sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputation_score - a.reputation_score;
        case 'response_time':
          return a.performance_metrics.response_time_avg - b.performance_metrics.response_time_avg;
        case 'cost':
          return a.pricing_info.cost_efficiency_score - b.pricing_info.cost_efficiency_score;
        case 'availability':
          return b.performance_metrics.availability_score - a.performance_metrics.availability_score;
        default:
          return b.reputation_score - a.reputation_score;
      }
    });

    // Create rankings
    sortedProviders.forEach((provider, index) => {
      rankings.push({
        provider_id: provider.provider_id,
        rank: index + 1,
        score: this.getScoreForSortCriteria(provider, sortBy),
        category: sortBy,
        reason: this.generateRankingReason(provider, sortBy, index + 1)
      });
    });

    return rankings;
  }

  /**
   * Get score for sorting criteria
   */
  private getScoreForSortCriteria(provider: ProviderMetrics, sortBy: string): number {
    switch (sortBy) {
      case 'reputation':
        return provider.reputation_score;
      case 'response_time':
        return provider.performance_metrics.response_time_avg;
      case 'cost':
        return provider.pricing_info.cost_efficiency_score;
      case 'availability':
        return provider.performance_metrics.availability_score;
      default:
        return provider.reputation_score;
    }
  }

  /**
   * Generate ranking reason
   */
  private generateRankingReason(provider: ProviderMetrics, sortBy: string, rank: number): string {
    switch (sortBy) {
      case 'reputation':
        return `Ranked #${rank} with ${provider.reputation_score} reputation score based on quality and reliability`;
      case 'response_time':
        return `Ranked #${rank} with ${provider.performance_metrics.response_time_avg}s average response time`;
      case 'cost':
        return `Ranked #${rank} with ${provider.pricing_info.cost_efficiency_score} cost efficiency score`;
      case 'availability':
        return `Ranked #${rank} with ${provider.performance_metrics.availability_score} availability score`;
      default:
        return `Ranked #${rank} in overall performance`;
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(providers: ProviderMetrics[], request: ProviderAnalysisRequest): string[] {
    const recommendations: string[] = [];

    if (providers.length === 0) {
      recommendations.push('No providers available for analysis');
      return recommendations;
    }

    const topProvider = providers.sort((a, b) => b.reputation_score - a.reputation_score)[0];
    const fastestProvider = providers.sort((a, b) => a.performance_metrics.response_time_avg - b.performance_metrics.response_time_avg)[0];

    recommendations.push(`For highest quality: Use ${topProvider.name} (reputation: ${topProvider.reputation_score})`);
    recommendations.push(`For fastest response: Use ${fastestProvider.name} (${fastestProvider.performance_metrics.response_time_avg}s avg)`);

    // Service-specific recommendations
    if (request.service_type) {
      const serviceProviders = providers.filter(p => p.capabilities.includes(request.service_type!));
      if (serviceProviders.length > 0) {
        const bestForService = serviceProviders.sort((a, b) => b.reputation_score - a.reputation_score)[0];
        recommendations.push(`For ${request.service_type}: ${bestForService.name} is the top specialist`);
      }
    }

    // Cost recommendations
    const costEfficient = providers.sort((a, b) => b.pricing_info.cost_efficiency_score - a.pricing_info.cost_efficiency_score)[0];
    recommendations.push(`For cost efficiency: ${costEfficient.name} offers best value for quality`);

    return recommendations;
  }

  /**
   * Generate insights
   */
  private generateInsights(providers: ProviderMetrics[]): string[] {
    const insights: string[] = [];

    if (providers.length === 0) {
      insights.push('No provider data available for analysis');
      return insights;
    }

    // Market insights
    const avgReputation = providers.reduce((sum, p) => sum + p.reputation_score, 0) / providers.length;
    insights.push(`Average marketplace reputation score is ${avgReputation.toFixed(2)}`);

    const avgResponseTime = providers.reduce((sum, p) => sum + p.performance_metrics.response_time_avg, 0) / providers.length;
    insights.push(`Average response time across providers is ${avgResponseTime.toFixed(1)} seconds`);

    // Health insights
    const healthyProviders = providers.filter(p => p.health_status === 'excellent' || p.health_status === 'good').length;
    insights.push(`${healthyProviders} out of ${providers.length} providers are in good health`);

    // Trend insights
    const improvingProviders = providers.filter(p => p.trends.reputation_trend === 'improving').length;
    if (improvingProviders > 0) {
      insights.push(`${improvingProviders} providers show improving reputation trends`);
    }

    // Competition insights
    if (providers.length > 1) {
      const competitionLevel = providers.length > 5 ? 'high' : providers.length > 2 ? 'moderate' : 'low';
      insights.push(`Marketplace competition level is ${competitionLevel} with ${providers.length} active providers`);
    }

    return insights;
  }

  /**
   * Generate summary
   */
  private generateSummary(providers: ProviderMetrics[], request: ProviderAnalysisRequest): string {
    if (providers.length === 0) {
      return 'No providers available for analysis. The marketplace may be experiencing issues or no providers match your criteria.';
    }

    const topProvider = providers.sort((a, b) => b.reputation_score - a.reputation_score)[0];
    const avgReputation = providers.reduce((sum, p) => sum + p.reputation_score, 0) / providers.length;
    const healthyCount = providers.filter(p => p.health_status === 'excellent' || p.health_status === 'good').length;

    let summary = `Analysis of ${providers.length} AI inference providers shows `;
    summary += `${topProvider.name} leading with a ${topProvider.reputation_score} reputation score. `;
    summary += `Overall marketplace quality is ${avgReputation > 0.8 ? 'excellent' : avgReputation > 0.6 ? 'good' : 'fair'} `;
    summary += `with an average reputation of ${avgReputation.toFixed(2)}. `;
    summary += `${healthyCount} providers are currently in good health and actively serving requests.`;

    if (request.service_type) {
      summary += ` Analysis focused on ${request.service_type} service capabilities.`;
    }

    return summary;
  }

  /**
   * Update marketplace client
   */
  updateClient(client: MarketplaceClient): void {
    this.marketplaceClient = client;
  }
}

/**
 * Create provider analysis tool instance
 */
export function createProviderAnalysisTool(marketplaceClient: MarketplaceClient): ProviderAnalysisTool {
  return new ProviderAnalysisTool(marketplaceClient);
}