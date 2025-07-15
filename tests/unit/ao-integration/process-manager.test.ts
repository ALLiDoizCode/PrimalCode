/**
 * Process Manager Tests
 * Tests for AO process lifecycle management
 */

import { EventEmitter } from 'events';
import { ProcessManager, ProcessConfig, MonsterRepository, AOMonster } from '../../../src/ao-integration/process-manager';
import { AOClient } from '../../../src/ao-integration/ao-client';

// Mock dependencies
jest.mock('../../../src/ao-integration/ao-client');
jest.mock('../../../src/utils/logger');

const MockedAOClient = AOClient as jest.MockedClass<typeof AOClient>;

describe('ProcessManager', () => {
    let processManager: ProcessManager;
    let mockAOClient: jest.Mocked<AOClient>;

    beforeEach(() => {
        processManager = new ProcessManager();
        mockAOClient = {
            sendMessage: jest.fn(),
            getState: jest.fn(),
            updateState: jest.fn(),
            getHealthStatus: jest.fn(),
            getBackupStatus: jest.fn(),
            triggerRecovery: jest.fn(),
            close: jest.fn()
        } as any;

        MockedAOClient.mockImplementation(() => mockAOClient);
    });

    afterEach(async () => {
        await processManager.shutdown();
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create ProcessManager instance', () => {
            expect(processManager).toBeDefined();
            expect(processManager).toBeInstanceOf(ProcessManager);
            expect(processManager).toBeInstanceOf(EventEmitter);
        });
    });

    describe('addProcess', () => {
        it('should add process successfully', async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster',
                autoRestart: true,
                healthCheckInterval: 30000
            };

            mockAOClient.getHealthStatus.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: {
                    status: 'healthy',
                    uptime: '3600',
                    errorCount: '0',
                    restartCount: '0'
                }
            });

            const processAddedPromise = new Promise((resolve) => {
                processManager.once('processAdded', resolve);
            });

            await processManager.addProcess(config);
            
            const processAddedEvent = await processAddedPromise;
            expect(processAddedEvent).toEqual({
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            });

            const status = processManager.getProcessStatus('test-process-id');
            expect(status).toBeDefined();
            expect(status?.name).toBe('Test Monster');
            expect(status?.status).toBe('healthy');
        });

        it('should handle process addition errors', async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            };

            mockAOClient.getHealthStatus.mockRejectedValue(new Error('Connection failed'));

            const processErrorPromise = new Promise((resolve) => {
                processManager.once('processError', resolve);
            });

            await expect(processManager.addProcess(config)).rejects.toThrow();
            
            const errorEvent = await processErrorPromise;
            expect(errorEvent).toEqual({
                processId: 'test-process-id',
                name: 'Test Monster',
                error: expect.any(Error)
            });
        });
    });

    describe('removeProcess', () => {
        beforeEach(async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            };

            mockAOClient.getHealthStatus.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { status: 'healthy' }
            });

            await processManager.addProcess(config);
        });

        it('should remove process successfully', async () => {
            const processRemovedPromise = new Promise((resolve) => {
                processManager.once('processRemoved', resolve);
            });

            await processManager.removeProcess('test-process-id');
            
            const processRemovedEvent = await processRemovedPromise;
            expect(processRemovedEvent).toEqual({
                processId: 'test-process-id',
                name: 'Test Monster'
            });

            const status = processManager.getProcessStatus('test-process-id');
            expect(status).toBeUndefined();
        });

        it('should handle non-existent process removal', async () => {
            await expect(processManager.removeProcess('non-existent-process')).rejects.toThrow('Process non-existent-process not found');
        });
    });

    describe('sendMessage', () => {
        beforeEach(async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            };

            mockAOClient.getHealthStatus.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { status: 'healthy' }
            });

            await processManager.addProcess(config);
        });

        it('should send message successfully', async () => {
            const mockResponse = {
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { result: 'success' }
            };

            mockAOClient.sendMessage.mockResolvedValue(mockResponse);

            const response = await processManager.sendMessage('test-process-id', 'Get-State');
            
            expect(response).toEqual(mockResponse);
            expect(mockAOClient.sendMessage).toHaveBeenCalledWith({
                action: 'Get-State',
                data: undefined
            });
        });

        it('should handle non-existent process', async () => {
            await expect(processManager.sendMessage('non-existent-process', 'Get-State')).rejects.toThrow('Process non-existent-process not found');
        });

        it('should update metrics on successful message', async () => {
            const mockResponse = {
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true
            };

            mockAOClient.sendMessage.mockResolvedValue(mockResponse);

            await processManager.sendMessage('test-process-id', 'Get-State');
            
            const metrics = processManager.getProcessMetrics('test-process-id');
            expect(metrics?.messagesSent).toBe(1);
            expect(metrics?.messagesReceived).toBe(1);
        });

        it('should update metrics on failed message', async () => {
            mockAOClient.sendMessage.mockRejectedValue(new Error('Message failed'));

            await expect(processManager.sendMessage('test-process-id', 'Get-State')).rejects.toThrow('Message failed');
            
            const metrics = processManager.getProcessMetrics('test-process-id');
            expect(metrics?.messagesSent).toBe(1);
            expect(metrics?.messagesReceived).toBe(0);
        });
    });

    describe('queryProcessState', () => {
        beforeEach(async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            };

            mockAOClient.getHealthStatus.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { status: 'healthy' }
            });

            await processManager.addProcess(config);
        });

        it('should query process state successfully', async () => {
            const mockState = {
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: {
                    monster_id: 'test-monster',
                    stats: { health: 100, hunger: 0, energy: 100 }
                }
            };

            mockAOClient.getState.mockResolvedValue(mockState);

            const response = await processManager.queryProcessState('test-process-id');
            
            expect(response).toEqual(mockState);
            expect(mockAOClient.getState).toHaveBeenCalled();
        });

        it('should handle non-existent process', async () => {
            await expect(processManager.queryProcessState('non-existent-process')).rejects.toThrow('Process non-existent-process not found');
        });
    });

    describe('updateProcessState', () => {
        beforeEach(async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            };

            mockAOClient.getHealthStatus.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { status: 'healthy' }
            });

            await processManager.addProcess(config);
        });

        it('should update process state successfully', async () => {
            const stateUpdate = {
                stats: { health: 90, hunger: 20, energy: 80 }
            };

            const mockResponse = {
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true
            };

            mockAOClient.updateState.mockResolvedValue(mockResponse);

            const response = await processManager.updateProcessState('test-process-id', stateUpdate);
            
            expect(response).toEqual(mockResponse);
            expect(mockAOClient.updateState).toHaveBeenCalledWith(stateUpdate);
        });

        it('should handle non-existent process', async () => {
            await expect(processManager.updateProcessState('non-existent-process', {})).rejects.toThrow('Process non-existent-process not found');
        });
    });

    describe('restartProcess', () => {
        beforeEach(async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            };

            mockAOClient.getHealthStatus.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { status: 'healthy' }
            });

            await processManager.addProcess(config);
        });

        it('should restart process successfully', async () => {
            mockAOClient.triggerRecovery.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true
            });

            const processRestartedPromise = new Promise((resolve) => {
                processManager.once('processRestarted', resolve);
            });

            await processManager.restartProcess('test-process-id');
            
            const processRestartedEvent = await processRestartedPromise;
            expect(processRestartedEvent).toEqual({
                processId: 'test-process-id',
                name: 'Test Monster'
            });

            const status = processManager.getProcessStatus('test-process-id');
            expect(status?.restartCount).toBe(1);
        });

        it('should handle restart failures', async () => {
            mockAOClient.triggerRecovery.mockRejectedValue(new Error('Recovery failed'));

            const processErrorPromise = new Promise((resolve) => {
                processManager.once('processError', resolve);
            });

            await expect(processManager.restartProcess('test-process-id')).rejects.toThrow('Recovery failed');
            
            const errorEvent = await processErrorPromise;
            expect(errorEvent).toEqual({
                processId: 'test-process-id',
                name: 'Test Monster',
                error: expect.any(Error)
            });
        });
    });

    describe('getAllProcessStatuses', () => {
        it('should return all process statuses', async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            };

            mockAOClient.getHealthStatus.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { status: 'healthy' }
            });

            await processManager.addProcess(config);

            const statuses = processManager.getAllProcessStatuses();
            expect(statuses).toBeInstanceOf(Map);
            expect(statuses.size).toBe(1);
            expect(statuses.get('test-process-id')).toBeDefined();
        });
    });

    describe('getSystemHealth', () => {
        it('should return system health summary', async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            };

            mockAOClient.getHealthStatus.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { status: 'healthy' }
            });

            await processManager.addProcess(config);

            const health = processManager.getSystemHealth();
            expect(health.totalProcesses).toBe(1);
            expect(health.healthyProcesses).toBe(1);
            expect(health.unhealthyProcesses).toBe(0);
            expect(health.errorProcesses).toBe(0);
        });
    });

    describe('shutdown', () => {
        it('should shutdown gracefully', async () => {
            const config: ProcessConfig = {
                processId: 'test-process-id',
                name: 'Test Monster',
                type: 'monster'
            };

            mockAOClient.getHealthStatus.mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-process-id',
                timestamp: new Date().toISOString(),
                success: true,
                data: { status: 'healthy' }
            });

            await processManager.addProcess(config);
            await processManager.shutdown();

            expect(mockAOClient.close).toHaveBeenCalled();
            
            const statuses = processManager.getAllProcessStatuses();
            expect(statuses.size).toBe(0);
        });
    });
});

