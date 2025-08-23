# AO Development Environment Setup

## Overview

This guide walks through setting up a complete AO (Actor-Oriented) development environment for the Tuxemon gaming platform.

## Prerequisites

### System Requirements

- **Operating System**: macOS, Linux, or Windows (with WSL2)
- **Node.js**: Version 16.x or higher
- **npm**: Version 7.x or higher
- **Git**: Latest version
- **Memory**: Minimum 8GB RAM recommended
- **Storage**: At least 5GB free space

### Knowledge Prerequisites

- Basic understanding of JavaScript/Node.js
- Familiarity with Lua programming language
- Understanding of blockchain/distributed systems concepts
- Git version control system knowledge

## Step-by-Step Setup

### 1. Install Node.js and npm

#### Using Node Version Manager (Recommended)

```bash
# Install nvm (Linux/macOS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source profile
source ~/.bashrc  # or ~/.zshrc

# Install and use Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

#### Direct Installation

Download and install from [nodejs.org](https://nodejs.org/):
- Choose LTS version (18.x or higher)
- Follow platform-specific installation instructions

### 2. Install AO Development Tools

#### Install AOS (AO Compute Interface)

```bash
# Install aos globally
npm install -g @permaweb/aos

# Verify installation
aos --version
```

#### Install AOConnect

```bash
# Install aoconnect for AO process interaction
npm install -g @permaweb/aoconnect
```

#### Install Additional AO Tools

```bash
# Install permaweb deployment tools
npm install -g permaweb-deploy

# Install Arweave tools (if needed)
npm install -g arweave-deploy
```

### 3. Clone and Setup Project Repository

```bash
# Clone the repository
git clone <repository-url> tuxemon-ao-processes
cd tuxemon-ao-processes

# Install project dependencies
npm install

# Verify setup
npm run test
```

### 4. Configure Development Environment

#### Environment Variables

Create a `.env.local` file in the project root:

```bash
# .env.local
NODE_ENV=development
AO_ENVIRONMENT=local
DEBUG=ao:*

# Optional: Arweave configuration
ARWEAVE_HOST=arweave.net
ARWEAVE_PORT=443
ARWEAVE_PROTOCOL=https
```

#### Git Configuration

```bash
# Configure git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set up project-specific hooks (optional)
cp scripts/git-hooks/* .git/hooks/
chmod +x .git/hooks/*
```

## AO Environment Configuration

### Local Development Setup

#### 1. AO Process Templates

The project includes templates for four main processes:

- **World Process**: Manages game world state and agent interactions
- **Battle Process**: Handles combat resolution and turn management
- **Registry Process**: Manages agent and process registration/discovery
- **Health Monitor Process**: Monitors system health and performance

#### 2. Testing Environment

The testing framework provides:

- **Mock AO Runtime**: Simulates AO message passing locally
- **Test Agents**: Simulate external agents for testing
- **Automated Test Runner**: Discovers and runs all test files

#### 3. Deployment Pipeline

Local deployment includes:

- **Build System**: Compiles and validates Lua processes
- **Local Deployment**: Simulates AO process deployment
- **Health Monitoring**: Verifies process health and availability

### Remote AO Configuration

#### Testnet Setup

```bash
# Set testnet environment
export AO_ENVIRONMENT=testnet

# Deploy to testnet (requires wallet configuration)
npm run deploy:testnet
```

#### Mainnet Setup

```bash
# Set mainnet environment  
export AO_ENVIRONMENT=mainnet

# Deploy to mainnet (production - use carefully)
npm run deploy:mainnet
```

## Development Workflow Verification

### 1. Run Initial Tests

```bash
# Run all tests
npm test

# Expected output:
# 🎉 ALL TESTS PASSED!
```

### 2. Build All Processes

```bash
# Build all AO processes
npm run build

# Verify build artifacts
ls -la ao-processes/*/dist/
```

### 3. Local Deployment Test

```bash
# Deploy to local environment
npm run deploy:local

# Expected output:
# 🚀 Local environment is ready for testing!
```

### 4. Health Check Verification

```bash
# Run health checks
npm run health-check

