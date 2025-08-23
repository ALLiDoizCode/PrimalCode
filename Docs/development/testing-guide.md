# Testing Guide for AO Processes

## Overview

This guide covers testing strategies, frameworks, and best practices for AO (Actor-Oriented) processes in the Tuxemon gaming platform.

## Testing Architecture

### Testing Levels

1. **Unit Tests**: Test individual AO process handlers in isolation
2. **Integration Tests**: Test interactions between multiple processes
3. **End-to-End Tests**: Test complete workflows across the entire system
4. **Performance Tests**: Test system performance under load

### Testing Framework Components

#### Mock AO Environment
- **MockAO**: Simulates AO runtime environment
- **TestAgent**: Simulates external agents and users
- **MessageBus**: Handles message routing in tests
- **StateManager**: Manages test state isolation

#### Test Runner
- **TestRunner**: Discovers and executes test files
- **Reporter**: Generates test reports and summaries
- **Coverage**: Tracks test coverage metrics

## Writing Unit Tests

### Basic Test Structure

```javascript
const { TestAgent } = require('../../mock-agents/test-agent');
const { MockAO } = require('../../mock-agents/mock-ao');

class ProcessTest {
    constructor() {
        this.testAgent = new TestAgent('test_agent');
        this.mockProcess = new MockAO();
        this.setupProcessHandlers();
    }

    setupProcessHandlers() {
        // Register mock handlers that simulate your AO process
        this.mockProcess.addHandler("handler-name", "Action", "Handler-Action", (msg) => {
            // Handler implementation
        });
    }

    async testSpecificFunctionality() {
        // Test implementation
    }
}
```

### Example: World Process Tests

```javascript
class WorldProcessTest {
    async testWorldInitialization() {
        console.log('\n=== Testing World Initialization ===');
        
        // Set expectation for response
        this.testAgent.expectResponse("Init-Response", (msg) => {
            const data = JSON.parse(msg.Data);
            return data.status === "initialized" && data.world_id;
        });

        // Send initialization message
        const initMessage = this.testAgent.sendMessage(
            'world_process',
            'Init',
            { WorldId: 'test_world_123' }
        );
        
        // Process the message
        this.mockWorld.processMessage(initMessage);

        // Verify results
        const report = this.testAgent.getTestReport();
        console.log(`World initialization test: ${report.success ? 'PASSED' : 'FAILED'}`);
        
        return report.success;
    }
}
```

### Test Expectations

#### Simple Expectations
```javascript
// Expect any response of a specific action
this.testAgent.expectResponse("Response-Action");

// Expect response with validation
this.testAgent.expectResponse("Response-Action", (msg) => {
    return msg.Data !== '' && msg.Tags.Status === 'success';
});
```

#### Complex Expectations
```javascript
// Multiple field validation
this.testAgent.expectResponse("Battle-Result", (msg) => {
    const data = JSON.parse(msg.Data);
    return (
        data.winner &&
        data.battle_id &&
        typeof data.turns === 'number' &&
        data.participants.length === 2
    );
});

// Timing expectations
this.testAgent.expectResponse("Quick-Response", (msg) => {
    const responseTime = Date.now() - msg.RequestTime;
    return responseTime < 1000; // Must respond within 1 second
});
```

## Mock AO Environment

### MockAO Class

```javascript
const mockAO = new MockAO();

// Register handlers
mockAO.addHandler("init", "Action", "Init", (msg) => {
    // Handler logic
});

// Process messages
mockAO.processMessage({
    Action: "Init",
    From: "test_agent",
    Tags: { WorldId: "test_world" },
    Data: ""
});

// Get sent messages
const messages = mockAO.getMessages();
const handlers = mockAO.getHandlers();
```

### TestAgent Class

```javascript
const testAgent = new TestAgent('test_agent_id');

// Send messages
const message = testAgent.sendMessage(
    'target_process',
    'Action-Name',
    { CustomTag: 'value' },
    'message data'
);

// Set expectations
testAgent.expectResponse("Response-Action", validator);

// Receive messages
testAgent.receiveMessage(incomingMessage);

// Check results
const report = testAgent.getTestReport();
const allPassed = testAgent.allExpectationsFulfilled();
```

## Process Handler Testing

### Handler Test Patterns

#### 1. Initialization Testing
```javascript
async testProcessInit() {
    // Test process starts with clean state
    // Test initialization message handling
    // Verify state is properly initialized
    // Confirm response message is sent
}
```

#### 2. State Management Testing
```javascript
async testStateUpdates() {
    // Send state-changing messages
    // Verify state is updated correctly
    // Test state persistence
    // Verify state isolation between tests
}
```

#### 3. Error Handling Testing
```javascript
async testErrorHandling() {
    // Send malformed messages
    // Test missing required fields
    // Verify error responses
    // Ensure process remains stable
}
```

