#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { HealthCheckTool } from './tools/health-check';
import { EcosystemObserverTool } from './tools/ecosystem-observer';
import { MonsterAnalyzerTool } from './tools/monster-analyzer';
import { EnvironmentCheckerTool } from './tools/environment-checker';
import { PlaceFoodTool } from './tools/place-food';
import { ModifyWeatherTool } from './tools/modify-weather';
import { BuildShelterTool } from './tools/build-shelter';
import { MockMonsterSystem } from './ecosystem/mock-monster-system';
import { MockEnvironmentState } from './ecosystem/mock-environment-state';
import logger from './utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

class PrimalCodeMCPServer {
  private server: Server;
  private healthCheckTool: HealthCheckTool;
  private ecosystemObserverTool: EcosystemObserverTool;
  private monsterAnalyzerTool: MonsterAnalyzerTool;
  private environmentCheckerTool: EnvironmentCheckerTool;
  private placeFoodTool: PlaceFoodTool;
  private modifyWeatherTool: ModifyWeatherTool;
  private buildShelterTool: BuildShelterTool;
  private monsterSystem: MockMonsterSystem;
  private environmentState: MockEnvironmentState;

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

    // Initialize mock systems
    this.monsterSystem = new MockMonsterSystem(logger);
    this.environmentState = new MockEnvironmentState(logger);
    
    // Initialize tools
    this.healthCheckTool = new HealthCheckTool(serverName, serverVersion);
    this.ecosystemObserverTool = new EcosystemObserverTool(this.monsterSystem, this.environmentState);
    this.monsterAnalyzerTool = new MonsterAnalyzerTool(this.monsterSystem);
    this.environmentCheckerTool = new EnvironmentCheckerTool(this.environmentState, this.monsterSystem);
    this.placeFoodTool = new PlaceFoodTool(this.monsterSystem, this.environmentState);
    this.modifyWeatherTool = new ModifyWeatherTool(this.monsterSystem, this.environmentState);
    this.buildShelterTool = new BuildShelterTool(this.monsterSystem, this.environmentState);
    
    this.setupHandlers();
    this.registerTools();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info('Received ListTools request');
      
      return {
        tools: [
          this.healthCheckTool.getToolDefinition(),
          this.ecosystemObserverTool.getToolDefinition(),
          this.monsterAnalyzerTool.getToolDefinition(),
          this.environmentCheckerTool.getToolDefinition(),
          this.placeFoodTool.getToolDefinition(),
          this.modifyWeatherTool.getToolDefinition(),
          this.buildShelterTool.getToolDefinition(),
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
          
          case 'observe_ecosystem': {
            const result = await this.ecosystemObserverTool.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          }
          
          case 'analyze_monster': {
            const result = await this.monsterAnalyzerTool.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          }
          
          case 'check_environment': {
            const result = await this.environmentCheckerTool.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          }
          
          case 'place_food': {
            const result = await this.placeFoodTool.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          }
          
          case 'modify_weather': {
            const result = await this.modifyWeatherTool.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: result,
                },
              ],
            };
          }
          
          case 'build_shelter': {
            const result = await this.buildShelterTool.execute(args || {});
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
    this.healthCheckTool.registerTool('observe_ecosystem');
    this.healthCheckTool.registerTool('analyze_monster');
    this.healthCheckTool.registerTool('check_environment');
    this.healthCheckTool.registerTool('place_food');
    this.healthCheckTool.registerTool('modify_weather');
    this.healthCheckTool.registerTool('build_shelter');
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