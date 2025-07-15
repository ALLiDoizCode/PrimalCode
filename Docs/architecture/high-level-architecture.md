# High Level Architecture

## Technical Summary

PrimalCode implements a **conversational MCP server architecture** where players interact with autonomous AI creatures through natural language commands via Claude Desktop. The system leverages **AO processes** for persistent, autonomous monster behavior, with each creature running as an independent process on the Arweave network. The **FastMCP npm package** provides the bridge between AI clients and the creature ecosystem, enabling rich text-based ecosystem management without traditional UI complexity. 

**Epic 4 Enhancement:** The architecture now includes an **AI Inference Marketplace** that enables autonomous processes to request AI inference services by transferring Primal tokens to providers, with automated registry and reputation management. This creates a token-based economy for AI services while maintaining the core autonomous creature experience.

This architecture creates a truly unique gaming experience that combines decentralized autonomous agents with natural language interaction patterns and a distributed AI services economy.

## Platform and Infrastructure Choice

**Platform:** Hybrid Cloud + Arweave/AO Network

**Key Services:**
- **MCP Server Hosting:** AWS/Vercel with auto-scaling capabilities
- **Autonomous Processes:** AO Runtime on Arweave network
- **AI Integration:** Claude API with intelligent fallback systems
- **Monitoring:** CloudWatch + Custom AO process health monitoring
- **Storage:** AO process state + Arweave permanent backup

**Deployment Host and Regions:** 
- Primary: US-East (Virginia) for low latency to Claude API
- Secondary: EU-West (Ireland) for global accessibility
- AO Network: Global decentralized deployment

## Repository Structure

**Structure:** Monorepo with specialized MCP + AO architecture

**Monorepo Tool:** npm workspaces (lightweight, FastMCP compatible)

**Package Organization:**
- `src/` - MCP server implementation
- `ao-processes/` - Lua-based monster and environment processes
- `packages/shared/` - TypeScript types shared between MCP tools
- `docs/` - Architecture and API documentation
- `scripts/` - Deployment and AO process management utilities

## High Level Architecture Diagram

```mermaid
graph TB
    subgraph "Player Interface Layer"
        CD[Claude Desktop]
        AC[Other AI Clients]
        WEB[Web MCP Clients]
    end
    
    subgraph "MCP Server Layer"
        MCP[FastMCP Server]
        
        subgraph "MCP Tools"
            OBS[Ecosystem Observer]
            MOD[Environment Modifier]
            ANA[Monster Analyzer]
            CAP[Capture Mechanics]
            NAV[Route Navigator]
            INF[Influence Tracker]
            MARKET[Inference Marketplace]
        end
        
        subgraph "Integration Layer"
            AO_CLIENT[AO Client]
            AI_CLIENT[AI Integration]
            CACHE[Decision Cache]
        end
    end
    
    subgraph "AO Process Layer"
        MP1[Monster Process 1]
        MP2[Monster Process 2]
        MP3[Monster Process N]
        ENV[Environment Manager]
        PLY[Player State Process]
        MARKETPLACE[Marketplace Core]
        REGISTRY[Provider Registry]
        REPUTATION[Reputation Manager]
        
        subgraph "Process Communication"
            MSG[Message Bus]
            COORD[Coordination Layer]
        end
    end
    
    subgraph "AI Decision Layer"
        API[Claude API]
        FALLBACK[Rule-based Fallback]
        STATIC[Static Behaviors]
    end
    
    subgraph "Arweave Network"
        AO[AO Runtime]
        AR[Permanent Storage]
        BACKUP[State Backup]
    end
    
    CD --> MCP
    AC --> MCP
    WEB --> MCP
    
    MCP --> OBS
    MCP --> MOD
    MCP --> ANA
    MCP --> CAP
    MCP --> NAV
    MCP --> INF
    MCP --> MARKET
    
    OBS --> AO_CLIENT
    MOD --> AO_CLIENT
    ANA --> AO_CLIENT
    CAP --> AO_CLIENT
    NAV --> AO_CLIENT
    INF --> AO_CLIENT
    MARKET --> AO_CLIENT
    
    AO_CLIENT --> MP1
    AO_CLIENT --> MP2
    AO_CLIENT --> MP3
    AO_CLIENT --> ENV
    AO_CLIENT --> PLY
    AO_CLIENT --> MARKETPLACE
    AO_CLIENT --> REGISTRY
    AO_CLIENT --> REPUTATION
    
    MP1 --> MSG
    MP2 --> MSG
    MP3 --> MSG
    ENV --> MSG
    PLY --> MSG
    MARKETPLACE --> MSG
    REGISTRY --> MSG
    REPUTATION --> MSG
    
    MSG --> COORD
    
    MP1 --> AI_CLIENT
    MP2 --> AI_CLIENT
    MP3 --> AI_CLIENT
    
    AI_CLIENT --> API
    AI_CLIENT --> CACHE
    API --> FALLBACK
    FALLBACK --> STATIC
    
    MP1 --> AO
    MP2 --> AO
    MP3 --> AO
    ENV --> AO
    PLY --> AO
    MARKETPLACE --> AO
    REGISTRY --> AO
    REPUTATION --> AO
    
    AO --> AR
    AO --> BACKUP
```

## Architectural Patterns

- **Conversational Interface Pattern:** Natural language tool interfaces for complex ecosystem management - _Rationale:_ Enables intuitive interaction with complex autonomous systems without traditional UI complexity
- **Autonomous Agent Pattern:** Independent AO processes with persistent state and decision-making - _Rationale:_ Creates truly autonomous creatures that operate independently of player presence
- **Multi-tier Decision Fallback:** Hierarchical AI decision system with graceful degradation - _Rationale:_ Ensures system reliability while maintaining intelligent behavior under various conditions
- **Event-Driven Communication:** AO message passing for inter-process coordination - _Rationale:_ Enables complex creature interactions while maintaining process isolation
- **Decentralized Persistence:** State management through AO processes with Arweave backup - _Rationale:_ Provides permanent, tamper-proof game state without traditional database costs
- **Tool-Based Architecture:** MCP tools as primary interface abstraction - _Rationale:_ Standardizes natural language interactions while maintaining extensibility
- **Token-Based Marketplace Pattern:** AO Token Blueprint with Credit-Notice/Debit-Notice handlers - _Rationale:_ Creates organic economic activity through AI inference service trading
- **X-Prefix Forwarding Pattern:** Extensible metadata passing through token transfers - _Rationale:_ Enables contextual information flow in marketplace transactions
