#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building marketplace payment handler...');

// Ensure build directory exists
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

try {
  // Run Teal compiler
  console.log('Compiling Teal files...');
  execSync('tl build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  console.log('✅ Payment handler build completed successfully');
  
  // List generated files
  console.log('\nGenerated files:');
  const files = fs.readdirSync(buildDir);
  files.forEach(file => {
    console.log(`  - ${file}`);
  });
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}