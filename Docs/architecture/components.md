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

## Inference Marketplace Core

**Responsibility:** Manages AI inference marketplace operations including request routing, payment processing, and provider coordination

**Key Interfaces:**
- AI inference request processing and routing
- Token payment validation using Credit-Notice/Debit-Notice handlers
- Provider discovery and capability matching
- Request timeout and error handling
- X-prefix metadata forwarding

**Dependencies:** AO Token Blueprint, Provider Registry, Reputation Manager, Primal Token Process

**Technology Stack:** Lua (AO Process), AO Token Blueprint patterns

## Provider Registry

**Responsibility:** Maintains registry of AI inference providers with capabilities, pricing, and availability status

**Key Interfaces:**
- Provider registration and capability advertising
- Service discovery and provider matching
- Pricing information management
- Provider status monitoring and health checks
- Capability validation and testing

**Dependencies:** Marketplace Core, Reputation Manager

**Technology Stack:** Lua (AO Process), JSON schema validation

## Reputation Manager

**Responsibility:** Tracks provider performance metrics, quality scores, and reputation indicators

**Key Interfaces:**
- Response time monitoring and averaging
- Quality score calculation and tracking
- Completion rate statistics
- Provider ranking and recommendation
- Reputation history and trends

**Dependencies:** Marketplace Core, Provider Registry

**Technology Stack:** Lua (AO Process), statistical analysis algorithms

## Token Payment Handler

**Responsibility:** Processes Primal token payments for AI inference services using AO Token Blueprint patterns

**Key Interfaces:**
- Credit-Notice processing for incoming payments
- Debit-Notice processing for outgoing payments
- X-prefix tag forwarding for marketplace context
- Payment validation and authorization
- Refund processing for failed requests

**Dependencies:** AO Token Blueprint, Primal Token Process, Marketplace Core

**Technology Stack:** Lua (AO Process), AO Token Blueprint handlers

## Inference Provider Node.js Applications

**Responsibility:** External Node.js applications that provide AI inference services and handle Credit-Notice payments from the marketplace

**Key Interfaces:**
- Credit-Notice message listener from Primal Token Process
- AI inference processing (Claude API, OpenAI, etc.)
- X-prefix metadata parsing and context extraction
- Response delivery to requesting Monster Process
- Service registration with Provider Registry
- Health monitoring and availability reporting

**Dependencies:** AO SDK, AI Service APIs (Claude, OpenAI), Provider Registry, Reputation Manager

**Technology Stack:** Node.js, TypeScript, AO SDK, AI service clients

**Architecture Pattern:** Event-driven microservice with AO message handling
