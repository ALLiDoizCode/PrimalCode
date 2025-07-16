#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Deploying Provider Registry AO Process locally...');

try {
  // Build first
  console.log('Building process...');
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // Check if process file exists
  const processFile = path.join(__dirname, '..', 'build', 'provider-registry-process.lua');
  const mainFile = path.join(__dirname, '..', 'build', 'main.lua');
  
  const deployFile = fs.existsSync(processFile) ? processFile : mainFile;
  
  if (!fs.existsSync(deployFile)) {
    throw new Error('Process file not found. Build may have failed.');
  }

  // Deploy using aos (if available)
  try {
    console.log('Deploying to local AO environment...');
    execSync(`aos --load ${deployFile}`, { stdio: 'inherit' });
    console.log('✓ Provider Registry deployed successfully');
  } catch (error) {
    console.warn('Warning: aos not available for deployment');
    console.log('Process file ready for manual deployment:', deployFile);
  }

} catch (error) {
  console.error('Deployment failed:', error.message);
  process.exit(1);
}