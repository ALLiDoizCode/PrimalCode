#!/usr/bin/env node

/**
 * AO Process Deployment Script
 * Deploys monster processes to AO network
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
    aoProcessPath: path.join(__dirname, '../ao-processes'),
    deploymentOutputPath: path.join(__dirname, '../deployment-outputs'),
    maxRetries: 3,
    retryDelay: 2000,
    timeout: 30000
};

// Ensure deployment output directory exists
if (!fs.existsSync(CONFIG.deploymentOutputPath)) {
    fs.mkdirSync(CONFIG.deploymentOutputPath, { recursive: true });
}

// Logging utility
const log = {
    info: (message) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
    error: (message) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
    debug: (message) => console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`),
    warn: (message) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`)
};

// Deployment status tracking
class DeploymentTracker {
    constructor() {
        this.deployments = new Map();
        this.startTime = Date.now();
    }

    addDeployment(id, config) {
        this.deployments.set(id, {
            id,
            config,
            status: 'pending',
            startTime: Date.now(),
            attempts: 0,
            processId: null,
            error: null
        });
    }

    updateDeployment(id, updates) {
        const deployment = this.deployments.get(id);
        if (deployment) {
            Object.assign(deployment, updates);
        }
    }

    getDeploymentStatus() {
        const deployments = Array.from(this.deployments.values());
        return {
            total: deployments.length,
            pending: deployments.filter(d => d.status === 'pending').length,
            deploying: deployments.filter(d => d.status === 'deploying').length,
            success: deployments.filter(d => d.status === 'success').length,
            failed: deployments.filter(d => d.status === 'failed').length,
            deployments: deployments
        };
    }

    saveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            status: this.getDeploymentStatus()
        };

        const reportPath = path.join(CONFIG.deploymentOutputPath, `deployment-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log.info(`Deployment report saved to: ${reportPath}`);
        return report;
    }
}

// Mock AO deployment (replace with actual AO SDK calls)
class AODeploymentClient {
    constructor() {
        this.deployedProcesses = new Map();
    }

    async deployProcess(processConfig) {
        log.info(`Deploying process: ${processConfig.name}`);
        
        // Simulate deployment delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Generate mock process ID
        const processId = `ao-process-${crypto.randomBytes(16).toString('hex')}`;
        
        // Simulate potential deployment failure
        if (Math.random() < 0.1) { // 10% failure rate for testing
            throw new Error(`Deployment failed: Network timeout for ${processConfig.name}`);
        }
        
        // Store deployment info
        this.deployedProcesses.set(processId, {
            processId,
            name: processConfig.name,
            code: processConfig.code,
            deployedAt: new Date().toISOString(),
            status: 'active'
        });
        
        log.info(`Process deployed successfully: ${processConfig.name} -> ${processId}`);
        
        return {
            processId,
            status: 'success',
            deployedAt: new Date().toISOString(),
            estimatedGasCost: Math.floor(Math.random() * 100000) + 50000
        };
    }

    async getProcessStatus(processId) {
        const process = this.deployedProcesses.get(processId);
        if (!process) {
            throw new Error(`Process not found: ${processId}`);
        }
        
        return {
            processId,
            status: process.status,
            deployedAt: process.deployedAt,
            health: 'healthy',
            lastActivity: new Date().toISOString()
        };
    }

    async sendMessage(processId, message) {
        const process = this.deployedProcesses.get(processId);
        if (!process) {
            throw new Error(`Process not found: ${processId}`);
        }
        
        // Simulate message sending
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        return {
            messageId: `msg-${crypto.randomBytes(8).toString('hex')}`,
            status: 'sent',
            timestamp: new Date().toISOString()
        };
    }
}

// Process configuration loader
function loadProcessConfigurations() {
    const configs = [];
    
    // Load monster process
    const monsterProcessPath = path.join(CONFIG.aoProcessPath, 'monster-process.lua');
    if (fs.existsSync(monsterProcessPath)) {
        configs.push({
            name: 'monster-process',
            type: 'monster',
            filePath: monsterProcessPath,
            code: fs.readFileSync(monsterProcessPath, 'utf8'),
            dependencies: ['shared/utils.lua', 'shared/timer.lua', 'shared/persistence.lua', 'shared/message-handlers.lua']
        });
    }
    
    return configs;
}

// Load and bundle dependencies
function bundleProcessCode(config) {
    let bundledCode = '';
    
    // Add dependencies first
    if (config.dependencies) {
        for (const dep of config.dependencies) {
            const depPath = path.join(CONFIG.aoProcessPath, dep);
            if (fs.existsSync(depPath)) {
                const depCode = fs.readFileSync(depPath, 'utf8');
                bundledCode += `-- Dependency: ${dep}\n${depCode}\n\n`;
            } else {
                log.warn(`Dependency not found: ${dep}`);
            }
        }
    }
    
    // Add main process code
    bundledCode += `-- Main Process: ${config.name}\n${config.code}\n`;
    
    return bundledCode;
}

// Deploy a single process with retries
async function deployProcessWithRetries(aoClient, tracker, config) {
    const deploymentId = `${config.name}-${Date.now()}`;
    tracker.addDeployment(deploymentId, config);
    
    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        try {
            tracker.updateDeployment(deploymentId, {
                status: 'deploying',
                attempts: attempt
            });
            
            log.info(`Deploying ${config.name} (attempt ${attempt}/${CONFIG.maxRetries})`);
            
            // Bundle code with dependencies
            const bundledCode = bundleProcessCode(config);
            
            // Deploy to AO
            const result = await aoClient.deployProcess({
                name: config.name,
                code: bundledCode,
                type: config.type
            });
            
            tracker.updateDeployment(deploymentId, {
                status: 'success',
                processId: result.processId,
                deployedAt: result.deployedAt,
                gasCost: result.estimatedGasCost
            });
            
            log.info(`Successfully deployed ${config.name} -> ${result.processId}`);
            return result;
            
        } catch (error) {
            log.error(`Deployment attempt ${attempt} failed for ${config.name}: ${error.message}`);
            
            tracker.updateDeployment(deploymentId, {
                error: error.message,
                lastAttempt: Date.now()
            });
            
            if (attempt < CONFIG.maxRetries) {
                log.info(`Retrying in ${CONFIG.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
            } else {
                tracker.updateDeployment(deploymentId, {
                    status: 'failed'
                });
                throw error;
            }
        }
    }
}

// Initialize deployed processes
async function initializeDeployedProcesses(aoClient, deployedProcesses) {
    log.info('Initializing deployed processes...');
    
    for (const result of deployedProcesses) {
        try {
            // Send initialization message
            await aoClient.sendMessage(result.processId, {
                Action: 'Initialize',
                Data: JSON.stringify({
                    processType: result.config.type,
                    deployedAt: result.deployedAt
                })
            });
            
            log.info(`Initialized process: ${result.processId}`);
            
        } catch (error) {
            log.error(`Failed to initialize process ${result.processId}: ${error.message}`);
        }
    }
}

// Run health checks on deployed processes
async function runHealthChecks(aoClient, deployedProcesses) {
    log.info('Running health checks...');
    const healthResults = [];
    
    for (const result of deployedProcesses) {
        try {
            const status = await aoClient.getProcessStatus(result.processId);
            healthResults.push({
                processId: result.processId,
                name: result.config.name,
                status: status.status,
                health: status.health,
                lastActivity: status.lastActivity
            });
            
            log.info(`Health check passed: ${result.processId} - ${status.health}`);
            
        } catch (error) {
            log.error(`Health check failed for ${result.processId}: ${error.message}`);
            healthResults.push({
                processId: result.processId,
                name: result.config.name,
                status: 'error',
                health: 'unhealthy',
                error: error.message
            });
        }
    }
    
    return healthResults;
}

// Main deployment function
async function deployAOProcesses() {
    log.info('Starting AO process deployment...');
    
    const tracker = new DeploymentTracker();
    const aoClient = new AODeploymentClient();
    const deployedProcesses = [];
    
    try {
        // Load process configurations
        const configs = loadProcessConfigurations();
        log.info(`Found ${configs.length} process configurations`);
        
        if (configs.length === 0) {
            log.warn('No process configurations found. Nothing to deploy.');
            return;
        }
        
        // Deploy each process
        for (const config of configs) {
            try {
                const result = await deployProcessWithRetries(aoClient, tracker, config);
                deployedProcesses.push({ ...result, config });
            } catch (error) {
                log.error(`Failed to deploy ${config.name}: ${error.message}`);
            }
        }
        
        // Initialize deployed processes
        if (deployedProcesses.length > 0) {
            await initializeDeployedProcesses(aoClient, deployedProcesses);
            
            // Run health checks
            const healthResults = await runHealthChecks(aoClient, deployedProcesses);
            
            // Save deployment artifacts
            const artifacts = {
                deployedProcesses: deployedProcesses.map(p => ({
                    processId: p.processId,
                    name: p.config.name,
                    type: p.config.type,
                    deployedAt: p.deployedAt,
                    status: p.status
                })),
                healthChecks: healthResults
            };
            
            const artifactsPath = path.join(CONFIG.deploymentOutputPath, `deployment-artifacts-${Date.now()}.json`);
            fs.writeFileSync(artifactsPath, JSON.stringify(artifacts, null, 2));
            log.info(`Deployment artifacts saved to: ${artifactsPath}`);
        }
        
        // Generate final report
        const report = tracker.saveReport();
        
        log.info(`Deployment completed! Success: ${report.status.success}, Failed: ${report.status.failed}`);
        
        if (report.status.failed > 0) {
            process.exit(1);
        }
        
    } catch (error) {
        log.error(`Deployment failed: ${error.message}`);
        tracker.saveReport();
        process.exit(1);
    }
}

// CLI interface
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'deploy':
            deployAOProcesses();
            break;
        case 'status':
            // TODO: Implement status check
            log.info('Status check not yet implemented');
            break;
        case 'cleanup':
            // TODO: Implement cleanup
            log.info('Cleanup not yet implemented');
            break;
        default:
            console.log(`
Usage: node deploy-ao-processes.js <command>

Commands:
  deploy    Deploy all AO processes
  status    Check deployment status
  cleanup   Clean up deployed processes

Examples:
  node deploy-ao-processes.js deploy
  node deploy-ao-processes.js status
            `);
    }
}

module.exports = {
    deployAOProcesses,
    AODeploymentClient,
    DeploymentTracker
};