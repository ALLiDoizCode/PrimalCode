/**
 * Message Schemas Tests
 * Tests for AO message schema validation
 */

import { 
    validateMessageSchema, 
    validateResponseSchema, 
    getMessageSchema, 
    getAllActions,
    createValidatedMessage,
    MessageBuilder,
    messageBuilder,
    MESSAGE_SCHEMAS
} from '../../../src/ao-integration/message-schemas';

describe('Message Schema Validation', () => {
    describe('validateMessageSchema', () => {
        it('should validate Get-State action', () => {
            const result = validateMessageSchema('Get-State');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate Update-State action with valid data', () => {
            const data = {
                stats: {
                    health: 85,
                    hunger: 30,
                    energy: 70
                },
                state: 'hunting'
            };

            const result = validateMessageSchema('Update-State', data);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate Environment-Change action with required fields', () => {
            const data = {
                route_id: 'forest_path',
                modification_type: 'food_placed',
                location: { x: 10, y: 20 }
            };

            const result = validateMessageSchema('Environment-Change', data);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate Monster-Communication action', () => {
            const data = {
                message_type: 'territory_warning',
                sender_id: 'monster_123',
                content: 'This is my territory'
            };

            const result = validateMessageSchema('Monster-Communication', data);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject unknown actions', () => {
            const result = validateMessageSchema('Unknown-Action');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Unknown action: Unknown-Action');
        });

        it('should reject missing required fields', () => {
            const data = {
                // Missing route_id and modification_type
                location: { x: 10, y: 20 }
            };

            const result = validateMessageSchema('Environment-Change', data);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing required field: route_id');
            expect(result.errors).toContain('Missing required field: modification_type');
        });

        it('should reject invalid enum values', () => {
            const data = {
                route_id: 'forest_path',
                modification_type: 'invalid_type' // Invalid enum value
            };

            const result = validateMessageSchema('Environment-Change', data);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should reject invalid number ranges', () => {
            const data = {
                stats: {
                    health: 150, // Above maximum
                    hunger: -10, // Below minimum
                    energy: 'invalid' // Wrong type
                }
            };

            const result = validateMessageSchema('Update-State', data);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('validateResponseSchema', () => {
        it('should validate basic response structure', () => {
            const response = {
                messageId: 'test-message-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { test: 'data' }
            };

            const result = validateResponseSchema('Get-State', response);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject responses missing required fields', () => {
            const response = {
                // Missing messageId, processId, timestamp
                success: true,
                data: { test: 'data' }
            };

            const result = validateResponseSchema('Get-State', response);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing messageId in response');
            expect(result.errors).toContain('Missing processId in response');
            expect(result.errors).toContain('Missing timestamp in response');
        });

        it('should reject unknown actions', () => {
            const response = {
                messageId: 'test-message-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString()
            };

            const result = validateResponseSchema('Unknown-Action', response);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Unknown action: Unknown-Action');
        });
    });

    describe('getMessageSchema', () => {
        it('should return schema for valid action', () => {
            const schema = getMessageSchema('Get-State');
            expect(schema).toBeDefined();
            expect(schema?.action).toBe('Get-State');
            expect(schema?.name).toBe('Get Monster State');
        });

        it('should return undefined for invalid action', () => {
            const schema = getMessageSchema('Unknown-Action');
            expect(schema).toBeUndefined();
        });
    });

    describe('getAllActions', () => {
        it('should return all available actions', () => {
            const actions = getAllActions();
            expect(actions).toBeInstanceOf(Array);
            expect(actions.length).toBeGreaterThan(0);
            expect(actions).toContain('Get-State');
            expect(actions).toContain('Update-State');
            expect(actions).toContain('Environment-Change');
            expect(actions).toContain('Monster-Communication');
        });
    });

    describe('createValidatedMessage', () => {
        it('should create valid message', () => {
            const message = createValidatedMessage('Get-State');
            expect(message).toBeDefined();
            expect(message?.action).toBe('Get-State');
        });

        it('should create valid message with data', () => {
            const data = {
                stats: { health: 85, hunger: 30, energy: 70 }
            };

            const message = createValidatedMessage('Update-State', data);
            expect(message).toBeDefined();
            expect(message?.action).toBe('Update-State');
            expect(message?.data).toEqual(data);
        });

        it('should return null for invalid message', () => {
            const message = createValidatedMessage('Invalid-Action');
            expect(message).toBeNull();
        });
    });

    describe('MessageBuilder', () => {
        it('should build Get-State message', () => {
            const builder = new MessageBuilder('Get-State');
            const message = builder.build();

            expect(message).toBeDefined();
            expect(message?.action).toBe('Get-State');
        });

        it('should build Update-State message with stats', () => {
            const builder = new MessageBuilder('Update-State');
            const message = builder
                .setStats({ health: 85, hunger: 30, energy: 70 })
                .setState('hunting')
                .build();

            expect(message).toBeDefined();
            expect(message?.action).toBe('Update-State');
            expect(message?.data?.stats).toBeDefined();
            expect(message?.data?.state).toBe('hunting');
        });

        it('should build Environment-Change message', () => {
            const builder = new MessageBuilder('Environment-Change');
            const message = builder
                .setEnvironmentChange('forest_path', 'food_placed', { x: 10, y: 20 })
                .build();

            expect(message).toBeDefined();
            expect(message?.action).toBe('Environment-Change');
            expect(message?.data?.route_id).toBe('forest_path');
            expect(message?.data?.modification_type).toBe('food_placed');
            expect(message?.data?.location).toEqual({ x: 10, y: 20 });
        });

        it('should build Monster-Communication message', () => {
            const builder = new MessageBuilder('Monster-Communication');
            const message = builder
                .setCommunication('territory_warning', 'monster_123', 'This is my territory')
                .build();

            expect(message).toBeDefined();
            expect(message?.action).toBe('Monster-Communication');
            expect(message?.data?.message_type).toBe('territory_warning');
            expect(message?.data?.sender_id).toBe('monster_123');
            expect(message?.data?.content).toBe('This is my territory');
        });

        it('should return null for invalid message', () => {
            const builder = new MessageBuilder('Invalid-Action');
            const message = builder.build();

            expect(message).toBeNull();
        });
    });

    describe('messageBuilder helper', () => {
        it('should create MessageBuilder instance', () => {
            const builder = messageBuilder('Get-State');
            expect(builder).toBeInstanceOf(MessageBuilder);
        });

        it('should build message using fluent interface', () => {
            const message = messageBuilder('Update-State')
                .setStats({ health: 90, hunger: 20, energy: 80 })
                .setState('resting')
                .build();

            expect(message).toBeDefined();
            expect(message?.action).toBe('Update-State');
            expect(message?.data?.stats?.health).toBe(90);
            expect(message?.data?.state).toBe('resting');
        });
    });

    describe('MESSAGE_SCHEMAS constant', () => {
        it('should contain all expected schemas', () => {
            expect(MESSAGE_SCHEMAS).toBeDefined();
            expect(MESSAGE_SCHEMAS['Get-State']).toBeDefined();
            expect(MESSAGE_SCHEMAS['Update-State']).toBeDefined();
            expect(MESSAGE_SCHEMAS['Environment-Change']).toBeDefined();
            expect(MESSAGE_SCHEMAS['Monster-Communication']).toBeDefined();
            expect(MESSAGE_SCHEMAS['Health-Check']).toBeDefined();
            expect(MESSAGE_SCHEMAS['Backup-Status']).toBeDefined();
            expect(MESSAGE_SCHEMAS['Force-Backup']).toBeDefined();
            expect(MESSAGE_SCHEMAS['Process-Recovery']).toBeDefined();
        });

        it('should have correct schema structure', () => {
            const schema = MESSAGE_SCHEMAS['Get-State'];
            expect(schema.name).toBe('Get Monster State');
            expect(schema.action).toBe('Get-State');
            expect(schema.requiredFields).toEqual([]);
            expect(schema.optionalFields).toEqual([]);
        });
    });
});