export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy';
    timestamp: number;
    serverInfo: {
        name: string;
        version: string;
        uptime: number;
    };
    tools: {
        registered: number;
        available: string[];
    };
    errors?: string[];
}
export interface HealthCheckOptions {
    includeDetails?: boolean;
    timeout?: number;
}
//# sourceMappingURL=health.d.ts.map