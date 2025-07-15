#!/usr/bin/env node

import { FastMCP } from 'fastmcp';
import { healthCheck } from './tools/health-check';
import { observeEcosystem } from './tools/ecosystem-observer';
import { analyzeMonster } from './tools/monster-analyzer';
import { checkEnvironment } from './tools/environment-checker';
import packageJson from '../package.json';


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

    
    // Start the server
    await server.start({ transportType: 'stdio' });
    
  } catch (error) {
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