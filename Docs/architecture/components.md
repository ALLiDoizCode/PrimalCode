# Components

## FastMCP Server

**Responsibility:** Hosts MCP tools and manages communication between AI clients and AO processes

**Key Interfaces:**
- MCP Protocol endpoints for tool execution
- AO Process communication via message passing
- Error handling and graceful degradation
- Real-time ecosystem state synchronization

**Dependencies:** FastMCP framework, AO Client, Winston logging

**Technology Stack:** TypeScript, FastMCP npm package, WebSocket connections

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
- AI inference marketplace integration with context optimization
- Decision caching and pattern recognition
- Rule-based fallback for marketplace failures
- Behavioral adaptation and learning

**Dependencies:** Marketplace API, Decision Cache, Monster State

**Technology Stack:** TypeScript, Marketplace API, Redis caching

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

**Responsibility:** Tracks player progress, Primal token balance, and ecosystem mastery

**Key Interfaces:**
- Wallet authentication and authorization
- Primal token economy management
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

## Marketplace Service Discovery Enhancement

**Responsibility:** Advanced service discovery and provider matching system that intelligently routes AI inference requests to optimal providers based on requirements, performance history, and real-time availability.

**Key Interfaces:**
- Intelligent provider matching based on service requirements and constraints
- Dynamic provider scoring with multi-factor optimization (cost, speed, quality, reliability)
- Real-time provider availability monitoring and failover routing
- Historical performance analysis and trend prediction for provider selection
- Service requirement parsing and capability matching
- Load balancing and request distribution optimization

**Service Discovery Architecture:**
```typescript
// Enhanced Service Discovery with Intelligent Routing
export class MarketplaceServiceDiscovery {
  private providerCapabilities: Map<string, ProviderCapability[]> = new Map();
  private performanceHistory: Map<string, PerformanceData> = new Map();
  private realTimeMetrics: Map<string, RealTimeMetrics> = new Map();
  
  async discoverOptimalProvider(
    serviceRequest: ServiceRequest
  ): Promise<ProviderSelection> {
    // Multi-stage provider discovery process
    const candidates = await this.findCandidateProviders(serviceRequest);
    const scored = await this.scoreProviders(candidates, serviceRequest);
    const optimized = await this.optimizeSelection(scored, serviceRequest);
    
    return {
      primaryProvider: optimized.primary,
      backupProviders: optimized.backups,
      routingReason: optimized.reasoning,
      expectedPerformance: optimized.performance,
      costEstimate: optimized.cost,
      fallbackStrategy: optimized.fallback
    };
  }
  
  private async findCandidateProviders(
    request: ServiceRequest
  ): Promise<ProviderCandidate[]> {
    const candidates: ProviderCandidate[] = [];
    
    for (const [providerId, capabilities] of this.providerCapabilities) {
      const matchingCapabilities = capabilities.filter(cap => 
        cap.serviceType === request.serviceType &&
        this.meetsRequirements(cap, request.requirements)
      );
      
      if (matchingCapabilities.length > 0) {
        candidates.push({
          providerId,
          capabilities: matchingCapabilities,
          availability: await this.checkProviderAvailability(providerId),
          currentLoad: await this.getCurrentLoad(providerId)
        });
      }
    }
    
    return candidates;
  }
  
  private async scoreProviders(
    candidates: ProviderCandidate[],
    request: ServiceRequest
  ): Promise<ScoredProvider[]> {
    const scored: ScoredProvider[] = [];
    
    for (const candidate of candidates) {
      const performance = this.performanceHistory.get(candidate.providerId);
      const realTime = this.realTimeMetrics.get(candidate.providerId);
      
      const qualityScore = this.calculateQualityScore(performance, request);
      const speedScore = this.calculateSpeedScore(performance, realTime, request);
      const costScore = this.calculateCostScore(candidate, request);
      const reliabilityScore = this.calculateReliabilityScore(performance);
      const availabilityScore = this.calculateAvailabilityScore(candidate, realTime);
      
      const totalScore = (
        qualityScore * request.weights.quality +
        speedScore * request.weights.speed +
        costScore * request.weights.cost +
        reliabilityScore * request.weights.reliability +
        availabilityScore * request.weights.availability
      );
      
      scored.push({
        candidate,
        score: totalScore,
        breakdown: {
          quality: qualityScore,
          speed: speedScore,
          cost: costScore,
          reliability: reliabilityScore,
          availability: availabilityScore
        }
      });
    }
    
    return scored.sort((a, b) => b.score - a.score);
  }
  
  private async optimizeSelection(
    scored: ScoredProvider[],
    request: ServiceRequest
  ): Promise<OptimizedSelection> {
    const primary = scored[0];
    const backups = scored.slice(1, 3);
    
    return {
      primary: primary.candidate,
      backups: backups.map(s => s.candidate),
      reasoning: this.generateSelectionReasoning(primary, request),
      performance: this.predictPerformance(primary, request),
      cost: this.calculateExpectedCost(primary, request),
      fallback: this.createFallbackStrategy(backups, request)
    };
  }
}
```

**Provider Capability Matching:**
```typescript
// Advanced Capability Matching System
export class ProviderCapabilityMatcher {
  async matchCapabilities(
    serviceType: string,
    requirements: ServiceRequirements
  ): Promise<CapabilityMatch[]> {
    const availableProviders = await this.getAvailableProviders();
    const matches: CapabilityMatch[] = [];
    
    for (const provider of availableProviders) {
      const capability = provider.capabilities.find(c => c.serviceType === serviceType);
      if (!capability) continue;
      
      const compatibilityScore = this.calculateCompatibilityScore(
        capability,
        requirements
      );
      
      if (compatibilityScore > 0.7) { // Minimum compatibility threshold
        matches.push({
          providerId: provider.id,
          capability,
          compatibilityScore,
          estimatedPerformance: await this.estimatePerformance(provider, requirements),
          pricing: await this.calculatePricing(provider, requirements)
        });
      }
    }
    
    return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }
  
  private calculateCompatibilityScore(
    capability: ProviderCapability,
    requirements: ServiceRequirements
  ): number {
    let score = 0;
    let maxScore = 0;
    
    // Quality tier matching
    if (requirements.qualityTier) {
      maxScore += 0.3;
      if (capability.supportedQualityTiers.includes(requirements.qualityTier)) {
        score += 0.3;
      }
    }
    
    // Response time requirements
    if (requirements.maxResponseTime) {
      maxScore += 0.2;
      if (capability.avgResponseTime <= requirements.maxResponseTime) {
        score += 0.2;
      }
    }
    
    // Cost constraints
    if (requirements.maxCost) {
      maxScore += 0.2;
      if (capability.pricing <= requirements.maxCost) {
        score += 0.2;
      }
    }
    
    // Availability requirements
    if (requirements.availabilityRequirement) {
      maxScore += 0.15;
      if (capability.availability >= requirements.availabilityRequirement) {
        score += 0.15;
      }
    }
    
    // Feature compatibility
    if (requirements.features) {
      maxScore += 0.15;
      const matchedFeatures = requirements.features.filter(f => 
        capability.supportedFeatures.includes(f)
      );
      score += 0.15 * (matchedFeatures.length / requirements.features.length);
    }
    
    return maxScore > 0 ? score / maxScore : 0;
  }
}
```

**Dependencies:** Provider Registry, Reputation Manager, Real-time Metrics Collector, Performance Analytics

**Technology Stack:** TypeScript, AO SDK, Performance Analytics, Machine Learning Models

**Architecture Pattern:** Intelligent routing with multi-factor optimization and real-time adaptation
