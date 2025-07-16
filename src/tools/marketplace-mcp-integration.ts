/**
 * Marketplace MCP Client Integration
 * Comprehensive integration of all marketplace interaction tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { MarketplaceClient, createMarketplaceClient } from '../marketplace/marketplace-client.js';
import { MarketplaceStatusTool, createMarketplaceStatusTool } from './marketplace-status.js';
import { ProviderAnalysisTool, createProviderAnalysisTool } from './provider-analysis.js';
import { AIServiceRequestTool, createAIServiceRequestTool } from './ai-service-request.js';
import { MarketplaceEconomicsTool, createMarketplaceEconomicsTool } from './marketplace-economics.js';
import { PrimalTokenIntegrationTool, createPrimalTokenIntegrationTool } from './primal-token-integration.js';

export interface MarketplaceMCPConfig {
  marketplace_process_id: string;
  ao_endpoint?: string;
  timeout?: number;
  enable_caching?: boolean;
  cache_ttl?: number;
}

export class MarketplaceMCPIntegration {
  private server: Server;
  private marketplaceClient: MarketplaceClient;
  private marketplaceStatusTool: MarketplaceStatusTool;
  private providerAnalysisTool: ProviderAnalysisTool;
  private aiServiceRequestTool: AIServiceRequestTool;
  private marketplaceEconomicsTool: MarketplaceEconomicsTool;
  private primalTokenIntegrationTool: PrimalTokenIntegrationTool;
  private config: MarketplaceMCPConfig;

  constructor(config: MarketplaceMCPConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: 'marketplace-mcp-server',
        version: '1.0.0',
        description: 'MCP server for AI inference marketplace interactions'
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize marketplace client
    this.marketplaceClient = createMarketplaceClient(
      config.marketplace_process_id,
      config.ao_endpoint,
      config.timeout
    );

    // Initialize all marketplace tools
    this.marketplaceStatusTool = createMarketplaceStatusTool(this.marketplaceClient);
    this.providerAnalysisTool = createProviderAnalysisTool(this.marketplaceClient);
    this.aiServiceRequestTool = createAIServiceRequestTool(this.marketplaceClient);
    this.marketplaceEconomicsTool = createMarketplaceEconomicsTool(this.marketplaceClient);
    this.primalTokenIntegrationTool = createPrimalTokenIntegrationTool(this.marketplaceClient);

    this.setupHandlers();
  }

  /**
   * Setup MCP server handlers
   */
  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          this.marketplaceStatusTool.getTool(),
          this.providerAnalysisTool.getTool(),
          this.aiServiceRequestTool.getTool(),
          this.marketplaceEconomicsTool.getTool(),
          this.primalTokenIntegrationTool.getTool(),
        ],
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'marketplace_status': {
            const statusResult = await this.marketplaceStatusTool.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatMarketplaceStatusResponse(statusResult),
                },
              ],
            };
          }

          case 'provider_analysis': {
            const analysisResult = await this.providerAnalysisTool.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatProviderAnalysisResponse(analysisResult),
                },
              ],
            };
          }

          case 'ai_service_request': {
            const requestResult = await this.aiServiceRequestTool.execute(args as any || {});
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatAIServiceRequestResponse(requestResult),
                },
              ],
            };
          }

          case 'marketplace_economics': {
            const economicsResult = await this.marketplaceEconomicsTool.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatMarketplaceEconomicsResponse(economicsResult),
                },
              ],
            };
          }

          case 'primal_token_integration': {
            const integrationResult = await this.primalTokenIntegrationTool.execute(args as any || {});
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatPrimalTokenIntegrationResponse(integrationResult),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Format marketplace status response for natural language output
   */
  private formatMarketplaceStatusResponse(result: any): string {
    let output = `# Marketplace Status\n\n`;
    output += `${result.summary}\n\n`;
    
    output += `## Health Overview\n`;
    output += `- **Overall Health**: ${result.healthIndicators.overallHealth}\n`;
    output += `- **Active Providers**: ${result.activeProviders}\n`;
    output += `- **Recent Transactions**: ${result.recentTransactions}\n`;
    output += `- **Response Time**: ${result.healthIndicators.responseTime}ms\n`;
    output += `- **Uptime**: ${Math.round(result.healthIndicators.uptime / 3600)}h\n\n`;

    output += `## Queue Status\n`;
    output += `- **High Priority**: ${result.queueStatus.high}\n`;
    output += `- **Medium Priority**: ${result.queueStatus.medium}\n`;
    output += `- **Low Priority**: ${result.queueStatus.low}\n`;
    output += `- **Active Processing**: ${result.queueStatus.active}\n\n`;

    if (result.providerActivity.length > 0) {
      output += `## Provider Activity\n`;
      result.providerActivity.forEach((activity: string) => {
        output += `- ${activity}\n`;
      });
      output += `\n`;
    }

    if (result.marketplaceInsights.length > 0) {
      output += `## Marketplace Insights\n`;
      result.marketplaceInsights.forEach((insight: string) => {
        output += `- ${insight}\n`;
      });
    }

    return output;
  }

  /**
   * Format provider analysis response for natural language output
   */
  private formatProviderAnalysisResponse(result: any): string {
    let output = `# Provider Analysis\n\n`;
    output += `${result.summary}\n\n`;

    if (result.providers.length > 0) {
      output += `## Provider Performance\n`;
      result.providers.forEach((provider: any) => {
        output += `### ${provider.name}\n`;
        output += `- **Reputation Score**: ${provider.reputation_score}\n`;
        output += `- **Response Time**: ${provider.performance_metrics.response_time_avg}s\n`;
        output += `- **Quality Score**: ${provider.performance_metrics.quality_score}\n`;
        output += `- **Completion Rate**: ${(provider.performance_metrics.completion_rate * 100).toFixed(1)}%\n`;
        output += `- **Health Status**: ${provider.health_status}\n`;
        output += `- **Last Activity**: ${provider.last_activity}\n`;
        output += `- **Capabilities**: ${provider.capabilities.join(', ')}\n\n`;
      });
    }

    if (result.marketplaceRanking.length > 0) {
      output += `## Provider Rankings\n`;
      result.marketplaceRanking.forEach((ranking: any) => {
        output += `${ranking.rank}. **${ranking.provider_id}** - ${ranking.reason}\n`;
      });
      output += `\n`;
    }

    if (result.recommendations.length > 0) {
      output += `## Recommendations\n`;
      result.recommendations.forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
      output += `\n`;
    }

    if (result.insights.length > 0) {
      output += `## Insights\n`;
      result.insights.forEach((insight: string) => {
        output += `- ${insight}\n`;
      });
    }

    return output;
  }

  /**
   * Format AI service request response for natural language output
   */
  private formatAIServiceRequestResponse(result: any): string {
    let output = `# AI Service Request\n\n`;
    
    if (result.success) {
      output += `✅ **Request Successfully Submitted**\n\n`;
      output += `**Request ID**: \`${result.request_id}\`\n`;
      output += `**Status**: ${result.status}\n`;
      
      if (result.provider_id) {
        output += `**Provider**: ${result.provider_id}\n`;
      }
      
      if (result.queue_position && result.queue_position > 0) {
        output += `**Queue Position**: ${result.queue_position}\n`;
      }
      
      if (result.estimated_completion) {
        const eta = new Date(result.estimated_completion).toLocaleTimeString();
        output += `**Estimated Completion**: ${eta}\n`;
      }
    } else {
      output += `❌ **Request Failed**\n\n`;
      output += `**Error**: ${result.error}\n`;
    }

    output += `\n## Request Details\n`;
    output += `- **Service Type**: ${result.request_details.service_type}\n`;
    output += `- **Context Size**: ${result.request_details.context_size} bytes\n`;
    output += `- **Priority**: ${result.request_details.priority}\n`;
    output += `- **Quality Tier**: ${result.request_details.quality_tier}\n`;
    output += `- **Metadata Tags**: ${result.request_details.x_metadata_count}\n\n`;

    output += `## Cost Breakdown\n`;
    output += `- **Total Cost**: ${result.cost_breakdown.total_cost} tokens\n`;
    output += `- **Provider Fee**: ${result.cost_breakdown.provider_fee} tokens\n`;
    output += `- **Marketplace Fee**: ${result.cost_breakdown.marketplace_fee} tokens\n\n`;

    if (result.monitoring_suggestions.length > 0) {
      output += `## Monitoring Suggestions\n`;
      result.monitoring_suggestions.forEach((suggestion: string) => {
        output += `- ${suggestion}\n`;
      });
      output += `\n`;
    }

    if (result.next_steps.length > 0) {
      output += `## Next Steps\n`;
      result.next_steps.forEach((step: string) => {
        output += `- ${step}\n`;
      });
    }

    return output;
  }

  /**
   * Format marketplace economics response for natural language output
   */
  private formatMarketplaceEconomicsResponse(result: any): string {
    let output = `# Marketplace Economics\n\n`;
    output += `${result.summary}\n\n`;

    output += `## Financial Health\n`;
    output += `- **Overall Score**: ${result.financial_health.overall_score}/100\n`;
    output += `- **Status**: ${result.financial_health.status}\n`;
    output += `- **Profit Margin**: ${result.financial_health.key_indicators.profit_margin}%\n`;
    output += `- **Utilization Rate**: ${result.financial_health.key_indicators.utilization_rate}%\n`;
    output += `- **Cost Efficiency**: ${result.financial_health.key_indicators.cost_efficiency}%\n\n`;

    output += `## Token Flow Analysis\n`;
    output += `- **Total Volume**: ${parseInt(result.token_flows.total_volume).toLocaleString()} tokens\n`;
    output += `- **Inbound Payments**: ${parseInt(result.token_flows.inbound_payments).toLocaleString()} tokens\n`;
    output += `- **Outbound Payments**: ${parseInt(result.token_flows.outbound_payments).toLocaleString()} tokens\n`;
    output += `- **Marketplace Fees**: ${parseInt(result.token_flows.marketplace_fees).toLocaleString()} tokens\n`;
    output += `- **Net Flow**: ${parseInt(result.token_flows.net_flow).toLocaleString()} tokens\n\n`;

    if (result.token_flows.flow_breakdown.length > 0) {
      output += `### Flow Breakdown\n`;
      result.token_flows.flow_breakdown.forEach((flow: any) => {
        output += `- **${flow.category}**: ${parseInt(flow.amount).toLocaleString()} tokens (${flow.percentage}%) - ${flow.description}\n`;
      });
      output += `\n`;
    }

    output += `## Revenue & Costs\n`;
    output += `- **Total Revenue**: ${parseInt(result.revenue_analysis.total_revenue).toLocaleString()} tokens\n`;
    output += `- **Total Costs**: ${parseInt(result.cost_analysis.total_costs).toLocaleString()} tokens\n`;
    output += `- **Transaction Volume**: ${result.revenue_analysis.transaction_volume.toLocaleString()}\n`;
    output += `- **Average Transaction**: ${parseInt(result.revenue_analysis.average_transaction_value).toLocaleString()} tokens\n`;
    output += `- **Cost per Request**: ${parseInt(result.cost_analysis.cost_per_request).toLocaleString()} tokens\n\n`;

    if (result.provider_economics.length > 0) {
      output += `## Provider Economics\n`;
      result.provider_economics.forEach((provider: any) => {
        output += `### ${provider.provider_id}\n`;
        output += `- **Earnings**: ${parseInt(provider.earnings).toLocaleString()} tokens\n`;
        output += `- **Requests Served**: ${provider.requests_served.toLocaleString()}\n`;
        output += `- **Avg per Request**: ${parseInt(provider.average_earning_per_request).toLocaleString()} tokens\n`;
        output += `- **Market Share**: ${provider.market_share}%\n\n`;
      });
    }

    output += `## Trends\n`;
    output += `- **Volume**: ${result.trend_analysis.volume_trend}\n`;
    output += `- **Revenue**: ${result.trend_analysis.revenue_trend}\n`;
    output += `- **Profitability**: ${result.trend_analysis.profitability_trend}\n`;
    output += `- **Efficiency**: ${result.trend_analysis.efficiency_trend}\n\n`;

    if (result.optimization_recommendations.length > 0) {
      output += `## Optimization Recommendations\n`;
      result.optimization_recommendations.forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
      output += `\n`;
    }

    if (result.financial_insights.length > 0) {
      output += `## Financial Insights\n`;
      result.financial_insights.forEach((insight: string) => {
        output += `- ${insight}\n`;
      });
    }

    return output;
  }

  /**
   * Format Primal token integration response for natural language output
   */
  private formatPrimalTokenIntegrationResponse(result: any): string {
    let output = `# Primal Token Integration\n\n`;
    output += `${result.summary}\n\n`;

    output += `## Current Balance\n`;
    output += `- **Total Tokens**: ${result.current_balance.total_primal_tokens.toLocaleString()}\n`;
    output += `- **Available for AI**: ${result.current_balance.available_for_ai_services.toLocaleString()}\n`;
    output += `- **Reserved for Ecosystem**: ${result.current_balance.reserved_for_ecosystem.toLocaleString()}\n`;
    output += `- **Pending Transactions**: ${result.current_balance.pending_transactions}\n\n`;

    output += `## Marketplace Spending\n`;
    output += `- **Total Spent**: ${result.marketplace_spending.total_spent.toLocaleString()} tokens\n`;
    output += `- **Transactions**: ${result.marketplace_spending.transactions_count}\n`;
    output += `- **Average per Transaction**: ${result.marketplace_spending.average_per_transaction} tokens\n`;
    output += `- **Spending Trend**: ${result.marketplace_spending.spending_trend}\n\n`;

    if (Object.keys(result.marketplace_spending.spending_by_service).length > 0) {
      output += `### Spending by Service\n`;
      Object.entries(result.marketplace_spending.spending_by_service).forEach(([service, amount]) => {
        output += `- **${service}**: ${(amount as number).toLocaleString()} tokens\n`;
      });
      output += `\n`;
    }

    output += `## Budget Management\n`;
    output += `- **Daily Budget**: ${result.budget_management.daily_budget.toLocaleString()} tokens\n`;
    output += `- **Weekly Budget**: ${result.budget_management.weekly_budget.toLocaleString()} tokens\n`;
    output += `- **Monthly Budget**: ${result.budget_management.monthly_budget.toLocaleString()} tokens\n\n`;

    output += `### Current Usage\n`;
    output += `- **Today**: ${result.budget_management.current_usage.today.toLocaleString()} tokens\n`;
    output += `- **This Week**: ${result.budget_management.current_usage.this_week.toLocaleString()} tokens\n`;
    output += `- **This Month**: ${result.budget_management.current_usage.this_month.toLocaleString()} tokens\n\n`;

    if (result.budget_management.budget_alerts.length > 0) {
      output += `### Budget Alerts\n`;
      result.budget_management.budget_alerts.forEach((alert: any) => {
        const icon = alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️';
        output += `${icon} **${alert.message}**\n`;
        output += `   - Current: ${alert.current_usage.toLocaleString()} / Threshold: ${alert.threshold.toLocaleString()}\n`;
        output += `   - Action: ${alert.recommended_action}\n\n`;
      });
    }

    if (result.transaction_monitoring.recent_transactions.length > 0) {
      output += `## Recent Transactions\n`;
      result.transaction_monitoring.recent_transactions.slice(0, 5).forEach((tx: any) => {
        const statusIcon = tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌';
        output += `${statusIcon} **${tx.service_type}** - ${tx.amount} tokens (${tx.provider_id})\n`;
        output += `   - Cost Efficiency: ${(tx.cost_efficiency * 100).toFixed(1)}%\n`;
        output += `   - Time: ${new Date(tx.timestamp).toLocaleString()}\n\n`;
      });
    }

    output += `## Predictions\n`;
    output += `- **Projected Monthly Spending**: ${result.predictions.projected_monthly_spending.toLocaleString()} tokens\n`;
    output += `- **Balance Depletion**: ${result.predictions.estimated_balance_depletion}\n`;
    output += `- **Recommended Top-up**: ${result.predictions.recommended_top_up_amount.toLocaleString()} tokens\n\n`;

    if (result.cost_optimization.recommendations.length > 0) {
      output += `## Cost Optimization\n`;
      output += `- **Efficiency Score**: ${result.cost_optimization.efficiency_score}%\n`;
      output += `- **Potential Savings**: ${result.cost_optimization.potential_savings.toLocaleString()} tokens\n\n`;
      
      output += `### Recommendations\n`;
      result.cost_optimization.recommendations.forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
      output += `\n`;
    }

    if (result.insights.length > 0) {
      output += `## Insights\n`;
      result.insights.forEach((insight: string) => {
        output += `- ${insight}\n`;
      });
    }

    return output;
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Marketplace MCP server started successfully
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MarketplaceMCPConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update marketplace client if process ID changed
    if (config.marketplace_process_id) {
      this.marketplaceClient.setProcessId(config.marketplace_process_id);
    }
    
    if (config.ao_endpoint) {
      this.marketplaceClient.setApiEndpoint(config.ao_endpoint);
    }
    
    if (config.timeout) {
      this.marketplaceClient.setTimeout(config.timeout);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): MarketplaceMCPConfig {
    return { ...this.config };
  }
}

/**
 * Create and start marketplace MCP integration
 */
export async function createMarketplaceMCPIntegration(config: MarketplaceMCPConfig): Promise<MarketplaceMCPIntegration> {
  const integration = new MarketplaceMCPIntegration(config);
  await integration.start();
  return integration;
}

/**
 * Main entry point for standalone execution
 */
if (require.main === module) {
  const config: MarketplaceMCPConfig = {
    marketplace_process_id: process.env.MARKETPLACE_PROCESS_ID || 'default-marketplace-process',
    ao_endpoint: process.env.AO_ENDPOINT || 'http://localhost:8081',
    timeout: parseInt(process.env.TIMEOUT || '5000'),
    enable_caching: process.env.ENABLE_CACHING === 'true',
    cache_ttl: parseInt(process.env.CACHE_TTL || '300000')
  };

  createMarketplaceMCPIntegration(config).catch((_error) => {
    // Failed to start Marketplace MCP server - exit process
    process.exit(1);
  });
}