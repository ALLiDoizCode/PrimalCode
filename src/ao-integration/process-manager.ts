/**
 * AO Process Manager
 * Manages AO process lifecycle, monitoring, and communication
 */

import { EventEmitter } from 'events';
import { AOClient, AOClientConfig, AOResponse } from './ao-client';
import logger from '../utils/logger';
// AO Monster interface (simpler than the full Monster interface)
export interface AOMonster {
    id: string;
    species: string;
    stats: {
        health: number;
        hunger: number;
        energy: number;
        position: {
            x: number;
            y: number;
            route: string;
        };
    };
    ai_personality: {
        aggression: number;
        intelligence: number;
        pack_tendency: number;
    };
    environmental_awareness: {
        detected_structures: string[];
        resource_memory: any[];
        weather_adaptation: number;
    };
    influence_resistance: {
        learned_patterns: Record<string, any>;
        adaptation_history: any[];
    };
    state: string;
    last_decision: {
        action: string;
        reasoning: string;
    };
}

export interface ProcessConfig {
    processId: string;
    name: string;
    type: 'monster' | 'environment' | 'ai';
    autoRestart?: boolean;
    healthCheckInterval?: number;
    maxRestarts?: number;
    timeout?: number;
}

export interface ProcessStatus {
    processId: string;
    name: string;
    status: 'healthy' | 'unhealthy' | 'starting' | 'stopping' | 'error';
    uptime: number;
    errorCount: number;
    restartCount: number;
    lastHealthCheck: Date;
    lastActivity: Date;
    backupStatus?: any;
}

export interface ProcessMetrics {
    processId: string;
    messagesSent: number;
    messagesReceived: number;
    averageResponseTime: number;
    errorRate: number;
    lastMessageTime: Date;
    healthCheckFailures: number;
}

export class ProcessManager extends EventEmitter {
    private processes: Map<string, AOClient> = new Map();
    private processConfigs: Map<string, ProcessConfig> = new Map();
    private processStatuses: Map<string, ProcessStatus> = new Map();
    private processMetrics: Map<string, ProcessMetrics> = new Map();
    private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
    private isShuttingDown = false;

    constructor() {
        super();
        this.setupCleanupHandlers();
    }

    /**
     * Add a process to be managed
     */
    async addProcess(config: ProcessConfig): Promise<void> {
        const { processId, name, type } = config;
        
        try {
            logger.info(`Adding process ${name} (${processId})`);
            
            // Create AO client
            const aoConfig: AOClientConfig = {
                processId,
                timeout: config.timeout || 10000,
                retryAttempts: 3,
                retryDelay: 1000
            };
            
            const client = new AOClient(aoConfig);
            
            // Store process information
            this.processes.set(processId, client);
            this.processConfigs.set(processId, config);
            
            // Initialize process status
            this.processStatuses.set(processId, {
                processId,
                name,
                status: 'starting',
                uptime: 0,
                errorCount: 0,
                restartCount: 0,
                lastHealthCheck: new Date(),
                lastActivity: new Date()
            });
            
            // Initialize process metrics
            this.processMetrics.set(processId, {
                processId,
                messagesSent: 0,
                messagesReceived: 0,
                averageResponseTime: 0,
                errorRate: 0,
                lastMessageTime: new Date(),
                healthCheckFailures: 0
            });
            
            // Start health monitoring
            this.startHealthMonitoring(processId);
            
            // Perform initial health check
            await this.performHealthCheck(processId);
            
            this.emit('processAdded', { processId, name, type });
            
            logger.info(`Process ${name} added successfully`);
            
        } catch (error) {
            logger.error(`Failed to add process ${name}:`, error);
            this.emit('processError', { processId, name, error });
            throw error;
        }
    }

