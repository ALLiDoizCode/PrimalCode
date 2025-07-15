# Epic 5: Inference Provider Infrastructure

## Payment Processing Architecture (Corrected)

**Overview:** Epic 5 implements the AI inference marketplace payment processing system using the AO token blueprint's credit-notice and debit-notice messaging pattern for seamless payment confirmation and context preservation.

### Credit-Notice & Debit-Notice Message Flow

**Core Payment Architecture:**

1. **Process requests inference** → sends payment to inference provider
2. **AO token transfer occurs** → triggers automatic notice generation
3. **Credit-notice sent to inference provider** → "You've been paid, context included via X- tags"
4. **Debit-notice sent to monster process** → "Your balance was debited"
5. **Inference provider processes request** → knowing payment is confirmed

### AO Token Blueprint Integration

**X-Prefix Context Passing System:**

Based on the AO cookbook token blueprint, tags beginning with "X-" are automatically forwarded to both debit and credit notice messages during token transfers:

```lua
-- From AO Token Blueprint
for tagName, tagValue in pairs(msg) do
  -- Tags beginning with "X-" are forwarded
  if string.sub(tagName, 1, 2) == "X-" then
    debitNotice[tagName] = tagValue
    creditNotice[tagName] = tagValue
  end
end
```

**Credit-Notice Message Structure:**
```typescript
interface CreditNoticeMessage {
  Action: "Credit-Notice";
  From: string;           // Sender's wallet address
  To: string;             // Inference provider's wallet address
  Quantity: string;       // Amount paid
  
  // X-prefix context tags (automatically forwarded)
  "X-Request-Type": "decision-making" | "text-generation" | "image-analysis";
  "X-Request-ID": string;
  "X-Monster-ID": string;
  "X-Context-Data": string; // JSON stringified context
  "X-Priority": "standard" | "premium" | "enterprise";
  "X-Callback-Address": string; // Where to send results
}
```

### Provider Application Framework

**Credit-Notice Handler Implementation:**
```typescript
export class InferenceProviderFramework {
  private aoClient: AOClient;
  private paymentValidator: PaymentValidator;
  
  constructor(config: ProviderFrameworkConfig) {
    this.aoClient = new AOClient(config.walletPath);
    this.paymentValidator = new PaymentValidator(config.tokenProcessId);
  }
  
  async handleCreditNotice(message: CreditNoticeMessage): Promise<void> {
    // 1. Validate payment
    const paymentValid = await this.paymentValidator.validatePayment({
      from: message.From,
      amount: message.Quantity,
      requestType: message["X-Request-Type"]
    });
    
    if (!paymentValid) {
      await this.refundPayment(message);
      return;
    }
    
    // 2. Extract context from X-prefix tags
    const requestContext = this.extractRequestContext(message);
    
    // 3. Process AI inference request
    await this.processInferenceRequest(requestContext);
  }
  
  private extractRequestContext(message: CreditNoticeMessage): InferenceRequestContext {
    return {
      requestId: message["X-Request-ID"],
      monsterId: message["X-Monster-ID"],
      requestType: message["X-Request-Type"],
      contextData: JSON.parse(message["X-Context-Data"] || '{}'),
      priority: message["X-Priority"] || "standard",
      callbackAddress: message["X-Callback-Address"],
      paymentAmount: message.Quantity,
      payerAddress: message.From
    };
  }
}
```

### Payment Validation and Processing

**Payment Validator Implementation:**
```typescript
export class PaymentValidator {
  private tokenProcessId: string;
  private pricingTiers: PricingTierConfig;
  
  constructor(tokenProcessId: string) {
    this.tokenProcessId = tokenProcessId;
    this.pricingTiers = {
      "decision-making": { standard: "100", premium: "200", enterprise: "500" },
      "text-generation": { standard: "75", premium: "150", enterprise: "300" },
      "image-analysis": { standard: "200", premium: "400", enterprise: "800" }
    };
  }
  
  async validatePayment(payment: PaymentValidationRequest): Promise<boolean> {
    const expectedAmount = this.getExpectedPayment(
      payment.requestType,
      payment.priority || "standard"
    );
    
    // Validate payment amount matches service pricing
    if (payment.amount !== expectedAmount) {
      console.warn(`Payment amount mismatch: expected ${expectedAmount}, got ${payment.amount}`);
      return false;
    }
    
    // Additional validation: check sender reputation, rate limits, etc.
    return await this.validateSenderAndLimits(payment.from, payment.requestType);
  }
  
  private getExpectedPayment(requestType: string, priority: string): string {
    return this.pricingTiers[requestType]?.[priority] || "0";
  }
}
```

