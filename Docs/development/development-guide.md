# Tuxemon AO Processes - Development Guide

## Overview

This guide will help you set up, develop, test, and deploy Tuxemon AO processes for the Actor-Oriented gaming platform. The project uses AO (Arweave Operating System) to create decentralized, blockchain-based gaming processes.

## Prerequisites

- Node.js 16+ and npm 7+
- Git
- Basic understanding of Lua programming
- Familiarity with AO (Actor-Oriented) concepts

## Quick Start

### 1. Repository Setup

```bash
# Clone the repository
git clone <repository-url>
cd tuxemon-ao-processes

# Install dependencies
npm install
```

### 2. Development Environment

The development environment includes:
- **AOS (AO Compute Interface)**: For local AO process development
- **AOConnect**: For interacting with AO processes
- **Testing Framework**: Mock AO environment for unit testing
- **Deployment Scripts**: Local and remote deployment automation

### 3. Running Tests

```bash
# Run all tests
npm test

# Run unit tests only  
npm run test:unit

# Run integration tests
npm run test:integration
```

### 4. Local Development & Testing

```bash
# Build all processes
npm run build

# Deploy to local environment
npm run deploy:local

# Check health of deployed processes
npm run health-check

# Development workflow (build + deploy)
npm run dev
```

## Project Structure

```
tuxemon-ao-processes/
├── ao-processes/           # AO Process implementations
│   ├── world/             # World management process
│   ├── battle/            # Battle resolution process
│   ├── registry/          # Agent/process registry
│   └── health-monitor/    # Health monitoring process
├── shared/                # Shared utilities and types
│   ├── types/            # Type definitions
│   ├── utils/            # Common utilities
│   └── data/             # Shared data structures
├── tests/                 # Testing infrastructure
│   ├── unit/             # Unit tests for each process
│   ├── integration/      # Cross-process integration tests
│   └── mock-agents/      # Mock AO environment and test agents
├── scripts/               # Build and deployment scripts
├── development/           # Development tools and monitoring
└── docs/                  # Documentation
```

## AO Process Development

### Process Structure

Each AO process follows this structure:

```
ao-processes/{process-name}/
├── src/
│   └── main.lua          # Main process implementation
├── tests/
│   └── {process}.test.lua # Process-specific tests
└── package.json          # Process configuration
```

### Writing AO Processes

AO processes are written in Lua and use the AO runtime environment. Key concepts:

#### 1. Process State Initialization
```lua
-- Initialize process state
if not State then
    State = {
        process_id = "",
        -- Process-specific state variables
    }
end
```

#### 2. Message Handlers
```lua
-- Handler for initialization
Handlers.add("init", "Action", "Init",
    function(msg)
        -- Handle initialization logic
        State.process_id = msg.Tags.ProcessId or "default_id"
        
        -- Send response
        ao.send({
            Target = msg.From,
            Action = "Init-Response",
            Data = json.encode({ status = "initialized" })
        })
    end
)
```

#### 3. Inter-Process Communication
```lua
-- Send message to another process
ao.send({
    Target = "target_process_id",
    Action = "Custom-Action",
    Tags = { CustomTag = "value" },
    Data = json.encode(payload)
})
```

### Message Protocol

All processes follow the ADP (Agent Data Protocol) v1.0 specification:

- **Action**: Required tag specifying the message type
- **Target**: Destination process ID
- **From**: Source process/agent ID (automatically set)
- **Tags**: Key-value metadata
- **Data**: JSON-encoded message payload

## Testing Framework

### Mock AO Environment

The testing framework includes a mock AO environment for unit testing:

```javascript
const { MockAO } = require('./tests/mock-agents/mock-ao');
const { TestAgent } = require('./tests/mock-agents/test-agent');

// Create test environment
const mockAO = new MockAO();
const testAgent = new TestAgent('test_agent_id');

// Register mock handlers
mockAO.addHandler("test-handler", "Action", "Test-Action", (msg) => {
    // Handler logic
});
```

### Writing Unit Tests

```javascript
// Example unit test
async testProcessInitialization() {
    // Set expectation
    this.testAgent.expectResponse("Init-Response", (msg) => {
        const data = JSON.parse(msg.Data);
        return data.status === "initialized";
    });

    // Send test message
    const initMessage = this.testAgent.sendMessage(
        'target_process',
        'Init',
        { ProcessId: 'test_process_123' }
    );
    
    // Process message
    this.mockAO.processMessage(initMessage);

    // Verify results
    const report = this.testAgent.getTestReport();
    return report.success;
}
```