    /**
     * Remove a process from management
     */
    async removeProcess(processId: string): Promise<void> {
        const config = this.processConfigs.get(processId);
        if (!config) {
            throw new Error(`Process ${processId} not found`);
        }

        try {
            logger.info(`Removing process ${config.name} (${processId})`);
            
            // Stop health monitoring
            this.stopHealthMonitoring(processId);
            
            // Close client
            const client = this.processes.get(processId);
            if (client && typeof client.close === 'function') {
                try {
                    await client.close();
                } catch (error) {
                    logger.error('Error closing client:', error);
                }
            }
            
            // Clean up data structures
            this.processes.delete(processId);
            this.processConfigs.delete(processId);
            this.processStatuses.delete(processId);
            this.processMetrics.delete(processId);
            
            this.emit('processRemoved', { processId, name: config.name });
            
            logger.info(`Process ${config.name} removed successfully`);
            
        } catch (error) {
            logger.error(`Failed to remove process ${config.name}:`, error);
            this.emit('processError', { processId, name: config.name, error });
            throw error;
        }
    }

    /**
     * Get process status
     */
    getProcessStatus(processId: string): ProcessStatus | undefined {
        return this.processStatuses.get(processId);
    }

    /**
     * Get process metrics
     */
    getProcessMetrics(processId: string): ProcessMetrics | undefined {
        return this.processMetrics.get(processId);
    }

    /**
     * Get all process statuses
     */
    getAllProcessStatuses(): Map<string, ProcessStatus> {
        return new Map(this.processStatuses);
    }

    /**
     * Get all process metrics
     */
    getAllProcessMetrics(): Map<string, ProcessMetrics> {
        return new Map(this.processMetrics);
    }

    /**
     * Send message to a process
     */
    async sendMessage(processId: string, action: string, data?: any): Promise<AOResponse> {
        const client = this.processes.get(processId);
        if (!client) {
            throw new Error(`Process ${processId} not found`);
        }

        const startTime = Date.now();
        
        try {
            const response = await client.sendMessage({ action, data });
            
            // Update metrics
            this.updateMessageMetrics(processId, startTime, true);
            
            // Update last activity
            const status = this.processStatuses.get(processId);
            if (status) {
                status.lastActivity = new Date();
            }
            
            return response;
            
        } catch (error) {
            this.updateMessageMetrics(processId, startTime, false);
            throw error;
        }
    }

    /**
     * Query process state
     */
    async queryProcessState(processId: string): Promise<AOResponse> {
        const client = this.processes.get(processId);
        if (!client) {
            throw new Error(`Process ${processId} not found`);
        }

        return client.getState();
    }

    /**
     * Update process state
     */
    async updateProcessState(processId: string, stateUpdate: any): Promise<AOResponse> {
        const client = this.processes.get(processId);
        if (!client) {
            throw new Error(`Process ${processId} not found`);
        }

        return client.updateState(stateUpdate);
    }

    /**
     * Restart a process
     */
    async restartProcess(processId: string): Promise<void> {
        const config = this.processConfigs.get(processId);
        if (!config) {
            throw new Error(`Process ${processId} not found`);
        }

        try {
            logger.info(`Restarting process ${config.name} (${processId})`);
            
            // Update status
            const status = this.processStatuses.get(processId);
            if (status) {
                status.status = 'starting';
                status.restartCount++;
            }
            
            // Trigger recovery
            const client = this.processes.get(processId);
            if (client) {
                await client.triggerRecovery();
            }
            
            // Perform health check
            await this.performHealthCheck(processId);
            
            this.emit('processRestarted', { processId, name: config.name });
            
            logger.info(`Process ${config.name} restarted successfully`);
            
        } catch (error) {
            logger.error(`Failed to restart process ${config.name}:`, error);
            
            const status = this.processStatuses.get(processId);
            if (status) {
                status.status = 'error';
                status.errorCount++;
            }
            
            this.emit('processError', { processId, name: config.name, error });
            throw error;
        }
    }

