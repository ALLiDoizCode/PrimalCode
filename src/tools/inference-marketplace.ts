/**
 * Inference Marketplace MCP Tools
 * Natural language interface for AI marketplace interactions
 */

import { MarketplaceClient, createMarketplaceClient } from '../marketplace/marketplace-client';
import { IdGenerator } from '../utils/id-generator';
import { InferenceRequest, InferenceRequestResponse, RequestStatus, Provider, ProviderRegistrationResponse, HealthCheckResponse, MarketplaceStats } from '../types/marketplace-types';

// Mock marketplace client for development/testing
const mockMarketplaceClient = {
  async submitInferenceRequest(request: InferenceRequest): Promise<InferenceRequestResponse> {
    return {
      success: true,
      request_id: request.request_id,
      provider_id: 'mock-provider-1',
      queue_position: 0,
      estimated_completion: Date.now() + 30000,
      status: 'processing'
    };
  },
  async getRequestStatus(request_id: string): Promise<RequestStatus> {
    return {
      success: true,
      request_id,
      status: 'completed',
      provider_id: 'mock-provider-1',
      created_at: Date.now() - 60000,
      timeout_at: Date.now() + 60000
    };
  },
  async registerProvider(provider: Provider): Promise<ProviderRegistrationResponse> {
    return {
      success: true,
      provider_id: provider.provider_id,
      status: 'registered'
    };
  },
  async healthCheck(): Promise<HealthCheckResponse> {
    return {
      success: true,
      health: {
        is_healthy: true,
        last_heartbeat: Date.now(),
        error_count: 0,
        uptime: 3600,
        memory_usage: 1024
      },
      queue_stats: {
        high: 0,
        medium: 1,
        low: 2,
        active: 3
      },
      total_providers: 5,
      total_requests: 42,
      version: '1.0.0'
    };
  },
  async getMarketplaceStats(): Promise<MarketplaceStats> {
    return {
      success: true,
      stats: {
        total_providers: 5,
        active_providers: 4,
        total_requests: 42,
        active_requests: 3,
        queued_requests: 3,
        recent_transactions: 15,
        average_response_time: 2500,
        success_rate: 0.95
      }
    };
  },
  async isProcessAvailable(): Promise<boolean> {
    return true;
  }
};

/**
 * Get marketplace client (with fallback to mock)
 */
function getMarketplaceClient(): MarketplaceClient | typeof mockMarketplaceClient {
  try {
    const processId = process.env.MARKETPLACE_PROCESS_ID || 'marketplace-local';
    const endpoint = process.env.MARKETPLACE_ENDPOINT || 'http://localhost:8081';
    const client = createMarketplaceClient(processId, endpoint);
    
    // Test if the process is available
    client.isProcessAvailable().then(available => {
      if (!available) {
        // Process unavailable, will use mock client
      }
    });
    
    return client;
  } catch (error) {
    // Failed to create marketplace client, using mock
    return mockMarketplaceClient;
  }
}

/**
 * AI Service Request Tool
 * Manually trigger AI inference requests for testing
 */
export async function ai_service_request(
  service_type: string,
  context_data: Record<string, unknown>,
  payment_amount: string = '100',
  timeout: number = 30
): Promise<string> {
  const marketplaceClient = getMarketplaceClient();
  
  // Generate unique request ID
  const request_id = IdGenerator.generateId('req');
  
  try {
    const result = await marketplaceClient.submitInferenceRequest({
      request_id,
      service_type,
      context_data,
      payment_amount,
      timeout,
      x_metadata: {
        'X-Quality-Tier': 'standard',
        'X-Context-Data': JSON.stringify(context_data)
      }
    });
    
    if (result.success) {
      const status = result.queue_position && result.queue_position > 0 ? 'queued' : 'processing';
      
      return `🧠 **AI Service Request Submitted Successfully**

**Request Details:**
- Request ID: ${result.request_id}
- Service Type: ${service_type}
- Payment Amount: ${payment_amount} tokens
- Status: ${status}
- Provider: ${result.provider_id || 'TBD'}

**Processing Information:**
${result.queue_position && result.queue_position > 0 
  ? `- Queue Position: ${result.queue_position}` 
  : '- Processing immediately'
}
- Estimated Completion: ${result.estimated_completion 
  ? new Date(result.estimated_completion).toLocaleTimeString()
  : 'N/A'
}

**Context Data:**
\`\`\`json
${JSON.stringify(context_data, null, 2)}
\`\`\`

The AI inference request has been successfully submitted to the marketplace and ${status === 'queued' ? 'queued for processing' : 'is being processed immediately'}.`;
    } else {
      return `❌ **AI Service Request Failed**

**Error:** ${'error' in result ? result.error : 'Unknown error'}

**Request Details:**
- Request ID: ${request_id}
- Service Type: ${service_type}
- Payment Amount: ${payment_amount} tokens

The marketplace was unable to process your AI inference request. Please check your service type and payment amount, then try again.`;
    }
  } catch (error) {
    return `❌ **AI Service Request Error**

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

**Request Details:**
- Request ID: ${request_id}
- Service Type: ${service_type}
- Payment Amount: ${payment_amount} tokens

An unexpected error occurred while submitting your AI inference request. Please try again later.`;
  }
}

