import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { HealthCheckTool } from './tools/health-check';
import logger from './utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

class PrimalCodeMCPServer {
  private server: Server;
  private healthCheckTool: HealthCheckTool;

  constructor() {
    const serverName = process.env.SERVER_NAME || 'PrimalCode';
    const serverVersion = process.env.SERVER_VERSION || '1.0.0';
    
    this.server = new Server(
      {
        name: 'primalcode-mcp',
        version: serverVersion,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.healthCheckTool = new HealthCheckTool(serverName, serverVersion);
    this.setupHandlers();
    this.registerTools();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info('Received ListTools request');
      
      return {
        tools: [
          this.healthCheckTool.getToolDefinition(),
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      logger.info(`Received CallTool request: ${request.params.name}`);
      
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'health_check': {
            const result = await this.healthCheckTool.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          }
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private registerTools(): void {
    this.healthCheckTool.registerTool('health_check');
    logger.info('All tools registered successfully');
  }

  public async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('PrimalCode MCP Server started successfully');
    } catch (error) {
      logger.error('Failed to start PrimalCode MCP Server:', error);
      process.exit(1);
    }
  }
}

async function main(): Promise<void> {
  const server = new PrimalCodeMCPServer();
  await server.start();
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}