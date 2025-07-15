#!/usr/bin/env node

import { FastMCP } from 'fastmcp';
import { healthCheck } from './tools/health-check';
import { observeEcosystem } from './tools/ecosystem-observer';
import { analyzeMonster } from './tools/monster-analyzer';
import { checkEnvironment } from './tools/environment-checker';
import { createLogger } from './utils/logging';
import packageJson from '../package.json';

const logger = createLogger('MCP Server');

async function main(): Promise<void> {
  try {
    // Initialize FastMCP server
    const server = new FastMCP({
      name: packageJson.name,
      version: packageJson.version as `${number}.${number}.${number}`,
    });

    // Register health check tool
    server.addTool(healthCheck);

    // Register ecosystem observation tools
    server.addTool(observeEcosystem);
    server.addTool(analyzeMonster);
    server.addTool(checkEnvironment);

    logger.info('PrimalCode MCP Server starting with 4 tools registered...');
    
    // Start the server
    await server.start();
    
    logger.info('PrimalCode MCP Server started successfully');
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main();
}