/**
 * AO Message Schema Validation
 * Validates messages sent to and from AO processes
 */

import logger from '../utils/logger';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface MessageSchema {
    name: string;
    action: string;
    requiredFields?: string[];
    optionalFields?: string[];
    dataSchema?: any;
    responseSchema?: any;
}

// Monster state update schema
const MonsterStateUpdateSchema = {
    type: 'object',
    properties: {
        stats: {
            type: 'object',
            properties: {
                health: { type: 'number', minimum: 0, maximum: 100 },
                hunger: { type: 'number', minimum: 0, maximum: 100 },
                energy: { type: 'number', minimum: 0, maximum: 100 },
                position: {
                    type: 'object',
                    properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                        route: { type: 'string' }
                    }
                }
            }
        },
        ai_personality: {
            type: 'object',
            properties: {
                aggression: { type: 'number', minimum: 0, maximum: 1 },
                intelligence: { type: 'number', minimum: 0, maximum: 1 },
                pack_tendency: { type: 'number', minimum: 0, maximum: 1 }
            }
        },
        state: { type: 'string' },
        environmental_awareness: {
            type: 'object',
            properties: {
                detected_structures: { type: 'array' },
                resource_memory: { type: 'array' },
                weather_adaptation: { type: 'number', minimum: 0, maximum: 1 }
            }
        }
    }
};

// Environment change schema
const EnvironmentChangeSchema = {
    type: 'object',
    required: ['route_id', 'modification_type'],
    properties: {
        route_id: { type: 'string' },
        modification_type: { 
            type: 'string', 
            enum: ['food_placed', 'shelter_built', 'weather_changed', 'resource_depleted', 'terrain_modified'] 
        },
        location: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' }
            }
        },
        modification_details: { type: 'object' },
        player_id: { type: 'string' },
        weather_severity: { type: 'number', minimum: 0, maximum: 1 }
    }
};

// Monster communication schema
const MonsterCommunicationSchema = {
    type: 'object',
    required: ['message_type', 'sender_id'],
    properties: {
        message_type: { 
            type: 'string', 
            enum: ['territory_warning', 'pack_invitation', 'resource_sharing', 'threat_alert', 'mating_call', 'distress_signal'] 
        },
        sender_id: { type: 'string' },
        target_id: { type: 'string' },
        content: { type: 'string' },
        urgency: { type: 'number', minimum: 0, maximum: 1 },
        resource_location: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' }
            }
        },
        resource_type: { type: 'string' }
    }
};

// Monster decision context schema
const MonsterDecisionSchema = {
    type: 'object',
    required: ['monster_id', 'context'],
    properties: {
        monster_id: { type: 'string' },
        context: {
            type: 'object',
            properties: {
                current_state: { type: 'object' },
                environment: { type: 'object' },
                nearby_monsters: { type: 'array' },
                player_influences: { type: 'array' }
            }
        },
        decision_urgency: { type: 'number', minimum: 0, maximum: 1 }
    }
};

// Define message schemas
export const MESSAGE_SCHEMAS: Record<string, MessageSchema> = {
    'Get-State': {
        name: 'Get Monster State',
        action: 'Get-State',
        requiredFields: [],
        optionalFields: []
    },
    
    'Update-State': {
        name: 'Update Monster State',
        action: 'Update-State',
        requiredFields: [],
        optionalFields: ['stats', 'ai_personality', 'state', 'environmental_awareness'],
        dataSchema: MonsterStateUpdateSchema
    },
    
    'Environment-Change': {
        name: 'Environment Change Notification',
        action: 'Environment-Change',
        requiredFields: ['route_id', 'modification_type'],
        optionalFields: ['location', 'modification_details', 'player_id', 'weather_severity'],
        dataSchema: EnvironmentChangeSchema
    },
    
    'Monster-Communication': {
        name: 'Monster Communication',
        action: 'Monster-Communication',
        requiredFields: ['message_type', 'sender_id'],
        optionalFields: ['target_id', 'content', 'urgency', 'resource_location', 'resource_type'],
        dataSchema: MonsterCommunicationSchema
    },
    
    'Make-Decision': {
        name: 'Make Monster Decision',
        action: 'Make-Decision',
        requiredFields: ['monster_id', 'context'],
        optionalFields: ['decision_urgency'],
        dataSchema: MonsterDecisionSchema
    },
    
    'Health-Check': {
        name: 'Health Check',
        action: 'Health-Check',
        requiredFields: [],
        optionalFields: []
    },
    
    'Backup-Status': {
        name: 'Backup Status Query',
        action: 'Backup-Status',
        requiredFields: [],
        optionalFields: []
    },
    
    'Force-Backup': {
        name: 'Force Backup',
        action: 'Force-Backup',
        requiredFields: [],
        optionalFields: []
    },
    
    'Process-Recovery': {
        name: 'Process Recovery',
        action: 'Process-Recovery',
        requiredFields: [],
        optionalFields: []
    },
    
    'Timer-Process': {
        name: 'Timer Processing',
        action: 'Timer-Process',
        requiredFields: [],
        optionalFields: []
    }
};

/**
 * Validate message schema
 */
