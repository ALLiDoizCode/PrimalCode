#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Provider Registry AO Process...');

try {
  // Ensure build directory exists
  const buildDir = path.join(__dirname, '..', 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Compile Teal files to Lua
  console.log('Compiling Teal files...');
  execSync('tl build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // Copy shared utilities if they exist
  const sharedDir = path.join(__dirname, '..', '..', 'shared', 'build');
  if (fs.existsSync(sharedDir)) {
    console.log('Copying shared utilities...');
    const sharedFiles = fs.readdirSync(sharedDir);
    sharedFiles.forEach(file => {
      const srcPath = path.join(sharedDir, file);
      const destPath = path.join(buildDir, file);
      fs.copyFileSync(srcPath, destPath);
    });
  }

  // Use squishy to amalgamate into single file
  console.log('Creating amalgamated process file...');
  const squishyConfig = {
    Output: "build/provider-registry-process.lua",
    Main: "build/main.lua",
    Verbose: true,
    Minify: false
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'squishy'),
    `-- Provider Registry Process Squishy Configuration
Output "${squishyConfig.Output}"
Main "${squishyConfig.Main}"
Verbose ${squishyConfig.Verbose}
Minify ${squishyConfig.Minify}

-- Include all built files
Module "types.registry" "build/types/registry.lua"
Module "handlers.provider-registration" "build/handlers/provider-registration.lua"
Module "handlers.service-discovery" "build/handlers/service-discovery.lua"
Module "handlers.reputation-tracking" "build/handlers/reputation-tracking.lua"
Module "utils.validation-utils" "build/utils/validation-utils.lua"
Module "json" "build/json.lua"
`
  );

  try {
    execSync('squishy', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✓ Provider Registry AO Process built successfully');
  } catch (error) {
    console.warn('Warning: squishy not available, using built files separately');
  }

  // Verify main file exists
  const mainFile = path.join(buildDir, 'main.lua');
  if (fs.existsSync(mainFile)) {
    console.log('✓ Main process file created');
  } else {
    throw new Error('Main process file not found after build');
  }

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}