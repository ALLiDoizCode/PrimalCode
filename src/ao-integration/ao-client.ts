/**
 * AO Client for Process Communication
 * Handles communication with deployed AO processes
 */

import { createDataItemSigner, message, result } from '@permaweb/aoconnect';
import logger from '../utils/logger';
import { MessageSchema, validateMessageSchema } from './message-schemas';

export interface AOClientConfig {
    processId: string;
    walletPath?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

export interface AOMessage {
    action: string;
    data?: any;
    tags?: Record<string, string>;
}

export interface AOResponse {
    messageId: string;
    processId: string;
    timestamp: string;
    data?: any;
    error?: string;
    success?: boolean;
}

export class AOClient {
    private config: AOClientConfig;
    private signer: any;

    constructor(config: AOClientConfig) {
        this.config = {
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
            ...config
        };
        
        this.initializeSigner();
    }

    private async initializeSigner() {
        try {
            // In a real implementation, this would load the wallet
            // For now, we'll use a mock signer
            this.signer = createDataItemSigner(this.createMockWallet());
            logger.debug('AO Client signer initialized');
        } catch (error) {
            logger.error('Failed to initialize AO signer:', error);
            throw new Error('Failed to initialize AO client');
        }
    }

    private createMockWallet() {
        // Mock wallet for development/testing
        return {
            jwk: {
                kty: 'RSA',
                n: 'mock_n_value',
                e: 'AQAB',
                d: 'mock_d_value',
                p: 'mock_p_value',
                q: 'mock_q_value',
                dp: 'mock_dp_value',
                dq: 'mock_dq_value',
                qi: 'mock_qi_value'
            }
        };
    }

    /**
     * Send a message to the AO process
     */
    async sendMessage(aoMessage: AOMessage): Promise<AOResponse> {
        const { action, data, tags = {} } = aoMessage;
        
        // Validate message schema
        const validationResult = validateMessageSchema(action, data);
        if (!validationResult.valid) {
            throw new Error(`Invalid message schema: ${validationResult.errors.join(', ')}`);
        }

        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < this.config.retryAttempts!) {
            try {
                logger.debug(`Sending message to process ${this.config.processId} (attempt ${attempt + 1})`);
                
                // Prepare message tags
                const messageTags = [
                    { name: 'Action', value: action },
                    ...Object.entries(tags).map(([name, value]) => ({ name, value }))
                ];

                // Send message to AO process
                const messageId = await message({
                    process: this.config.processId,
                    tags: messageTags,
                    data: data ? JSON.stringify(data) : undefined,
                    signer: this.signer
                });

                logger.debug(`Message sent with ID: ${messageId}`);

                // Get result
                const messageResult = await result({
                    message: messageId,
                    process: this.config.processId
                });

                // Parse response
                const response = this.parseAOResponse(messageId, messageResult);
                
                logger.debug(`Received response for message ${messageId}:`, response);
                
                return response;

            } catch (error) {
                lastError = error as Error;
                attempt++;
                
                logger.warn(`Message attempt ${attempt} failed:`, error);
                
                if (attempt < this.config.retryAttempts!) {
                    await this.delay(this.config.retryDelay!);
                }
            }
        }

