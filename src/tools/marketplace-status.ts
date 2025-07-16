/**
 * Marketplace Status MCP Tool
 * Provides natural language marketplace activity summaries
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MarketplaceClient } from '../marketplace/marketplace-client.js';
import { MarketplaceHealth } from '../marketplace/marketplace-client.js';

export interface MarketplaceStatusRequest {
  filter_by_route?: string;
  include_detailed_stats?: boolean;
  time_range?: 'hour' | 'day' | 'week';
}

export interface MarketplaceStatusResponse {
  summary: string;
  activeProviders: number;
  recentTransactions: number;
  queueStatus: {
    high: number;
    medium: number;
    low: number;
    active: number;
  };
  healthIndicators: {
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
  providerActivity: string[];
  marketplaceInsights: string[];
}

export class MarketplaceStatusTool {
  private marketplaceClient: MarketplaceClient;
  private readonly maxResponseTime = 2000; // 2 seconds as per requirements

  constructor(marketplaceClient: MarketplaceClient) {
    this.marketplaceClient = marketplaceClient;
  }

  /**
   * Get MCP tool definition
   */
  getTool(): Tool {
    return {
      name: 'marketplace_status',
      description: 'Get natural language marketplace activity summaries with provider availability and health indicators',
      inputSchema: {
        type: 'object',
        properties: {
          filter_by_route: {
            type: 'string',
            description: 'Optional route filter to show marketplace activity for specific ecosystem areas'
          },
          include_detailed_stats: {
            type: 'boolean',
            description: 'Include detailed statistics and metrics in the response',
            default: false
          },
          time_range: {
            type: 'string',
            enum: ['hour', 'day', 'week'],
            description: 'Time range for activity analysis',
            default: 'hour'
          }
        }
      }
    };
  }

  /**
   * Execute the marketplace status tool
   */
  async execute(request: MarketplaceStatusRequest): Promise<MarketplaceStatusResponse> {
    const startTime = Date.now();
    
    try {
      // Check if marketplace is available
      const isAvailable = await this.marketplaceClient.isProcessAvailable();
      if (!isAvailable) {
        return this.generateUnavailableResponse();
      }

      // Get marketplace health and statistics
      const [healthResponse, statsResponse] = await Promise.all([
        this.marketplaceClient.healthCheck(),
        this.marketplaceClient.getMarketplaceStats()
      ]);

      // Check response time requirement
      const responseTime = Date.now() - startTime;
      if (responseTime > this.maxResponseTime) {
        // Response time exceeded target - log for monitoring
      }

      return this.generateStatusResponse(healthResponse, statsResponse, request);

    } catch (error) {
      // Error getting marketplace status - handle gracefully
      return this.generateErrorResponse(error);
    }
  }

  /**
   * Generate response when marketplace is unavailable
   */
  private generateUnavailableResponse(): MarketplaceStatusResponse {
    return {
      summary: 'The AI inference marketplace is currently unavailable. Services are temporarily offline for maintenance or experiencing connectivity issues.',
      activeProviders: 0,
      recentTransactions: 0,
      queueStatus: {
        high: 0,
        medium: 0,
        low: 0,
        active: 0
      },
      healthIndicators: {
        overallHealth: 'unhealthy',
        responseTime: 0,
        errorRate: 1.0,
        uptime: 0
      },
      providerActivity: ['No providers currently available'],
      marketplaceInsights: [
        'Marketplace processes are offline',
        'Check back in a few minutes for service restoration',
        'Consider using cached AI decisions for critical operations'
      ]
    };
  }

  /**
   * Generate response when there's an error
   */
  private generateErrorResponse(error: any): MarketplaceStatusResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      summary: `Marketplace status check encountered an error: ${errorMessage}. The marketplace may be experiencing issues or undergoing maintenance.`,
      activeProviders: 0,
      recentTransactions: 0,
      queueStatus: {
        high: 0,
        medium: 0,
        low: 0,
        active: 0
      },
      healthIndicators: {
        overallHealth: 'unhealthy',
        responseTime: 0,
        errorRate: 1.0,
        uptime: 0
      },
      providerActivity: ['Error retrieving provider information'],
      marketplaceInsights: [
        'Error communicating with marketplace processes',
        'This may indicate network issues or process unavailability',
        'Automatic retry mechanisms are in place'
      ]
    };
  }

  /**
   * Generate comprehensive marketplace status response
   */
  private generateStatusResponse(
    healthResponse: any,
    statsResponse: any,
    request: MarketplaceStatusRequest
  ): MarketplaceStatusResponse {
    const health = healthResponse.health;
    const stats = statsResponse.stats;
    const queueStats = healthResponse.queue_stats || {};

    // Calculate health indicators
    const overallHealth = this.calculateOverallHealth(health, stats);
    const responseTime = health?.response_time_avg || 0;
    const errorRate = this.calculateErrorRate(health);
    const uptime = health?.uptime || 0;

    // Generate natural language summary
    const summary = this.generateNaturalLanguageSummary(health, stats, queueStats, request);

    // Generate provider activity insights
    const providerActivity = this.generateProviderActivity(stats, health);

    // Generate marketplace insights
    const marketplaceInsights = this.generateMarketplaceInsights(health, stats, queueStats);

    return {
      summary,
      activeProviders: stats?.active_providers || 0,
      recentTransactions: stats?.recent_transactions || 0,
      queueStatus: {
        high: queueStats.high || 0,
        medium: queueStats.medium || 0,
        low: queueStats.low || 0,
        active: queueStats.active || 0
      },
      healthIndicators: {
        overallHealth,
        responseTime,
        errorRate,
        uptime
      },
      providerActivity,
      marketplaceInsights
    };
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(health: MarketplaceHealth | undefined, _stats: any): 'healthy' | 'degraded' | 'unhealthy' {
    if (!health || !health.is_healthy) {
      return 'unhealthy';
    }

    // Check for degraded performance indicators
    if (health.error_count > 10 || health.memory_usage > 0.8) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Calculate error rate from health data
   */
  private calculateErrorRate(health: MarketplaceHealth | undefined): number {
    if (!health) return 1.0;
    
    // Simple error rate calculation based on error count and uptime
    const errorCount = health.error_count || 0;
    const uptime = health.uptime || 1;
    return Math.min(errorCount / (uptime / 3600), 1.0); // errors per hour, capped at 1.0
  }

  /**
   * Generate natural language summary of marketplace activity
   */
  private generateNaturalLanguageSummary(
    health: MarketplaceHealth | undefined,
    stats: any,
    queueStats: any,
    request: MarketplaceStatusRequest
  ): string {
    if (!health || !health.is_healthy) {
      return 'The marketplace is currently experiencing issues. AI inference services are limited or unavailable.';
    }

    const totalProviders = stats?.total_providers || 0;
    const activeProviders = stats?.active_providers || 0;
    const queuedRequests = (queueStats.high || 0) + (queueStats.medium || 0) + (queueStats.low || 0);
    const activeRequests = queueStats.active || 0;

    let summary = `The AI inference marketplace is running smoothly with ${activeProviders} active providers`;
    
    if (totalProviders > activeProviders) {
      summary += ` out of ${totalProviders} total registered providers`;
    }
    
    summary += '. ';

    if (activeRequests > 0) {
      summary += `Currently processing ${activeRequests} AI inference requests`;
      if (queuedRequests > 0) {
        summary += ` with ${queuedRequests} requests queued`;
      }
      summary += '. ';
    } else if (queuedRequests > 0) {
      summary += `${queuedRequests} requests are queued awaiting processing. `;
    } else {
      summary += 'No requests are currently queued or being processed. ';
    }

    // Add route-specific information if requested
    if (request.filter_by_route) {
      summary += `Marketplace activity is filtered for the ${request.filter_by_route} ecosystem area. `;
    }

    // Add performance insights
    const uptimeHours = Math.floor((health.uptime || 0) / 3600);
    if (uptimeHours > 0) {
      summary += `System has been running smoothly for ${uptimeHours} hours.`;
    }

    return summary;
  }

  /**
   * Generate provider activity descriptions
   */
  private generateProviderActivity(stats: any, health: MarketplaceHealth | undefined): string[] {
    const activity: string[] = [];

    if (!stats || !health?.is_healthy) {
      activity.push('Provider activity information is currently unavailable');
      return activity;
    }

    const totalProviders = stats.total_providers || 0;
    const activeProviders = stats.active_providers || 0;

    if (totalProviders === 0) {
      activity.push('No providers are currently registered with the marketplace');
    } else {
      activity.push(`${totalProviders} providers are registered with the marketplace`);
      
      if (activeProviders > 0) {
        activity.push(`${activeProviders} providers are actively accepting requests`);
      }
      
      if (activeProviders < totalProviders) {
        activity.push(`${totalProviders - activeProviders} providers are currently offline or unavailable`);
      }
    }

    // Add success rate if available
    if (stats.success_rate > 0) {
      const successPercentage = Math.round(stats.success_rate * 100);
      activity.push(`Overall success rate is ${successPercentage}% for recent requests`);
    }

    return activity;
  }

  /**
   * Generate marketplace insights and recommendations
   */
  private generateMarketplaceInsights(health: MarketplaceHealth | undefined, stats: any, queueStats: any): string[] {
    const insights: string[] = [];

    if (!health || !health.is_healthy) {
      insights.push('Marketplace health is degraded - expect slower response times');
      insights.push('Consider retrying failed requests or using cached decisions');
      return insights;
    }

    // Queue analysis
    const totalQueued = (queueStats.high || 0) + (queueStats.medium || 0) + (queueStats.low || 0);
    
    if (totalQueued > 10) {
      insights.push('High request volume detected - consider breaking large requests into smaller chunks');
    } else if (totalQueued === 0) {
      insights.push('Low request volume - ideal time for batch processing or complex AI tasks');
    }

    // Performance insights
    if (health.memory_usage > 0.7) {
      insights.push('Memory usage is high - performance may be impacted during peak times');
    }

    if (health.error_count > 5) {
      insights.push('Some errors detected recently - monitor for patterns or retry failed requests');
    }

    // Provider insights
    const activeProviders = stats?.active_providers || 0;
    if (activeProviders > 3) {
      insights.push('Multiple providers available - good redundancy for high availability');
    } else if (activeProviders === 1) {
      insights.push('Single provider active - consider having backup options ready');
    }

    // Default positive insight
    if (insights.length === 0) {
      insights.push('Marketplace is operating optimally with good provider availability');
    }

    return insights;
  }

  /**
   * Update marketplace client configuration
   */
  updateClient(client: MarketplaceClient): void {
    this.marketplaceClient = client;
  }
}

/**
 * Create a marketplace status tool instance
 */
export function createMarketplaceStatusTool(marketplaceClient: MarketplaceClient): MarketplaceStatusTool {
  return new MarketplaceStatusTool(marketplaceClient);
}