### Running Tests

```bash
# Run specific test file
node tests/unit/world/world-process.test.js

# Run all tests with test runner
node tests/test-runner.js
```

## Local Deployment

### Deployment Process

1. **Build Processes**: Copies Lua files to dist/ directories
2. **Process Validation**: Ensures all required files exist
3. **Deployment Simulation**: Creates process IDs and deployment records
4. **Health Check**: Verifies all processes are accessible

### Deployment Commands

```bash
# Full deployment workflow
npm run deploy:local

# Manual steps
npm run build                    # Build all processes
node scripts/deploy-local.js     # Deploy to local environment
npm run health-check            # Verify deployment
```

### Deployment Reports

Deployment generates reports in JSON format:

```json
{
  "timestamp": "2025-08-23T19:52:54.979Z",
  "environment": "local",
  "processes": {
    "world": {
      "id": "world_1755978774602",
      "name": "world",
      "status": "active",
      "deployedAt": "2025-08-23T19:52:54.979Z"
    }
  }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline includes:

1. **Lint and Test**: Code quality and unit testing
2. **Build Processes**: Compile all AO processes
3. **Integration Tests**: Cross-process validation
4. **Deploy to Testnet**: Automated testnet deployment
5. **Deploy to Mainnet**: Production deployment (main branch only)
6. **Health Check**: Post-deployment verification

### Branch Strategy

- **development**: Deploys to AO testnet
- **main**: Deploys to AO mainnet
- **feature branches**: Run tests only

### Environment Variables

```bash
# Required for deployment
ARWEAVE_WALLET=<wallet_json>      # Arweave wallet for deployment
AO_ENVIRONMENT=local|testnet|mainnet
```

## Health Monitoring

### Health Check System

The health monitoring system:

1. Loads deployment report
2. Sends health check messages to all processes
3. Validates responses
4. Generates health reports

### Health Check Commands

```bash
# Check all deployed processes
npm run health-check

# Set environment for health check
AO_ENVIRONMENT=testnet npm run health-check
```

### Health Metrics

- Response time
- Process availability
- Message handling capability
- Resource usage (where available)

## Development Best Practices

### Code Standards

1. **Lua Coding Style**:
   - Use snake_case for variables and functions
   - Use PascalCase for handler names
   - Include error handling for all message handlers

2. **Message Handling**:
   - Always validate required tags and data
   - Send appropriate error responses
   - Use consistent JSON data structures

3. **Testing**:
   - Write unit tests for all handlers
   - Test both success and error scenarios
   - Use descriptive test names and clear assertions

### Security Considerations

1. **Input Validation**: Always validate message inputs
2. **Process Isolation**: Keep process state separate
3. **Error Handling**: Never expose internal errors to external messages
4. **Deterministic Logic**: Use seeded random generation

### Performance Optimization

1. **State Management**: Keep process state minimal
2. **Message Batching**: Group related operations
3. **Response Optimization**: Send concise responses
4. **Resource Monitoring**: Monitor memory and CPU usage

## Troubleshooting

### Common Issues

#### 1. AOS Installation Issues
```bash
# Reinstall AOS
npm uninstall -g @permaweb/aos
npm install -g @permaweb/aos
aos --version
```

#### 2. Test Failures
- Check mock handler setup
- Verify message format matches expected structure
- Ensure test expectations align with actual responses

#### 3. Deployment Failures
- Verify all Lua files exist in src/ directories
- Check Node.js and npm versions
- Ensure proper file permissions on scripts

#### 4. Health Check Issues
- Confirm deployment-report.json exists
- Verify process IDs in deployment report
- Check network connectivity for remote environments

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run deploy:local
DEBUG=health* npm run health-check
```

## Getting Help

### Resources

- [AO Documentation](https://ao.arweave.dev)
- [AO Cookbook](https://cookbook_ao.arweave.net)
- [Arweave Documentation](https://docs.arweave.org)

### Support

- Create issues in the project repository
- Check existing documentation in docs/
- Review test examples for implementation patterns

## Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run test suite: `npm test`
5. Commit changes: `git commit -am 'Add new feature'`
6. Push branch: `git push origin feature/new-feature`
7. Create Pull Request

### Code Review

All changes require:
- Passing test suite
- Code review approval
- Documentation updates (if applicable)
- Health check validation in CI/CD

---

*This guide covers the essential aspects of developing with the Tuxemon AO Processes platform. For specific implementation details, refer to the individual process documentation and test examples.*