        throw new Error(`Failed to send message after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
    }

    /**
     * Query process state (dry run)
     */
    async queryState(action: string, data?: any): Promise<AOResponse> {
        try {
            logger.debug(`Querying state from process ${this.config.processId}`);
            
            // Validate query schema
            const validationResult = validateMessageSchema(action, data);
            if (!validationResult.valid) {
                throw new Error(`Invalid query schema: ${validationResult.errors.join(', ')}`);
            }

            // For dry run queries, we'll use a mock response
            // In a real implementation, this would use AO's dryRun functionality
            const mockResponse = this.createMockResponse(action, data);
            
            logger.debug(`Query response:`, mockResponse);
            
            return mockResponse;

        } catch (error) {
            logger.error('Failed to query state:', error);
            throw error;
        }
    }

    /**
     * Get process health status
     */
    async getHealthStatus(): Promise<AOResponse> {
        return this.sendMessage({
            action: 'Health-Check'
        });
    }

    /**
     * Get process state
     */
    async getState(): Promise<AOResponse> {
        return this.sendMessage({
            action: 'Get-State'
        });
    }

    /**
     * Update process state
     */
    async updateState(stateUpdate: any): Promise<AOResponse> {
        return this.sendMessage({
            action: 'Update-State',
            data: stateUpdate
        });
    }

    /**
     * Send environment change notification
     */
    async notifyEnvironmentChange(changeData: any): Promise<AOResponse> {
        return this.sendMessage({
            action: 'Environment-Change',
            data: changeData
        });
    }

    /**
     * Send monster communication message
     */
    async sendMonsterCommunication(commData: any): Promise<AOResponse> {
        return this.sendMessage({
            action: 'Monster-Communication',
            data: commData
        });
    }

    /**
     * Get backup status
     */
    async getBackupStatus(): Promise<AOResponse> {
        return this.sendMessage({
            action: 'Backup-Status'
        });
    }

    /**
     * Force backup
     */
    async forceBackup(): Promise<AOResponse> {
        return this.sendMessage({
            action: 'Force-Backup'
        });
    }

    /**
     * Trigger process recovery
     */
    async triggerRecovery(): Promise<AOResponse> {
        return this.sendMessage({
            action: 'Process-Recovery'
        });
    }

    private parseAOResponse(messageId: string, messageResult: any): AOResponse {
        const response: AOResponse = {
            messageId,
            processId: this.config.processId,
            timestamp: new Date().toISOString()
        };

        if (messageResult.Messages && messageResult.Messages.length > 0) {
            const message = messageResult.Messages[0];
            
            // Parse response data
            if (message.Data) {
                try {
                    response.data = JSON.parse(message.Data);
                } catch (error) {
                    response.data = message.Data;
                }
            }

            // Parse response tags
            if (message.Tags) {
                const tags = message.Tags.reduce((acc: any, tag: any) => {
                    acc[tag.name] = tag.value;
                    return acc;
                }, {});

                response.success = tags.Success === 'true';
                response.error = tags.Error;
            }
        }

        return response;
    }

    private createMockResponse(action: string, data?: any): AOResponse {
        const response: AOResponse = {
            messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            processId: this.config.processId,
            timestamp: new Date().toISOString(),
            success: true
        };

        // Generate mock data based on action
        switch (action) {
            case 'Get-State':
                response.data = {
                    monster_id: 'monster_mock_123',
                    species: 'basic_monster',
                    created_at: new Date().toISOString(),
                    stats: {
                        health: 100,
                        hunger: 25,
                        energy: 80,
                        position: { x: 10, y: 20, route: 'forest_path' }
                    },
                    ai_personality: {
                        aggression: 0.6,
                        intelligence: 0.7,
                        pack_tendency: 0.4
                    },
                    environmental_awareness: {
                        detected_structures: [],
                        resource_memory: [],
                        weather_adaptation: 0.5
                    },
                    state: 'exploring',
                    last_decision: {
                        action: 'explore',
                        reasoning: 'Normal exploration behavior',
                        timestamp: Date.now()
                    }
                };
                break;

            case 'Health-Check':
                response.data = {
                    status: 'healthy',
                    uptime: '3600',
                    errorCount: '0',
                    restartCount: '0',
                    lastHeartbeat: Date.now().toString()
                };
                break;

            case 'Backup-Status':
                response.data = {
                    backup_stats: {
                        total_backups: 5,
                        last_backup: Date.now() - 300000,
                        backup_history_count: 5,
                        error_count: 0,
                        arweave_enabled: true
                    },
                    backup_history: []
                };
                break;

            default:
                response.data = { acknowledged: true };
        }

        return response;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Close the client and cleanup resources
     */
    async close(): Promise<void> {
        logger.debug('Closing AO client');
        // Cleanup resources if needed
    }
}

/**
 * Create an AO client instance
 */
export function createAOClient(config: AOClientConfig): AOClient {
    return new AOClient(config);
}