### AI Service Integration with Context

**Service Processing with Credit-Notice Context:**
```typescript
export class AIServiceProcessor {
  private claudeAPI: ClaudeAPIClient;
  private openAI: OpenAIAPIClient;
  
  async processInferenceRequest(context: InferenceRequestContext): Promise<void> {
    try {
      let result: AIInferenceResult;
      
      // Process based on request type from credit-notice X-prefix
      switch (context.requestType) {
        case "decision-making":
          result = await this.processDecisionRequest(context);
          break;
        case "text-generation":
          result = await this.processTextGeneration(context);
          break;
        case "image-analysis":
          result = await this.processImageAnalysis(context);
          break;
        default:
          throw new Error(`Unsupported request type: ${context.requestType}`);
      }
      
      // Send result back to callback address from credit-notice
      await this.sendResultToCallback(context.callbackAddress, result);
      
    } catch (error) {
      // Handle error and refund payment
      await this.handleProcessingError(context, error);
    }
  }
  
  private async processDecisionRequest(context: InferenceRequestContext): Promise<AIInferenceResult> {
    const prompt = this.buildDecisionPrompt(context.contextData, context.monsterId);
    
    const response = await this.claudeAPI.generateText({
      prompt,
      maxTokens: context.priority === "enterprise" ? 2000 : 1000,
      temperature: 0.7
    });
    
    return {
      requestId: context.requestId,
      result: response.text,
      processingTime: Date.now() - context.startTime,
      provider: "claude-3-sonnet",
      quality: context.priority
    };
  }
}
```

### Monster Process Integration

**Monster Process Payment Flow:**
```typescript
// Monster process sends payment with context via X-prefix tags
export class MonsterInferenceClient {
  private aoClient: AOClient;
  private tokenProcessId: string;
  
  async requestInference(request: MonsterInferenceRequest): Promise<void> {
    // Send token transfer with X-prefix context tags
    await this.aoClient.sendMessage({
      Target: this.tokenProcessId,
      Action: "Transfer",
      Data: JSON.stringify({
        Target: request.providerAddress,
        Quantity: request.paymentAmount
      }),
      Tags: {
        // Standard transfer tags
        Recipient: request.providerAddress,
        Quantity: request.paymentAmount,
        
        // X-prefix context tags (automatically forwarded to credit-notice)
        "X-Request-Type": request.requestType,
        "X-Request-ID": request.requestId,
        "X-Monster-ID": this.monsterId,
        "X-Context-Data": JSON.stringify(request.contextData),
        "X-Priority": request.priority || "standard",
        "X-Callback-Address": this.aoClient.getWalletAddress()
      }
    });
    
    // Payment triggers automatic credit-notice to provider
    // and debit-notice to this monster process
  }
}
```

### Debit-Notice Handling

**Monster Process Debit-Notice Handler:**
```typescript
export class MonsterPaymentTracker {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  
  async handleDebitNotice(message: DebitNoticeMessage): Promise<void> {
    // Extract request context from X-prefix tags
    const requestId = message["X-Request-ID"];
    const paymentAmount = message.Quantity;
    
    // Update local balance tracking
    await this.updateBalance(-parseInt(paymentAmount));
    
    // Track pending inference request
    this.pendingRequests.set(requestId, {
      requestId,
      paymentAmount,
      providerAddress: message.To,
      timestamp: Date.now(),
      status: "payment-sent"
    });
    
    // Set timeout for response
    setTimeout(() => {
      this.handleRequestTimeout(requestId);
    }, 30000); // 30 second timeout
  }
  
  async handleInferenceResult(result: AIInferenceResult): Promise<void> {
    const request = this.pendingRequests.get(result.requestId);
    if (request) {
      request.status = "completed";
      request.result = result;
      
      // Process the AI decision/result
      await this.processAIResult(result);
      
      // Clean up tracking
      this.pendingRequests.delete(result.requestId);
    }
  }
}
```