#### 4. Message Validation Testing
```javascript
async testMessageValidation() {
    // Test required tag validation
    // Test data format validation
    // Test authorization checks
    // Verify rejection messages
}
```

### Example Handler Tests

#### World Process Handler Tests

```javascript
// Test agent registration
async testAgentRegistration() {
    this.testAgent.expectResponse("Registration-Response", (msg) => {
        const data = JSON.parse(msg.Data);
        return (
            data.status === "registered" &&
            data.location === "forest_entrance" &&
            data.world_id
        );
    });

    const regMessage = this.testAgent.sendMessage(
        'world_process',
        'Register-Agent',
        { Location: 'forest_entrance' }
    );
    
    this.mockWorld.processMessage(regMessage);
    return this.testAgent.getTestReport().success;
}

// Test world state queries
async testWorldStateQuery() {
    this.testAgent.expectResponse("World-State-Response", (msg) => {
        const data = JSON.parse(msg.Data);
        return (
            data.world_id &&
            data.environment &&
            typeof data.agent_count === 'number'
        );
    });

    const stateMessage = this.testAgent.sendMessage(
        'world_process',
        'Get-World-State'
    );
    
    this.mockWorld.processMessage(stateMessage);
    return this.testAgent.getTestReport().success;
}
```

#### Battle Process Handler Tests

```javascript
// Test battle initiation
async testBattleStart() {
    this.testAgent.expectResponse("Battle-Started", (msg) => {
        const data = JSON.parse(msg.Data);
        return (
            data.battle_id &&
            Array.isArray(data.participants) &&
            data.participants.length === 2 &&
            typeof data.your_turn === 'boolean'
        );
    });

    const battleMessage = this.testAgent.sendMessage(
        'battle_process',
        'Start-Battle',
        { Opponent: 'opponent_agent_id' }
    );
    
    this.mockBattle.processMessage(battleMessage);
    return this.testAgent.getTestReport().success;
}
```

## Test Runner Usage

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
node tests/unit/world/world-process.test.js

# Run with test runner
node tests/test-runner.js

# Run tests with coverage
npm run test:coverage
```

### Test Discovery

The test runner automatically discovers test files:

```javascript
// Test files must follow naming convention
// *.test.js in tests/unit/ or tests/integration/

// Example file structure:
tests/
├── unit/
│   ├── world/
│   │   └── world-process.test.js
│   ├── battle/
│   │   └── battle-process.test.js
│   └── registry/
│       └── registry-process.test.js
└── integration/
    └── full-workflow.test.js
```

### Test Reports

Test runner generates detailed reports:

```javascript
// Example test report
{
  "agentId": "test_agent_123",
  "totalMessages": 4,
  "totalExpectations": 3,
  "fulfilledExpectations": 3,
  "success": true,
  "unfulfilled": [],
  "messages": [/* received messages */]
}
```

## Integration Testing

### Cross-Process Testing

```javascript
class IntegrationTest {
    constructor() {
        this.worldProcess = new MockAO();
        this.battleProcess = new MockAO();
        this.registryProcess = new MockAO();
        this.testAgent = new TestAgent('integration_test');
        
        this.setupAllProcesses();
        this.connectProcesses();
    }

    setupAllProcesses() {
        // Setup handlers for all processes
        this.setupWorldHandlers();
        this.setupBattleHandlers();
        this.setupRegistryHandlers();
    }

    connectProcesses() {
        // Route messages between processes
        this.worldProcess.onMessage = (msg) => {
            if (msg.Target === 'battle_process') {
                this.battleProcess.processMessage(msg);
            }
        };
    }