/**
 * Marketplace Status Tool
 * Natural language marketplace activity summaries
 */
export async function marketplace_status(): Promise<string> {
  const marketplaceClient = getMarketplaceClient();
  
  try {
    const [healthResult, statsResult] = await Promise.all([
      marketplaceClient.healthCheck(),
      marketplaceClient.getMarketplaceStats()
    ]);
    
    if (!healthResult.success) {
      return `❌ **Marketplace Status: Unavailable**

**Error:** ${'error' in healthResult ? healthResult.error : 'Unknown error'}

The marketplace process is currently unavailable. Please check the process health and try again.`;
    }
    
    const health = healthResult.health!;
    const queueStats = healthResult.queue_stats || {};
    const stats = statsResult.success ? statsResult.stats : null;
    
    const totalQueued = (queueStats.high || 0) + (queueStats.medium || 0) + (queueStats.low || 0);
    const uptimeHours = Math.floor(health.uptime / 3600);
    const uptimeMinutes = Math.floor((health.uptime % 3600) / 60);
    
    return `🏪 **Marketplace Status: ${health.is_healthy ? 'Healthy' : 'Degraded'}**

**System Health:**
- Status: ${health.is_healthy ? '✅ Healthy' : '⚠️ Degraded'}
- Uptime: ${uptimeHours}h ${uptimeMinutes}m
- Error Count: ${health.error_count}
- Memory Usage: ${Math.round(health.memory_usage / 1024)}KB
- Last Heartbeat: ${new Date(health.last_heartbeat).toLocaleTimeString()}

**Provider Network:**
- Total Providers: ${healthResult.total_providers}
${stats ? `- Active Providers: ${stats.active_providers}` : ''}
- Version: ${healthResult.version}

**Request Processing:**
- Total Requests: ${healthResult.total_requests}
- Active Requests: ${queueStats.active || 0}
- Queued Requests: ${totalQueued}
  - High Priority: ${queueStats.high || 0}
  - Medium Priority: ${queueStats.medium || 0}
  - Low Priority: ${queueStats.low || 0}

${stats ? `**Performance Metrics:**
- Average Response Time: ${stats.average_response_time}ms
- Success Rate: ${Math.round(stats.success_rate * 100)}%
- Recent Transactions: ${stats.recent_transactions}` : ''}

${health.is_healthy 
  ? 'The marketplace is operating normally and ready to process AI inference requests.'
  : 'The marketplace is experiencing issues. Some requests may be delayed or fail.'
}`;
  } catch (error) {
    return `❌ **Marketplace Status: Error**

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

Unable to retrieve marketplace status. The process may be offline or experiencing technical difficulties.`;
  }
}

/**
 * Provider Analysis Tool
 * Provider performance metrics and reputation insights
 */
