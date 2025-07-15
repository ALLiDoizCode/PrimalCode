import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HealthCheckResult, HealthCheckOptions } from '../types/health';
export declare class HealthCheckTool {
    private readonly startTime;
    private readonly serverName;
    private readonly version;
    private registeredTools;
    constructor(serverName?: string, version?: string);
    registerTool(toolName: string): void;
    checkHealth(options?: HealthCheckOptions): Promise<HealthCheckResult>;
    private performHealthCheck;
    getToolDefinition(): Tool;
    execute(args: Record<string, unknown>): Promise<string>;
    private formatHealthCheckResponse;
    private formatUptime;
}
//# sourceMappingURL=health-check.d.ts.map