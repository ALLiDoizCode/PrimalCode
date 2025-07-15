#!/usr/bin/env node

/**
 * AO Process Testing Utilities
 * Provides testing and interaction utilities for deployed AO processes
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
    testOutputPath: path.join(__dirname, '../test-outputs'),
    defaultTimeout: 10000,
    messageDelay: 100,
    maxRetries: 3
};

// Ensure test output directory exists
if (!fs.existsSync(CONFIG.testOutputPath)) {
    fs.mkdirSync(CONFIG.testOutputPath, { recursive: true });
}

// Logging utility
const log = {
    info: (message) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
    error: (message) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
    debug: (message) => console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`),
    warn: (message) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),
    test: (message) => console.log(`[TEST] ${new Date().toISOString()} - ${message}`)
};

// Test result tracking
class TestRunner {
    constructor() {
        this.tests = [];
        this.startTime = Date.now();
    }

    addTest(name, description) {
        const test = {
            name,
            description,
            startTime: Date.now(),
            status: 'running',
            duration: 0,
            result: null,
            error: null
        };
        
        this.tests.push(test);
        log.test(`Starting test: ${name}`);
        return test;
    }

    completeTest(test, success, result, error) {
        test.status = success ? 'passed' : 'failed';
        test.duration = Date.now() - test.startTime;
        test.result = result;
        test.error = error;
        
        const status = success ? 'PASSED' : 'FAILED';
        log.test(`Test ${status}: ${test.name} (${test.duration}ms)`);
        
        if (error) {
            log.error(`Test error: ${error.message || error}`);
        }
    }

    getResults() {
        const results = {
            total: this.tests.length,
            passed: this.tests.filter(t => t.status === 'passed').length,
            failed: this.tests.filter(t => t.status === 'failed').length,
            duration: Date.now() - this.startTime,
            tests: this.tests
        };
        
        results.success = results.failed === 0;
        return results;
    }

    saveResults() {
        const results = this.getResults();
        const reportPath = path.join(CONFIG.testOutputPath, `test-results-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        log.info(`Test results saved to: ${reportPath}`);
        return results;
    }
}

// Mock AO process client for testing
class AOProcessClient {
    constructor(processId) {
        this.processId = processId;
        this.messageHistory = [];
        this.mockResponses = new Map();
    }

    // Set mock response for testing
    setMockResponse(action, response) {
        this.mockResponses.set(action, response);
    }

    async sendMessage(action, data = null, timeout = CONFIG.defaultTimeout) {
        const message = {
            id: `msg-${crypto.randomBytes(8).toString('hex')}`,
            action,
            data,
            timestamp: new Date().toISOString(),
            processId: this.processId
        };
        
        this.messageHistory.push(message);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, CONFIG.messageDelay));
        
        // Check for mock response
        const mockResponse = this.mockResponses.get(action);
        if (mockResponse) {
            return mockResponse;
        }
        
        // Generate default mock responses based on action
        return this.generateMockResponse(action, data);
    }

    generateMockResponse(action, data) {
        const baseResponse = {
            messageId: `resp-${crypto.randomBytes(8).toString('hex')}`,
            timestamp: new Date().toISOString(),
            processId: this.processId
        };

        switch (action) {
            case 'Get-State':
                return {
                    ...baseResponse,
                    action: 'State-Response',
                    data: {
                        monster_id: 'monster_test_123',
                        species: 'basic_monster',
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
                        state: 'exploring',
                        last_decision: {
                            action: 'explore',
                            reasoning: 'Normal exploration behavior'
                        }
                    }
                };

            case 'Update-State':
                return {
                    ...baseResponse,
                    action: 'Update-State-Response',
                    success: true,
                    error: null
                };

            case 'Environment-Change':
                return {
                    ...baseResponse,
                    action: 'Environment-Change-Response',
                    success: true,
                    error: null
                };

            case 'Monster-Communication':
                return {
                    ...baseResponse,
                    action: 'Monster-Communication-Response',
                    success: true,
                    error: null
                };

            case 'Health-Check':
                return {
                    ...baseResponse,
                    action: 'Health-Check-Response',
                    status: 'healthy',
                    uptime: '3600',
                    errorCount: '0',
                    restartCount: '0'
                };

            case 'Backup-Status':
                return {
                    ...baseResponse,
                    action: 'Backup-Status-Response',
                    data: {
                        backup_stats: {
                            total_backups: 5,
                            last_backup: Date.now() - 300000,
                            backup_history_count: 5,
                            error_count: 0
                        },
                        backup_history: []
                    }
                };

            default:
                return {
                    ...baseResponse,
                    action: `${action}-Response`,
                    success: false,
                    error: `Unknown action: ${action}`
                };
        }
    }

    getMessageHistory() {
        return this.messageHistory;
    }

    clearHistory() {
        this.messageHistory = [];
    }
}

// Test suites
class MonsterProcessTests {
    constructor(processClient) {
        this.client = processClient;
        this.runner = new TestRunner();
    }

    async runAllTests() {
        log.info('Running monster process tests...');

        await this.testStateQuery();
        await this.testStateUpdate();
        await this.testEnvironmentChange();
        await this.testMonsterCommunication();
        await this.testHealthCheck();
        await this.testBackupStatus();
        await this.testProcessRecovery();

        return this.runner.getResults();
    }

    async testStateQuery() {
        const test = this.runner.addTest('state-query', 'Test monster state query');
        
        try {
            const response = await this.client.sendMessage('Get-State');
            
            if (response.action === 'State-Response' && response.data) {
                const state = response.data;
                
                // Validate required fields
                const requiredFields = ['monster_id', 'species', 'stats', 'ai_personality', 'state'];
                const missingFields = requiredFields.filter(field => !state[field]);
                
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }
                
                // Validate stats structure
                if (!state.stats.health || !state.stats.hunger || !state.stats.energy) {
                    throw new Error('Invalid stats structure');
                }
                
                this.runner.completeTest(test, true, response);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            this.runner.completeTest(test, false, null, error);
        }
    }

    async testStateUpdate() {
        const test = this.runner.addTest('state-update', 'Test monster state update');
        
        try {
            const updateData = {
                stats: {
                    health: 90,
                    hunger: 30,
                    energy: 70
                },
                state: 'hunting'
            };
            
            const response = await this.client.sendMessage('Update-State', updateData);
            
            if (response.action === 'Update-State-Response' && response.success) {
                this.runner.completeTest(test, true, response);
            } else {
                throw new Error(`Update failed: ${response.error || 'Unknown error'}`);
            }
        } catch (error) {
            this.runner.completeTest(test, false, null, error);
        }
    }

    async testEnvironmentChange() {
        const test = this.runner.addTest('environment-change', 'Test environment change handling');
        
        try {
            const changeData = {
                route_id: 'forest_path',
                modification_type: 'food_placed',
                location: { x: 15, y: 25 }
            };
            
            const response = await this.client.sendMessage('Environment-Change', changeData);
            
            if (response.action === 'Environment-Change-Response' && response.success) {
                this.runner.completeTest(test, true, response);
            } else {
                throw new Error(`Environment change failed: ${response.error || 'Unknown error'}`);
            }
        } catch (error) {
            this.runner.completeTest(test, false, null, error);
        }
    }

    async testMonsterCommunication() {
        const test = this.runner.addTest('monster-communication', 'Test monster-to-monster communication');
        
        try {
            const commData = {
                message_type: 'territory_warning',
                sender_id: 'monster_other_456',
                content: 'This is my territory'
            };
            
            const response = await this.client.sendMessage('Monster-Communication', commData);
            
            if (response.action === 'Monster-Communication-Response' && response.success) {
                this.runner.completeTest(test, true, response);
            } else {
                throw new Error(`Communication failed: ${response.error || 'Unknown error'}`);
            }
        } catch (error) {
            this.runner.completeTest(test, false, null, error);
        }
    }

    async testHealthCheck() {
        const test = this.runner.addTest('health-check', 'Test process health monitoring');
        
        try {
            const response = await this.client.sendMessage('Health-Check');
            
            if (response.action === 'Health-Check-Response' && response.status) {
                const requiredFields = ['status', 'uptime', 'errorCount', 'restartCount'];
                const missingFields = requiredFields.filter(field => response[field] === undefined);
                
                if (missingFields.length > 0) {
                    throw new Error(`Missing health check fields: ${missingFields.join(', ')}`);
                }
                
                this.runner.completeTest(test, true, response);
            } else {
                throw new Error('Invalid health check response');
            }
        } catch (error) {
            this.runner.completeTest(test, false, null, error);
        }
    }

    async testBackupStatus() {
        const test = this.runner.addTest('backup-status', 'Test backup status query');
        
        try {
            const response = await this.client.sendMessage('Backup-Status');
            
            if (response.action === 'Backup-Status-Response' && response.data) {
                const data = response.data;
                
                if (!data.backup_stats) {
                    throw new Error('Missing backup_stats in response');
                }
                
                this.runner.completeTest(test, true, response);
            } else {
                throw new Error('Invalid backup status response');
            }
        } catch (error) {
            this.runner.completeTest(test, false, null, error);
        }
    }

    async testProcessRecovery() {
        const test = this.runner.addTest('process-recovery', 'Test process recovery functionality');
        
        try {
            const response = await this.client.sendMessage('Process-Recovery');
            
            if (response.action === 'Process-Recovery-Response' && response.success) {
                this.runner.completeTest(test, true, response);
            } else {
                throw new Error(`Recovery failed: ${response.error || 'Unknown error'}`);
            }
        } catch (error) {
            this.runner.completeTest(test, false, null, error);
        }
    }

    saveResults() {
        return this.runner.saveResults();
    }
}

// Interactive testing utilities
class InteractiveTestSession {
    constructor(processClient) {
        this.client = processClient;
        this.sessionLog = [];
    }

    async runInteractiveSession() {
        log.info('Starting interactive test session...');
        log.info('Available commands: state, update, environment, communicate, health, backup, quit');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const promptUser = () => {
            rl.question('Enter command: ', async (command) => {
                if (command.trim().toLowerCase() === 'quit') {
                    rl.close();
                    return;
                }
                
                try {
                    await this.executeCommand(command.trim());
                } catch (error) {
                    log.error(`Command failed: ${error.message}`);
                }
                
                promptUser();
            });
        };
        
        promptUser();
    }

    async executeCommand(command) {
        const parts = command.split(' ');
        const action = parts[0].toLowerCase();
        
        let response;
        
        switch (action) {
            case 'state':
                response = await this.client.sendMessage('Get-State');
                break;
            case 'health':
                response = await this.client.sendMessage('Health-Check');
                break;
            case 'backup':
                response = await this.client.sendMessage('Backup-Status');
                break;
            case 'update':
                response = await this.client.sendMessage('Update-State', {
                    stats: { health: 95, hunger: 20, energy: 85 }
                });
                break;
            case 'environment':
                response = await this.client.sendMessage('Environment-Change', {
                    route_id: 'test_route',
                    modification_type: 'food_placed',
                    location: { x: 10, y: 20 }
                });
                break;
            case 'communicate':
                response = await this.client.sendMessage('Monster-Communication', {
                    message_type: 'pack_invitation',
                    sender_id: 'test_monster',
                    content: 'Join our pack'
                });
                break;
            default:
                log.error(`Unknown command: ${action}`);
                return;
        }
        
        this.sessionLog.push({
            command,
            response,
            timestamp: new Date().toISOString()
        });
        
        log.info(`Response: ${JSON.stringify(response, null, 2)}`);
    }

    saveSession() {
        const sessionPath = path.join(CONFIG.testOutputPath, `interactive-session-${Date.now()}.json`);
        fs.writeFileSync(sessionPath, JSON.stringify(this.sessionLog, null, 2));
        log.info(`Session saved to: ${sessionPath}`);
    }
}

// Main testing function
async function runTests() {
    const processId = 'test-monster-process';
    const client = new AOProcessClient(processId);
    const tests = new MonsterProcessTests(client);
    
    try {
        const results = await tests.runAllTests();
        const savedResults = tests.saveResults();
        
        log.info(`Test Results: ${results.passed}/${results.total} passed`);
        
        if (results.failed > 0) {
            log.error(`${results.failed} tests failed`);
            process.exit(1);
        } else {
            log.info('All tests passed!');
        }
    } catch (error) {
        log.error(`Test execution failed: ${error.message}`);
        process.exit(1);
    }
}

// CLI interface
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'run':
            runTests();
            break;
        case 'interactive':
            const processId = process.argv[3] || 'test-monster-process';
            const client = new AOProcessClient(processId);
            const session = new InteractiveTestSession(client);
            session.runInteractiveSession();
            break;
        default:
            console.log(`
Usage: node test-ao-processes.js <command>

Commands:
  run                    Run automated test suite
  interactive [id]       Start interactive testing session

Examples:
  node test-ao-processes.js run
  node test-ao-processes.js interactive monster-process-123
            `);
    }
}

module.exports = {
    AOProcessClient,
    MonsterProcessTests,
    InteractiveTestSession,
    TestRunner
};