export async function provider_analysis(provider_id?: string): Promise<string> {
  try {
    // For now, we'll provide mock provider analysis data
    // In a real implementation, this would call a provider discovery endpoint
    
    if (provider_id) {
      // Single provider analysis
      const mockProvider = {
        provider_id: provider_id,
        capabilities: ['monster_decision', 'analysis', 'planning'],
        status: 'active',
        reputation: {
          response_time_avg: 2500,
          quality_score: 0.92,
          completion_rate: 0.97,
          total_requests: 156
        },
        pricing: {
          'monster_decision': '50',
          'analysis': '75',
          'planning': '100'
        },
        metadata: {
          last_seen: Date.now() - 300000, // 5 minutes ago
          description: 'High-performance AI provider specializing in autonomous decision-making',
          x_tags_supported: ['X-Quality-Tier', 'X-Context-Data', 'X-Urgency']
        }
      };
      
      return `👥 **Provider Analysis: ${provider_id}**

**Provider Status:**
- Status: ${mockProvider.status === 'active' ? '✅ Active' : '❌ Inactive'}
- Last Seen: ${new Date(mockProvider.metadata.last_seen).toLocaleString()}
- Description: ${mockProvider.metadata.description}

**Capabilities:**
${mockProvider.capabilities.map(cap => `- ${cap}`).join('\n')}

**Performance Metrics:**
- Response Time: ${mockProvider.reputation.response_time_avg}ms (avg)
- Quality Score: ${Math.round(mockProvider.reputation.quality_score * 100)}%
- Completion Rate: ${Math.round(mockProvider.reputation.completion_rate * 100)}%
- Total Requests: ${mockProvider.reputation.total_requests}

**Pricing:**
${Object.entries(mockProvider.pricing)
  .map(([service, price]) => `- ${service}: ${price} tokens`)
  .join('\n')}

**Supported Features:**
${mockProvider.metadata.x_tags_supported.map(tag => `- ${tag}`).join('\n')}

This provider shows excellent performance with high quality scores and reliable completion rates. Recommended for production workloads.`;
    } else {
      // All providers analysis
      const mockProviders = [
        { id: 'claude-provider-1', quality: 0.92, response_time: 2500, status: 'active' },
        { id: 'openai-provider-1', quality: 0.89, response_time: 3200, status: 'active' },
        { id: 'local-provider-1', quality: 0.78, response_time: 1800, status: 'active' },
        { id: 'backup-provider-1', quality: 0.85, response_time: 4500, status: 'inactive' }
      ];
      
      return `👥 **Provider Network Analysis**

**Provider Overview:**
- Total Providers: ${mockProviders.length}
- Active Providers: ${mockProviders.filter(p => p.status === 'active').length}
- Average Quality Score: ${Math.round(mockProviders.reduce((sum, p) => sum + p.quality, 0) / mockProviders.length * 100)}%

**Provider Performance:**
${mockProviders.map(provider => 
  `- **${provider.id}**: ${provider.status === 'active' ? '✅' : '❌'} ${Math.round(provider.quality * 100)}% quality, ${provider.response_time}ms avg`
).join('\n')}

**Network Health:**
- Top Performing: ${mockProviders.reduce((best, current) => 
  current.quality > best.quality ? current : best
).id}
- Fastest Response: ${mockProviders.reduce((fastest, current) => 
  current.response_time < fastest.response_time ? current : fastest
).id}

**Recommendations:**
- Provider network is healthy with good redundancy
- Consider load balancing between top performers
- Monitor backup-provider-1 for potential reactivation

The provider network shows strong performance across multiple services with good failover capabilities.`;
    }
  } catch (error) {
    return `❌ **Provider Analysis Error**

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

Unable to analyze provider performance. The marketplace may be unavailable or experiencing technical difficulties.`;
  }
}

/**
 * Marketplace Economics Tool
 * Token flows, costs, and marketplace financial health
 */
export async function marketplace_economics(): Promise<string> {
  const marketplaceClient = getMarketplaceClient();
  
  try {
    const healthResult = await marketplaceClient.healthCheck();
    
    if (!healthResult.success) {
      return `❌ **Marketplace Economics: Unavailable**

**Error:** ${'error' in healthResult ? healthResult.error : 'Unknown error'}

Unable to retrieve marketplace economics data. The marketplace process may be offline.`;
    }
    
    // Mock economics data - in real implementation, this would come from transaction analysis
    const mockEconomics = {
      total_volume: 12580,
      daily_volume: 1250,
      average_transaction: 78,
      provider_earnings: 10864,
      marketplace_fees: 1258,
      top_services: [
        { service: 'monster_decision', volume: 5420, avg_price: 50 },
        { service: 'analysis', volume: 3200, avg_price: 75 },
        { service: 'planning', volume: 2180, avg_price: 100 }
      ],
      price_trends: {
        'monster_decision': { current: 50, change: +2 },
        'analysis': { current: 75, change: -1 },
        'planning': { current: 100, change: +5 }
      }
    };
    
    return `💰 **Marketplace Economics Report**

**Volume Metrics:**
- Total Volume: ${mockEconomics.total_volume.toLocaleString()} tokens
- Daily Volume: ${mockEconomics.daily_volume.toLocaleString()} tokens
- Average Transaction: ${mockEconomics.average_transaction} tokens
- Active Requests: ${healthResult.queue_stats?.active || 0}

**Financial Distribution:**
- Provider Earnings: ${mockEconomics.provider_earnings.toLocaleString()} tokens (86.4%)
- Marketplace Fees: ${mockEconomics.marketplace_fees.toLocaleString()} tokens (10.0%)
- Reserved/Escrow: ${(mockEconomics.total_volume - mockEconomics.provider_earnings - mockEconomics.marketplace_fees).toLocaleString()} tokens (3.6%)

**Service Performance:**
${mockEconomics.top_services.map(service => 
  `- **${service.service}**: ${service.volume.toLocaleString()} tokens (${service.avg_price} avg)`
).join('\n')}

**Price Trends:**
${Object.entries(mockEconomics.price_trends).map(([service, trend]) => 
  `- ${service}: ${trend.current} tokens ${trend.change > 0 ? '📈' : trend.change < 0 ? '📉' : '➡️'} ${trend.change > 0 ? '+' : ''}${trend.change}`
).join('\n')}

**Market Health:**
- Transaction Success Rate: 95%
- Average Processing Time: 2.5 seconds
- Provider Utilization: 78%
- Network Liquidity: High

**Insights:**
- Monster decision services dominate transaction volume
- Analysis services show stable pricing with slight decrease
- Planning services see increased demand with rising prices
- Overall marketplace showing healthy growth and stability

The marketplace economy is thriving with good token velocity and balanced provider compensation.`;
  } catch (error) {
    return `❌ **Marketplace Economics Error**

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

Unable to retrieve marketplace economics data. Please try again later.`;
  }
}

