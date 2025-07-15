/**
 * AO Client Tests
 * Tests for the AO client functionality
 */

import { AOClient, AOClientConfig } from '../../../src/ao-integration/ao-client';
import logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('@permaweb/aoconnect', () => ({
    createDataItemSigner: jest.fn(() => 'mock-signer'),
    message: jest.fn(() => Promise.resolve('mock-message-id')),
    result: jest.fn(() => Promise.resolve({
        Messages: [{
            Data: JSON.stringify({ test: 'data' }),
            Tags: [
                { name: 'Success', value: 'true' },
                { name: 'Action', value: 'Test-Response' }
            ]
        }]
    }))
}));

describe('AOClient', () => {
    let client: AOClient;
    let config: AOClientConfig;

    beforeEach(() => {
        config = {
            processId: 'test-process-id',
            timeout: 5000,
            retryAttempts: 2,
            retryDelay: 500
        };
        
        client = new AOClient(config);
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Reset mocks to default behavior
        const { message, result } = require('@permaweb/aoconnect');
        message.mockResolvedValue('mock-message-id');
        result.mockResolvedValue({
            Messages: [{
                Data: JSON.stringify({ test: 'data' }),
                Tags: [
                    { name: 'Success', value: 'true' },
                    { name: 'Action', value: 'Test-Response' }
                ]
            }]
        });
    });

    describe('constructor', () => {
        it('should initialize with provided config', () => {
            expect(client).toBeDefined();
            expect(client).toBeInstanceOf(AOClient);
        });

        it('should use default values for missing config', () => {
            const minimalConfig: AOClientConfig = {
                processId: 'test-process'
            };
            
            const minimalClient = new AOClient(minimalConfig);
            expect(minimalClient).toBeDefined();
        });
    });

    describe('sendMessage', () => {
        it('should send message successfully', async () => {
            const aoMessage = {
                action: 'Get-State',
                data: { test: 'data' }
            };

            const response = await client.sendMessage(aoMessage);

            expect(response).toBeDefined();
            expect(response.messageId).toBeDefined();
            expect(response.processId).toBe(config.processId);
            expect(response.success).toBe(true);
        });

        it('should handle message validation errors', async () => {
            const invalidMessage = {
                action: 'Invalid-Action',
                data: { test: 'data' }
            };

            await expect(client.sendMessage(invalidMessage)).rejects.toThrow('Invalid message schema');
        });

        it('should retry on failure', async () => {
            const { message } = require('@permaweb/aoconnect');
            message.mockRejectedValueOnce(new Error('Network error'));
            message.mockResolvedValueOnce('success-message-id');

            const aoMessage = {
                action: 'Get-State'
            };

            const response = await client.sendMessage(aoMessage);
            expect(response).toBeDefined();
            expect(message).toHaveBeenCalledTimes(2);
        });
    });

    describe('queryState', () => {
        it('should query state successfully', async () => {
            const response = await client.queryState('Get-State');

            expect(response).toBeDefined();
            expect(response.data).toBeDefined();
            expect(response.success).toBe(true);
        });

        it('should validate query parameters', async () => {
            await expect(client.queryState('Invalid-Action')).rejects.toThrow('Invalid query schema');
        });
    });

    describe('convenience methods', () => {
        it('should get health status', async () => {
            const response = await client.getHealthStatus();
            expect(response).toBeDefined();
            expect(response.data).toBeDefined();
        });

        it('should get state', async () => {
            const response = await client.getState();
            expect(response).toBeDefined();
            expect(response.data).toBeDefined();
        });

        it('should update state', async () => {
            const stateUpdate = {
                stats: { health: 90, hunger: 20, energy: 80 }
            };

            const response = await client.updateState(stateUpdate);
            expect(response).toBeDefined();
        });

        it('should notify environment change', async () => {
            const changeData = {
                route_id: 'test-route',
                modification_type: 'food_placed',
                location: { x: 10, y: 20 }
            };

            const response = await client.notifyEnvironmentChange(changeData);
            expect(response).toBeDefined();
        });

        it('should send monster communication', async () => {
            const commData = {
                message_type: 'territory_warning',
                sender_id: 'test-monster',
                content: 'Warning message'
            };

            const response = await client.sendMonsterCommunication(commData);
            expect(response).toBeDefined();
        });

        it('should get backup status', async () => {
            const response = await client.getBackupStatus();
            expect(response).toBeDefined();
        });

        it('should force backup', async () => {
            const response = await client.forceBackup();
            expect(response).toBeDefined();
        });

        it('should trigger recovery', async () => {
            const response = await client.triggerRecovery();
            expect(response).toBeDefined();
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            const { message } = require('@permaweb/aoconnect');
            message.mockRejectedValue(new Error('Network error'));

            const aoMessage = {
                action: 'Get-State'
            };

            await expect(client.sendMessage(aoMessage)).rejects.toThrow('Failed to send message after 2 attempts');
        });

        it('should handle malformed responses', async () => {
            const { result } = require('@permaweb/aoconnect');
            // Mock the result to return malformed response
            result.mockResolvedValueOnce({ Messages: [] });

            const aoMessage = {
                action: 'Get-State'
            };

            const response = await client.sendMessage(aoMessage);
            expect(response.data).toBeUndefined();
            expect(response.success).toBeUndefined();
        });
    });

    describe('close', () => {
        it('should close client gracefully', async () => {
            await expect(client.close()).resolves.not.toThrow();
        });
    });
});

describe('createAOClient', () => {
    it('should create AOClient instance', () => {
        const config: AOClientConfig = {
            processId: 'test-process'
        };

        const client = require('../../../src/ao-integration/ao-client').createAOClient(config);
        expect(client).toBeInstanceOf(AOClient);
    });
});