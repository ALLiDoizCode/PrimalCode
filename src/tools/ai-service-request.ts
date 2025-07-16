/**
 * AI Service Request MCP Tool
 * Enables manual triggering of AI inference requests for testing and debugging
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MarketplaceClient } from '../marketplace/marketplace-client.js';
import { randomUUID } from 'crypto';

export interface AIServiceRequestRequest {
  service_type: string;
  provider_id?: string;
  context_data: Record<string, any>;
  payment_amount: string;
  timeout?: number;
  x_metadata?: Record<string, string>;
  priority?: 'high' | 'medium' | 'low';
  quality_tier?: 'premium' | 'standard' | 'basic';
}

export interface AIServiceRequestResponse {
  success: boolean;
  request_id: string;
  status: 'submitted' | 'queued' | 'processing' | 'completed' | 'failed';
  provider_id?: string;
  queue_position?: number;
  estimated_completion?: number;
  tracking_info: {
    submission_time: number;
    last_update: number;
    monitoring_url?: string;
  };
  cost_breakdown: {
    base_cost: string;
    provider_fee: string;
    marketplace_fee: string;
    total_cost: string;
  };
  request_details: {
    service_type: string;
    context_size: number;
    x_metadata_count: number;
    priority: string;
    quality_tier: string;
  };
  monitoring_suggestions: string[];
  next_steps: string[];
  error?: string;
}

export class AIServiceRequestTool {
  private marketplaceClient: MarketplaceClient;
  private readonly maxResponseTime = 1000; // 1 second as per requirements
  private readonly monitoringInterval = 500; // 500ms monitoring updates

  constructor(marketplaceClient: MarketplaceClient) {
    this.marketplaceClient = marketplaceClient;
  }

  /**
   * Get MCP tool definition
   */
  getTool(): Tool {
    return {
      name: 'ai_service_request',
      description: 'Manually trigger AI inference requests for testing, debugging, and validation of marketplace services',
      inputSchema: {
        type: 'object',
        properties: {
          service_type: {
            type: 'string',
            description: 'Type of AI service to request',
            enum: ['text-generation', 'analysis', 'reasoning', 'code-generation', 'image-analysis', 'translation', 'summarization']
          },
          provider_id: {
            type: 'string',
            description: 'Specific provider to target (optional - if not specified, marketplace will auto-select)'
          },
          context_data: {
            type: 'object',
            description: 'Context data and parameters for the AI service request',
            properties: {
              prompt: { type: 'string', description: 'Main prompt or query for the AI service' },
              max_tokens: { type: 'number', description: 'Maximum tokens to generate' },
              temperature: { type: 'number', description: 'Temperature for generation' },
              additional_context: { type: 'object', description: 'Additional context parameters' }
            },
            required: ['prompt']
          },
          payment_amount: {
            type: 'string',
            description: 'Amount of tokens to pay for the service'
          },
          timeout: {
            type: 'number',
            description: 'Request timeout in seconds',
            default: 30,
            minimum: 5,
            maximum: 300
          },
          x_metadata: {
            type: 'object',
            description: 'Additional X-prefixed metadata tags for the request',
            additionalProperties: { type: 'string' }
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'Request priority level',
            default: 'medium'
          },
          quality_tier: {
            type: 'string',
            enum: ['premium', 'standard', 'basic'],
            description: 'Quality tier for the service',
            default: 'standard'
          }
        },
        required: ['service_type', 'context_data', 'payment_amount']
      }
    };
  }

  /**
   * Execute AI service request
   */
  async execute(request: AIServiceRequestRequest): Promise<AIServiceRequestResponse> {
    const startTime = Date.now();
    const requestId = randomUUID();
    
    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (!validationResult.valid) {
        return this.generateValidationErrorResponse(requestId, validationResult.errors);
      }

      // Check marketplace availability
      const isAvailable = await this.marketplaceClient.isProcessAvailable();
      if (!isAvailable) {
        return this.generateUnavailableResponse(requestId, request);
      }

      // Submit the request
      const submissionResponse = await this.submitRequest(requestId, request);
      
      // Check response time requirement
      const responseTime = Date.now() - startTime;
      if (responseTime > this.maxResponseTime) {
        // Response time exceeded target - should be monitored via performance tracking
      }

      return this.generateSuccessResponse(requestId, request, submissionResponse, startTime);

    } catch (error) {
      // Error submitting AI service request - handle gracefully
      return this.generateErrorResponse(requestId, request, error);
    }
  }

  /**
   * Validate request parameters
   */
  private validateRequest(request: AIServiceRequestRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate service type
    const validServiceTypes = ['text-generation', 'analysis', 'reasoning', 'code-generation', 'image-analysis', 'translation', 'summarization'];
    if (!validServiceTypes.includes(request.service_type)) {
      errors.push(`Invalid service_type: ${request.service_type}. Must be one of: ${validServiceTypes.join(', ')}`);
    }

    // Validate context data
    if (!request.context_data.prompt || typeof request.context_data.prompt !== 'string') {
      errors.push('context_data.prompt is required and must be a string');
    }

    // Validate payment amount
    const paymentAmount = parseInt(request.payment_amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      errors.push('payment_amount must be a valid positive number');
    }

    // Validate timeout
    if (request.timeout && (request.timeout < 5 || request.timeout > 300)) {
      errors.push('timeout must be between 5 and 300 seconds');
    }

    // Validate metadata
    if (request.x_metadata) {
      for (const [key, value] of Object.entries(request.x_metadata)) {
        if (!key.startsWith('X-')) {
          errors.push(`Metadata key "${key}" must start with "X-"`);
        }
        if (typeof value !== 'string') {
          errors.push(`Metadata value for "${key}" must be a string`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Submit request to marketplace
   */
  private async submitRequest(requestId: string, request: AIServiceRequestRequest) {
    // Prepare X-metadata
    const xMetadata: Record<string, string> = {
      'X-Request-Source': 'mcp-tool',
      'X-Quality-Tier': request.quality_tier || 'standard',
      'X-Priority': request.priority || 'medium',
      ...request.x_metadata
    };

    // Add provider targeting if specified
    if (request.provider_id) {
      xMetadata['X-Provider-ID'] = request.provider_id;
    }

    // Submit to marketplace
    return await this.marketplaceClient.submitInferenceRequest({
      request_id: requestId,
      service_type: request.service_type,
      context_data: request.context_data,
      payment_amount: request.payment_amount,
      timeout: request.timeout || 30,
      x_metadata: xMetadata
    });
  }

  /**
   * Generate validation error response
   */
  private generateValidationErrorResponse(requestId: string, errors: string[]): AIServiceRequestResponse {
    return {
      success: false,
      request_id: requestId,
      status: 'failed',
      tracking_info: {
        submission_time: Date.now(),
        last_update: Date.now()
      },
      cost_breakdown: {
        base_cost: '0',
        provider_fee: '0',
        marketplace_fee: '0',
        total_cost: '0'
      },
      request_details: {
        service_type: 'unknown',
        context_size: 0,
        x_metadata_count: 0,
        priority: 'medium',
        quality_tier: 'standard'
      },
      monitoring_suggestions: [
        'Fix validation errors before resubmitting',
        'Check request parameters against tool schema',
        'Ensure all required fields are provided'
      ],
      next_steps: [
        'Review and correct the validation errors',
        'Resubmit the request with valid parameters',
        'Check documentation for parameter requirements'
      ],
      error: `Validation failed: ${errors.join(', ')}`
    };
  }

  /**
   * Generate unavailable response
   */
  private generateUnavailableResponse(requestId: string, request: AIServiceRequestRequest): AIServiceRequestResponse {
    return {
      success: false,
      request_id: requestId,
      status: 'failed',
      tracking_info: {
        submission_time: Date.now(),
        last_update: Date.now()
      },
      cost_breakdown: {
        base_cost: '0',
        provider_fee: '0',
        marketplace_fee: '0',
        total_cost: '0'
      },
      request_details: {
        service_type: request.service_type,
        context_size: JSON.stringify(request.context_data).length,
        x_metadata_count: Object.keys(request.x_metadata || {}).length,
        priority: request.priority || 'medium',
        quality_tier: request.quality_tier || 'standard'
      },
      monitoring_suggestions: [
        'Wait for marketplace to become available',
        'Check marketplace status using marketplace_status tool',
        'Consider retrying in a few minutes'
      ],
      next_steps: [
        'Monitor marketplace availability',
        'Retry request when marketplace is online',
        'Check marketplace health status'
      ],
      error: 'Marketplace is currently unavailable'
    };
  }

  /**
   * Generate success response
   */
  private generateSuccessResponse(
    requestId: string,
    request: AIServiceRequestRequest,
    submissionResponse: any,
    startTime: number
  ): AIServiceRequestResponse {
    const contextSize = JSON.stringify(request.context_data).length;
    const xMetadataCount = Object.keys(request.x_metadata || {}).length;
    
    // Calculate cost breakdown
    const baseCost = parseInt(request.payment_amount);
    const providerFee = Math.floor(baseCost * 0.85); // 85% to provider
    const marketplaceFee = Math.floor(baseCost * 0.15); // 15% marketplace fee
    
    const status = submissionResponse.success ? 'submitted' : 'failed';
    const queuePosition = submissionResponse.queue_position || 0;
    const estimatedCompletion = submissionResponse.estimated_completion || Date.now() + 30000;

    return {
      success: submissionResponse.success,
      request_id: requestId,
      status: status,
      provider_id: submissionResponse.provider_id,
      queue_position: queuePosition,
      estimated_completion: estimatedCompletion,
      tracking_info: {
        submission_time: startTime,
        last_update: Date.now(),
        monitoring_url: `${this.marketplaceClient.getProcessId()}/request/${requestId}`
      },
      cost_breakdown: {
        base_cost: request.payment_amount,
        provider_fee: providerFee.toString(),
        marketplace_fee: marketplaceFee.toString(),
        total_cost: request.payment_amount
      },
      request_details: {
        service_type: request.service_type,
        context_size: contextSize,
        x_metadata_count: xMetadataCount,
        priority: request.priority || 'medium',
        quality_tier: request.quality_tier || 'standard'
      },
      monitoring_suggestions: this.generateMonitoringSuggestions(submissionResponse, queuePosition),
      next_steps: this.generateNextSteps(submissionResponse, queuePosition),
      error: submissionResponse.success ? undefined : submissionResponse.error
    };
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(requestId: string, request: AIServiceRequestRequest, error: any): AIServiceRequestResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      request_id: requestId,
      status: 'failed',
      tracking_info: {
        submission_time: Date.now(),
        last_update: Date.now()
      },
      cost_breakdown: {
        base_cost: '0',
        provider_fee: '0',
        marketplace_fee: '0',
        total_cost: '0'
      },
      request_details: {
        service_type: request.service_type,
        context_size: JSON.stringify(request.context_data).length,
        x_metadata_count: Object.keys(request.x_metadata || {}).length,
        priority: request.priority || 'medium',
        quality_tier: request.quality_tier || 'standard'
      },
      monitoring_suggestions: [
        'Check marketplace connectivity',
        'Verify request parameters are correct',
        'Monitor for automatic retry attempts'
      ],
      next_steps: [
        'Investigate the error cause',
        'Retry the request if appropriate',
        'Check marketplace status for issues'
      ],
      error: errorMessage
    };
  }

  /**
   * Generate monitoring suggestions
   */
  private generateMonitoringSuggestions(submissionResponse: any, queuePosition: number): string[] {
    const suggestions: string[] = [];

    if (submissionResponse.success) {
      suggestions.push(`Monitor request progress every ${this.monitoringInterval}ms`);
      
      if (queuePosition > 0) {
        suggestions.push(`Request is queued at position ${queuePosition}`);
        suggestions.push('Monitor queue movement for processing updates');
      } else {
        suggestions.push('Request is being processed immediately');
      }
      
      suggestions.push('Check for completion or error status updates');
      suggestions.push('Monitor token balance for payment processing');
    } else {
      suggestions.push('Monitor marketplace status for availability');
      suggestions.push('Check for retry opportunities');
      suggestions.push('Verify payment balance and provider availability');
    }

    return suggestions;
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(submissionResponse: any, queuePosition: number): string[] {
    const steps: string[] = [];

    if (submissionResponse.success) {
      steps.push('Wait for request processing to complete');
      
      if (queuePosition > 5) {
        steps.push('Consider using higher priority for faster processing');
      }
      
      steps.push('Monitor for response or timeout');
      steps.push('Review results when processing completes');
    } else {
      steps.push('Address the submission error');
      steps.push('Check marketplace and provider availability');
      steps.push('Retry with corrected parameters');
    }

    return steps;
  }

  /**
   * Get request status (for monitoring)
   */
  async getRequestStatus(requestId: string): Promise<{
    success: boolean;
    status?: string;
    provider_id?: string;
    progress?: number;
    estimated_completion?: number;
    error?: string;
  }> {
    try {
      const response = await this.marketplaceClient.getRequestStatus(requestId);
      
      return {
        success: response.success,
        status: response.status,
        provider_id: response.provider_id,
        progress: this.calculateProgress(response.status),
        estimated_completion: response.timeout_at,
        error: response.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgress(status?: string): number {
    switch (status) {
      case 'pending': return 10;
      case 'queued': return 25;
      case 'processing': return 50;
      case 'completed': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  }

  /**
   * Update marketplace client
   */
  updateClient(client: MarketplaceClient): void {
    this.marketplaceClient = client;
  }
}

/**
 * Create AI service request tool instance
 */
export function createAIServiceRequestTool(marketplaceClient: MarketplaceClient): AIServiceRequestTool {
  return new AIServiceRequestTool(marketplaceClient);
}