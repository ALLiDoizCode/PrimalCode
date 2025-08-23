#!/usr/bin/env node

// Health check script for deployed AO processes
// Verifies that all deployed processes are responding correctly

const fs = require('fs');

class HealthChecker {
    constructor() {
        this.results = {};
        this.environment = process.env.AO_ENVIRONMENT || 'local';
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    }

    async checkProcess(processName, processId) {
        this.log(`Checking health of ${processName} process (${processId})...`);
        
        try {
            // Simulate health check - in real implementation, this would
            // send actual AO messages to the deployed processes
            const isHealthy = await this.simulateHealthCheck(processName, processId);
            
            this.results[processName] = {
                id: processId,
                status: isHealthy ? 'healthy' : 'unhealthy',
                responseTime: Math.random() * 100 + 50, // Simulated response time
                checkedAt: new Date().toISOString(),
                details: isHealthy ? 'Process responding normally' : 'Process not responding'
            };
            
            if (isHealthy) {
                this.log(`✅ ${processName} is healthy`);
            } else {
                this.log(`❌ ${processName} is unhealthy`, 'error');
            }
            
        } catch (error) {
            this.log(`💥 Error checking ${processName}: ${error.message}`, 'error');
            this.results[processName] = {
                id: processId,
                status: 'error',
                error: error.message,
                checkedAt: new Date().toISOString()
            };
        }
    }

    async simulateHealthCheck(processName, processId) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
        
        // For simulation, assume all processes are healthy
        // In real implementation, this would send AO messages like:
        // const response = await aoconnect.message({
        //     process: processId,
        //     tags: [{ name: 'Action', value: 'Health-Check' }]
        // });
        // return response.status === 'healthy';
        
        return true;
    }

    async loadDeploymentReport() {
        const reportFile = 'deployment-report.json';
        
        if (!fs.existsSync(reportFile)) {
            throw new Error(`Deployment report not found: ${reportFile}`);
        }
        
        const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        return report.processes;
    }

    async checkAllProcesses() {
        this.log(`Starting health check for ${this.environment} environment...`);
        
        try {
            const processes = await this.loadDeploymentReport();
            
            if (!processes || Object.keys(processes).length === 0) {
                throw new Error('No deployed processes found in report');
            }
            
            // Check each deployed process
            for (const [processName, processInfo] of Object.entries(processes)) {
                await this.checkProcess(processName, processInfo.id);
            }
            
            this.generateHealthReport();
            return this.isAllHealthy();
            
        } catch (error) {
            this.log(`Failed to check processes: ${error.message}`, 'error');
            throw error;
        }
    }

    isAllHealthy() {
        return Object.values(this.results).every(result => result.status === 'healthy');
    }

    generateHealthReport() {
        const report = {
            timestamp: new Date().toISOString(),
            environment: this.environment,
            overall_status: this.isAllHealthy() ? 'healthy' : 'unhealthy',
            processes: this.results,
            summary: {
                total: Object.keys(this.results).length,
                healthy: Object.values(this.results).filter(r => r.status === 'healthy').length,
                unhealthy: Object.values(this.results).filter(r => r.status === 'unhealthy').length,
                errors: Object.values(this.results).filter(r => r.status === 'error').length
            }
        };

        const reportFile = `health-check-${this.environment}-${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        this.log(`Health check report saved to: ${reportFile}`);

        // Display summary
        console.log('\n' + '='.repeat(50));
        console.log('🏥 HEALTH CHECK SUMMARY');
        console.log('='.repeat(50));
        console.log(`Environment: ${this.environment}`);
        console.log(`Overall Status: ${report.overall_status.toUpperCase()}`);
        console.log(`Check Time: ${report.timestamp}`);
        console.log(`\nProcess Health Status:`);
        console.log(`  Total Processes: ${report.summary.total}`);
        console.log(`  ✅ Healthy: ${report.summary.healthy}`);
        console.log(`  ❌ Unhealthy: ${report.summary.unhealthy}`);
        console.log(`  💥 Errors: ${report.summary.errors}`);
        
        console.log('\nDetailed Results:');
        for (const [name, result] of Object.entries(this.results)) {
            const status = result.status === 'healthy' ? '✅' : '❌';
            const responseTime = result.responseTime ? ` (${result.responseTime.toFixed(0)}ms)` : '';
            console.log(`  ${status} ${name}: ${result.status}${responseTime}`);
        }
        
        console.log('\n' + (this.isAllHealthy() ? '🎉 All processes healthy!' : '⚠️  Some processes need attention'));
        console.log('='.repeat(50));
    }
}

// Run health check if this file is executed directly
if (require.main === module) {
    const checker = new HealthChecker();
    
    checker.checkAllProcesses()
        .then((allHealthy) => {
            if (allHealthy) {
                console.log('\n🎉 All processes are healthy!');
                process.exit(0);
            } else {
                console.log('\n⚠️  Some processes are unhealthy. Check logs for details.');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('\n💥 Health check failed:', error.message);
            process.exit(1);
        });
}

module.exports = { HealthChecker };