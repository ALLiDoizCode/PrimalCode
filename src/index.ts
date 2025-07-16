#!/usr/bin/env node

import { FastMCP } from 'fastmcp';
import { healthCheck } from './tools/health-check';
import { observeEcosystem } from './tools/ecosystem-observer';
import { analyzeMonster } from './tools/monster-analyzer';
import { checkEnvironment } from './tools/environment-checker';
import { PlaceFoodTool } from './tools/place-food';
import { ModifyWeatherTool } from './tools/modify-weather';
import { BuildShelterTool } from './tools/build-shelter';
import { PrimalTokenService } from './utils/primal-token-service';
import { MockEnvironmentState } from './ecosystem/environment-state';
import packageJson from '../package.json';


async function main(): Promise<void> {
  try {
    // Initialize FastMCP server
    const server = new FastMCP({
      name: packageJson.name,
      version: packageJson.version as `${number}.${number}.${number}`,
    });

    // Initialize shared services
    const tokenService = new PrimalTokenService();
    const environmentState = new MockEnvironmentState();

    // Initialize environmental modification tools
    const placeFoodTool = new PlaceFoodTool(tokenService, environmentState);
    const modifyWeatherTool = new ModifyWeatherTool(tokenService, environmentState);
    const buildShelterTool = new BuildShelterTool(tokenService, environmentState);

    // Register health check tool
    server.addTool(healthCheck);

    // Register ecosystem observation tools
    server.addTool(observeEcosystem);
    server.addTool(analyzeMonster);
    server.addTool(checkEnvironment);

    // Register environmental modification tools
    server.addTool({
      ...PlaceFoodTool.getToolDefinition(),
      execute: async (request: any) => {
        try {
          const result = await placeFoodTool.execute(request);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          throw new Error(`Place Food Tool Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });

    server.addTool({
      ...ModifyWeatherTool.getToolDefinition(),
      execute: async (request: any) => {
        try {
          const result = await modifyWeatherTool.execute(request);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          throw new Error(`Modify Weather Tool Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });

    server.addTool({
      ...BuildShelterTool.getToolDefinition(),
      execute: async (request: any) => {
        try {
          const result = await buildShelterTool.execute(request);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          throw new Error(`Build Shelter Tool Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });

    
    // Start the server
    await server.start({ transportType: 'stdio' });
    
  } catch (error) {
    // Cannot use console in MCP stdio mode - exit with error code
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

if (require.main === module) {
  main();
}