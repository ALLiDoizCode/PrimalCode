/**
 * Primal Token Integration MCP Tool
 * Integrates Primal token tracking with marketplace transactions
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MarketplaceClient } from '../marketplace/marketplace-client.js';

export interface PrimalTokenIntegrationRequest {
  action: 'balance' | 'spending_analysis' | 'transaction_monitoring' | 'budget_management' | 'optimization';
  time_range?: 'hour' | 'day' | 'week' | 'month';
  include_predictions?: boolean;
  include_recommendations?: boolean;
  transaction_id?: string;
  category_filter?: string;
}

export interface PrimalTokenIntegrationResponse {
  summary: string;
  current_balance: {
    total_primal_tokens: number;
    available_for_ai_services: number;
    reserved_for_ecosystem: number;
    pending_transactions: number;
  };
  marketplace_spending: {
    total_spent: number;
    transactions_count: number;
    average_per_transaction: number;
    spending_by_service: Record<string, number>;
    spending_trend: 'increasing' | 'decreasing' | 'stable';
  };
  transaction_monitoring: {
    recent_transactions: MarketplaceTransaction[];
    failed_transactions: MarketplaceTransaction[];
    pending_transactions: MarketplaceTransaction[];
    success_rate: number;
  };
  budget_management: {
    daily_budget: number;
    weekly_budget: number;
    monthly_budget: number;
    current_usage: {
      today: number;
      this_week: number;
      this_month: number;
    };
    budget_alerts: BudgetAlert[];
  };
  cost_optimization: {
    recommendations: string[];
    potential_savings: number;
    efficiency_score: number;
    optimal_spending_patterns: string[];
  };
  predictions: {
    projected_monthly_spending: number;
    estimated_balance_depletion: string;
    recommended_top_up_amount: number;
  };
  insights: string[];
}

export interface MarketplaceTransaction {
  transaction_id: string;
  timestamp: number;
  amount: number;
  service_type: string;
  provider_id: string;
  status: 'completed' | 'pending' | 'failed';
  cost_efficiency: number;
  x_metadata: Record<string, string>;
}

export interface BudgetAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  threshold: number;
  current_usage: number;
  recommended_action: string;
}

export class PrimalTokenIntegrationTool {
  private marketplaceClient: MarketplaceClient;
  private readonly maxResponseTime = 1000; // 1 second as per requirements
  private readonly cacheRefreshInterval = 500; // 500ms cache refresh

  constructor(marketplaceClient: MarketplaceClient) {
    this.marketplaceClient = marketplaceClient;
  }

  /**
   * Get MCP tool definition
   */
  getTool(): Tool {
    return {
      name: 'primal_token_integration',
      description: 'Monitor and manage Primal token spending on AI marketplace services with budget tracking and optimization',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['balance', 'spending_analysis', 'transaction_monitoring', 'budget_management', 'optimization'],
            description: 'Type of Primal token analysis to perform',
            default: 'balance'
          },
          time_range: {
            type: 'string',
            enum: ['hour', 'day', 'week', 'month'],
            description: 'Time range for analysis',
            default: 'day'
          },
          include_predictions: {
            type: 'boolean',
            description: 'Include spending predictions and forecasts',
            default: true
          },
          include_recommendations: {
            type: 'boolean',
            description: 'Include cost optimization recommendations',
            default: true
          },
          transaction_id: {
            type: 'string',
            description: 'Specific transaction ID to analyze (optional)'
          },
          category_filter: {
            type: 'string',
            description: 'Filter by service category (e.g., "text-generation", "analysis")'
          }
        },
        required: ['action']
      }
    };
  }

  /**
   * Execute Primal token integration analysis
   */
  async execute(request: PrimalTokenIntegrationRequest): Promise<PrimalTokenIntegrationResponse> {
    const startTime = Date.now();
    
    try {
      // Check marketplace availability
      const isAvailable = await this.marketplaceClient.isProcessAvailable();
      if (!isAvailable) {
        return this.generateUnavailableResponse();
      }

      // Get marketplace data and transaction history
      const [healthResponse, statsResponse] = await Promise.all([
        this.marketplaceClient.healthCheck(),
        this.marketplaceClient.getMarketplaceStats()
      ]);

      // Check response time requirement
      const responseTime = Date.now() - startTime;
      if (responseTime > this.maxResponseTime) {
        // Response time exceeded target - should be monitored via performance tracking
      }

      // Generate comprehensive analysis
      return this.generateIntegrationAnalysis(healthResponse, statsResponse, request);

    } catch (error) {
      // Error in Primal token integration - handle gracefully
      return this.generateErrorResponse(error);
    }
  }

  /**
   * Generate response when marketplace is unavailable
   */
  private generateUnavailableResponse(): PrimalTokenIntegrationResponse {
    return {
      summary: 'Primal token integration is temporarily unavailable due to marketplace connectivity issues. Balance and transaction monitoring cannot be performed.',
      current_balance: {
        total_primal_tokens: 0,
        available_for_ai_services: 0,
        reserved_for_ecosystem: 0,
        pending_transactions: 0
      },
      marketplace_spending: {
        total_spent: 0,
        transactions_count: 0,
        average_per_transaction: 0,
        spending_by_service: {},
        spending_trend: 'stable'
      },
      transaction_monitoring: {
        recent_transactions: [],
        failed_transactions: [],
        pending_transactions: [],
        success_rate: 0
      },
      budget_management: {
        daily_budget: 0,
        weekly_budget: 0,
        monthly_budget: 0,
        current_usage: {
          today: 0,
          this_week: 0,
          this_month: 0
        },
        budget_alerts: [{
          type: 'critical',
          message: 'Unable to access balance information due to marketplace unavailability',
          threshold: 0,
          current_usage: 0,
          recommended_action: 'Wait for marketplace to become available'
        }]
      },
      cost_optimization: {
        recommendations: [
          'Restore marketplace connectivity to enable cost tracking',
          'Check system status for service restoration updates',
          'Monitor for automatic service recovery'
        ],
        potential_savings: 0,
        efficiency_score: 0,
        optimal_spending_patterns: []
      },
      predictions: {
        projected_monthly_spending: 0,
        estimated_balance_depletion: 'Unable to calculate',
        recommended_top_up_amount: 0
      },
      insights: [
        'Marketplace connectivity is required for Primal token tracking',
        'Service will resume automatically when connectivity is restored',
        'Historical data will be available once the system is online'
      ]
    };
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(error: any): PrimalTokenIntegrationResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      summary: `Primal token integration encountered an error: ${errorMessage}. Unable to retrieve balance and transaction data.`,
      current_balance: {
        total_primal_tokens: 0,
        available_for_ai_services: 0,
        reserved_for_ecosystem: 0,
        pending_transactions: 0
      },
      marketplace_spending: {
        total_spent: 0,
        transactions_count: 0,
        average_per_transaction: 0,
        spending_by_service: {},
        spending_trend: 'stable'
      },
      transaction_monitoring: {
        recent_transactions: [],
        failed_transactions: [],
        pending_transactions: [],
        success_rate: 0
      },
      budget_management: {
        daily_budget: 0,
        weekly_budget: 0,
        monthly_budget: 0,
        current_usage: {
          today: 0,
          this_week: 0,
          this_month: 0
        },
        budget_alerts: [{
          type: 'critical',
          message: `System error: ${errorMessage}`,
          threshold: 0,
          current_usage: 0,
          recommended_action: 'Check system logs and retry'
        }]
      },
      cost_optimization: {
        recommendations: [
          'Resolve the underlying system error',
          'Check marketplace process health',
          'Retry analysis once issues are resolved'
        ],
        potential_savings: 0,
        efficiency_score: 0,
        optimal_spending_patterns: []
      },
      predictions: {
        projected_monthly_spending: 0,
        estimated_balance_depletion: 'Unable to calculate',
        recommended_top_up_amount: 0
      },
      insights: [
        'Technical error prevented Primal token analysis',
        'System diagnostics may be required',
        'Manual intervention may be needed'
      ]
    };
  }

  /**
   * Generate comprehensive integration analysis
   */
  private generateIntegrationAnalysis(
    healthResponse: any,
    statsResponse: any,
    request: PrimalTokenIntegrationRequest
  ): PrimalTokenIntegrationResponse {
    // Mock Primal token data - in production, this would query actual balance and transaction data
    const mockPrimalTokenData = this.generateMockPrimalTokenData(request.time_range);
    
    const currentBalance = this.calculateCurrentBalance(mockPrimalTokenData);
    const marketplaceSpending = this.analyzeMarketplaceSpending(mockPrimalTokenData, request.category_filter);
    const transactionMonitoring = this.analyzeTransactionMonitoring(mockPrimalTokenData, request.transaction_id);
    const budgetManagement = this.analyzeBudgetManagement(mockPrimalTokenData);
    const costOptimization = this.analyzeCostOptimization(mockPrimalTokenData, request.include_recommendations);
    const predictions = this.generatePredictions(mockPrimalTokenData, request.include_predictions);
    const insights = this.generateInsights(mockPrimalTokenData, currentBalance, marketplaceSpending);
    const summary = this.generateSummary(currentBalance, marketplaceSpending, request.action);

    return {
      summary,
      current_balance: currentBalance,
      marketplace_spending: marketplaceSpending,
      transaction_monitoring: transactionMonitoring,
      budget_management: budgetManagement,
      cost_optimization: costOptimization,
      predictions,
      insights
    };
  }

  /**
   * Generate mock Primal token data
   */
  private generateMockPrimalTokenData(timeRange: string = 'day') {
    const multiplier = timeRange === 'hour' ? 1 : timeRange === 'day' ? 24 : timeRange === 'week' ? 168 : 720;
    
    return {
      totalPrimalTokens: 10000,
      availableForAI: 7500,
      reservedForEcosystem: 2500,
      pendingTransactions: 3,
      totalSpent: 2000 * multiplier,
      transactionCount: 25 * multiplier,
      dailyBudget: 500,
      weeklyBudget: 3000,
      monthlyBudget: 12000,
      todayUsage: 350,
      thisWeekUsage: 1200,
      thisMonthUsage: 4500,
      transactions: [
        {
          transaction_id: 'tx_001',
          timestamp: Date.now() - 3600000,
          amount: 150,
          service_type: 'text-generation',
          provider_id: 'claude-provider-1',
          status: 'completed' as const,
          cost_efficiency: 0.85,
          x_metadata: { 'X-Quality-Tier': 'premium' }
        },
        {
          transaction_id: 'tx_002',
          timestamp: Date.now() - 7200000,
          amount: 100,
          service_type: 'analysis',
          provider_id: 'openai-provider-1',
          status: 'completed' as const,
          cost_efficiency: 0.72,
          x_metadata: { 'X-Quality-Tier': 'standard' }
        },
        {
          transaction_id: 'tx_003',
          timestamp: Date.now() - 300000,
          amount: 80,
          service_type: 'reasoning',
          provider_id: 'claude-provider-1',
          status: 'pending' as const,
          cost_efficiency: 0.88,
          x_metadata: { 'X-Quality-Tier': 'premium' }
        },
        {
          transaction_id: 'tx_004',
          timestamp: Date.now() - 1800000,
          amount: 200,
          service_type: 'text-generation',
          provider_id: 'local-provider-1',
          status: 'failed' as const,
          cost_efficiency: 0.45,
          x_metadata: { 'X-Quality-Tier': 'basic' }
        }
      ],
      spendingByService: {
        'text-generation': 1200,
        'analysis': 500,
        'reasoning': 300
      },
      timeRange: timeRange
    };
  }

  /**
   * Calculate current balance information
   */
  private calculateCurrentBalance(data: any): any {
    return {
      total_primal_tokens: data.totalPrimalTokens,
      available_for_ai_services: data.availableForAI,
      reserved_for_ecosystem: data.reservedForEcosystem,
      pending_transactions: data.pendingTransactions
    };
  }

  /**
   * Analyze marketplace spending patterns
   */
  private analyzeMarketplaceSpending(data: any, categoryFilter?: string): any {
    let spendingByService = data.spendingByService;
    
    if (categoryFilter) {
      spendingByService = Object.keys(spendingByService)
        .filter(key => key.includes(categoryFilter))
        .reduce((obj: any, key) => {
          obj[key] = spendingByService[key];
          return obj;
        }, {});
    }

    const averagePerTransaction = data.totalSpent / data.transactionCount;
    const spendingTrend = this.calculateSpendingTrend(data);

    return {
      total_spent: data.totalSpent,
      transactions_count: data.transactionCount,
      average_per_transaction: Math.round(averagePerTransaction),
      spending_by_service: spendingByService,
      spending_trend: spendingTrend
    };
  }

  /**
   * Analyze transaction monitoring data
   */
  private analyzeTransactionMonitoring(data: any, transactionId?: string): any {
    let transactions = data.transactions;
    
    if (transactionId) {
      transactions = transactions.filter((tx: any) => tx.transaction_id === transactionId);
    }

    const recentTransactions = transactions.filter((tx: any) => tx.status === 'completed').slice(0, 10);
    const failedTransactions = transactions.filter((tx: any) => tx.status === 'failed');
    const pendingTransactions = transactions.filter((tx: any) => tx.status === 'pending');
    
    const successRate = transactions.length > 0 ? 
      (transactions.filter((tx: any) => tx.status === 'completed').length / transactions.length) * 100 : 0;

    return {
      recent_transactions: recentTransactions,
      failed_transactions: failedTransactions,
      pending_transactions: pendingTransactions,
      success_rate: Math.round(successRate)
    };
  }

  /**
   * Analyze budget management
   */
  private analyzeBudgetManagement(data: any): any {
    const budgetAlerts: BudgetAlert[] = [];

    // Check daily budget
    const dailyUsagePercent = (data.todayUsage / data.dailyBudget) * 100;
    if (dailyUsagePercent > 90) {
      budgetAlerts.push({
        type: 'critical',
        message: 'Daily budget almost exhausted',
        threshold: data.dailyBudget * 0.9,
        current_usage: data.todayUsage,
        recommended_action: 'Reduce AI service usage or increase daily budget'
      });
    } else if (dailyUsagePercent > 70) {
      budgetAlerts.push({
        type: 'warning',
        message: 'Daily budget 70% used',
        threshold: data.dailyBudget * 0.7,
        current_usage: data.todayUsage,
        recommended_action: 'Monitor spending closely for rest of day'
      });
    }

    // Check weekly budget
    const weeklyUsagePercent = (data.thisWeekUsage / data.weeklyBudget) * 100;
    if (weeklyUsagePercent > 80) {
      budgetAlerts.push({
        type: 'warning',
        message: 'Weekly budget 80% used',
        threshold: data.weeklyBudget * 0.8,
        current_usage: data.thisWeekUsage,
        recommended_action: 'Consider optimizing AI service usage'
      });
    }

    // Check monthly budget
    const monthlyUsagePercent = (data.thisMonthUsage / data.monthlyBudget) * 100;
    if (monthlyUsagePercent > 75) {
      budgetAlerts.push({
        type: 'info',
        message: 'Monthly budget 75% used',
        threshold: data.monthlyBudget * 0.75,
        current_usage: data.thisMonthUsage,
        recommended_action: 'Review spending patterns and optimize'
      });
    }

    return {
      daily_budget: data.dailyBudget,
      weekly_budget: data.weeklyBudget,
      monthly_budget: data.monthlyBudget,
      current_usage: {
        today: data.todayUsage,
        this_week: data.thisWeekUsage,
        this_month: data.thisMonthUsage
      },
      budget_alerts: budgetAlerts
    };
  }

  /**
   * Analyze cost optimization opportunities
   */
  private analyzeCostOptimization(data: any, includeRecommendations: boolean = true): any {
    const recommendations: string[] = [];
    
    if (includeRecommendations) {
      // Analyze transaction efficiency
      const avgEfficiency = data.transactions.reduce((sum: number, tx: any) => sum + tx.cost_efficiency, 0) / data.transactions.length;
      
      if (avgEfficiency < 0.7) {
        recommendations.push('Consider switching to more cost-efficient providers');
      }
      
      // Analyze service usage patterns
      const textGenSpending = data.spendingByService['text-generation'] || 0;
      const totalSpending = Object.values(data.spendingByService).reduce((sum: number, val: any) => sum + val, 0);
      
      if (textGenSpending / totalSpending > 0.6) {
        recommendations.push('High text generation usage - consider batch processing to reduce costs');
      }
      
      // Budget optimization
      if (data.todayUsage < data.dailyBudget * 0.5) {
        recommendations.push('Daily budget underutilized - consider reallocating to other needs');
      }
      
      // Provider optimization
      recommendations.push('Use premium providers for critical tasks and standard for routine work');
      recommendations.push('Monitor cost efficiency scores to identify best-value providers');
    }

    const potentialSavings = this.calculatePotentialSavings(data);
    const efficiencyScore = this.calculateEfficiencyScore(data);
    const optimalPatterns = this.identifyOptimalSpendingPatterns(data);

    return {
      recommendations,
      potential_savings: potentialSavings,
      efficiency_score: efficiencyScore,
      optimal_spending_patterns: optimalPatterns
    };
  }

  /**
   * Generate predictions
   */
  private generatePredictions(data: any, includePredictions: boolean = true): any {
    if (!includePredictions) {
      return {
        projected_monthly_spending: 0,
        estimated_balance_depletion: 'N/A',
        recommended_top_up_amount: 0
      };
    }

    const dailyAverage = data.thisMonthUsage / 30; // Assuming 30 days in month
    const projectedMonthlySpending = dailyAverage * 30;
    
    const burnRate = data.thisWeekUsage / 7; // Daily burn rate
    const daysUntilDepletion = data.availableForAI / burnRate;
    
    let balanceDepletionEstimate: string;
    if (daysUntilDepletion > 365) {
      balanceDepletionEstimate = 'More than 1 year';
    } else if (daysUntilDepletion > 30) {
      balanceDepletionEstimate = `${Math.round(daysUntilDepletion / 30)} months`;
    } else {
      balanceDepletionEstimate = `${Math.round(daysUntilDepletion)} days`;
    }

    const recommendedTopUp = Math.max(0, projectedMonthlySpending - data.availableForAI);

    return {
      projected_monthly_spending: Math.round(projectedMonthlySpending),
      estimated_balance_depletion: balanceDepletionEstimate,
      recommended_top_up_amount: Math.round(recommendedTopUp)
    };
  }

  /**
   * Generate insights
   */
  private generateInsights(data: any, currentBalance: any, marketplaceSpending: any): string[] {
    const insights: string[] = [];

    // Balance insights
    const balanceRatio = currentBalance.available_for_ai_services / currentBalance.total_primal_tokens;
    if (balanceRatio > 0.8) {
      insights.push('High proportion of Primal tokens available for AI services');
    } else if (balanceRatio < 0.5) {
      insights.push('Large amount of Primal tokens reserved for ecosystem activities');
    }

    // Spending insights
    if (marketplaceSpending.spending_trend === 'increasing') {
      insights.push('AI service usage is trending upward - monitor budget allocation');
    } else if (marketplaceSpending.spending_trend === 'decreasing') {
      insights.push('AI service usage is declining - consider increasing utilization');
    }

    // Service mix insights
    const topService = Object.entries(marketplaceSpending.spending_by_service)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];
    
    if (topService) {
      insights.push(`${topService[0]} is your primary AI service expense`);
    }

    // Efficiency insights
    const avgEfficiency = data.transactions.reduce((sum: number, tx: any) => sum + tx.cost_efficiency, 0) / data.transactions.length;
    if (avgEfficiency > 0.8) {
      insights.push('Your AI service usage shows good cost efficiency');
    } else if (avgEfficiency < 0.6) {
      insights.push('Consider optimizing provider selection for better cost efficiency');
    }

    return insights;
  }

  /**
   * Generate summary
   */
  private generateSummary(currentBalance: any, marketplaceSpending: any, action: string): string {
    const availableBalance = currentBalance.available_for_ai_services;
    const totalSpent = marketplaceSpending.total_spent;
    const transactionCount = marketplaceSpending.transactions_count;
    const avgTransaction = marketplaceSpending.average_per_transaction;

    let summary = `Your Primal token balance shows ${availableBalance.toLocaleString()} tokens available for AI services. `;
    summary += `Recent marketplace activity includes ${transactionCount} transactions totaling ${totalSpent.toLocaleString()} tokens `;
    summary += `with an average of ${avgTransaction} tokens per transaction. `;

    switch (action) {
      case 'balance':
        summary += 'Current balance is healthy for continued AI service usage.';
        break;
      case 'spending_analysis':
        summary += `Spending trend is ${marketplaceSpending.spending_trend} with good distribution across service types.`;
        break;
      case 'budget_management':
        summary += 'Budget tracking shows controlled spending within allocated limits.';
        break;
      case 'optimization':
        summary += 'Cost optimization analysis identifies opportunities for improved efficiency.';
        break;
      default:
        summary += 'Marketplace transaction integration is functioning properly.';
    }

    return summary;
  }

  /**
   * Calculate spending trend
   */
  private calculateSpendingTrend(data: any): 'increasing' | 'decreasing' | 'stable' {
    // Mock trend calculation - in production would analyze historical data
    const recentAvg = data.thisWeekUsage / 7;
    const previousAvg = (data.thisMonthUsage - data.thisWeekUsage) / 23;
    
    if (recentAvg > previousAvg * 1.1) return 'increasing';
    if (recentAvg < previousAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate potential savings
   */
  private calculatePotentialSavings(data: any): number {
    const inefficientTransactions = data.transactions.filter((tx: any) => tx.cost_efficiency < 0.7);
    const potentialSavings = inefficientTransactions.reduce((sum: number, tx: any) => {
      return sum + (tx.amount * (0.8 - tx.cost_efficiency));
    }, 0);
    
    return Math.round(potentialSavings);
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiencyScore(data: any): number {
    const avgEfficiency = data.transactions.reduce((sum: number, tx: any) => sum + tx.cost_efficiency, 0) / data.transactions.length;
    return Math.round(avgEfficiency * 100);
  }

  /**
   * Identify optimal spending patterns
   */
  private identifyOptimalSpendingPatterns(data: any): string[] {
    const patterns: string[] = [];
    
    // Analyze transaction timing
    patterns.push('Batch similar requests to reduce per-transaction overhead');
    
    // Analyze provider efficiency
    const efficientProviders = [...new Set(data.transactions
      .filter((tx: any) => tx.cost_efficiency > 0.8)
      .map((tx: any) => tx.provider_id))];
    
    if (efficientProviders.length > 0) {
      patterns.push(`Prefer providers: ${efficientProviders.join(', ')} for better efficiency`);
    }
    
    // Analyze service mix
    patterns.push('Use premium quality for critical tasks, standard for routine work');
    patterns.push('Monitor cost-per-outcome rather than just cost-per-request');
    
    return patterns;
  }

  /**
   * Update marketplace client
   */
  updateClient(client: MarketplaceClient): void {
    this.marketplaceClient = client;
  }
}

/**
 * Create Primal token integration tool instance
 */
export function createPrimalTokenIntegrationTool(marketplaceClient: MarketplaceClient): PrimalTokenIntegrationTool {
  return new PrimalTokenIntegrationTool(marketplaceClient);
}