// Provider Registry TypeScript Client Unit Tests
//
// Tests for the provider registry client functionality including
// registration, discovery, heartbeat, and validation.

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AOClient } from '../../../src/ao/client';
import { ProviderRegistryClient, ProviderRegistrationData } from '../../../src/marketplace/provider-registry';

// Mock the AOClient
jest.mock('../../../src/ao/client');

describe('ProviderRegistryClient', () => {
  let mockAOClient: jest.Mocked<AOClient>;
  let registryClient: ProviderRegistryClient;
  const registryProcessId = 'test-registry-process-id';

  beforeEach(() => {
    mockAOClient = {
      sendMessage: jest.fn(),
    } as any;

    registryClient = new ProviderRegistryClient(mockAOClient, registryProcessId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerProvider', () => {
    it('should successfully register a new provider', async () => {
      const registrationData: ProviderRegistrationData = {
        provider_id: 'test-provider-001',
        capabilities: ['text-generation', 'decision-making'],
        pricing: {
          'text-generation': '100',
          'decision-making': '200',
        },
        description: 'Test AI inference provider',
        x_tags_supported: ['X-Context-Data', 'X-Quality-Tier'],
        contact_info: 'test@example.com',
        provider_version: '1.0.0',
      };

      const expectedResponse = {
        success: true,
        message: 'Provider registered successfully',
        provider_id: 'test-provider-001',
        timestamp: Date.now() / 1000,
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Registration-Success',
        Data: JSON.stringify(expectedResponse),
      } as any);

      const result = await registryClient.registerProvider(registrationData);

      expect(mockAOClient.sendMessage).toHaveBeenCalledWith({
        Target: registryProcessId,
        Action: 'Provider-Registration',
        Data: JSON.stringify(registrationData),
      });

      expect(result).toEqual(expectedResponse);
    });

    it('should handle registration errors', async () => {
      const registrationData: ProviderRegistrationData = {
        provider_id: 'invalid-provider',
        capabilities: [],
        pricing: {},
        description: '',
        x_tags_supported: [],
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Registration-Error',
        Data: JSON.stringify({
          error: 'At least one capability is required',
          provider_id: 'invalid-provider',
        }),
      } as any);

      await expect(registryClient.registerProvider(registrationData))
        .rejects
        .toThrow('Registration failed: At least one capability is required');
    });
  });

  describe('deregisterProvider', () => {
    it('should successfully deregister a provider', async () => {
      const providerId = 'test-provider-001';
      const expectedResponse = {
        success: true,
        message: 'Provider deregistered successfully',
        provider_id: providerId,
        timestamp: Date.now() / 1000,
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Deregistration-Success',
        Data: JSON.stringify(expectedResponse),
      } as any);

      const result = await registryClient.deregisterProvider(providerId);

      expect(mockAOClient.sendMessage).toHaveBeenCalledWith({
        Target: registryProcessId,
        Action: 'Provider-Deregistration',
        Data: JSON.stringify({ provider_id: providerId }),
      });

      expect(result).toEqual(expectedResponse);
    });

    it('should handle deregistration errors', async () => {
      const providerId = 'non-existent-provider';

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Deregistration-Error',
        Data: JSON.stringify({
          error: 'Provider not found',
          provider_id: providerId,
        }),
      } as any);

      await expect(registryClient.deregisterProvider(providerId))
        .rejects
        .toThrow('Deregistration failed: Provider not found');
    });
  });

  describe('discoverServices', () => {
    it('should successfully discover services', async () => {
      const query = {
        service_type: 'text-generation',
        quality_tier: 'standard',
        max_cost: '150',
        timeout: 30,
        x_tags_required: ['X-Context-Data'],
      };

      const expectedResponse = {
        query,
        results: [
          {
            provider_id: 'test-provider-001',
            score: 0.92,
            estimated_cost: '100',
            response_time_avg: 1.5,
            quality_score: 0.95,
          },
          {
            provider_id: 'test-provider-002',
            score: 0.88,
            estimated_cost: '120',
            response_time_avg: 2.0,
            quality_score: 0.90,
          },
        ],
        total_found: 2,
        timestamp: Date.now() / 1000,
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Discovery-Response',
        Data: JSON.stringify(expectedResponse),
      } as any);

      const result = await registryClient.discoverServices(query);

      expect(mockAOClient.sendMessage).toHaveBeenCalledWith({
        Target: registryProcessId,
        Action: 'Service-Discovery',
        Data: JSON.stringify(query),
      });

      expect(result).toEqual(expectedResponse);
    });

    it('should handle service discovery errors', async () => {
      const query = {
        service_type: '',
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Discovery-Error',
        Data: JSON.stringify({
          error: 'Service type is required',
          query,
        }),
      } as any);

      await expect(registryClient.discoverServices(query))
        .rejects
        .toThrow('Service discovery failed: Service type is required');
    });
  });

  describe('getServiceRecommendations', () => {
    it('should get service recommendations', async () => {
      const serviceType = 'text-generation';
      const limit = 3;

      const expectedResponse = {
        service_type: serviceType,
        recommendations: [
          {
            provider_id: 'test-provider-001',
            score: 0.95,
            estimated_cost: '100',
            response_time_avg: 1.2,
            quality_score: 0.98,
          },
        ],
        limit,
        timestamp: Date.now() / 1000,
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Recommendations-Response',
        Data: JSON.stringify(expectedResponse),
      } as any);

      const result = await registryClient.getServiceRecommendations(serviceType, limit);

      expect(mockAOClient.sendMessage).toHaveBeenCalledWith({
        Target: registryProcessId,
        Action: 'Service-Recommendations',
        Data: JSON.stringify({ service_type: serviceType, limit }),
      });

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('sendHeartbeat', () => {
    it('should send heartbeat successfully', async () => {
      const heartbeatData = {
        provider_id: 'test-provider-001',
        timestamp: Date.now() / 1000,
        status: 'active' as const,
        performance_metrics: {
          response_time_avg: 1.5,
          quality_score: 0.95,
        },
      };

      const expectedResponse = {
        message: 'Heartbeat updated successfully',
        provider_id: 'test-provider-001',
        timestamp: heartbeatData.timestamp,
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Heartbeat-Success',
        Data: JSON.stringify(expectedResponse),
      } as any);

      const result = await registryClient.sendHeartbeat(heartbeatData);

      expect(mockAOClient.sendMessage).toHaveBeenCalledWith({
        Target: registryProcessId,
        Action: 'Provider-Heartbeat',
        Data: JSON.stringify(heartbeatData),
      });

      expect(result).toEqual(expectedResponse);
    });

    it('should handle heartbeat errors', async () => {
      const heartbeatData = {
        provider_id: 'non-existent-provider',
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Heartbeat-Error',
        Data: JSON.stringify({
          error: 'Provider not found',
          provider_id: 'non-existent-provider',
        }),
      } as any);

      await expect(registryClient.sendHeartbeat(heartbeatData))
        .rejects
        .toThrow('Heartbeat failed: Provider not found');
    });
  });

  describe('reportPerformance', () => {
    it('should report performance successfully', async () => {
      const providerId = 'test-provider-001';
      const responseTime = 1.5;
      const qualityScore = 0.95;
      const success = true;

      const expectedResponse = {
        message: 'Performance reported successfully',
        provider_id: providerId,
        timestamp: Date.now() / 1000,
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Performance-Report-Success',
        Data: JSON.stringify(expectedResponse),
      } as any);

      const result = await registryClient.reportPerformance(
        providerId,
        responseTime,
        qualityScore,
        success
      );

      expect(mockAOClient.sendMessage).toHaveBeenCalledWith({
        Target: registryProcessId,
        Action: 'Performance-Report',
        Data: JSON.stringify({
          provider_id: providerId,
          response_time: responseTime,
          quality_score: qualityScore,
          success,
        }),
      });

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('checkProviderHealth', () => {
    it('should check health for specific provider', async () => {
      const providerId = 'test-provider-001';
      const expectedResponse = {
        health: {
          provider_id: providerId,
          status: 'active',
          last_heartbeat: Date.now() / 1000,
          time_since_heartbeat: 30,
          is_healthy: true,
          reputation: {
            response_time_avg: 1.5,
            quality_score: 0.95,
            completion_rate: 0.98,
            total_requests: 1000,
            last_updated: Date.now() / 1000,
          },
          capabilities: ['text-generation', 'decision-making'],
        },
        timestamp: Date.now() / 1000,
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Health-Check-Response',
        Data: JSON.stringify(expectedResponse),
      } as any);

      const result = await registryClient.checkProviderHealth(providerId);

      expect(mockAOClient.sendMessage).toHaveBeenCalledWith({
        Target: registryProcessId,
        Action: 'Provider-Health-Check',
        Data: JSON.stringify({ provider_id: providerId }),
      });

      expect(result).toEqual(expectedResponse);
    });

    it('should check health for all providers', async () => {
      const expectedResponse = {
        health: {
          'test-provider-001': {
            provider_id: 'test-provider-001',
            status: 'active',
            is_healthy: true,
          },
          'test-provider-002': {
            provider_id: 'test-provider-002',
            status: 'inactive',
            is_healthy: false,
          },
        },
        timestamp: Date.now() / 1000,
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Health-Check-Response',
        Data: JSON.stringify(expectedResponse),
      } as any);

      const result = await registryClient.checkProviderHealth();

      expect(mockAOClient.sendMessage).toHaveBeenCalledWith({
        Target: registryProcessId,
        Action: 'Provider-Health-Check',
        Data: JSON.stringify({}),
      });

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getRegistryStatus', () => {
    it('should get registry status', async () => {
      const expectedResponse = {
        status: {
          total_providers: 5,
          active_providers: 3,
          inactive_providers: 2,
          suspended_providers: 0,
          capabilities: [
            { service_type: 'text-generation', provider_count: 3 },
            { service_type: 'decision-making', provider_count: 2 },
          ],
          cache_entries: 10,
          heartbeat_config: {
            timeout_seconds: 300,
            cleanup_interval: 60,
          },
        },
        timestamp: Date.now() / 1000,
      };

      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Registry-Status-Response',
        Data: JSON.stringify(expectedResponse),
      } as any);

      const result = await registryClient.getRegistryStatus();

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('validateRegistrationData', () => {
    it('should validate valid registration data', () => {
      const validData: ProviderRegistrationData = {
        provider_id: 'test-provider-001',
        capabilities: ['text-generation', 'decision-making'],
        pricing: {
          'text-generation': '100',
          'decision-making': '200',
        },
        description: 'Test AI inference provider',
        x_tags_supported: ['X-Context-Data', 'X-Quality-Tier'],
        contact_info: 'test@example.com',
        provider_version: '1.0.0',
      };

      const result = ProviderRegistryClient.validateRegistrationData(validData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate invalid registration data', () => {
      const invalidData: ProviderRegistrationData = {
        provider_id: '', // Invalid: empty
        capabilities: [], // Invalid: empty
        pricing: {}, // Invalid: empty
        description: 'A'.repeat(501), // Invalid: too long
        x_tags_supported: [],
        contact_info: 'B'.repeat(201), // Invalid: too long
        provider_version: '1.0', // Invalid: not semantic versioning
      };

      const result = ProviderRegistryClient.validateRegistrationData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider ID is required');
      expect(result.errors).toContain('At least one capability is required');
      expect(result.errors).toContain('Pricing information is required');
      expect(result.errors).toContain('Description must be 500 characters or less');
      expect(result.errors).toContain('Contact info must be 200 characters or less');
      expect(result.errors).toContain('Provider version must be in semantic versioning format (e.g., 1.0.0)');
    });

    it('should validate provider ID format', () => {
      const invalidIdData: ProviderRegistrationData = {
        provider_id: 'invalid@provider!', // Invalid: contains special characters
        capabilities: ['text-generation'],
        pricing: { 'text-generation': '100' },
        description: 'Test provider',
        x_tags_supported: [],
      };

      const result = ProviderRegistryClient.validateRegistrationData(invalidIdData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider ID can only contain alphanumeric characters, underscores, and hyphens');
    });
  });

  describe('heartbeat management', () => {
    it('should start and stop heartbeat', async () => {
      const providerId = 'test-provider-001';
      const intervalSeconds = 1; // Short interval for testing

      // Mock successful heartbeat response
      mockAOClient.sendMessage.mockResolvedValue({
        Action: 'Heartbeat-Success',
        Data: JSON.stringify({
          message: 'Heartbeat updated successfully',
          provider_id: providerId,
          timestamp: Date.now() / 1000,
        }),
      } as any);

      const heartbeatTimer = registryClient.startHeartbeat(providerId, intervalSeconds);

      // Wait for at least one heartbeat to be sent
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(mockAOClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          Target: registryProcessId,
          Action: 'Provider-Heartbeat',
          Data: expect.stringContaining(providerId),
        })
      );

      registryClient.stopHeartbeat(heartbeatTimer);
    });
  });
});