export function validateMessageSchema(action: string, data?: any): ValidationResult {
    const schema = MESSAGE_SCHEMAS[action];
    
    if (!schema) {
        return {
            valid: false,
            errors: [`Unknown action: ${action}`]
        };
    }
    
    const errors: string[] = [];
    
    // Validate required fields
    if (schema.requiredFields && schema.requiredFields.length > 0) {
        if (!data) {
            errors.push('Data is required for this action');
        } else {
            for (const field of schema.requiredFields) {
                if (!data.hasOwnProperty(field)) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
        }
    }
    
    // Validate data schema if provided
    if (schema.dataSchema && data) {
        const schemaErrors = validateDataSchema(data, schema.dataSchema);
        errors.push(...schemaErrors);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate data against JSON schema
 */
function validateDataSchema(data: any, schema: any): string[] {
    const errors: string[] = [];
    
    if (!data || !schema) {
        return errors;
    }
    
    // Type validation
    if (schema.type && typeof data !== schema.type) {
        errors.push(`Expected type ${schema.type}, got ${typeof data}`);
        return errors;
    }
    
    // Required fields validation
    if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
            if (!data.hasOwnProperty(field)) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }
    
    // Properties validation
    if (schema.properties) {
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
            if (data.hasOwnProperty(prop)) {
                const propErrors = validateDataSchema(data[prop], propSchema);
                errors.push(...propErrors.map(err => `${prop}.${err}`));
            }
        }
    }
    
    // Array validation
    if (schema.type === 'array' && Array.isArray(data)) {
        if (schema.items) {
            data.forEach((item, index) => {
                const itemErrors = validateDataSchema(item, schema.items);
                errors.push(...itemErrors.map(err => `[${index}].${err}`));
            });
        }
    }
    
    // Number validation
    if (schema.type === 'number' && typeof data === 'number') {
        if (schema.minimum !== undefined && data < schema.minimum) {
            errors.push(`Value ${data} is below minimum ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && data > schema.maximum) {
            errors.push(`Value ${data} is above maximum ${schema.maximum}`);
        }
    }
    
    // String enum validation
    if (schema.enum && Array.isArray(schema.enum)) {
        if (!schema.enum.includes(data)) {
            errors.push(`Value '${data}' is not in allowed values: ${schema.enum.join(', ')}`);
        }
    }
    
    return errors;
}

/**
 * Validate response schema
 */
export function validateResponseSchema(action: string, response: any): ValidationResult {
    const schema = MESSAGE_SCHEMAS[action];
    
    if (!schema) {
        return {
            valid: false,
            errors: [`Unknown action: ${action}`]
        };
    }
    
    const errors: string[] = [];
    
    // Basic response structure validation
    if (!response.messageId) {
        errors.push('Missing messageId in response');
    }
    
    if (!response.processId) {
        errors.push('Missing processId in response');
    }
    
    if (!response.timestamp) {
        errors.push('Missing timestamp in response');
    }
    
    // Validate response schema if provided
    if (schema.responseSchema && response.data) {
        const schemaErrors = validateDataSchema(response.data, schema.responseSchema);
        errors.push(...schemaErrors);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get schema for an action
 */
export function getMessageSchema(action: string): MessageSchema | undefined {
    return MESSAGE_SCHEMAS[action];
}

/**
 * Get all available actions
 */
export function getAllActions(): string[] {
    return Object.keys(MESSAGE_SCHEMAS);
}

/**
 * Create a validated message
 */
export function createValidatedMessage(action: string, data?: any): { action: string; data?: any } | null {
    const validation = validateMessageSchema(action, data);
    
    if (!validation.valid) {
        logger.error(`Invalid message schema for ${action}:`, validation.errors);
        return null;
    }
    
    return { action, data };
}

/**
 * Message builder utilities
 */
export class MessageBuilder {
    private action: string;
    private data: any = {};
    
    constructor(action: string) {
        this.action = action;
    }
    
    setData(key: string, value: any): MessageBuilder {
        this.data[key] = value;
        return this;
    }
    
    setStats(stats: any): MessageBuilder {
        this.data.stats = stats;
        return this;
    }
    
    setPersonality(personality: any): MessageBuilder {
        this.data.ai_personality = personality;
        return this;
    }
    
    setState(state: string): MessageBuilder {
        this.data.state = state;
        return this;
    }
    
    setEnvironmentChange(routeId: string, modificationType: string, location?: any): MessageBuilder {
        this.data.route_id = routeId;
        this.data.modification_type = modificationType;
        if (location) {
            this.data.location = location;
        }
        return this;
    }
    
    setCommunication(messageType: string, senderId: string, content?: string): MessageBuilder {
        this.data.message_type = messageType;
        this.data.sender_id = senderId;
        if (content) {
            this.data.content = content;
        }
        return this;
    }
    
    build(): { action: string; data?: any } | null {
        return createValidatedMessage(this.action, Object.keys(this.data).length > 0 ? this.data : undefined);
    }
}

/**
 * Helper function to create message builders
 */
export function messageBuilder(action: string): MessageBuilder {
    return new MessageBuilder(action);
}