    /**
     * Perform health check on a process
     */
    private async performHealthCheck(processId: string): Promise<void> {
        const client = this.processes.get(processId);
        const config = this.processConfigs.get(processId);
        const status = this.processStatuses.get(processId);
        const metrics = this.processMetrics.get(processId);

        if (!client || !config || !status || !metrics) {
            return;
        }

        try {
            const healthResponse = await client.getHealthStatus();
            
            // Update status based on health response
            if (healthResponse.success) {
                status.status = 'healthy';
                status.lastHealthCheck = new Date();
                status.uptime = parseInt(healthResponse.data?.uptime || '0', 10);
                status.errorCount = parseInt(healthResponse.data?.errorCount || '0', 10);
                status.restartCount = parseInt(healthResponse.data?.restartCount || '0', 10);
                
                // Get backup status if available
                try {
                    const backupResponse = await client.getBackupStatus();
                    if (backupResponse.success) {
                        status.backupStatus = backupResponse.data;
                    }
                } catch (backupError) {
                    // Backup status is optional
                    logger.debug(`Backup status check failed for ${config.name}:`, backupError);
                }
                
                // Reset health check failure count
                metrics.healthCheckFailures = 0;
                
            } else {
                status.status = 'unhealthy';
                metrics.healthCheckFailures++;
                
                // Auto-restart if configured
                if (config.autoRestart && metrics.healthCheckFailures >= 3) {
                    if (status.restartCount < (config.maxRestarts || 5)) {
                        logger.warn(`Process ${config.name} is unhealthy, attempting restart`);
                        await this.restartProcess(processId);
                    } else {
                        logger.error(`Process ${config.name} exceeded max restarts, marking as error`);
                        status.status = 'error';
                    }
                }
            }
            
        } catch (error) {
            logger.error(`Health check failed for ${config.name}:`, error);
            status.status = 'unhealthy';
            metrics.healthCheckFailures++;
        }
    }

    /**
     * Start health monitoring for a process
     */
    private startHealthMonitoring(processId: string): void {
        const config = this.processConfigs.get(processId);
        if (!config) {
            return;
        }

        const interval = config.healthCheckInterval || 30000; // Default 30 seconds
        
        const intervalId = setInterval(async () => {
            if (!this.isShuttingDown) {
                await this.performHealthCheck(processId);
            }
        }, interval);

        this.healthCheckIntervals.set(processId, intervalId);
    }

    /**
     * Stop health monitoring for a process
     */
    private stopHealthMonitoring(processId: string): void {
        const intervalId = this.healthCheckIntervals.get(processId);
        if (intervalId) {
            clearInterval(intervalId);
            this.healthCheckIntervals.delete(processId);
        }
    }

    /**
     * Update message metrics
     */
    private updateMessageMetrics(processId: string, startTime: number, success: boolean): void {
        const metrics = this.processMetrics.get(processId);
        if (!metrics) {
            return;
        }

        const responseTime = Date.now() - startTime;
        
        metrics.messagesSent++;
        metrics.lastMessageTime = new Date();
        
        if (success) {
            metrics.messagesReceived++;
        }
        
        // Update average response time
        metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2;
        
        // Update error rate
        metrics.errorRate = (metrics.messagesSent - metrics.messagesReceived) / metrics.messagesSent;
    }

    /**
     * Get system health summary
     */
    getSystemHealth(): {
        totalProcesses: number;
        healthyProcesses: number;
        unhealthyProcesses: number;
        errorProcesses: number;
        averageUptime: number;
        totalMessages: number;
        averageResponseTime: number;
        overallErrorRate: number;
    } {
        const statuses = Array.from(this.processStatuses.values());
        const metrics = Array.from(this.processMetrics.values());
        
        return {
            totalProcesses: statuses.length,
            healthyProcesses: statuses.filter(s => s.status === 'healthy').length,
            unhealthyProcesses: statuses.filter(s => s.status === 'unhealthy').length,
            errorProcesses: statuses.filter(s => s.status === 'error').length,
            averageUptime: statuses.reduce((sum, s) => sum + s.uptime, 0) / statuses.length || 0,
            totalMessages: metrics.reduce((sum, m) => sum + m.messagesSent, 0),
            averageResponseTime: metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length || 0,
            overallErrorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length || 0
        };
    }

    /**
     * Shutdown all processes gracefully
     */
    async shutdown(): Promise<void> {
        logger.info('Shutting down process manager...');
        
        this.isShuttingDown = true;
        
        // Stop all health monitoring
        for (const processId of this.healthCheckIntervals.keys()) {
            this.stopHealthMonitoring(processId);
        }
        
        // Close all clients
        const shutdownPromises = Array.from(this.processes.values()).map(async client => {
            try {
                if (client && typeof client.close === 'function') {
                    await client.close();
                }
            } catch (error) {
                logger.error('Error closing client:', error);
            }
        });
        
        await Promise.all(shutdownPromises);
        
        // Clear all data structures
        this.processes.clear();
        this.processConfigs.clear();
        this.processStatuses.clear();
        this.processMetrics.clear();
        this.healthCheckIntervals.clear();
        
        logger.info('Process manager shutdown complete');
    }

