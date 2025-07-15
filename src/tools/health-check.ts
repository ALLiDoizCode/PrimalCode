import { z } from 'zod';
import packageJson from '../../package.json';
import { cpus } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Health check input schema
const HealthCheckInput = z.object({
  detailed: z.boolean().optional().default(false).describe('Whether to include detailed system information')
}).partial();

// Health check output type
interface HealthCheckOutput {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  server: string;
  version: string;
  uptime: string;
  memory?: {
    used: string;
    total: string;
    percentage: string;
  };
  system?: {
    platform: string;
    nodeVersion: string;
    architecture: string;
    cpuUsage?: {
      percentage: string;
      cores: number;
    };
    diskSpace?: {
      total: string;
      used: string;
      available: string;
      percentage: string;
    };
    network?: {
      connectivity: boolean;
      latency?: string;
    };
  };
  errors?: {
    details: string;
    timestamp: string;
    component: string;
    recoverable: boolean;
  }[];
}

/**
 * Health check MCP tool for PrimalCode ecosystem management
 * Provides server health status and optional detailed system information
 */
export const healthCheck = {
  name: 'health_check',
  description: 'Check the health status of the PrimalCode MCP server with optional detailed system information',
  parameters: HealthCheckInput,
  execute: async (input: z.infer<typeof HealthCheckInput>): Promise<string> => {
    const errors: HealthCheckOutput['errors'] = [];

    try {

      let uptime: string;
      try {
        uptime = formatUptime(process.uptime());
      } catch (error) {
        uptime = 'unknown';
        errors.push({
          details: `Failed to get process uptime: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          component: 'process',
          recoverable: true
        });
      }

      const baseResponse: HealthCheckOutput = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'PrimalCode MCP Server',
        version: packageJson.version,
        uptime
      };

      // Include detailed information if requested
      if (input.detailed ?? false) {
        try {
          const memoryUsage = process.memoryUsage();
          
          baseResponse.memory = {
            used: formatBytes(memoryUsage.heapUsed),
            total: formatBytes(memoryUsage.heapTotal),
            percentage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%'
          };

          // Check for memory pressure
          const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
          if (memoryPercentage > 90) {
            errors.push({
              details: `High memory usage: ${memoryPercentage.toFixed(2)}%`,
              timestamp: new Date().toISOString(),
              component: 'memory',
              recoverable: true
            });
          }
        } catch (error) {
          errors.push({
            details: `Failed to get memory information: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            component: 'memory',
            recoverable: true
          });
        }

        try {
          baseResponse.system = {
            platform: process.platform,
            nodeVersion: process.version,
            architecture: process.arch
          };

          // Add CPU usage information
          try {
            const cpuUsage = await getCPUUsage();
            baseResponse.system.cpuUsage = cpuUsage;
          } catch (error) {
            errors.push({
              details: `Failed to get CPU usage: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date().toISOString(),
              component: 'cpu',
              recoverable: true
            });
          }

          // Add disk space information
          try {
            const diskSpace = await getDiskSpace();
            baseResponse.system.diskSpace = diskSpace;
          } catch (error) {
            errors.push({
              details: `Failed to get disk space: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date().toISOString(),
              component: 'disk',
              recoverable: true
            });
          }

          // Add network connectivity information
          try {
            const networkInfo = await getNetworkInfo();
            baseResponse.system.network = networkInfo;
          } catch (error) {
            errors.push({
              details: `Failed to get network info: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date().toISOString(),
              component: 'network',
              recoverable: true
            });
          }
        } catch (error) {
          errors.push({
            details: `Failed to get system information: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            component: 'system',
            recoverable: true
          });
        }
      }

      // Add errors to response if any were collected
      if (errors.length > 0) {
        baseResponse.errors = errors;
      }

      return JSON.stringify(baseResponse, null, 2);

    } catch (error) {
      
      let uptime: string;
      try {
        uptime = formatUptime(process.uptime());
      } catch (uptimeError) {
        uptime = 'unknown';
      }

      const errorResponse: HealthCheckOutput = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        server: 'PrimalCode MCP Server',
        version: packageJson.version,
        uptime,
        errors: [
          {
            details: `Critical health check failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            component: 'health-check',
            recoverable: false
          },
          ...errors
        ]
      };
      
      return JSON.stringify(errorResponse, null, 2);
    }
  }
};

/**
 * Format process uptime into human-readable string
 */
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

/**
 * Format bytes into human-readable string
 */
function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get CPU usage percentage
 */
async function getCPUUsage(): Promise<{ percentage: string; cores: number }> {
  const cpuInfo = cpus();
  const numCores = cpuInfo.length;
  
  // Simple CPU usage calculation based on load average
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const { stdout } = await execAsync('uptime');
      const loadMatch = stdout.match(/load averages?: ([0-9.]+)/);
      if (loadMatch) {
        const loadAvg = parseFloat(loadMatch[1]);
        const cpuPercentage = Math.min((loadAvg / numCores) * 100, 100);
        return {
          percentage: cpuPercentage.toFixed(1) + '%',
          cores: numCores
        };
      }
    }
  } catch (error) {
    // Fallback for unsupported platforms
  }
  
  return {
    percentage: 'N/A',
    cores: numCores
  };
}

/**
 * Get disk space information
 */
async function getDiskSpace(): Promise<{ total: string; used: string; available: string; percentage: string }> {
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.split('\n');
      const dataLine = lines.find(line => line.includes('/')) || lines[1];
      
      if (dataLine) {
        const parts = dataLine.split(/\s+/);
        const total = parts[1];
        const used = parts[2];
        const available = parts[3];
        const percentage = parts[4];
        
        return { total, used, available, percentage };
      }
    } else if (process.platform === 'win32') {
      await execAsync('wmic logicaldisk get size,freespace,caption');
      // Parse Windows disk info if needed
    }
  } catch (error) {
    // Fallback
  }
  
  return {
    total: 'N/A',
    used: 'N/A',
    available: 'N/A',
    percentage: 'N/A'
  };
}

/**
 * Test network connectivity
 */
async function getNetworkInfo(): Promise<{ connectivity: boolean; latency?: string }> {
  try {
    const start = Date.now();
    await execAsync('ping -c 1 -W 1000 8.8.8.8');
    const end = Date.now();
    
    const latency = `${end - start}ms`;
    return { connectivity: true, latency };
  } catch (error) {
    return { connectivity: false };
  }
}