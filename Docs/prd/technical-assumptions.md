# Technical Assumptions

## Repository Structure: Monorepo
The project will use a monorepo structure containing all AO processes (world-state, battle-engine, agent-registry) with shared utilities and testing infrastructure. This enables coordinated development of inter-process communication patterns while maintaining clear separation of concerns.

## Service Architecture
**AO Process-Based Microservices**: Individual AO processes handle discrete game systems (world management, battle resolution, agent registration) that communicate via inter-process messages. Each process maintains its own state and exposes ADP-compliant handlers for external agent interaction.

## Testing Requirements
**Unit + Integration Testing**: Comprehensive testing pyramid including:
- Unit tests for individual handler logic using aolite local testing
- Integration tests validating inter-process message communication  
- End-to-end agent interaction tests using mock external agents
- Performance benchmarking against AO process computational limits

## Additional Technical Assumptions and Requests

**Development Platform**: 
- **Primary Language**: Lua for AO process handlers following AO development patterns
- **Local Development**: aolite for rapid iteration and testing before mainnet deployment
- **Message Protocol**: ADP v1.0 compliant JSON message structures for all external interfaces

**Process Communication Patterns**:
- **Individual World Instances**: Separate AO processes for each agent's world state to eliminate concurrency complexity
- **Shared Battle Process**: Centralized battle resolution process that agents from different worlds connect to for combat
- **State Synchronization**: Event-driven state updates between processes using AO's native message passing

**Performance Architecture**:
- **Computational Limits**: Design handlers to operate within AO process execution constraints per message
- **State Management**: Optimize for AO's persistent state patterns rather than traditional database approaches  
- **Message Throughput**: Handler design optimized for 1000+ messages/hour target with <2s response times

**Deployment Strategy**:
- **Local Testing**: Full aolite simulation environment for development and CI/CD
- **Mainnet Deployment**: Direct deployment to Arweave/AO network without traditional server infrastructure
- **Process Management**: Automated process spawning and configuration management for game instances