### Project Structure & Deployment Architecture

**Directory Structure (Updated with Teal AO Architecture):**
```
PrimalCode/
├── src/                           # Main MCP server code
│   ├── index.ts                   # MCP server entry point
│   ├── tools/                     # MCP tools implementation
│   └── utils/                     # Core utilities
├── ao-processes/                  # Teal-based AO processes (clean separation)
│   ├── monster/                   # Monster creature process
│   │   ├── src/
│   │   │   ├── main.tl           # Main Teal entry point
│   │   │   ├── handlers/
│   │   │   │   ├── credit-notice.tl
│   │   │   │   ├── debit-notice.tl
│   │   │   │   └── decision-making.tl
│   │   │   └── utils/
│   │   │       └── payment-utils.tl
│   │   ├── build/                # Compiled Lua output
│   │   └── package.json          # Teal build dependencies
│   ├── marketplace/              # Marketplace processes
│   │   ├── registry/             # Provider registry
│   │   └── payment/              # Payment handler
│   ├── shared/                   # Shared AO utilities
│   │   └── src/
│   │       ├── ao-types.d.tl     # Common type definitions
│   │       └── token-blueprint.tl
│   └── scripts/                  # Build and deployment scripts
│       ├── build-all.sh
│       └── deploy-all.sh
├── inference-provider/            # Epic 5 - Separate directory
│   ├── src/
│   │   ├── index.ts              # Provider server entry point
│   │   ├── handlers/
│   │   │   ├── credit-notice.ts  # Credit-notice handler
│   │   │   └── debit-notice.ts   # Debit-notice handler
│   │   ├── services/
│   │   │   ├── ai-service.ts     # AI inference processing
│   │   │   ├── payment-validator.ts
│   │   │   └── ao-client.ts      # AO blockchain client
│   │   ├── types/
│   │   │   └── inference.ts      # Provider-specific types
│   │   └── utils/
│   │       └── context-extractor.ts
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   ├── config/
│   │   └── provider-config.ts
│   ├── tests/
│   ├── package.json              # Separate dependencies
│   └── tsconfig.json            # Provider-specific config
├── docs/                         # Shared documentation
└── package.json                 # Main project dependencies
```

**Container-Based Provider Deployment:**
```yaml
# inference-provider/docker/docker-compose.yml
version: '3.8'
services:
  inference-provider:
    build: 
      context: ..
      dockerfile: docker/Dockerfile
    environment:
      - AO_WALLET_PATH=/app/wallet/wallet.json
      - TOKEN_PROCESS_ID=your-token-process-id
      - CLAUDE_API_KEY=your-claude-api-key
      - PROVIDER_ADDRESS=your-provider-address
    volumes:
      - ./wallet:/app/wallet:ro
      - ./logs:/app/logs
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Summary

**Key Architecture Points:**

1. **Separated Concerns**: Inference provider is isolated in its own directory, keeping main MCP server clean
2. **Messages, not endpoints**: Credit/debit notices are AO messages, not MCP server endpoints
3. **Bilateral notification**: Both inference provider and monster process receive payment notices
4. **Context preservation**: X-prefixed tags carry request context through the payment flow
5. **Payment confirmation**: Inference provider knows it's been paid before processing
6. **Decentralized flow**: AO token contract handles notification, ensuring synchronized payment state
7. **Independent deployment**: Provider can be deployed as separate microservice without affecting main system

**Directory Structure Benefits:**
- **Clean Architecture**: Main MCP server stays focused on core responsibilities
- **AO Process Isolation**: AO processes use Teal for type safety and professional development
- **Independent Deployment**: Inference provider deploys separately as microservice
- **Separate Dependencies**: Provider has its own AI/ML dependencies without bloating main project
- **Scalability**: Multiple providers can be added without affecting core system
- **Development Isolation**: Teams can work on provider without touching main codebase
- **Type Safety**: Teal provides compile-time checks for AO processes, reducing runtime errors
- **Professional Workflow**: teal-ao-starter template provides TypeScript-like development experience

This architecture creates a **decentralized payment notification system** where the AO token contract itself manages the payment flow, enabling secure, context-aware AI inference transactions in the autonomous ecosystem while maintaining clean project structure.