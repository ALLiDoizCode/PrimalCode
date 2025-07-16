#!/usr/bin/env node

/**
 * Build script for AO monster process
 * Compiles Teal to Lua and prepares for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = path.join(__dirname, '../build');
const srcDir = path.join(__dirname, '../src');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function buildProcess() {
    console.log('🔨 Building AO Monster Process...');
    
    // Ensure build directory exists
    ensureDir(buildDir);
    
    try {
        // Compile Teal to Lua
        console.log('📝 Compiling Teal to Lua...');
        execSync('tl build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
        
        // Generate single file with squishy (if available)
        if (fs.existsSync(path.join(__dirname, '../squishy'))) {
            console.log('📦 Amalgamating files with squishy...');
            execSync('lua squishy', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
        }
        
        console.log('✅ Build completed successfully!');
        
        // Display build artifacts
        const files = fs.readdirSync(buildDir);
        console.log('📋 Build artifacts:');
        files.forEach(file => {
            const filePath = path.join(buildDir, file);
            const stats = fs.statSync(filePath);
            console.log(`  - ${file} (${Math.round(stats.size / 1024)}KB)`);
        });
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

function main() {
    buildProcess();
}

if (require.main === module) {
    main();
}

module.exports = { buildProcess };