    async testFullGameWorkflow() {
        // Test complete workflow from agent registration to battle
        const success = (
            await this.testAgentRegistration() &&
            await this.testWorldEntry() &&
            await this.testBattleInitiation() &&
            await this.testBattleResolution()
        );
        
        return success;
    }
}
```

### Message Flow Testing

```javascript
async testMessageFlow() {
    const messageFlow = [];
    
    // Track all messages
    this.worldProcess.onMessage = (msg) => {
        messageFlow.push(`World -> ${msg.Action}`);
    };
    
    this.battleProcess.onMessage = (msg) => {
        messageFlow.push(`Battle -> ${msg.Action}`);
    };
    
    // Execute test scenario
    await this.executeTestScenario();
    
    // Verify message flow
    const expectedFlow = [
        'World -> Register-Agent',
        'Battle -> Start-Battle',
        'Battle -> Battle-Action',
        'World -> Battle-Complete'
    ];
    
    return JSON.stringify(messageFlow) === JSON.stringify(expectedFlow);
}
```

## Performance Testing

### Load Testing

```javascript
class LoadTest {
    async testMessageThroughput() {
        const startTime = Date.now();
        const messageCount = 1000;
        
        for (let i = 0; i < messageCount; i++) {
            const message = this.testAgent.sendMessage(
                'world_process',
                'Health-Check',
                { TestId: `load_test_${i}` }
            );
            
            this.mockWorld.processMessage(message);
        }
        
        const endTime = Date.now();
        const throughput = messageCount / ((endTime - startTime) / 1000);
        
        console.log(`Message throughput: ${throughput.toFixed(2)} msg/sec`);
        
        // Verify all messages processed
        return this.mockWorld.getMessages().length === messageCount;
    }
}
```

### Memory Testing

```javascript
async testMemoryUsage() {
    const initialMemory = process.memoryUsage();
    
    // Simulate heavy state operations
    for (let i = 0; i < 10000; i++) {
        this.worldState.agents[`agent_${i}`] = {
            id: `agent_${i}`,
            location: 'test_location',
            status: 'active'
        };
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    console.log(`Memory increase: ${memoryIncrease / 1024 / 1024} MB`);
    
    // Memory should not increase beyond reasonable limits
    return memoryIncrease < 100 * 1024 * 1024; // 100MB limit
}
```

## Test Data Management

### Test State Isolation

```javascript
class TestStateManager {
    constructor() {
        this.testStates = new Map();
    }

    saveState(testId, state) {
        this.testStates.set(testId, JSON.parse(JSON.stringify(state)));
    }

    restoreState(testId) {
        return this.testStates.get(testId);
    }

    clearState(testId) {
        this.testStates.delete(testId);
    }

    isolateTest(testFn) {
        const testId = `test_${Date.now()}`;
        
        return async () => {
            this.saveState(testId, this.currentState);
            
            try {
                const result = await testFn();
                return result;
            } finally {
                this.currentState = this.restoreState(testId);
                this.clearState(testId);
            }
        };
    }
}
```

### Test Data Factories

```javascript
class TestDataFactory {
    static createTestAgent(overrides = {}) {
        return {
            id: `test_agent_${Date.now()}`,
            name: 'Test Agent',
            type: 'player',
            location: 'spawn_point',
            status: 'active',
            ...overrides
        };
    }

    static createTestBattle(overrides = {}) {
        return {
            id: `battle_${Date.now()}`,
            participants: ['agent1', 'agent2'],
            status: 'active',
            turn: 1,
            current_player: 'agent1',
            ...overrides
        };
    }

    static createTestMessage(action, overrides = {}) {
        return {
            From: 'test_agent',
            Action: action,
            Tags: { Action: action },
            Data: '',
            Timestamp: Date.now(),
            ...overrides
        };
    }
}
```

## Debugging Tests

### Test Debug Mode

```bash
# Enable debug output
DEBUG=test:* npm test

# Debug specific test
DEBUG=test:world npm test

# Verbose test output
npm test -- --verbose
```

### Debug Helpers

```javascript
class TestDebugger {
    static logMessage(message, direction = 'sent') {
        if (process.env.DEBUG) {
            console.log(`[DEBUG] ${direction.toUpperCase()}: ${JSON.stringify(message, null, 2)}`);
        }
    }

    static logState(state, label = 'State') {
        if (process.env.DEBUG) {
            console.log(`[DEBUG] ${label}: ${JSON.stringify(state, null, 2)}`);
        }
    }

    static logExpectation(expectation, result) {
        if (process.env.DEBUG) {
            const status = result ? '✓' : '✗';
            console.log(`[DEBUG] ${status} Expectation: ${expectation.action}`);
        }
    }
}
```

## Best Practices

### Test Organization

1. **One test class per process**: Keep tests focused and organized
2. **Descriptive test names**: Use clear, descriptive names for test methods
3. **Setup and teardown**: Properly initialize and clean up test state
4. **Test isolation**: Ensure tests don't depend on each other

### Test Quality

1. **Test both success and failure cases**: Cover all code paths
2. **Use meaningful assertions**: Validate important business logic
3. **Avoid test duplication**: Use helper methods for common operations
4. **Keep tests simple**: Each test should focus on one specific behavior

### Performance

1. **Minimize external dependencies**: Use mocks instead of real services
2. **Parallel test execution**: Run independent tests in parallel
3. **Efficient state management**: Use lightweight state objects
4. **Resource cleanup**: Always clean up resources after tests

### Maintenance

1. **Regular test updates**: Keep tests current with code changes
2. **Test documentation**: Document complex test scenarios
3. **Refactor test code**: Apply same quality standards as production code
4. **Monitor test performance**: Track test execution time and optimize slow tests

## Continuous Integration

### GitHub Actions Integration

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:unit
  
- name: Run Integration Tests
  run: npm run test:integration
  
- name: Generate Coverage Report
  run: npm run test:coverage
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

### Test Reporting

```bash
# Generate test reports
npm run test:report

# Generate coverage reports
npm run test:coverage

# Generate performance reports
npm run test:performance
```

---

*This testing guide provides comprehensive coverage of testing strategies and best practices for AO process development. Follow these patterns to ensure reliable, maintainable tests for your Tuxemon gaming platform.*