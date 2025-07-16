/**
 * Marketplace Client Unit Tests
 * Tests for TypeScript marketplace client functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MarketplaceClient, createMarketplaceClient } from '../../../src/marketplace/marketplace-client';

// Mock fetch for testing
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('MarketplaceClient', () => {
  let client: MarketplaceClient;
  const mockProcessId = 'test-marketplace-process';
  const mockEndpoint = 'http://localhost:8081';

  beforeEach(() => {
    client = createMarketplaceClient(mockProcessId, mockEndpoint, 1000);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with correct configuration', () => {
      expect(client.getProcessId()).toBe(mockProcessId);
    });

    it('should use default endpoint when not provided', () => {
      const defaultClient = createMarketplaceClient('test-process');
      expect(defaultClient.getProcessId()).toBe('test-process');
    });
  });

  describe('sendMessage', () => {
    it('should send message with correct format', async () => {
      const mockResponse = {
        success: true,
        data: { result: 'test' },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.sendMessage('Test-Action', { test: 'data' });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockEndpoint}/process/${mockProcessId}/message`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Test-Action')
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const result = await client.sendMessage('Test-Action');

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await client.sendMessage('Test-Action');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('submitInferenceRequest', () => {
    it('should submit inference request successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          request_id: 'req_123',
          provider_id: 'provider_1',
          queue_position: 0,
          estimated_completion: Date.now() + 30000,
          status: 'processing'
        },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.submitInferenceRequest({
        request_id: 'req_123',
        service_type: 'monster_decision',
        context_data: { monster_state: 'hunting' },
        payment_amount: '100'
      });

      expect(result.success).toBe(true);
      expect(result.request_id).toBe('req_123');
      expect(result.provider_id).toBe('provider_1');
      expect(result.queue_position).toBe(0);
      expect(result.status).toBe('processing');
    });

    it('should handle request submission failure', async () => {
      const mockResponse = {
        success: false,
        error: 'No providers available',
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.submitInferenceRequest({
        request_id: 'req_123',
        service_type: 'monster_decision',
        context_data: { monster_state: 'hunting' },
        payment_amount: '100'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No providers available');
    });

    it('should include X-metadata in request', async () => {
      const mockResponse = {
        success: true,
        data: { request_id: 'req_123', provider_id: 'provider_1' },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      await client.submitInferenceRequest({
        request_id: 'req_123',
        service_type: 'monster_decision',
        context_data: { monster_state: 'hunting' },
        payment_amount: '100',
        x_metadata: { 'X-Quality-Tier': 'premium' }
      });

      const callArgs = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      
      expect(requestBody.Tags).toEqual(expect.objectContaining({
        'X-Quality-Tier': 'premium'
      }));
    });
  });

  describe('registerProvider', () => {
    it('should register provider successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          provider_id: 'provider_1',
          status: 'registered'
        },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.registerProvider({
        provider_id: 'provider_1',
        capabilities: ['monster_decision', 'analysis'],
        pricing: { 'monster_decision': '50', 'analysis': '75' },
        description: 'Test provider'
      });

      expect(result.success).toBe(true);
      expect(result.provider_id).toBe('provider_1');
      expect(result.status).toBe('registered');
    });

    it('should handle provider registration failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Provider already exists',
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.registerProvider({
        provider_id: 'provider_1',
        capabilities: ['monster_decision'],
        pricing: { 'monster_decision': '50' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Provider already exists');
    });
  });

  describe('getRequestStatus', () => {
    it('should get request status successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          request_id: 'req_123',
          status: 'completed',
          provider_id: 'provider_1',
          created_at: Date.now() - 60000,
          timeout_at: Date.now() + 60000
        },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getRequestStatus('req_123');

      expect(result.success).toBe(true);
      expect(result.request_id).toBe('req_123');
      expect(result.status).toBe('completed');
      expect(result.provider_id).toBe('provider_1');
    });

    it('should handle request not found', async () => {
      const mockResponse = {
        success: false,
        error: 'Request not found',
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getRequestStatus('req_nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request not found');
    });
  });

  describe('healthCheck', () => {
    it('should perform health check successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
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
        },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.healthCheck();

      expect(result.success).toBe(true);
      expect(result.health?.is_healthy).toBe(true);
      expect(result.total_providers).toBe(5);
      expect(result.total_requests).toBe(42);
    });

    it('should handle health check failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Process unavailable',
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.healthCheck();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Process unavailable');
    });
  });

  describe('sendCreditNotice', () => {
    it('should send credit notice successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          transaction_id: 'txn_123',
          amount: '100'
        },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.sendCreditNotice({
        sender: 'player_1',
        quantity: '100',
        message: 'Payment for AI service',
        request_id: 'req_123',
        service_type: 'monster_decision'
      });

      expect(result.success).toBe(true);
      expect(result.transaction_id).toBe('txn_123');
      expect(result.amount).toBe('100');
    });
  });

  describe('sendDebitNotice', () => {
    it('should send debit notice successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          transaction_id: 'txn_124',
          amount: '100'
        },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.sendDebitNotice({
        recipient: 'provider_1',
        quantity: '100',
        message: 'Payment for AI service',
        request_id: 'req_123',
        service_type: 'monster_decision'
      });

      expect(result.success).toBe(true);
      expect(result.transaction_id).toBe('txn_124');
      expect(result.amount).toBe('100');
    });
  });

  describe('isProcessAvailable', () => {
    it('should return true when process is healthy', async () => {
      const mockResponse = {
        success: true,
        data: {
          health: { is_healthy: true },
          queue_stats: {},
          total_providers: 1,
          total_requests: 1,
          version: '1.0.0'
        },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.isProcessAvailable();

      expect(result).toBe(true);
    });

    it('should return false when process is unhealthy', async () => {
      const mockResponse = {
        success: true,
        data: {
          health: { is_healthy: false },
          queue_stats: {},
          total_providers: 1,
          total_requests: 1,
          version: '1.0.0'
        },
        timestamp: Date.now()
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.isProcessAvailable();

      expect(result).toBe(false);
    });

    it('should return false when health check fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await client.isProcessAvailable();

      expect(result).toBe(false);
    });
  });

  describe('configuration methods', () => {
    it('should update process ID', () => {
      const newProcessId = 'new-marketplace-process';
      client.setProcessId(newProcessId);
      expect(client.getProcessId()).toBe(newProcessId);
    });

    it('should update API endpoint', () => {
      const newEndpoint = 'http://localhost:9999';
      client.setApiEndpoint(newEndpoint);
      // No direct getter for endpoint, but it should be used in next request
      expect(client.getProcessId()).toBe(mockProcessId); // Verify client is still valid
    });

    it('should update timeout', () => {
      const newTimeout = 10000;
      client.setTimeout(newTimeout);
      // No direct getter for timeout, but it should be used in next request
      expect(client.getProcessId()).toBe(mockProcessId); // Verify client is still valid
    });
  });
});