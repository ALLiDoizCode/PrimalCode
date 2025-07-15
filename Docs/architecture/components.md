# Components

## FastMCP Server

**Responsibility:** Hosts MCP tools and manages communication between AI clients and AO processes

**Key Interfaces:**
- MCP Protocol endpoints for tool execution
- AO Process communication via message passing
- Error handling and graceful degradation
- Real-time ecosystem state synchronization

**Dependencies:** FastMCP framework, AO Client, Winston logging

**Technology Stack:** TypeScript, FastMCP boilerplate, WebSocket connections

## AO Process Manager

**Responsibility:** Handles deployment, monitoring, and communication with AO processes

**Key Interfaces:**
- Process deployment and lifecycle management
- Message routing between MCP server and AO processes
- Health monitoring and automatic recovery
- State synchronization and caching

**Dependencies:** AO SDK, Arweave wallet, monitoring services

**Technology Stack:** TypeScript, AO SDK, Arweave integration

## Monster AI Engine

**Responsibility:** Provides intelligent decision-making for autonomous creatures with fallback systems

**Key Interfaces:**
- Claude API integration with context optimization
- Decision caching and pattern recognition
- Rule-based fallback for API failures
- Behavioral adaptation and learning

**Dependencies:** Claude API, Decision Cache, Monster State

**Technology Stack:** TypeScript, Claude API, Redis caching

## Environment Manager

**Responsibility:** Manages route-level environmental state and player modifications

**Key Interfaces:**
- Environmental modification processing
- Weather system and timing control
- Resource management and decay
- Ecosystem balance monitoring

**Dependencies:** AO Processes, Player State, Monster Processes

**Technology Stack:** Lua (AO Process), TypeScript (MCP integration)

## Player State Manager

**Responsibility:** Tracks player progress, influence points, and ecosystem mastery

**Key Interfaces:**
- Wallet authentication and authorization
- Influence point economy management
- Progression tracking and tool unlocks
- Session management and history

**Dependencies:** Arweave wallet, Player AO Process

**Technology Stack:** TypeScript, Arweave SDK, AO integration
