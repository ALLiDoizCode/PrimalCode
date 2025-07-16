# Node.js Inference Provider Architecture

## Credit-Notice Flow Implementation

**Architecture Pattern:** Event-driven microservice that listens for Credit-Notice messages from the Primal Token Process and provides AI inference services.

### Core Components

**1. Credit-Notice Message Handler**
```typescript
// Credit-Notice Handler for Inference Providers
export class CreditNoticeHandler {
  constructor(
    private aoClient: AOClient,
    private aiClient: AIClient,
    private serviceRegistry: ServiceRegistry
  ) {}

  async handleCreditNotice(message: CreditNoticeMessage): Promise<void> {
    try {
      // Parse X-prefix metadata
      const metadata = this.parseXMetadata(message.Tags);
      
      // Validate payment amount
      if (!this.validatePayment(message.Data.quantity, metadata.serviceType)) {
        await this.initiateRefund(message.Data.sender, message.Data.quantity);
        return;
      }

      // Process inference request
      const inferenceResult = await this.processInferenceRequest(
        metadata.serviceType,
        metadata.contextData,
        metadata.requestId
      );

      // Send response to monster process
      await this.sendInferenceResponse(
        message.Data.sender,
        metadata.requestId,
        inferenceResult
      );

      // Report successful completion
      await this.reportCompletion(metadata.requestId, true);
    } catch (error) {
      await this.handleError(message, error);
    }
  }

  private parseXMetadata(tags: Record<string, string>): InferenceMetadata {
    return {
      serviceType: tags["X-Service-Type"],
      requestId: tags["X-Request-ID"],
      contextData: JSON.parse(tags["X-Context-Data"] || "{}"),
      qualityTier: tags["X-Quality-Tier"] || "standard",
      timeout: parseInt(tags["X-Timeout"] || "30000")
    };
  }

  private async processInferenceRequest(
    serviceType: string,
    contextData: any,
    requestId: string
  ): Promise<InferenceResult> {
    // Process based on service type
    switch (serviceType) {
      case "decision-making":
        return await this.aiClient.generateDecision(contextData);
      case "text-generation":
        return await this.aiClient.generateText(contextData);
      case "image-analysis":
        return await this.aiClient.analyzeImage(contextData);
      default:
        throw new Error(`Unsupported service type: ${serviceType}`);
    }
  }
}
```

**2. AI Service Integration**
```typescript
// marketplace AI inference Client for Inference Providers
export class MarketplaceInferenceClient {
  constructor(private apiKey: string) {}

  async generateDecision(context: MonsterDecisionContext): Promise<DecisionResult> {
    const prompt = this.buildDecisionPrompt(context);
    
    const response = await this.claude.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    });

    return this.parseDecisionResponse(response.content[0].text);
  }

  private buildDecisionPrompt(context: MonsterDecisionContext): string {
    return `
      You are an AI helping a monster make a decision in PrimalCode.
      
      Monster State: ${JSON.stringify(context.monsterState)}
      Environment: ${JSON.stringify(context.environment)}
      Nearby Monsters: ${JSON.stringify(context.nearbyMonsters)}
      
      Based on this context, what should the monster do next?
      Respond with a JSON object containing:
      - action: string (hunt, rest, explore, flee, etc.)
      - reasoning: string
      - confidence: number (0-1)
      - duration: number (seconds)
    `;
  }
}
```

**3. Service Registration**
```typescript
// Service Registry Integration
export class InferenceProviderRegistry {
  async registerProvider(config: ProviderConfig): Promise<void> {
    const registrationMessage = {
      Action: "Provider-Registration",
      Data: {
        provider_id: config.providerId,
        capabilities: config.capabilities,
        pricing: config.pricing,
        description: config.description,
        x_tags_supported: config.supportedXTags
      }
    };

    await this.aoClient.sendMessage(
      config.registryProcessId,
      registrationMessage
    );
  }

  async sendHeartbeat(providerId: string): Promise<void> {
    const heartbeatMessage = {
      Action: "Provider-Heartbeat",
      Data: {
        provider_id: providerId,
        timestamp: Date.now(),
        status: "active"
      }
    };

    await this.aoClient.sendMessage(
      this.registryProcessId,
      heartbeatMessage
    );
  }
}
```

**4. Main Application Structure**
```typescript
// Main Inference Provider Application
export class InferenceProviderApp {
  private creditNoticeHandler: CreditNoticeHandler;
  private serviceRegistry: InferenceProviderRegistry;
  private aoClient: AOClient;

  constructor(config: InferenceProviderConfig) {
    this.aoClient = new AOClient(config.walletPath);
    this.creditNoticeHandler = new CreditNoticeHandler(
      this.aoClient,
      new MarketplaceInferenceClient(config.claudeApiKey),
      this.serviceRegistry
    );
  }

  async start(): Promise<void> {
    // Register with the marketplace
    await this.serviceRegistry.registerProvider({
      providerId: this.config.providerId,
      capabilities: ["decision-making", "text-generation"],
      pricing: {
        "decision-making": "250",
        "text-generation": "100"
      },
      description: "High-quality AI inference using marketplace AI inference",
      supportedXTags: ["X-Context-Data", "X-Quality-Tier", "X-Timeout"]
    });

    // Start listening for Credit-Notice messages
    await this.aoClient.subscribe({
      Action: "Credit-Notice",
      Handler: this.creditNoticeHandler.handleCreditNotice.bind(this.creditNoticeHandler)
    });

    // Start heartbeat
    setInterval(async () => {
      await this.serviceRegistry.sendHeartbeat(this.config.providerId);
    }, 30000);

    console.log(`Inference Provider ${this.config.providerId} started`);
  }
}
```

## Deployment Architecture

**Container Structure:**
```dockerfile