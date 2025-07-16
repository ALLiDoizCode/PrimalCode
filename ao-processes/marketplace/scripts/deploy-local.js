#!/usr/bin/env node

/**
 * Local deployment script for AO marketplace process using AOLite
 * Deploys to local AO emulation for testing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AOLITE_CONFIG = {
    port: 8081,
    processName: 'marketplace-process-local'
};

function deployToAOLite() {
    console.log('🚀 Deploying Marketplace Process to AOLite...');
    
    const buildPath = path.join(__dirname, '../build/main.lua');
    
    if (!fs.existsSync(buildPath)) {
        console.error('❌ Build file not found. Run `npm run build` first.');
        process.exit(1);
    }
    
    try {
        // Start AOLite if not already running
        console.log('📡 Starting AOLite emulation...');
        
        // Note: This would be replaced with actual AOLite deployment commands
        // For now, we'll just copy the file and show instructions
        console.log('📋 Local deployment instructions:');
        console.log('1. Install AOLite: npm install -g @permaweb/aolite');
        console.log('2. Start AOLite: aolite start');
        console.log(`3. Load process: aolite load ${buildPath}`);
        console.log(`4. Process will be available on port ${AOLITE_CONFIG.port}`);
        
        // Copy for easy access
        const localPath = path.join(__dirname, '../marketplace-local.lua');
        fs.copyFileSync(buildPath, localPath);
        console.log(`✅ Process copied to: ${localPath}`);
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

function main() {
    deployToAOLite();
}

if (require.main === module) {
    main();
}

module.exports = { deployToAOLite };