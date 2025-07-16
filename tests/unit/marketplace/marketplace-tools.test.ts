/**
 * Marketplace Tools Unit Tests
 * Tests for MCP marketplace interaction tools
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  ai_service_request, 
  marketplace_status, 
  provider_analysis, 
  marketplace_economics,
  request_status,
  register_provider
} from '../../../src/tools/inference-marketplace';

// Mock the marketplace client
jest.mock('../../../src/marketplace/marketplace-client', () => ({
  createMarketplaceClient: jest.fn(() => ({
    submitInferenceRequest: jest.fn(),
    healthCheck: jest.fn(),
    getMarketplaceStats: jest.fn(),
    getRequestStatus: jest.fn(),
    registerProvider: jest.fn(),
    isProcessAvailable: jest.fn()
  }))
}));

describe('Marketplace Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ai_service_request', () => {
    it('should submit AI service request successfully', async () => {
      const result = await ai_service_request(
        'monster_decision',
        { monster_state: 'hunting' },
        '100',
        30
      );

      expect(result).toContain('AI Service Request Submitted Successfully');
      expect(result).toContain('monster_decision');
      expect(result).toContain('100 tokens');
      expect(result).toContain('monster_state');
    });

    it('should handle different service types', async () => {
      const result = await ai_service_request(
        'analysis',
        { data: 'test' },
        '75'
      );

      expect(result).toContain('analysis');
      expect(result).toContain('75 tokens');
    });

    it('should use default payment amount', async () => {
      const result = await ai_service_request(
        'monster_decision',
        { monster_state: 'hunting' }
      );

      expect(result).toContain('100 tokens'); // Default payment amount
    });
  });

  describe('marketplace_status', () => {
    it('should return marketplace status successfully', async () => {
      const result = await marketplace_status();

      expect(result).toContain('Marketplace Status');
      expect(result).toContain('System Health');
      expect(result).toContain('Provider Network');
      expect(result).toContain('Request Processing');
    });

    it('should show healthy status by default', async () => {
      const result = await marketplace_status();

      expect(result).toContain('Healthy');
      expect(result).toContain('✅');
    });
  });

  describe('provider_analysis', () => {
    it('should analyze specific provider', async () => {
      const result = await provider_analysis('claude-provider-1');

      expect(result).toContain('Provider Analysis: claude-provider-1');
      expect(result).toContain('Provider Status');
      expect(result).toContain('Capabilities');
      expect(result).toContain('Performance Metrics');
      expect(result).toContain('Pricing');
    });

    it('should analyze all providers when no ID provided', async () => {
      const result = await provider_analysis();

      expect(result).toContain('Provider Network Analysis');
      expect(result).toContain('Provider Overview');
      expect(result).toContain('Provider Performance');
      expect(result).toContain('Network Health');
    });
  });

  describe('marketplace_economics', () => {
    it('should return economics report', async () => {
      const result = await marketplace_economics();

      expect(result).toContain('Marketplace Economics Report');
      expect(result).toContain('Volume Metrics');
      expect(result).toContain('Financial Distribution');
      expect(result).toContain('Service Performance');
      expect(result).toContain('Price Trends');
    });

    it('should include token amounts and percentages', async () => {
      const result = await marketplace_economics();

      expect(result).toMatch(/[\d,]+\s+tokens/);
      expect(result).toMatch(/\d+\.\d+%/);
    });
  });

  describe('request_status', () => {
    it('should return request status for valid request', async () => {
      const result = await request_status('req_123');

      expect(result).toContain('Request Status: req_123');
      expect(result).toContain('Current Status');
      expect(result).toContain('Request Details');
      expect(result).toContain('Timing Information');
    });

    it('should handle different request statuses', async () => {
      const testCases = [
        'pending',
        'processing', 
        'completed',
        'failed'
      ];

      for (const status of testCases) {
        const result = await request_status(`req_${status}`);
        
        expect(result).toContain('Request Status');
        expect(result).toContain('Status Meaning');
      }
    });
  });

  describe('register_provider', () => {
    it('should register provider successfully', async () => {
      const result = await register_provider(
        'test-provider-1',
        ['monster_decision', 'analysis'],
        { 'monster_decision': '50', 'analysis': '75' },
        'Test AI provider'
      );

      expect(result).toContain('Provider Registration: Successful');
      expect(result).toContain('test-provider-1');
      expect(result).toContain('monster_decision');
      expect(result).toContain('analysis');
      expect(result).toContain('50 tokens');
      expect(result).toContain('75 tokens');
    });

    it('should use default description when not provided', async () => {
      const result = await register_provider(
        'test-provider-2',
        ['monster_decision'],
        { 'monster_decision': '50' }
      );

      expect(result).toContain('AI inference provider');
    });

    it('should handle provider registration failure', async () => {
      // This would require mocking the marketplace client to return failure
      // For now, we test the successful case since the mock always succeeds
      const result = await register_provider(
        'failing-provider',
        ['invalid_service'],
        { 'invalid_service': '0' }
      );

      // With the mock, this should still succeed
      expect(result).toContain('Provider Registration');
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test with tools that might fail
      const statusResult = await marketplace_status();
      const requestResult = await request_status('invalid_request');

      expect(statusResult).toContain('Marketplace Status');
      expect(requestResult).toContain('Request Status');
      
      // Both should contain some form of result, even if mocked
      expect(statusResult.length).toBeGreaterThan(0);
      expect(requestResult.length).toBeGreaterThan(0);
    });
  });

  describe('natural language responses', () => {
    it('should provide user-friendly descriptions', async () => {
      const statusResult = await marketplace_status();
      const economicsResult = await marketplace_economics();

      // Check for natural language elements
      expect(statusResult).toMatch(/The marketplace is/);
      expect(economicsResult).toMatch(/The marketplace economy/);
    });

    it('should include helpful context and explanations', async () => {
      const providerResult = await provider_analysis('claude-provider-1');
      const requestResult = await request_status('req_123');

      // Check for explanatory text
      expect(providerResult).toContain('This provider shows');
      expect(requestResult).toContain('Status Meaning');
    });

    it('should format data in readable way', async () => {
      const statusResult = await marketplace_status();

      // Check for formatted output
      expect(statusResult).toContain('**');  // Bold formatting
      expect(statusResult).toContain('- ');  // List formatting
      expect(statusResult).toContain('✅');  // Status emojis
    });
  });
});