// Provider Registry Integration Tests
//
// End-to-end integration tests for the provider registry system including
// registration, discovery, heartbeat, and performance reporting workflows.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { AOClient } from '../../src/ao/client';
import { ProviderRegistryClient, ProviderRegistrationData } from '../../src/marketplace/provider-registry';

describe('Provider Registry Integration Tests', () => {
  let aoClient: AOClient;
  let registryClient: ProviderRegistryClient;
  let registryProcessId: string;

  // Test providers data
  const testProviders: ProviderRegistrationData[] = [
    {
      provider_id: 'high-quality-ai-001',
      capabilities: ['text-generation', 'decision-making'],
      pricing: {
        'text-generation': '100',
        'decision-making': '200',
      },
      description: 'High-quality AI inference provider with fast response times',
      x_tags_supported: ['X-Context-Data', 'X-Quality-Tier', 'X-Timeout'],
      contact_info: 'contact@highquality.ai',
      provider_version: '1.2.0',
    },
    {
      provider_id: 'budget-ai-002',
      capabilities: ['text-generation', 'image-analysis'],
      pricing: {
        'text-generation': '50',
        'image-analysis': '150',
      },
      description: 'Budget-friendly AI inference provider',
      x_tags_supported: ['X-Context-Data', 'X-Cache-Enabled'],
      contact_info: 'support@budgetai.com',
      provider_version: '1.0.0',
    },
    {
      provider_id: 'specialized-ai-003',
      capabilities: ['code-generation', 'data-analysis'],
      pricing: {
        'code-generation': '300',
        'data-analysis': '250',
      },
      description: 'Specialized AI provider for technical tasks',
      x_tags_supported: ['X-Context-Data', 'X-Quality-Tier', 'X-Model-Preference'],
      contact_info: 'tech@specialized.ai',
      provider_version: '2.0.0',
    },
  ];

  beforeAll(async () => {
    // Initialize AO client (this would be configured for test environment)
    aoClient = new AOClient({
      gateway: process.env.TEST_AO_GATEWAY || 'http://localhost:8080',
      wallet: process.env.TEST_WALLET_PATH || './test-wallet.json',
    });

    // Deploy or get registry process ID
    registryProcessId = process.env.TEST_REGISTRY_PROCESS_ID || 'test-registry-process';
    
    registryClient = new ProviderRegistryClient(aoClient, registryProcessId);
  });

  afterAll(async () => {
    // Clean up test providers
    for (const provider of testProviders) {
      try {
        await registryClient.deregisterProvider(provider.provider_id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  beforeEach(async () => {
    // Clear cache before each test
    try {
      await registryClient.clearCache();
    } catch (error) {
      // Ignore if cache clear fails
    }
  });

  describe('Provider Registration Workflow', () => {
    it('should register multiple providers successfully', async () => {
      for (const providerData of testProviders) {
        const result = await registryClient.registerProvider(providerData);
        
        expect(result.success).toBe(true);
        expect(result.provider_id).toBe(providerData.provider_id);
        expect(result.message).toContain('successfully');
        expect(result.timestamp).toBeGreaterThan(0);
      }
    });

    it('should update existing provider registration', async () => {
      const originalProvider = testProviders[0];
      
      // First registration
      await registryClient.registerProvider(originalProvider);
      
      // Update with new capabilities
      const updatedProvider = {
        ...originalProvider,
        capabilities: ['text-generation', 'decision-making', 'sentiment-analysis'],
        pricing: {
          ...originalProvider.pricing,
          'sentiment-analysis': '75',
        },
        description: 'Updated: ' + originalProvider.description,
        provider_version: '1.3.0',
      };
      
      const result = await registryClient.registerProvider(updatedProvider);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('updated successfully');
      
      // Verify the update
      const providerInfo = await registryClient.getProviderInfo(originalProvider.provider_id);
      expect(providerInfo.provider?.capabilities).toContain('sentiment-analysis');
      expect(providerInfo.provider?.metadata.description).toContain('Updated:');
    });

    it('should handle invalid provider registration', async () => {
      const invalidProvider: ProviderRegistrationData = {
        provider_id: '',
        capabilities: [],
        pricing: {},
        description: '',
        x_tags_supported: [],
      };

      await expect(registryClient.registerProvider(invalidProvider))
        .rejects
        .toThrow(/registration failed/i);
    });
  });

  describe('Service Discovery Workflow', () => {
    beforeEach(async () => {
      // Ensure test providers are registered
      for (const providerData of testProviders) {
        await registryClient.registerProvider(providerData);
      }
    });

    it('should discover services by type', async () => {
      const result = await registryClient.discoverServices({
        service_type: 'text-generation',
      });

      expect(result.results).toHaveLength(2); // high-quality-ai-001 and budget-ai-002
      expect(result.total_found).toBe(2);
      expect(result.results[0].provider_id).toBeDefined();
      expect(result.results[0].score).toBeGreaterThan(0);
      expect(result.results[0].estimated_cost).toBeDefined();
    });

    it('should filter services by cost constraint', async () => {
      const result = await registryClient.discoverServices({
        service_type: 'text-generation',
        max_cost: '75',
      });

      expect(result.results).toHaveLength(1); // Only budget-ai-002
      expect(result.results[0].provider_id).toBe('budget-ai-002');
    });

    it('should filter services by x-tag requirements', async () => {
      const result = await registryClient.discoverServices({
        service_type: 'text-generation',
        x_tags_required: ['X-Quality-Tier'],
      });

      expect(result.results).toHaveLength(1); // Only high-quality-ai-001
      expect(result.results[0].provider_id).toBe('high-quality-ai-001');
    });

    it('should return no results for unsupported service type', async () => {
      const result = await registryClient.discoverServices({
        service_type: 'unsupported-service',
      });

      expect(result.results).toHaveLength(0);
      expect(result.total_found).toBe(0);
    });

    it('should get service recommendations', async () => {
      const result = await registryClient.getServiceRecommendations('text-generation', 3);

      expect(result.service_type).toBe('text-generation');
      expect(result.recommendations.length).toBeLessThanOrEqual(3);
      expect(result.limit).toBe(3);
      
      // Results should be sorted by score (highest first)
      if (result.recommendations.length > 1) {
        expect(result.recommendations[0].score).toBeGreaterThanOrEqual(result.recommendations[1].score);
      }
    });
  });

  describe('Heartbeat and Health Monitoring Workflow', () => {
    beforeEach(async () => {
      // Register test providers
      for (const providerData of testProviders) {
        await registryClient.registerProvider(providerData);
      }
    });

    it('should send heartbeat successfully', async () => {
      const heartbeatData = {
        provider_id: 'high-quality-ai-001',
        timestamp: Date.now() / 1000,
        status: 'active' as const,
        performance_metrics: {
          response_time_avg: 1.2,
          quality_score: 0.95,
          completion_rate: 0.98,
        },
      };

      const result = await registryClient.sendHeartbeat(heartbeatData);

      expect(result.message).toContain('successfully');
      expect(result.provider_id).toBe('high-quality-ai-001');
    });

    it('should check provider health', async () => {
      // Send heartbeat first
      await registryClient.sendHeartbeat({
        provider_id: 'high-quality-ai-001',
        status: 'active',
      });

      const result = await registryClient.checkProviderHealth('high-quality-ai-001');

      expect(result.health).toBeDefined();
      expect((result.health as any).provider_id).toBe('high-quality-ai-001');
      expect((result.health as any).status).toBe('active');
      expect((result.health as any).is_healthy).toBe(true);
    });

    it('should check health for all providers', async () => {
      // Send heartbeats for all providers
      for (const provider of testProviders) {
        await registryClient.sendHeartbeat({
          provider_id: provider.provider_id,
          status: 'active',
        });
      }

      const result = await registryClient.checkProviderHealth();

      expect(typeof result.health).toBe('object');
      const healthData = result.health as { [key: string]: any };
      
      expect(Object.keys(healthData)).toHaveLength(testProviders.length);
      
      for (const provider of testProviders) {
        expect(healthData[provider.provider_id]).toBeDefined();
        expect(healthData[provider.provider_id].provider_id).toBe(provider.provider_id);
      }
    });
  });

  describe('Performance Reporting Workflow', () => {
    beforeEach(async () => {
      // Register test providers
      for (const providerData of testProviders) {
        await registryClient.registerProvider(providerData);
      }
    });

    it('should report performance metrics', async () => {
      const result = await registryClient.reportPerformance(
        'high-quality-ai-001',
        1.5, // response_time
        0.92, // quality_score
        true  // success
      );

      expect(result.message).toContain('successfully');
      expect(result.provider_id).toBe('high-quality-ai-001');
    });

    it('should update provider ranking based on performance', async () => {
      // Report good performance for budget provider
      await registryClient.reportPerformance('budget-ai-002', 1.0, 0.98, true);
      
      // Report poor performance for high-quality provider
      await registryClient.reportPerformance('high-quality-ai-001', 5.0, 0.60, false);

      // Clear cache to ensure fresh ranking
      await registryClient.clearCache();

      // Check if ranking is updated
      const result = await registryClient.getServiceRecommendations('text-generation', 2);

      expect(result.recommendations).toHaveLength(2);
      
      // Budget provider should now rank higher due to better recent performance
      const budgetProviderRank = result.recommendations.findIndex(r => r.provider_id === 'budget-ai-002');
      const highQualityProviderRank = result.recommendations.findIndex(r => r.provider_id === 'high-quality-ai-001');
      
      expect(budgetProviderRank).toBeLessThan(highQualityProviderRank);
    });
  });

  describe('Registry Status and Management Workflow', () => {
    beforeEach(async () => {
      // Register test providers
      for (const providerData of testProviders) {
        await registryClient.registerProvider(providerData);
      }
    });

    it('should get comprehensive registry status', async () => {
      const result = await registryClient.getRegistryStatus();

      expect(result.status.total_providers).toBeGreaterThanOrEqual(testProviders.length);
      expect(result.status.active_providers).toBeGreaterThan(0);
      expect(result.status.capabilities).toBeInstanceOf(Array);
      expect(result.status.capabilities.length).toBeGreaterThan(0);
      
      // Check for expected capabilities
      const capabilityTypes = result.status.capabilities.map(c => c.service_type);
      expect(capabilityTypes).toContain('text-generation');
      expect(capabilityTypes).toContain('decision-making');
      expect(capabilityTypes).toContain('code-generation');
    });

    it('should clear cache successfully', async () => {
      // Trigger service discovery to populate cache
      await registryClient.discoverServices({ service_type: 'text-generation' });

      const result = await registryClient.clearCache();

      expect(result.message).toContain('successfully');
      expect(result.cleared_entries).toBeGreaterThanOrEqual(0);
    });

    it('should get provider information', async () => {
      const result = await registryClient.getProviderInfo('high-quality-ai-001');

      expect(result.provider).toBeDefined();
      expect(result.provider?.provider_id).toBe('high-quality-ai-001');
      expect(result.provider?.capabilities).toContain('text-generation');
      expect(result.provider?.status).toBe('active');
    });

    it('should get all providers information', async () => {
      const result = await registryClient.getProviderInfo();

      expect(result.providers).toBeDefined();
      expect(result.total_count).toBeGreaterThanOrEqual(testProviders.length);
      
      const providerIds = Object.keys(result.providers!);
      for (const provider of testProviders) {
        expect(providerIds).toContain(provider.provider_id);
      }
    });
  });

  describe('Provider Deregistration Workflow', () => {
    beforeEach(async () => {
      // Register test providers
      for (const providerData of testProviders) {
        await registryClient.registerProvider(providerData);
      }
    });

    it('should deregister provider successfully', async () => {
      const result = await registryClient.deregisterProvider('high-quality-ai-001');

      expect(result.success).toBe(true);
      expect(result.provider_id).toBe('high-quality-ai-001');
      expect(result.message).toContain('successfully');
    });

    it('should remove provider from service discovery', async () => {
      // Verify provider is discoverable
      let result = await registryClient.discoverServices({
        service_type: 'text-generation',
      });
      
      const initialCount = result.results.length;
      expect(result.results.some(r => r.provider_id === 'high-quality-ai-001')).toBe(true);

      // Deregister provider
      await registryClient.deregisterProvider('high-quality-ai-001');

      // Verify provider is no longer discoverable
      result = await registryClient.discoverServices({
        service_type: 'text-generation',
      });
      
      expect(result.results.length).toBe(initialCount - 1);
      expect(result.results.some(r => r.provider_id === 'high-quality-ai-001')).toBe(false);
    });

    it('should handle deregistration of non-existent provider', async () => {
      await expect(registryClient.deregisterProvider('non-existent-provider'))
        .rejects
        .toThrow(/provider not found/i);
    });
  });

  describe('Automated Heartbeat Workflow', () => {
    it('should start and stop automated heartbeat', async () => {
      // Register provider
      await registryClient.registerProvider(testProviders[0]);

      // Start automated heartbeat
      const heartbeatTimer = registryClient.startHeartbeat(
        testProviders[0].provider_id,
        1, // 1 second interval for testing
        async () => ({
          response_time_avg: 1.2,
          quality_score: 0.95,
        })
      );

      // Wait for heartbeat to be sent
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Check provider health
      const healthResult = await registryClient.checkProviderHealth(testProviders[0].provider_id);
      expect((healthResult.health as any).is_healthy).toBe(true);

      // Stop heartbeat
      registryClient.stopHeartbeat(heartbeatTimer);

      // Verify no more heartbeats are sent (by checking that the provider becomes inactive after timeout)
      // This would require a longer test or mocking the timeout mechanism
    });
  });
});