# Expected output:
# 🎉 All processes healthy!
```

## IDE and Editor Setup

### VS Code Configuration

#### Recommended Extensions

Install these VS Code extensions:

```json
{
  "recommendations": [
    "ms-vscode.vscode-lua",
    "sumneko.lua",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-eslint"
  ]
}
```

#### Settings Configuration

Create `.vscode/settings.json`:

```json
{
  "lua.diagnostics.globals": [
    "ao",
    "Handlers",
    "State",
    "json"
  ],
  "files.associations": {
    "*.lua": "lua",
    "*.tl": "lua"
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true
}
```

### Lua Language Server Setup

```bash
# Install Lua Language Server (if using vim/neovim)
# macOS
brew install lua-language-server

# Ubuntu/Debian
apt install lua-language-server

# Configure for AO development
echo 'globals = {"ao", "Handlers", "State", "json"}' > .luarc.json
```

## Troubleshooting Common Issues

### Node.js/npm Issues

#### Permission Errors (Linux/macOS)

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to ~/.bashrc or ~/.zshrc:
export PATH=~/.npm-global/bin:$PATH

# Source the file
source ~/.bashrc
```

#### Version Conflicts

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### AOS Installation Issues

#### Global Installation Failures

```bash
# Try with explicit registry
npm install -g @permaweb/aos --registry https://registry.npmjs.org/

# Or use npx for one-time usage
npx @permaweb/aos --version
```

#### Missing Dependencies

```bash
# Install build tools (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install build-essential

# macOS (install Xcode command line tools)
xcode-select --install
```

### Git and Repository Issues

#### Clone Failures

```bash
# Use HTTPS instead of SSH if SSH keys not configured
git clone https://github.com/username/repo.git

# Configure Git credentials
git config --global credential.helper store
```

#### Submodule Issues

```bash
# Initialize and update submodules (if any)
git submodule update --init --recursive
```

### Testing Issues

#### Mock Environment Problems

```bash
# Clear any cached test data
rm -rf .test-cache/

# Reinstall test dependencies
npm install --dev
```

#### Lua Syntax Errors

```bash
# Check Lua installation
lua -v

# Install Lua if missing (macOS)
brew install lua

# Ubuntu/Debian
sudo apt install lua5.3
```

## Performance Optimization

### Development Environment

#### Increase Node.js Memory Limit

```bash
# For large projects
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### Enable File Watching Optimizations

```bash
# macOS - increase file watch limits
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Use Local Registry Cache

```bash
# Install npm cache proxy
npm install -g verdaccio

# Use local cache
npm set registry http://localhost:4873/
```

## Verification Checklist

Use this checklist to verify your setup:

- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm 7+ installed (`npm --version`)
- [ ] AOS installed globally (`aos --version`)
- [ ] AOConnect available (`npm list -g @permaweb/aoconnect`)
- [ ] Repository cloned and dependencies installed
- [ ] All tests passing (`npm test`)
- [ ] Local build successful (`npm run build`)
- [ ] Local deployment working (`npm run deploy:local`)
- [ ] Health checks passing (`npm run health-check`)
- [ ] IDE/editor configured with Lua support
- [ ] Git configured for commits
- [ ] Environment variables set (if needed)

## Next Steps

After completing this setup:

1. **Review the Development Guide**: Read `docs/development/development-guide.md`
2. **Explore Process Code**: Examine AO processes in `ao-processes/`
3. **Run Example Tests**: Study test files in `tests/unit/`
4. **Try Local Development**: Make a small change and test it
5. **Check CI/CD Pipeline**: Review `.github/workflows/`

## Getting Help

If you encounter issues not covered in this guide:

1. Check existing issues in the repository
2. Review error messages carefully
3. Consult AO documentation at https://ao.arweave.dev
4. Create a new issue with:
   - Your operating system and version
   - Node.js and npm versions
   - Full error messages and stack traces
   - Steps to reproduce the problem

---

*This setup guide ensures you have a complete AO development environment ready for Tuxemon gaming platform development.*