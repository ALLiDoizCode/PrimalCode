# PrimalCode - Autonomous Ecosystem Management MCP Server

PrimalCode is a Model Context Protocol (MCP) server that provides autonomous ecosystem management capabilities through intelligent creature behavior simulation and environmental analysis tools.

## ⚠️ Important: No Console Logging

**This MCP server uses stdio transport and cannot use console logging.** Any console output will interfere with the MCP protocol communication.

**For development guidelines and debugging alternatives, see [DEVELOPMENT.md](./DEVELOPMENT.md)**

## Features

- **Health Check Tool**: Monitor server health and system status
- **Ecosystem Observer**: Get detailed natural language descriptions of ecosystem state
- **Monster Analyzer**: Behavioral analysis for individual creatures
- **Environment Checker**: Environmental condition analysis and modification tracking

## Installation

```bash
npm install
npm run build
```

## Usage

This is an MCP server designed to be used with MCP-compatible clients. It communicates via stdio transport.

```bash
npm start
```

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for:
- Critical console logging restrictions
- Alternative debugging strategies  
- Code review checklist
- Enforcement mechanisms

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## Code Quality

```bash
npm run lint          # Check code quality
npm run lint:fix      # Fix auto-fixable issues
npm run format        # Format code
npm run pre-commit    # Run pre-commit checks
```

## Architecture

This project implements:
- Autonomous creature behavior simulation
- Environmental state management
- Natural language ecosystem descriptions
- MCP protocol compliance

For detailed architecture documentation, see the [docs/](./docs/) directory.

## License

ISC