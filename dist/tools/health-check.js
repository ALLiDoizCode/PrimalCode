"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckTool = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class HealthCheckTool {
    startTime;
    serverName;
    version;
    registeredTools = [];
    constructor(serverName = 'PrimalCode', version = '1.0.0') {
        this.startTime = Date.now();
        this.serverName = serverName;
        this.version = version;
    }
    registerTool(toolName) {
        if (!this.registeredTools.includes(toolName)) {
            this.registeredTools.push(toolName);
            logger_1.default.info(`Tool registered: ${toolName}`);
        }
    }
    async checkHealth(options = {}) {
        const { includeDetails = true, timeout = 5000 } = options;
        try {
            logger_1.default.info('Performing health check...');
            // Add timeout handling for health checks
            const healthCheckPromise = this.performHealthCheck(includeDetails);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Health check timeout')), timeout);
            });
            const result = await Promise.race([healthCheckPromise, timeoutPromise]);
            logger_1.default.info(`Health check completed: ${result.status}`);
            return result;
        }
        catch (error) {
            logger_1.default.error('Health check failed', error);
            return {
                status: 'unhealthy',
                timestamp: Date.now(),
                serverInfo: {
                    name: this.serverName,
                    version: this.version,
                    uptime: Date.now() - this.startTime,
                },
                tools: {
                    registered: 0,
                    available: [],
                },
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            };
        }
    }
    async performHealthCheck(includeDetails) {
        const result = {
            status: 'healthy',
            timestamp: Date.now(),
            serverInfo: {
                name: this.serverName,
                version: this.version,
                uptime: Date.now() - this.startTime,
            },
            tools: {
                registered: this.registeredTools.length,
                available: includeDetails ? [...this.registeredTools] : [],
            },
        };
        const errors = [];
        // Check if tools are registered
        if (this.registeredTools.length === 0) {
            errors.push('No tools registered');
        }
        // Check memory usage (basic check) - 500MB threshold for development
        if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) { // 500MB threshold
            errors.push('High memory usage detected');
        }
        // Check uptime (warn if running for more than 24 hours without restart)
        const uptimeHours = (Date.now() - this.startTime) / (1000 * 60 * 60);
        if (uptimeHours > 24) {
            errors.push('Long uptime detected - consider restart');
        }
        if (errors.length > 0) {
            result.status = 'unhealthy';
            result.errors = errors;
        }
        return result;
    }
    getToolDefinition() {
        return {
            name: 'health_check',
            description: 'Performs a comprehensive health check of the PrimalCode MCP server, validating server functionality, tool registration, and system status.',
            inputSchema: {
                type: 'object',
                properties: {
                    includeDetails: {
                        type: 'boolean',
                        description: 'Whether to include detailed information about available tools',
                        default: true,
                    },
                    timeout: {
                        type: 'number',
                        description: 'Timeout in milliseconds for the health check',
                        default: 5000,
                    },
                },
                additionalProperties: false,
            },
        };
    }
    async execute(args) {
        const options = {
            includeDetails: typeof args?.includeDetails === 'boolean' ? args.includeDetails : true,
            timeout: typeof args?.timeout === 'number' ? args.timeout : 5000,
        };
        const result = await this.checkHealth(options);
        return this.formatHealthCheckResponse(result);
    }
    formatHealthCheckResponse(result) {
        const statusEmoji = result.status === 'healthy' ? '✅' : '❌';
        const uptimeFormatted = this.formatUptime(result.serverInfo.uptime);
        let response = `${statusEmoji} **PrimalCode MCP Server Health Check**\n\n`;
        response += `**Status:** ${result.status.toUpperCase()}\n`;
        response += `**Server:** ${result.serverInfo.name} v${result.serverInfo.version}\n`;
        response += `**Uptime:** ${uptimeFormatted}\n`;
        response += `**Tools Registered:** ${result.tools.registered}\n`;
        if (result.tools.available.length > 0) {
            response += `**Available Tools:** ${result.tools.available.join(', ')}\n`;
        }
        if (result.errors && result.errors.length > 0) {
            response += `\n**Errors:**\n`;
            result.errors.forEach(error => {
                response += `- ${error}\n`;
            });
        }
        response += `\n**Timestamp:** ${new Date(result.timestamp).toISOString()}`;
        return response;
    }
    formatUptime(uptimeMs) {
        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }
}
exports.HealthCheckTool = HealthCheckTool;
//# sourceMappingURL=health-check.js.map