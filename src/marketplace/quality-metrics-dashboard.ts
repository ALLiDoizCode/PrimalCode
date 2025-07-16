import { Tool } from '@modelcontextprotocol/sdk/types';
import { ReputationManager } from './reputation-manager';

export interface QualityMetricsDashboard {
  reputation_manager: ReputationManager;
}

export class QualityMetricsDashboardTool {
  private reputationManager: ReputationManager;

  constructor(reputationManagerProcessId: string) {
    this.reputationManager = new ReputationManager(reputationManagerProcessId);
  }

  /**
   * Get MCP tool definitions for quality metrics dashboard
   */
  getTools(): Tool[] {
    return [
      {
        name: 'analyze_provider_reputation',
        description: 'Analyze reputation and performance metrics for a specific AI inference provider',
        inputSchema: {
          type: 'object',
          properties: {
            provider_id: {
              type: 'string',
              description: 'The unique identifier for the AI inference provider'
            },
            include_history: {
              type: 'boolean',
              description: 'Whether to include historical reputation trends (default: true)',
              default: true
            },
            include_alerts: {
              type: 'boolean',
              description: 'Whether to include performance alerts (default: true)',
              default: true
            }
          },
          required: ['provider_id']
        }
      },
      {
        name: 'get_provider_rankings',
        description: 'Get provider rankings for a specific service type with quality metrics',
        inputSchema: {
          type: 'object',
          properties: {
            service_type: {
              type: 'string',
              description: 'The type of AI service (e.g., "text-generation", "image-generation")',
              default: 'default'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of providers to return (default: 10)',
              default: 10
            },
            min_reputation: {
              type: 'number',
              description: 'Minimum reputation score threshold (0-1)',
              default: 0.0
            }
          }
        }
      },
      {
        name: 'compare_providers',
        description: 'Compare quality metrics and reputation between two AI inference providers',
        inputSchema: {
          type: 'object',
          properties: {
            provider_id_1: {
              type: 'string',
              description: 'First provider ID to compare'
            },
            provider_id_2: {
              type: 'string',
              description: 'Second provider ID to compare'
            }
          },
          required: ['provider_id_1', 'provider_id_2']
        }
      },
      {
        name: 'get_marketplace_overview',
        description: 'Get comprehensive overview of marketplace reputation and quality metrics',
        inputSchema: {
          type: 'object',
          properties: {
            include_distribution: {
              type: 'boolean',
              description: 'Include performance distribution analysis (default: true)',
              default: true
            }
          }
        }
      },
      {
        name: 'track_quality_trends',
        description: 'Analyze quality trends across the marketplace or for specific providers',
        inputSchema: {
          type: 'object',
          properties: {
            provider_id: {
              type: 'string',
              description: 'Specific provider to analyze (omit for marketplace-wide trends)'
            },
            time_period: {
              type: 'string',
              description: 'Time period for trend analysis',
              enum: ['24h', '7d', '30d'],
              default: '7d'
            }
          }
        }
      },
      {
        name: 'check_performance_alerts',
        description: 'Check for performance alerts and quality issues across providers',
        inputSchema: {
          type: 'object',
          properties: {
            provider_id: {
              type: 'string',
              description: 'Specific provider to check (omit for all providers)'
            },
            severity: {
              type: 'string',
              description: 'Minimum alert severity level',
              enum: ['info', 'warning', 'critical'],
              default: 'warning'
            }
          }
        }
      },
      {
        name: 'recommend_providers',
        description: 'Get provider recommendations based on quality metrics and reputation',
        inputSchema: {
          type: 'object',
          properties: {
            service_type: {
              type: 'string',
              description: 'Type of AI service needed',
              default: 'default'
            },
            max_response_time: {
              type: 'number',
              description: 'Maximum acceptable response time in seconds',
              default: 5.0
            },
            min_quality_score: {
              type: 'number',
              description: 'Minimum quality score requirement (0-1)',
              default: 0.7
            },
            min_completion_rate: {
              type: 'number',
              description: 'Minimum completion rate requirement (0-1)',
              default: 0.9
            },
            limit: {
              type: 'number',
              description: 'Maximum number of recommendations',
              default: 5
            }
          }
        }
      }
    ];
  }

