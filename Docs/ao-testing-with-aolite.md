# AO Process Testing with AOLite

## Overview

AOLite is a local, concurrent emulation of the Arweave AO protocol designed for testing Lua processes. This tool provides a lightweight testing environment for AO processes before deploying to the actual Arweave network.

## Key Features

- **Local AO Environment**: Run and test AO processes in-memory without network dependencies
- **Concurrent Emulation**: Uses coroutines for concurrent process emulation
- **Message Passing**: Full support for inter-process communication
- **Direct State Access**: Access and inspect process state directly
- **Flexible Scheduling**: Manual and automatic message queue control
- **Configurable Logging**: Detailed logging with adjustable verbosity levels

## Requirements

- Lua 5.3 (specific version required)
- No external Lua dependencies

## Installation

### Via Luarocks
```bash
luarocks install aolite
```

### From Source
```bash
git clone https://github.com/perplex-labs/aolite
cd aolite
luarocks make
```

## Core API Functions

### Process Management
- `spawnProcess(name, source)`: Create new AO processes from source code or files
- `eval(processName, code)`: Execute code within a specific process context

### Messaging System
- `send(message)`: Send messages between processes
- `getAllMsgs(processName)`: Retrieve all messages for a process
- `getLastMsg(processName)`: Get the most recent message

### Scheduler Control
- `runScheduler()`: Manually process message queues
- Auto-scheduling available for continuous operation

## Basic Usage Example

```lua
-- Load aolite
local aolite = require('aolite')

-- Spawn a process
aolite.spawnProcess("myProcess", [[
    Handlers.add("ping", "ping", function(msg)
        print("Received ping from: " .. msg.From)
        ao.send({Target = msg.From, Data = "pong"})
    end)
]])

-- Send a message
local message = {
    From = "testSender",
    Target = "myProcess", 
    Action = "ping",
    Data = "Hello AO!"
}

aolite.send(message)

-- Process the message queue
aolite.runScheduler()

-- Check for responses
local responses = aolite.getAllMsgs("testSender")
for _, response in ipairs(responses) do
    print("Response:", response.Data)
end
```

## Testing Workflows

### 1. Local Development Testing
Use AOLite during development to test process logic without deploying to Arweave:

```lua
-- Test process handlers
aolite.spawnProcess("testProcess", processSource)
aolite.send(testMessage)
local result = aolite.getLastMsg("testProcess")
assert(result.Data == expectedOutput)
```

### 2. Integration Testing
Test multiple processes interacting:

```lua
-- Spawn multiple processes
aolite.spawnProcess("serviceA", serviceASource)
aolite.spawnProcess("serviceB", serviceBSource)

-- Test communication between services
aolite.send({From = "serviceA", Target = "serviceB", Action = "request"})
aolite.runScheduler()

-- Verify responses
local responses = aolite.getAllMsgs("serviceA")
```

### 3. Debugging Support
Use eval for process inspection:

```lua
-- Check process state
local state = aolite.eval("myProcess", "return State")
print("Current state:", state)

-- Modify state for testing
aolite.eval("myProcess", "State.testMode = true")
```

## Logging Configuration

Control logging verbosity with environment variables:

```bash
export AOLITE_LOG_LEVEL=debug  # Options: debug, info, warn, error
export AOLITE_LOG_FILE=tests.log  # Optional file logging
```

## Advanced Features

### Sand-boxed Process Isolation
AOLite provides isolated process environments with:
- Separate global namespaces
- Independent state management
- Controlled message passing

### Coroutine-based Concurrency
Processes run concurrently using Lua coroutines, allowing:
- Non-blocking message processing
- Realistic timing simulation
- Controlled execution flow

## Best Practices

1. **Process Isolation**: Always test processes in isolation before integration
2. **Message Validation**: Verify message formats and required fields
3. **State Management**: Use eval to inspect and validate process state
4. **Error Handling**: Test error conditions and edge cases
5. **Performance Testing**: Use AOLite to identify bottlenecks before deployment

## Integration with PrimalCode

For testing PrimalCode's AO processes:

1. **Environment Setup**: Use AOLite to simulate the ecosystem environment
2. **Token Testing**: Test primal token operations locally
3. **Game Logic**: Validate monster state management and interactions
4. **Tool Testing**: Verify shelter building, food placement, and weather modification

## Repository Information

- **Source**: https://github.com/perplex-labs/aolite
- **Documentation**: Comprehensive README with API details
- **Examples**: Sample code and usage patterns available
- **Testing**: Busted unit tests included (`make test`)

## Contributing

When contributing to AOLite:
- Use 2-space indentation
- Trim whitespace
- Follow existing code patterns
- Add tests for new features

---

*This documentation integrates AOLite capabilities for testing AO processes within the PrimalCode ecosystem.*