describe('MonsterRepository', () => {
    let processManager: ProcessManager;
    let repository: MonsterRepository;
    let mockAOClient: jest.Mocked<AOClient>;

    beforeEach(() => {
        processManager = new ProcessManager();
        repository = new MonsterRepository(processManager);
        
        mockAOClient = {
            sendMessage: jest.fn(),
            getState: jest.fn(),
            updateState: jest.fn(),
            getHealthStatus: jest.fn(),
            getBackupStatus: jest.fn(),
            triggerRecovery: jest.fn(),
            close: jest.fn()
        } as any;

        MockedAOClient.mockImplementation(() => mockAOClient);
    });

    afterEach(async () => {
        await processManager.shutdown();
        jest.clearAllMocks();
    });

    describe('findById', () => {
        it('should find monster by ID', async () => {
            const mockMonsterData = {
                monster_id: 'test-monster-123',
                species: 'basic_monster',
                stats: {
                    health: 85,
                    hunger: 30,
                    energy: 70,
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
                influence_resistance: {
                    learned_patterns: {},
                    adaptation_history: []
                },
                state: 'exploring',
                last_decision: {
                    action: 'explore',
                    reasoning: 'Normal exploration'
                }
            };

            // Mock the queryProcessState method
            jest.spyOn(processManager, 'queryProcessState').mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-monster-123',
                timestamp: new Date().toISOString(),
                success: true,
                data: mockMonsterData
            });

            const monster = await repository.findById('test-monster-123');
            
            expect(monster).toBeDefined();
            expect(monster?.id).toBe('test-monster-123');
            expect(monster?.species).toBe('basic_monster');
            expect(monster?.stats.health).toBe(85);
            expect(monster?.stats.position.route).toBe('forest_path');
        });

        it('should return null for non-existent monster', async () => {
            jest.spyOn(processManager, 'queryProcessState').mockRejectedValue(new Error('Process not found'));

            const monster = await repository.findById('non-existent-monster');
            expect(monster).toBeNull();
        });

        it('should return null for unsuccessful response', async () => {
            jest.spyOn(processManager, 'queryProcessState').mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-monster-123',
                timestamp: new Date().toISOString(),
                success: false,
                error: 'Process error'
            });

            const monster = await repository.findById('test-monster-123');
            expect(monster).toBeNull();
        });
    });

    describe('updateState', () => {
        it('should update monster state successfully', async () => {
            const stateUpdate = {
                stats: { 
                    health: 90, 
                    hunger: 20, 
                    energy: 80,
                    position: { x: 10, y: 20, route: 'test-route' }
                }
            };

            jest.spyOn(processManager, 'updateProcessState').mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-monster-123',
                timestamp: new Date().toISOString(),
                success: true
            });

            const result = await repository.updateState('test-monster-123', stateUpdate);
            
            expect(result).toBe(true);
            expect(processManager.updateProcessState).toHaveBeenCalledWith('test-monster-123', stateUpdate);
        });

        it('should return false for failed update', async () => {
            jest.spyOn(processManager, 'updateProcessState').mockRejectedValue(new Error('Update failed'));

            const result = await repository.updateState('test-monster-123', {});
            expect(result).toBe(false);
        });
    });

    describe('findByRoute', () => {
        it('should find monsters by route', async () => {
            const mockMonsterData = {
                monster_id: 'test-monster-123',
                species: 'basic_monster',
                stats: {
                    health: 85,
                    hunger: 30,
                    energy: 70,
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
                influence_resistance: {
                    learned_patterns: {},
                    adaptation_history: []
                },
                state: 'exploring',
                last_decision: {
                    action: 'explore',
                    reasoning: 'Normal exploration'
                }
            };

            // Mock getAllProcessStatuses
            jest.spyOn(processManager, 'getAllProcessStatuses').mockReturnValue(new Map([
                ['test-monster-123', {
                    processId: 'test-monster-123',
                    name: 'Test Monster',
                    status: 'healthy',
                    uptime: 3600,
                    errorCount: 0,
                    restartCount: 0,
                    lastHealthCheck: new Date(),
                    lastActivity: new Date()
                }]
            ]));

            // Mock queryProcessState
            jest.spyOn(processManager, 'queryProcessState').mockResolvedValue({
                messageId: 'test-msg-id',
                processId: 'test-monster-123',
                timestamp: new Date().toISOString(),
                success: true,
                data: mockMonsterData
            });

            const monsters = await repository.findByRoute('forest_path');
            
            expect(monsters).toHaveLength(1);
            expect(monsters[0].id).toBe('test-monster-123');
            expect(monsters[0].stats.position.route).toBe('forest_path');
        });

        it('should return empty array for non-existent route', async () => {
            jest.spyOn(processManager, 'getAllProcessStatuses').mockReturnValue(new Map());

            const monsters = await repository.findByRoute('non-existent-route');
            expect(monsters).toHaveLength(0);
        });
    });
});