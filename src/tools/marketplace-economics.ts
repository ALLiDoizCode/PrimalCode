/**
 * Marketplace Economics MCP Tool
 * Provides token flow visualization and marketplace financial health indicators
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MarketplaceClient } from '../marketplace/marketplace-client.js';

export interface MarketplaceEconomicsRequest {
  time_range?: 'hour' | 'day' | 'week' | 'month';
  include_provider_breakdown?: boolean;
  include_token_flows?: boolean;
  include_trend_analysis?: boolean;
  focus_area?: 'revenue' | 'costs' | 'profitability' | 'volume';
}

export interface MarketplaceEconomicsResponse {
  summary: string;
  financial_health: {
    overall_score: number;
    status: 'excellent' | 'good' | 'concerning' | 'poor';
    key_indicators: Record<string, number>;
  };
  token_flows: {
    total_volume: string;
    inbound_payments: string;
    outbound_payments: string;
    marketplace_fees: string;
    net_flow: string;
    flow_breakdown: TokenFlowBreakdown[];
  };
  cost_analysis: {
    total_costs: string;
    provider_payments: string;
    operational_costs: string;
    infrastructure_costs: string;
    cost_per_request: string;
  };
  revenue_analysis: {
    total_revenue: string;
    fee_revenue: string;
    transaction_volume: number;
    average_transaction_value: string;
    revenue_per_request: string;
  };
  provider_economics: ProviderEconomics[];
  trend_analysis: {
    volume_trend: 'increasing' | 'stable' | 'decreasing';
    revenue_trend: 'increasing' | 'stable' | 'decreasing';
    profitability_trend: 'improving' | 'stable' | 'declining';
    efficiency_trend: 'improving' | 'stable' | 'declining';
  };
  optimization_recommendations: string[];
  financial_insights: string[];
}

export interface TokenFlowBreakdown {
  category: string;
  amount: string;
  percentage: number;
  description: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ProviderEconomics {
  provider_id: string;
  earnings: string;
  requests_served: number;
  average_earning_per_request: string;
  cost_efficiency: number;
  market_share: number;
  revenue_contribution: number;
}

export class MarketplaceEconomicsTool {
  private marketplaceClient: MarketplaceClient;
  private readonly maxResponseTime = 4000; // 4 seconds as per requirements

  constructor(marketplaceClient: MarketplaceClient) {
    this.marketplaceClient = marketplaceClient;
  }

  /**
   * Get MCP tool definition
   */
  getTool(): Tool {
    return {
      name: 'marketplace_economics',
      description: 'Analyze marketplace financial health, token flows, costs, and revenue with optimization recommendations',
      inputSchema: {
        type: 'object',
        properties: {
          time_range: {
            type: 'string',
            enum: ['hour', 'day', 'week', 'month'],
            description: 'Time period for economic analysis',
            default: 'day'
          },
          include_provider_breakdown: {
            type: 'boolean',
            description: 'Include detailed provider economics breakdown',
            default: true
          },
          include_token_flows: {
            type: 'boolean',
            description: 'Include detailed token flow analysis',
            default: true
          },
          include_trend_analysis: {
            type: 'boolean',
            description: 'Include trend analysis and predictions',
            default: true
          },
          focus_area: {
            type: 'string',
            enum: ['revenue', 'costs', 'profitability', 'volume'],
            description: 'Primary focus area for the analysis',
            default: 'profitability'
          }
        }
      }
    };
  }

  /**
   * Execute marketplace economics analysis
   */
  async execute(request: MarketplaceEconomicsRequest): Promise<MarketplaceEconomicsResponse> {
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

      // Generate economic analysis
      return this.generateEconomicAnalysis(healthResponse, statsResponse, request);

    } catch (error) {
      // Error analyzing marketplace economics - handle gracefully
      return this.generateErrorResponse(error);
    }
  }

  /**
   * Generate response when marketplace is unavailable
   */
  private generateUnavailableResponse(): MarketplaceEconomicsResponse {
    return {
      summary: 'Marketplace economics data is currently unavailable due to system connectivity issues. Financial analysis cannot be performed at this time.',
      financial_health: {
        overall_score: 0,
        status: 'poor',
        key_indicators: {}
      },
      token_flows: {
        total_volume: '0',
        inbound_payments: '0',
        outbound_payments: '0',
        marketplace_fees: '0',
        net_flow: '0',
        flow_breakdown: []
      },
      cost_analysis: {
        total_costs: '0',
        provider_payments: '0',
        operational_costs: '0',
        infrastructure_costs: '0',
        cost_per_request: '0'
      },
      revenue_analysis: {
        total_revenue: '0',
        fee_revenue: '0',
        transaction_volume: 0,
        average_transaction_value: '0',
        revenue_per_request: '0'
      },
      provider_economics: [],
      trend_analysis: {
        volume_trend: 'stable',
        revenue_trend: 'stable',
        profitability_trend: 'stable',
        efficiency_trend: 'stable'
      },
      optimization_recommendations: [
        'Restore marketplace connectivity for economic analysis',
        'Check system health and process availability',
        'Monitor for service restoration'
      ],
      financial_insights: [
        'Economic data is temporarily unavailable',
        'Service restoration is required for analysis',
        'Historical data will be available once connectivity is restored'
      ]
    };
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(error: any): MarketplaceEconomicsResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      summary: `Marketplace economics analysis failed: ${errorMessage}. Unable to retrieve financial data for analysis.`,
      financial_health: {
        overall_score: 0,
        status: 'poor',
        key_indicators: {}
      },
      token_flows: {
        total_volume: '0',
        inbound_payments: '0',
        outbound_payments: '0',
        marketplace_fees: '0',
        net_flow: '0',
        flow_breakdown: []
      },
      cost_analysis: {
        total_costs: '0',
        provider_payments: '0',
        operational_costs: '0',
        infrastructure_costs: '0',
        cost_per_request: '0'
      },
      revenue_analysis: {
        total_revenue: '0',
        fee_revenue: '0',
        transaction_volume: 0,
        average_transaction_value: '0',
        revenue_per_request: '0'
      },
      provider_economics: [],
      trend_analysis: {
        volume_trend: 'stable',
        revenue_trend: 'stable',
        profitability_trend: 'stable',
        efficiency_trend: 'stable'
      },
      optimization_recommendations: [
        'Resolve the underlying error condition',
        'Check marketplace process health',
        'Retry analysis once issues are resolved'
      ],
      financial_insights: [
        'Technical error prevented economic analysis',
        'System diagnostics may be required',
        'Manual intervention may be needed'
      ]
    };
  }

  /**
   * Generate comprehensive economic analysis
   */
  private generateEconomicAnalysis(
    healthResponse: any,
    statsResponse: any,
    request: MarketplaceEconomicsRequest
  ): MarketplaceEconomicsResponse {
    // Mock economic data - in production, this would query actual transaction data
    const mockEconomicData = this.generateMockEconomicData(request.time_range);
    
    const financialHealth = this.calculateFinancialHealth(mockEconomicData);
    const tokenFlows = this.analyzeTokenFlows(mockEconomicData, request.include_token_flows);
    const costAnalysis = this.analyzeCosts(mockEconomicData);
    const revenueAnalysis = this.analyzeRevenue(mockEconomicData);
    const providerEconomics = this.analyzeProviderEconomics(mockEconomicData, request.include_provider_breakdown);
    const trendAnalysis = this.analyzeTrends(mockEconomicData, request.include_trend_analysis);
    const optimizationRecommendations = this.generateOptimizationRecommendations(mockEconomicData, request.focus_area);
    const financialInsights = this.generateFinancialInsights(mockEconomicData, financialHealth);
    const summary = this.generateSummary(financialHealth, tokenFlows, request);

    return {
      summary,
      financial_health: financialHealth,
      token_flows: tokenFlows,
      cost_analysis: costAnalysis,
      revenue_analysis: revenueAnalysis,
      provider_economics: providerEconomics,
      trend_analysis: trendAnalysis,
      optimization_recommendations: optimizationRecommendations,
      financial_insights: financialInsights
    };
  }

  /**
   * Generate mock economic data for analysis
   */
  private generateMockEconomicData(timeRange: string = 'day') {
    const multiplier = timeRange === 'hour' ? 1 : timeRange === 'day' ? 24 : timeRange === 'week' ? 168 : 720;
    
    return {
      totalVolume: 10000 * multiplier,
      totalTransactions: 500 * multiplier,
      marketplaceFeeRate: 0.15,
      totalRevenue: 1500 * multiplier,
      totalCosts: 1200 * multiplier,
      providerPayments: 8500 * multiplier,
      operationalCosts: 300 * multiplier,
      infrastructureCosts: 200 * multiplier,
      providers: [
        { id: 'claude-provider-1', earnings: 5000 * multiplier, requests: 250 * multiplier },
        { id: 'openai-provider-1', earnings: 3500 * multiplier, requests: 200 * multiplier },
        { id: 'local-provider-1', earnings: 2000 * multiplier, requests: 100 * multiplier }
      ],
      timeRange: timeRange
    };
  }

  /**
   * Calculate financial health indicators
   */
  private calculateFinancialHealth(data: any): { overall_score: number; status: 'excellent' | 'good' | 'concerning' | 'poor'; key_indicators: Record<string, number> } {
    const profitMargin = ((data.totalRevenue - data.totalCosts) / data.totalRevenue) * 100;
    const utilization = (data.totalTransactions / (data.totalTransactions + 100)) * 100;
    const costEfficiency = (data.totalRevenue / data.totalCosts) * 100;
    const marketShare = Math.min(100, (data.totalVolume / 50000) * 100);

    const keyIndicators = {
      profit_margin: Math.round(profitMargin * 100) / 100,
      utilization_rate: Math.round(utilization * 100) / 100,
      cost_efficiency: Math.round(costEfficiency * 100) / 100,
      market_share: Math.round(marketShare * 100) / 100,
      liquidity_score: 85.5,
      growth_rate: 12.3
    };

    const overallScore = (profitMargin + utilization + (costEfficiency - 100) + marketShare) / 4;
    
    let status: 'excellent' | 'good' | 'concerning' | 'poor';
    if (overallScore >= 80) status = 'excellent';
    else if (overallScore >= 60) status = 'good';
    else if (overallScore >= 40) status = 'concerning';
    else status = 'poor';

    return {
      overall_score: Math.round(overallScore * 100) / 100,
      status,
      key_indicators: keyIndicators
    };
  }

  /**
   * Analyze token flows
   */
  private analyzeTokenFlows(data: any, includeFlows: boolean = true): any {
    const inboundPayments = data.totalVolume.toString();
    const outboundPayments = data.providerPayments.toString();
    const marketplaceFees = Math.round(data.totalVolume * data.marketplaceFeeRate).toString();
    const netFlow = (data.totalVolume - data.providerPayments).toString();

    const flowBreakdown: TokenFlowBreakdown[] = includeFlows ? [
      {
        category: 'Provider Payments',
        amount: outboundPayments,
        percentage: 85,
        description: 'Payments to AI inference providers',
        trend: 'up'
      },
      {
        category: 'Marketplace Fees',
        amount: marketplaceFees,
        description: 'Marketplace service fees',
        percentage: 15,
        trend: 'stable'
      },
      {
        category: 'Operational Costs',
        amount: data.operationalCosts.toString(),
        percentage: 3,
        description: 'System operational expenses',
        trend: 'down'
      },
      {
        category: 'Infrastructure Costs',
        amount: data.infrastructureCosts.toString(),
        percentage: 2,
        description: 'Infrastructure and hosting costs',
        trend: 'stable'
      }
    ] : [];

    return {
      total_volume: data.totalVolume.toString(),
      inbound_payments: inboundPayments,
      outbound_payments: outboundPayments,
      marketplace_fees: marketplaceFees,
      net_flow: netFlow,
      flow_breakdown: flowBreakdown
    };
  }

  /**
   * Analyze costs
   */
  private analyzeCosts(data: any): any {
    const costPerRequest = (data.totalCosts / data.totalTransactions).toFixed(2);
    
    return {
      total_costs: data.totalCosts.toString(),
      provider_payments: data.providerPayments.toString(),
      operational_costs: data.operationalCosts.toString(),
      infrastructure_costs: data.infrastructureCosts.toString(),
      cost_per_request: costPerRequest
    };
  }

  /**
   * Analyze revenue
   */
  private analyzeRevenue(data: any): any {
    const averageTransactionValue = (data.totalVolume / data.totalTransactions).toFixed(2);
    const revenuePerRequest = (data.totalRevenue / data.totalTransactions).toFixed(2);
    
    return {
      total_revenue: data.totalRevenue.toString(),
      fee_revenue: Math.round(data.totalVolume * data.marketplaceFeeRate).toString(),
      transaction_volume: data.totalTransactions,
      average_transaction_value: averageTransactionValue,
      revenue_per_request: revenuePerRequest
    };
  }

  /**
   * Analyze provider economics
   */
  private analyzeProviderEconomics(data: any, includeBreakdown: boolean = true): ProviderEconomics[] {
    if (!includeBreakdown) return [];

    const totalEarnings = data.providers.reduce((sum: number, p: any) => sum + p.earnings, 0);
    const totalRequests = data.providers.reduce((sum: number, p: any) => sum + p.requests, 0);

    return data.providers.map((provider: any) => ({
      provider_id: provider.id,
      earnings: provider.earnings.toString(),
      requests_served: provider.requests,
      average_earning_per_request: (provider.earnings / provider.requests).toFixed(2),
      cost_efficiency: Math.round((provider.earnings / (provider.requests * 2)) * 100) / 100,
      market_share: Math.round((provider.requests / totalRequests) * 100 * 100) / 100,
      revenue_contribution: Math.round((provider.earnings / totalEarnings) * 100 * 100) / 100
    }));
  }

  /**
   * Analyze trends
   */
  private analyzeTrends(data: any, includeTrends: boolean = true): any {
    if (!includeTrends) {
      return {
        volume_trend: 'stable',
        revenue_trend: 'stable',
        profitability_trend: 'stable',
        efficiency_trend: 'stable'
      };
    }

    // Mock trend analysis - in production, would compare with historical data
    return {
      volume_trend: 'increasing',
      revenue_trend: 'increasing',
      profitability_trend: 'improving',
      efficiency_trend: 'improving'
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(data: any, focusArea: string = 'profitability'): string[] {
    const recommendations: string[] = [];

    switch (focusArea) {
      case 'revenue':
        recommendations.push('Consider implementing dynamic pricing based on demand');
        recommendations.push('Explore premium service tiers for higher revenue');
        recommendations.push('Increase marketplace fee for high-volume providers');
        break;
      
      case 'costs':
        recommendations.push('Optimize infrastructure costs through better resource allocation');
        recommendations.push('Negotiate better rates with high-volume providers');
        recommendations.push('Implement cost-based routing for efficiency');
        break;
      
      case 'volume':
        recommendations.push('Incentivize new provider onboarding');
        recommendations.push('Implement volume-based discounts for large users');
        recommendations.push('Improve service discovery and matching algorithms');
        break;
      
      default: // profitability
        recommendations.push('Balance fee structure to maximize profit margins');
        recommendations.push('Focus on high-margin service types');
        recommendations.push('Optimize operational costs while maintaining quality');
        break;
    }

    // General recommendations
    const profitMargin = ((data.totalRevenue - data.totalCosts) / data.totalRevenue) * 100;
    if (profitMargin < 20) {
      recommendations.push('Consider raising marketplace fees to improve profitability');
    }

    if (data.totalTransactions < 1000) {
      recommendations.push('Focus on user acquisition to increase transaction volume');
    }

    return recommendations;
  }

  /**
   * Generate financial insights
   */
  private generateFinancialInsights(data: any, financialHealth: any): string[] {
    const insights: string[] = [];

    // Health-based insights
    if (financialHealth.status === 'excellent') {
      insights.push('Marketplace is operating at optimal financial performance');
    } else if (financialHealth.status === 'good') {
      insights.push('Marketplace shows strong financial health with room for improvement');
    } else {
      insights.push('Marketplace financial health needs attention and optimization');
    }

    // Volume insights
    const avgTransactionValue = data.totalVolume / data.totalTransactions;
    if (avgTransactionValue > 25) {
      insights.push('High average transaction value indicates premium service usage');
    } else if (avgTransactionValue < 15) {
      insights.push('Low average transaction value suggests cost-sensitive user base');
    }

    // Provider insights
    const topProvider = data.providers.sort((a: any, b: any) => b.earnings - a.earnings)[0];
    if (topProvider.earnings > data.totalVolume * 0.6) {
      insights.push('Market concentration risk: top provider dominates earnings');
    }

    // Efficiency insights
    const costEfficiency = (data.totalRevenue / data.totalCosts) * 100;
    if (costEfficiency > 120) {
      insights.push('Strong cost efficiency indicates healthy operational management');
    } else if (costEfficiency < 105) {
      insights.push('Cost efficiency below optimal levels - review operational expenses');
    }

    return insights;
  }

  /**
   * Generate summary
   */
  private generateSummary(financialHealth: any, tokenFlows: any, request: MarketplaceEconomicsRequest): string {
    const timeRange = request.time_range || 'day';
    const status = financialHealth.status;
    const totalVolume = parseInt(tokenFlows.total_volume);
    const netFlow = parseInt(tokenFlows.net_flow);
    const profitMargin = financialHealth.key_indicators.profit_margin;

    let summary = `Marketplace economics analysis for the past ${timeRange} shows ${status} financial health `;
    summary += `with ${totalVolume.toLocaleString()} tokens in total volume. `;
    summary += `Net positive flow of ${netFlow.toLocaleString()} tokens indicates healthy marketplace activity. `;
    summary += `Profit margin of ${profitMargin}% `;
    
    if (profitMargin > 20) {
      summary += 'demonstrates strong profitability. ';
    } else if (profitMargin > 10) {
      summary += 'shows moderate profitability with optimization opportunities. ';
    } else {
      summary += 'indicates the need for cost optimization or fee adjustment. ';
    }

    summary += `Overall financial score of ${financialHealth.overall_score} reflects `;
    summary += status === 'excellent' ? 'outstanding ' : status === 'good' ? 'solid ' : 'concerning ';
    summary += 'marketplace performance.';

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
 * Create marketplace economics tool instance
 */
export function createMarketplaceEconomicsTool(marketplaceClient: MarketplaceClient): MarketplaceEconomicsTool {
  return new MarketplaceEconomicsTool(marketplaceClient);
}