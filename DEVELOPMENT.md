# Development Guidelines

## Critical: No Console Logging in MCP Servers

**⚠️ WARNING: This MCP server uses stdio transport and CANNOT use console logging**

### Why No Logging?

MCP (Model Context Protocol) servers that use `stdio` as their transport type communicate through stdin/stdout. Any console output (console.log, console.error, etc.) will interfere with the protocol messages and break communication between the client and server.

### Prohibited Patterns

❌ **NEVER USE:**
- `console.log()`
- `console.error()`
- `console.warn()`
- `console.info()`
- `console.debug()`
- Any external logging libraries that output to console
- `process.stdout.write()`
- `process.stderr.write()` (can interfere in some environments)

### Alternative Debugging Strategies

✅ **FOR DEBUGGING, USE:**

1. **File-based logging** (development only):
```typescript
import fs from 'fs';
const debugLog = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    fs.appendFileSync('debug.log', `${new Date().toISOString()}: ${message}\n`);
  }
};
```

2. **Conditional stderr logging** (use sparingly):
```typescript
const debugError = (message: string) => {
  if (process.env.DEBUG_MODE && process.env.NODE_ENV === 'development') {
    process.stderr.write(`DEBUG: ${message}\n`);
  }
};
```

3. **Return debugging info in responses** (for tools):
```typescript
// Include debug info in tool responses when helpful
return JSON.stringify({
  result: actualResult,
  debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
}, null, 2);
```

### Code Review Checklist

Before committing code, ensure:
- [ ] No console.* methods anywhere in the codebase
- [ ] No imports of logging libraries
- [ ] No direct stdout/stderr writes
- [ ] ESLint passes without logging-related errors
- [ ] Pre-commit hooks pass

### Enforcement

This project uses multiple layers of enforcement:
1. **ESLint rules** - Prevents console usage
2. **TypeScript overrides** - Makes console methods unavailable
3. **Pre-commit hooks** - Scans for logging patterns
4. **Code review** - Manual verification

### Testing

When testing the MCP server:
- Use proper MCP clients or tools
- Monitor for any unexpected output that might break protocol
- Test in both development and production modes