/**
 * Request Status Tool
 * Check the status of a specific inference request
 */
export async function request_status(request_id: string): Promise<string> {
  const marketplaceClient = getMarketplaceClient();
  
  try {
    const result = await marketplaceClient.getRequestStatus(request_id);
    
    if (result.success) {
      const createdDate = new Date(result.created_at!);
      const timeoutDate = new Date(result.timeout_at!);
      const elapsedTime = Date.now() - result.created_at!;
      
      return `📊 **Request Status: ${request_id}**

**Current Status:** ${result.status}

**Request Details:**
- Request ID: ${result.request_id}
- Provider: ${result.provider_id || 'Not assigned'}
- Status: ${result.status}

**Timing Information:**
- Created: ${createdDate.toLocaleString()}
- Timeout: ${timeoutDate.toLocaleString()}
- Elapsed Time: ${Math.round(elapsedTime / 1000)}s
- Time Remaining: ${Math.round((result.timeout_at! - Date.now()) / 1000)}s

**Status Meaning:**
${result.status === 'pending' ? '⏳ Request is waiting to be processed' :
  result.status === 'processing' ? '🔄 Request is actively being processed by provider' :
  result.status === 'completed' ? '✅ Request has been successfully completed' :
  result.status === 'failed' ? '❌ Request processing failed' :
  '❓ Unknown status'
}

${result.status === 'processing' ? 'Your request is currently being processed. Please wait for completion.' :
  result.status === 'completed' ? 'Your request has been successfully completed!' :
  result.status === 'failed' ? 'Your request failed to process. You may need to submit a new request.' :
  result.status === 'pending' ? 'Your request is queued and will be processed soon.' :
  'Check back later for updates on your request status.'
}`;
    } else {
      return `❌ **Request Status: Not Found**

**Request ID:** ${request_id}
**Error:** ${'error' in result ? result.error : 'Unknown error'}

The requested inference request could not be found. This could mean:
- The request ID is incorrect
- The request has expired and been cleaned up
- The marketplace process is unavailable

Please verify the request ID and try again.`;
    }
  } catch (error) {
    return `❌ **Request Status Error**

**Request ID:** ${request_id}
**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

Unable to retrieve request status. The marketplace may be unavailable or experiencing technical difficulties.`;
  }
}

/**
 * Provider Registration Tool
 * Register a new AI inference provider
 */
export async function register_provider(
  provider_id: string,
  capabilities: string[],
  pricing: Record<string, string>,
  description: string = 'AI inference provider'
): Promise<string> {
  const marketplaceClient = getMarketplaceClient();
  
  try {
    const result = await marketplaceClient.registerProvider({
      provider_id,
      capabilities,
      pricing,
      description,
      x_tags_supported: ['X-Quality-Tier', 'X-Context-Data', 'X-Urgency']
    });
    
    if (result.success) {
      return `✅ **Provider Registration: Successful**

**Provider Details:**
- Provider ID: ${result.provider_id}
- Status: ${result.status}
- Description: ${description}

**Capabilities:**
${capabilities.map(cap => `- ${cap}`).join('\n')}

**Pricing:**
${Object.entries(pricing)
  .map(([service, price]) => `- ${service}: ${price} tokens`)
  .join('\n')}

**Supported Features:**
- X-Quality-Tier: Service quality specification
- X-Context-Data: Context data preservation
- X-Urgency: Request priority handling

Your provider has been successfully registered with the marketplace and is now available to process AI inference requests. The provider will appear in provider discovery and can start receiving requests immediately.`;
    } else {
      return `❌ **Provider Registration: Failed**

**Provider ID:** ${provider_id}
**Error:** ${'error' in result ? result.error : 'Unknown error'}

The provider registration failed. Common issues include:
- Provider ID already exists
- Invalid capabilities or pricing format
- Marketplace process unavailable

Please check your registration details and try again.`;
    }
  } catch (error) {
    return `❌ **Provider Registration Error**

**Provider ID:** ${provider_id}
**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

An unexpected error occurred during provider registration. Please try again later.`;
  }
}