    /**
     * Setup cleanup handlers
     */
    private setupCleanupHandlers(): void {
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT, shutting down gracefully...');
            await this.shutdown();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM, shutting down gracefully...');
            await this.shutdown();
            process.exit(0);
        });

        process.on('uncaughtException', async (error) => {
            logger.error('Uncaught exception:', error);
            await this.shutdown();
            process.exit(1);
        });

        process.on('unhandledRejection', async (reason, promise) => {
            logger.error('Unhandled rejection at:', promise, 'reason:', reason);
            await this.shutdown();
            process.exit(1);
        });
    }
}

/**
 * Create a process manager instance
 */
export function createProcessManager(): ProcessManager {
    return new ProcessManager();
}

/**
 * MonsterRepository implementation using AO processes
 */
export class MonsterRepository {
    private processManager: ProcessManager;

    constructor(processManager: ProcessManager) {
        this.processManager = processManager;
    }

    /**
     * Find monster by ID
     */
    async findById(monsterId: string): Promise<AOMonster | null> {
        try {
            const processId = this.getProcessIdForMonster(monsterId);
            const response = await this.processManager.queryProcessState(processId);
            
            if (response.success && response.data) {
                return this.mapAODataToMonster(response.data);
            }
            
            return null;
            
        } catch (error) {
            logger.error(`Failed to find monster ${monsterId}:`, error);
            return null;
        }
    }

    /**
     * Update monster state
     */
    async updateState(monsterId: string, stateUpdate: Partial<AOMonster>): Promise<boolean> {
        try {
            const processId = this.getProcessIdForMonster(monsterId);
            const response = await this.processManager.updateProcessState(processId, stateUpdate);
            
            return response.success || false;
            
        } catch (error) {
            logger.error(`Failed to update monster ${monsterId}:`, error);
            return false;
        }
    }

    /**
     * Find monsters by route
     */
    async findByRoute(route: string): Promise<AOMonster[]> {
        try {
            // In a real implementation, this would query multiple processes
            // For now, we'll return a mock implementation
            const allStatuses = this.processManager.getAllProcessStatuses();
            const monsters: AOMonster[] = [];
            
            for (const [processId, status] of allStatuses) {
                try {
                    const response = await this.processManager.queryProcessState(processId);
                    if (response.success && response.data && response.data.stats?.position?.route === route) {
                        monsters.push(this.mapAODataToMonster(response.data));
                    }
                } catch (error) {
                    // Skip failed queries
                    logger.debug(`Failed to query process ${processId}:`, error);
                }
            }
            
            return monsters;
            
        } catch (error) {
            logger.error(`Failed to find monsters by route ${route}:`, error);
            return [];
        }
    }

    /**
     * Map AO process data to Monster interface
     */
    private mapAODataToMonster(aoData: any): AOMonster {
        return {
            id: aoData.monster_id,
            species: aoData.species,
            stats: {
                health: aoData.stats.health,
                hunger: aoData.stats.hunger,
                energy: aoData.stats.energy,
                position: {
                    x: aoData.stats.position.x,
                    y: aoData.stats.position.y,
                    route: aoData.stats.position.route
                }
            },
            ai_personality: {
                aggression: aoData.ai_personality.aggression,
                intelligence: aoData.ai_personality.intelligence,
                pack_tendency: aoData.ai_personality.pack_tendency
            },
            environmental_awareness: {
                detected_structures: aoData.environmental_awareness.detected_structures || [],
                resource_memory: aoData.environmental_awareness.resource_memory || [],
                weather_adaptation: aoData.environmental_awareness.weather_adaptation || 0.5
            },
            influence_resistance: {
                learned_patterns: aoData.influence_resistance.learned_patterns || {},
                adaptation_history: aoData.influence_resistance.adaptation_history || []
            },
            state: aoData.state,
            last_decision: aoData.last_decision
        };
    }

    /**
     * Get process ID for a monster (placeholder implementation)
     */
    private getProcessIdForMonster(monsterId: string): string {
        // In a real implementation, this would map monster IDs to process IDs
        // For now, we'll assume a 1:1 mapping
        return monsterId;
    }
}