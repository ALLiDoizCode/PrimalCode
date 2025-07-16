/**
 * Marketplace Workflow Integration Tests
 * End-to-end tests for marketplace workflows
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MarketplaceClient } from '../../src/marketplace/marketplace-client';
import { 
  ai_service_request, 
  marketplace_status, 
  provider_analysis, 
  request_status,
  register_provider
} from '../../src/tools/inference-marketplace';

describe('Marketplace Workflow Integration', () => {
  let client: MarketplaceClient;
  const testProcessId = 'test-marketplace-process';
  const testEndpoint = 'http://localhost:8081';

  beforeEach(() => {
    // Use mock client for integration tests
    client = new MarketplaceClient(testProcessId, testEndpoint, 2000);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('End-to-End Workflow: AI Inference Request', () => {
    it('should complete full AI inference workflow', async () => {
      // Step 1: Check marketplace status
      const statusResult = await marketplace_status();
      expect(statusResult).toContain('Marketplace Status');
      
      // Step 2: Analyze available providers
      const providerResult = await provider_analysis();
      expect(providerResult).toContain('Provider Network Analysis');
      
      // Step 3: Submit AI inference request
      const requestResult = await ai_service_request(
        'monster_decision',
        { 
          monster_id: 'monster_123',
          current_state: 'hunting',
          environment: { weather: 'sunny', terrain: 'forest' },
          threats: []
        },
        '100'
      );
      
      expect(requestResult).toContain('AI Service Request Submitted Successfully');
      expect(requestResult).toContain('monster_decision');
      expect(requestResult).toContain('100 tokens');
      
      // Step 4: Check request status
      const requestId = 'req_123'; // Would be extracted from requestResult in real test
      const statusCheckResult = await request_status(requestId);
      
      expect(statusCheckResult).toContain('Request Status');
      expect(statusCheckResult).toContain(requestId);
    });

    it('should handle monster AI decision workflow', async () => {
      const contextData = {
        monster_id: 'monster_456',
        species: 'forest_wolf',
        stats: {
          health: 85,
          hunger: 60,
          energy: 70
        },
        environment: {
          weather: 'rainy',
          terrain: 'forest',
          nearby_resources: ['berries', 'small_game'],
          threats: ['player_camp']
        },
        recent_actions: ['hunt', 'rest'],
        personality: {
          aggression: 0.7,
          intelligence: 0.8,
          pack_tendency: 0.6
        }
      };

      const result = await ai_service_request(
        'monster_decision',
        contextData,
        '50'
      );

      expect(result).toContain('AI Service Request Submitted Successfully');
      expect(result).toContain('monster_decision');
      expect(result).toContain('50 tokens');
      expect(result).toContain('forest_wolf');
    });

    it('should handle analysis service workflow', async () => {
      const analysisData = {
        analysis_type: 'ecosystem_health',
        data: {
          monster_populations: {
            forest_wolf: 12,
            cave_bear: 3,
            mountain_eagle: 8
          },
          resource_availability: {
            food: 'abundant',
            water: 'moderate',
            shelter: 'scarce'
          },
          environmental_factors: {
            weather_pattern: 'seasonal_rain',
            temperature: 'cool',
            threats: ['human_expansion']
          }
        }
      };

      const result = await ai_service_request(
        'analysis',
        analysisData,
        '75'
      );

      expect(result).toContain('AI Service Request Submitted Successfully');
      expect(result).toContain('analysis');
      expect(result).toContain('75 tokens');
      expect(result).toContain('ecosystem_health');
    });
  });

  describe('End-to-End Workflow: Provider Registration', () => {
    it('should complete provider registration workflow', async () => {
      // Step 1: Register a new provider
      const registrationResult = await register_provider(
        'claude-monster-ai-v1',
        ['monster_decision', 'analysis', 'planning'],
        {
          'monster_decision': '50',
          'analysis': '75',
          'planning': '100'
        },
        'Claude-based AI provider for monster decision-making and ecosystem analysis'
      );

      expect(registrationResult).toContain('Provider Registration: Successful');
      expect(registrationResult).toContain('claude-monster-ai-v1');
      expect(registrationResult).toContain('monster_decision');
      expect(registrationResult).toContain('analysis');
      expect(registrationResult).toContain('planning');

      // Step 2: Verify provider appears in analysis
      const providerAnalysisResult = await provider_analysis('claude-monster-ai-v1');
      expect(providerAnalysisResult).toContain('Provider Analysis: claude-monster-ai-v1');
      expect(providerAnalysisResult).toContain('Claude-based AI provider');

      // Step 3: Test provider in network overview
      const networkResult = await provider_analysis();
      expect(networkResult).toContain('Provider Network Analysis');
      expect(networkResult).toContain('Provider Performance');
    });

    it('should handle specialized provider registration', async () => {
      const result = await register_provider(
        'emergency-response-ai',
        ['emergency', 'threat_assessment'],
        {
          'emergency': '200',
          'threat_assessment': '150'
        },
        'High-priority emergency response AI for critical situations'
      );

      expect(result).toContain('Provider Registration: Successful');
      expect(result).toContain('emergency-response-ai');
      expect(result).toContain('emergency');
      expect(result).toContain('threat_assessment');
      expect(result).toContain('200 tokens');
    });
  });

  describe('End-to-End Workflow: Payment Processing', () => {
    it('should simulate payment workflow', async () => {
      // This would test the full payment cycle:
      // 1. Submit request with payment
      // 2. Process Credit-Notice
      // 3. Route to provider
      // 4. Process completion
      // 5. Send Debit-Notice to provider
      
      const requestResult = await ai_service_request(
        'monster_decision',
        { monster_state: 'hunting' },
        '100'
      );
      
      expect(requestResult).toContain('Payment Amount: 100 tokens');
      
      // In a real implementation, this would trigger:
      // - Credit notice processing
      // - Provider payment distribution
      // - Transaction recording
      
      // Check that the payment workflow is mentioned
      expect(requestResult).toContain('submitted to the marketplace');
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle no providers available scenario', async () => {
      // Test what happens when no providers are available
      const statusResult = await marketplace_status();
      const requestResult = await ai_service_request(
        'rare_service_type',
        { data: 'test' },
        '100'
      );

      // Should still get responses even if no providers
      expect(statusResult).toContain('Marketplace Status');
      expect(requestResult).toContain('AI Service Request');
    });

    it('should handle request timeout scenario', async () => {
      // Test request with very short timeout
      const result = await ai_service_request(
        'monster_decision',
        { monster_state: 'hunting' },
        '100',
        1 // 1 second timeout
      );

      expect(result).toContain('AI Service Request');
      expect(result).toContain('Estimated Completion');
    });

    it('should handle invalid request scenarios', async () => {
      // Test various invalid scenarios
      const emptyContextResult = await ai_service_request(
        'monster_decision',
        {},
        '100'
      );

      const zeroPaymentResult = await ai_service_request(
        'monster_decision',
        { monster_state: 'hunting' },
        '0'
      );

      expect(emptyContextResult).toContain('AI Service Request');
      expect(zeroPaymentResult).toContain('AI Service Request');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        ai_service_request(
          'monster_decision',
          { monster_id: `monster_${i}`, action: 'hunt' },
          '100'
        )
      );

      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toContain('AI Service Request');
        expect(result).toContain(`monster_${index}`);
      });
    });

    it('should handle marketplace status checks under load', async () => {
      const statusChecks = Array.from({ length: 10 }, () => marketplace_status());
      
      const results = await Promise.all(statusChecks);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toContain('Marketplace Status');
        expect(result).toContain('System Health');
      });
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain consistent data across operations', async () => {
      // Check initial state
      const initialStatus = await marketplace_status();
      
      // Register provider
      await register_provider(
        'consistency-test-provider',
        ['monster_decision'],
        { 'monster_decision': '50' }
      );
      
      // Check updated state
      const updatedStatus = await marketplace_status();
      
      // Both should be valid marketplace status responses
      expect(initialStatus).toContain('Marketplace Status');
      expect(updatedStatus).toContain('Marketplace Status');
    });

    it('should validate request IDs and tracking', async () => {
      // Submit request
      const requestResult = await ai_service_request(
        'monster_decision',
        { monster_state: 'hunting' },
        '100'
      );
      
      expect(requestResult).toContain('Request ID: req_');
      
      // Check status with mock request ID
      const statusResult = await request_status('req_123');
      expect(statusResult).toContain('Request Status: req_123');
    });
  });

  describe('X-Metadata and Context Preservation', () => {
    it('should preserve context data through request lifecycle', async () => {
      const contextData = {
        monster_id: 'monster_context_test',
        environment: { terrain: 'mountain', weather: 'storm' },
        urgency: 'high',
        quality_requirements: 'premium'
      };

      const result = await ai_service_request(
        'monster_decision',
        contextData,
        '100'
      );

      expect(result).toContain('Context Data');
      expect(result).toContain('monster_context_test');
      expect(result).toContain('mountain');
      expect(result).toContain('storm');
    });

    it('should handle X-metadata forwarding', async () => {
      // Test that X-metadata is properly formatted and forwarded
      const result = await ai_service_request(
        'monster_decision',
        { monster_state: 'hunting' },
        '100'
      );

      expect(result).toContain('AI Service Request Submitted Successfully');
      // The actual X-metadata handling would be tested at the client level
    });
  });
});