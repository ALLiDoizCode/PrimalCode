# Tech Stack

## Cloud Infrastructure
- **Provider:** Arweave/AO Network
- **Key Services:** AO Process Runtime, Arweave Storage, AO Message Router
- **Deployment Regions:** Global (Arweave network nodes)

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Primary Language** | Lua | 5.3+ | AO process handler implementation | Native AO runtime language, optimized for process execution |
| **Process Runtime** | AO (Arweave Operating System) | Latest | Distributed process execution | Provides persistent, verifiable compute with native state management |
| **Message Protocol** | ADP (Arweave Data Protocol) | v1.0 | Standardized agent communication | Ensures consistent, documented interfaces for external agents |
| **Local Development** | aolite | Latest | AO process testing framework | Enables rapid local iteration before mainnet deployment |
| **AI Code Generation** | Permamind MCP Server | Latest | Lua process generation and tooling | Accelerates development with AO-specific code generation |
| **Development Tools** | Claude Code + MCP | Latest | AI-assisted development environment | Integrated development workflow with specialized AO tooling |
| **State Management** | AO Process State | Native | Persistent game state storage | Built-in AO state persistence eliminates external database needs |
| **Inter-Process Communication** | AO Native Messaging | Native | Process-to-process communication | Leverages AO's built-in message routing for reliable communication |
| **Testing Framework** | aolite + Custom Test Harness | Latest | Unit and integration testing | Local testing environment with mock agent interactions |
| **Documentation** | Markdown + Mermaid | Latest | Architecture and API documentation | Standard documentation format with diagram support |
| **Version Control** | Git | Latest | Source code management | Industry standard for collaborative development |
| **Deployment** | Arweave Network | Native | Process deployment and hosting | Direct deployment to decentralized compute network |
