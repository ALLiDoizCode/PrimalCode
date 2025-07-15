# API Specification

## MCP Tool Specification

The API follows MCP (Model Context Protocol) tool patterns for natural language interaction:

```typescript
// MCP Tool Schema
interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

// Ecosystem Observer Tool
const observeEcosystemTool: MCPTool = {
  name: "observe_ecosystem",
  description: "Get detailed natural language description of current ecosystem state",
  inputSchema: {
    type: "object",
    properties: {
      route_id: { type: "string", description: "Route/habitat to observe" },
      focus: { type: "string", description: "Specific aspect to focus on (monsters, environment, interactions)" }
    },
    required: ["route_id"]
  }
};

// Environment Modifier Tool
const modifyEnvironmentTool: MCPTool = {
  name: "modify_environment",
  description: "Make strategic environmental changes to influence monster behavior",
  inputSchema: {
    type: "object",
    properties: {
      route_id: { type: "string", description: "Route to modify" },
      modification_type: { type: "string", enum: ["shelter", "food", "barrier", "weather"] },
      location: { type: "object", properties: { x: { type: "number" }, y: { type: "number" } } },
      parameters: { type: "object", description: "Modification-specific parameters" }
    },
    required: ["route_id", "modification_type", "location"]
  }
};

// Inference Marketplace Tool
const inferenceMarketplaceTool: MCPTool = {
  name: "inference_marketplace",
  description: "Interact with AI inference marketplace - discover providers, request services, check reputation",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["discover_providers", "request_inference", "check_reputation", "view_transactions"] },
      service_type: { type: "string", description: "Type of AI service needed" },
      provider_id: { type: "string", description: "Specific provider ID (optional)" },
      context_data: { type: "object", description: "Inference parameters and context" },
      max_cost: { type: "string", description: "Maximum tokens willing to spend" }
    },
    required: ["action"]
  }
};
```

## AO Message Schemas

Inter-process communication follows standardized message formats:

```typescript
// Monster Decision Request
interface MonsterDecisionMessage {
  Action: "Make-Decision";
  Data: {
    monster_id: string;
    context: {
      current_state: MonsterState;
      environment: EnvironmentalContext;
      nearby_monsters: MonsterInfo[];
      player_influences: PlayerInfluence[];
    };
    decision_urgency: "low" | "medium" | "high";
  };
}

// Environment Modification Message
interface EnvironmentModificationMessage {
  Action: "Environment-Change";
  Data: {
    route_id: string;
    modification: {
      type: string;
      location: { x: number; y: number };
      parameters: Record<string, any>;
      duration: number;
    };
    player_id: string;
  };
}

// Monster Communication Message
interface MonsterCommunicationMessage {
  Action: "Monster-Communication";
  Data: {
    message_type: "territory_claim" | "threat_warning" | "resource_share";
    sender_id: string;
    target_id?: string;
    content: Record<string, any>;
    urgency: "low" | "medium" | "high";
  };
}

// AI Inference Request Message
interface AIInferenceRequestMessage {
  Action: "AI-Inference-Request";
  Data: {
    request_id: string;
    service_type: string;
    context_data: any;
    payment_amount: string;
    timeout: number;
  };
  Tags: {
    "X-Service-Type": string;
    "X-Request-ID": string;
    "X-Provider-ID": string;
    "X-Context-Data": string;
    "X-Quality-Tier": string;
    "X-Timeout": string;
  };
}

// AI Inference Response Message  
interface AIInferenceResponseMessage {
  Action: "AI-Inference-Response";
  Data: {
    request_id: string;
    inference_result: any;
    quality_score: number;
    response_time: number;
  };
  Tags: {
    "X-Request-ID": string;
    "X-Provider-ID": string;
    "X-Quality-Score": string;
  };
}

// Provider Registration Message
interface ProviderRegistrationMessage {
  Action: "Provider-Registration";
  Data: {
    provider_id: string;
    capabilities: string[];
    pricing: Record<string, string>;
    description: string;
    x_tags_supported: string[];
  };
}

// Credit-Notice Message (AO Token Blueprint)
interface CreditNoticeMessage {
  Action: "Credit-Notice";
  Data: {
    sender: string;
    quantity: string;
    message: string;
  };
  Tags: {
    "X-Service-Type"?: string;
    "X-Request-ID"?: string;
    "X-Provider-ID"?: string;
    [key: string]: string | undefined; // Additional X-prefixed tags
  };
}

// Debit-Notice Message (AO Token Blueprint)
interface DebitNoticeMessage {
  Action: "Debit-Notice";
  Data: {
    recipient: string;
    quantity: string;
    message: string;
  };
  Tags: {
    "X-Service-Type"?: string;
    "X-Request-ID"?: string;
    "X-Provider-ID"?: string;
    [key: string]: string | undefined; // Additional X-prefixed tags
  };
}
```