  /**
   * Handle MCP tool calls
   */
  async handleToolCall(name: string, args: any): Promise<string> {
    switch (name) {
      case 'analyze_provider_reputation':
        return this.analyzeProviderReputation(args);
      case 'get_provider_rankings':
        return this.getProviderRankings(args);
      case 'compare_providers':
        return this.compareProviders(args);
      case 'get_marketplace_overview':
        return this.getMarketplaceOverview(args);
      case 'track_quality_trends':
        return this.trackQualityTrends(args);
      case 'check_performance_alerts':
        return this.checkPerformanceAlerts(args);
      case 'recommend_providers':
        return this.recommendProviders(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Analyze provider reputation with natural language description
   */
  private async analyzeProviderReputation(args: any): Promise<string> {
    const { provider_id, include_history = true, include_alerts = true } = args;
    
    try {
      const analysis = await this.reputationManager.getProviderAnalysis(provider_id);
      
      let narrative = `## Provider Reputation Analysis: ${provider_id}\n\n`;
      
      // Overall reputation assessment
      const score = analysis.reputation.reputation_score;
      const scoreCategory = this.getScoreCategory(score);
      
      narrative += `**Overall Reputation Score:** ${(score * 100).toFixed(1)}% (${scoreCategory})\n\n`;
      
      // Quality metrics breakdown
      const metrics = analysis.reputation.quality_metrics;
      narrative += `### Quality Metrics\n`;
      narrative += `- **Response Time:** ${metrics.avg_response_time.toFixed(2)}s average\n`;
      narrative += `- **Quality Score:** ${(metrics.avg_quality_score * 100).toFixed(1)}%\n`;
      narrative += `- **Completion Rate:** ${(metrics.completion_rate * 100).toFixed(1)}%\n`;
      narrative += `- **Reliability Score:** ${(metrics.reliability_score * 100).toFixed(1)}%\n`;
      narrative += `- **Trend Direction:** ${metrics.trend_direction}\n`;
      narrative += `- **Data Points:** ${metrics.data_points} service completions\n\n`;
      
      // Performance interpretation
      narrative += `### Performance Interpretation\n`;
      narrative += this.interpretPerformance(metrics);
      
      // Trend analysis
      if (include_history) {
        narrative += `\n### Trend Analysis\n`;
        narrative += `The provider shows a **${analysis.trend_analysis.trend_direction}** trend with `;
        narrative += `${(analysis.trend_analysis.trend_strength * 100).toFixed(1)}% strength. `;
        narrative += `Recent performance (${(analysis.trend_analysis.recent_performance * 100).toFixed(1)}%) `;
        narrative += `compared to historical average (${(analysis.trend_analysis.historical_average * 100).toFixed(1)}%). `;
        narrative += `**Recommendation:** ${analysis.trend_analysis.recommendation}\n\n`;
      }
      
      // Alerts
      if (include_alerts && analysis.alerts.length > 0) {
        narrative += `### Performance Alerts\n`;
        for (const alert of analysis.alerts) {
          narrative += `- **${alert.severity.toUpperCase()}:** ${alert.message} `;
          narrative += `(Current: ${alert.value.toFixed(2)}, Threshold: ${alert.threshold.toFixed(2)})\n`;
        }
        narrative += `\n`;
      }
      
      return narrative;
    } catch (error) {
      return `Error analyzing provider reputation: ${error}`;
    }
  }

  /**
   * Get provider rankings with analysis
   */
  private async getProviderRankings(args: any): Promise<string> {
    const { service_type = 'default', limit = 10, min_reputation = 0.0 } = args;
    
    try {
      const ranking = await this.reputationManager.getProviderRanking(service_type, limit);
      
      let narrative = `## Provider Rankings for ${service_type}\n\n`;
      narrative += `Showing top ${Math.min(limit, ranking.total_providers)} providers out of ${ranking.total_providers} total.\n\n`;
      
      const filteredRanking = ranking.ranking.filter(r => r.score >= min_reputation);
      
      if (filteredRanking.length === 0) {
        narrative += `No providers meet the minimum reputation threshold of ${(min_reputation * 100).toFixed(1)}%.\n`;
        return narrative;
      }
      
      for (let i = 0; i < filteredRanking.length; i++) {
        const provider = filteredRanking[i];
        const rank = i + 1;
        const scoreCategory = this.getScoreCategory(provider.score);
        
        narrative += `### ${rank}. ${provider.provider_id}\n`;
        narrative += `**Score:** ${(provider.score * 100).toFixed(1)}% (${scoreCategory})\n`;
        narrative += `**Last Updated:** ${new Date(provider.last_updated).toLocaleString()}\n\n`;
      }
      
      return narrative;
    } catch (error) {
      return `Error getting provider rankings: ${error}`;
    }
  }

  /**
   * Compare two providers
   */
  private async compareProviders(args: any): Promise<string> {
    const { provider_id_1, provider_id_2 } = args;
    
    try {
      const comparison = await this.reputationManager.compareProviders(provider_id_1, provider_id_2);
      
      let narrative = `## Provider Comparison\n\n`;
      narrative += `Comparing **${provider_id_1}** vs **${provider_id_2}**\n\n`;
      
      // Winner announcement
      narrative += `### Winner: ${comparison.winner}\n`;
      narrative += `Score difference: ${(comparison.score_difference * 100).toFixed(1)}%\n\n`;
      
      // Detailed comparison
      narrative += `### Detailed Comparison\n\n`;
      
      const p1 = comparison.provider1;
      const p2 = comparison.provider2;
      
      narrative += `| Metric | ${provider_id_1} | ${provider_id_2} |\n`;
      narrative += `|--------|----------|----------|\n`;
      narrative += `| Overall Score | ${(p1.reputation_score * 100).toFixed(1)}% | ${(p2.reputation_score * 100).toFixed(1)}% |\n`;
      narrative += `| Response Time | ${p1.quality_metrics.avg_response_time.toFixed(2)}s | ${p2.quality_metrics.avg_response_time.toFixed(2)}s |\n`;
      narrative += `| Quality Score | ${(p1.quality_metrics.avg_quality_score * 100).toFixed(1)}% | ${(p2.quality_metrics.avg_quality_score * 100).toFixed(1)}% |\n`;
      narrative += `| Completion Rate | ${(p1.quality_metrics.completion_rate * 100).toFixed(1)}% | ${(p2.quality_metrics.completion_rate * 100).toFixed(1)}% |\n`;
      narrative += `| Reliability | ${(p1.quality_metrics.reliability_score * 100).toFixed(1)}% | ${(p2.quality_metrics.reliability_score * 100).toFixed(1)}% |\n`;
      narrative += `| Trend | ${p1.quality_metrics.trend_direction} | ${p2.quality_metrics.trend_direction} |\n`;
      narrative += `| Data Points | ${p1.quality_metrics.data_points} | ${p2.quality_metrics.data_points} |\n\n`;
      
      // Recommendations
      narrative += `### Recommendations\n`;
      if (comparison.score_difference < 0.1) {
        narrative += `Both providers perform similarly. Consider other factors like cost or specific capabilities.\n`;
      } else {
        narrative += `${comparison.winner} shows significantly better performance and should be preferred.\n`;
      }
      
      return narrative;
    } catch (error) {
      return `Error comparing providers: ${error}`;
    }
  }

  /**
   * Get marketplace overview
   */
  private async getMarketplaceOverview(args: any): Promise<string> {
    const { include_distribution = true } = args;
    
    try {
      const stats = await this.reputationManager.getMarketplaceStats();
      
      let narrative = `## Marketplace Quality Overview\n\n`;
      narrative += `**Total Providers:** ${stats.total_providers}\n`;
      narrative += `**Average Reputation Score:** ${(stats.avg_reputation_score * 100).toFixed(1)}%\n`;
      narrative += `**Top Performer:** ${stats.top_performer || 'None'}\n`;
      narrative += `**Bottom Performer:** ${stats.bottom_performer || 'None'}\n\n`;
      
      if (include_distribution) {
        narrative += `### Performance Distribution\n`;
        narrative += `- **Excellent (80%+):** ${stats.performance_distribution.excellent} providers\n`;
        narrative += `- **Good (60-80%):** ${stats.performance_distribution.good} providers\n`;
        narrative += `- **Average (40-60%):** ${stats.performance_distribution.average} providers\n`;
        narrative += `- **Poor (<40%):** ${stats.performance_distribution.poor} providers\n\n`;
        
        // Market health assessment
        const excellentPercent = (stats.performance_distribution.excellent / stats.total_providers) * 100;
        const poorPercent = (stats.performance_distribution.poor / stats.total_providers) * 100;
        
        narrative += `### Market Health Assessment\n`;
        if (excellentPercent > 30) {
          narrative += `✅ **Healthy Market** - High proportion of excellent providers (${excellentPercent.toFixed(1)}%)\n`;
        } else if (poorPercent > 30) {
          narrative += `⚠️ **Concerning Market** - High proportion of poor performers (${poorPercent.toFixed(1)}%)\n`;
        } else {
          narrative += `📊 **Balanced Market** - Reasonable distribution of provider quality\n`;
        }
      }
      
      return narrative;
    } catch (error) {
      return `Error getting marketplace overview: ${error}`;
    }
  }

  /**
   * Track quality trends
   */
  private async trackQualityTrends(args: any): Promise<string> {
    const { provider_id, time_period = '7d' } = args;
    
    try {
      if (provider_id) {
        const trendAnalysis = await this.reputationManager.analyzeProviderTrend(provider_id);
        
        let narrative = `## Quality Trends for ${provider_id}\n\n`;
        narrative += `**Trend Direction:** ${trendAnalysis.trend_direction}\n`;
        narrative += `**Trend Strength:** ${(trendAnalysis.trend_strength * 100).toFixed(1)}%\n`;
        narrative += `**Recent Performance:** ${(trendAnalysis.recent_performance * 100).toFixed(1)}%\n`;
        narrative += `**Historical Average:** ${(trendAnalysis.historical_average * 100).toFixed(1)}%\n\n`;
        narrative += `**Recommendation:** ${trendAnalysis.recommendation}\n`;
        
        return narrative;
      } else {
        // Marketplace-wide trends
        const stats = await this.reputationManager.getMarketplaceStats();
        
        let narrative = `## Marketplace Quality Trends (${time_period})\n\n`;
        narrative += `Analysis of ${stats.total_providers} providers over the past ${time_period}.\n\n`;
        narrative += `**Current Average Quality:** ${(stats.avg_reputation_score * 100).toFixed(1)}%\n`;
        narrative += `**Market Leader:** ${stats.top_performer || 'None'}\n`;
        narrative += `**Market Trends:** Comprehensive trend analysis requires historical data aggregation.\n`;
        
        return narrative;
      }
    } catch (error) {
      return `Error tracking quality trends: ${error}`;
    }
  }

  /**
   * Check performance alerts
   */
  private async checkPerformanceAlerts(args: any): Promise<string> {
    const { provider_id, severity = 'warning' } = args;
    
    try {
      if (provider_id) {
        const alerts = await this.reputationManager.checkPerformanceAlerts(provider_id);
        const filteredAlerts = alerts.filter(a => this.getSeverityLevel(a.severity) >= this.getSeverityLevel(severity));
        
        let narrative = `## Performance Alerts for ${provider_id}\n\n`;
        
        if (filteredAlerts.length === 0) {
          narrative += `✅ No ${severity}+ alerts detected for this provider.\n`;
        } else {
          narrative += `⚠️ ${filteredAlerts.length} ${severity}+ alert(s) detected:\n\n`;
          
          for (const alert of filteredAlerts) {
            const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
            narrative += `${icon} **${alert.type.toUpperCase()}** (${alert.severity}): ${alert.message}\n`;
            narrative += `   Current: ${alert.value.toFixed(2)}, Threshold: ${alert.threshold.toFixed(2)}\n\n`;
          }
        }
        
        return narrative;
      } else {
        // Check all providers (simplified)
        const ranking = await this.reputationManager.getProviderRanking('default', 100);
        let totalAlerts = 0;
        
        for (const provider of ranking.ranking) {
          const alerts = await this.reputationManager.checkPerformanceAlerts(provider.provider_id);
          const filteredAlerts = alerts.filter(a => this.getSeverityLevel(a.severity) >= this.getSeverityLevel(severity));
          totalAlerts += filteredAlerts.length;
        }
        
        let narrative = `## Marketplace Performance Alerts (${severity}+)\n\n`;
        narrative += `**Total Alerts:** ${totalAlerts} across ${ranking.total_providers} providers\n`;
        
        if (totalAlerts > 0) {
          narrative += `⚠️ Performance issues detected. Run alerts check on individual providers for details.\n`;
        } else {
          narrative += `✅ No significant performance issues detected.\n`;
        }
        
        return narrative;
      }
    } catch (error) {
      return `Error checking performance alerts: ${error}`;
    }
  }

  /**
   * Recommend providers based on criteria
   */
  private async recommendProviders(args: any): Promise<string> {
    const {
      service_type = 'default',
      max_response_time = 5.0,
      min_quality_score = 0.7,
      min_completion_rate = 0.9,
      limit = 5
    } = args;
    
    try {
      const ranking = await this.reputationManager.getProviderRanking(service_type, 50);
      const recommendations = [];
      
      for (const provider of ranking.ranking) {
        const reputation = await this.reputationManager.getProviderReputation(provider.provider_id);
        const metrics = reputation.quality_metrics;
        
        if (
          metrics.avg_response_time <= max_response_time &&
          metrics.avg_quality_score >= min_quality_score &&
          metrics.completion_rate >= min_completion_rate
        ) {
          recommendations.push({
            provider_id: provider.provider_id,
            reputation_score: reputation.reputation_score,
            metrics: metrics
          });
        }
        
        if (recommendations.length >= limit) break;
      }
      
      let narrative = `## Provider Recommendations for ${service_type}\n\n`;
      narrative += `**Criteria:**\n`;
      narrative += `- Max Response Time: ${max_response_time}s\n`;
      narrative += `- Min Quality Score: ${(min_quality_score * 100).toFixed(1)}%\n`;
      narrative += `- Min Completion Rate: ${(min_completion_rate * 100).toFixed(1)}%\n\n`;
      
      if (recommendations.length === 0) {
        narrative += `❌ No providers meet the specified criteria. Consider relaxing requirements.\n`;
      } else {
        narrative += `✅ Found ${recommendations.length} recommended provider(s):\n\n`;
        
        for (let i = 0; i < recommendations.length; i++) {
          const rec = recommendations[i];
          narrative += `### ${i + 1}. ${rec.provider_id}\n`;
          narrative += `**Overall Score:** ${(rec.reputation_score * 100).toFixed(1)}%\n`;
          narrative += `**Response Time:** ${rec.metrics.avg_response_time.toFixed(2)}s\n`;
          narrative += `**Quality Score:** ${(rec.metrics.avg_quality_score * 100).toFixed(1)}%\n`;
          narrative += `**Completion Rate:** ${(rec.metrics.completion_rate * 100).toFixed(1)}%\n`;
          narrative += `**Trend:** ${rec.metrics.trend_direction}\n\n`;
        }
      }
      
      return narrative;
    } catch (error) {
      return `Error generating provider recommendations: ${error}`;
    }
  }

  /**
   * Helper methods
   */
  private getScoreCategory(score: number): string {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Average';
    return 'Poor';
  }

  private getSeverityLevel(severity: string): number {
    switch (severity) {
      case 'critical': return 3;
      case 'warning': return 2;
      case 'info': return 1;
      default: return 0;
    }
  }

  private interpretPerformance(metrics: any): string {
    let interpretation = '';
    
    if (metrics.avg_response_time > 5.0) {
      interpretation += '⚠️ **Response time is slower than ideal** - Consider optimization or infrastructure improvements.\n';
    } else if (metrics.avg_response_time < 2.0) {
      interpretation += '✅ **Excellent response time** - Provides fast service delivery.\n';
    }
    
    if (metrics.avg_quality_score < 0.7) {
      interpretation += '⚠️ **Quality score below recommended threshold** - May need attention to service quality.\n';
    } else if (metrics.avg_quality_score > 0.9) {
      interpretation += '✅ **Outstanding quality score** - Consistently delivers high-quality results.\n';
    }
    
    if (metrics.completion_rate < 0.9) {
      interpretation += '🚨 **Low completion rate** - Reliability issues may impact user experience.\n';
    } else if (metrics.completion_rate > 0.95) {
      interpretation += '✅ **Excellent reliability** - Consistently completes service requests.\n';
    }
    
    if (metrics.trend_direction === 'improving') {
      interpretation += '📈 **Improving trend** - Performance is getting better over time.\n';
    } else if (metrics.trend_direction === 'declining') {
      interpretation += '📉 **Declining trend** - Performance degradation detected.\n';
    }
    
    return interpretation;
  }
}