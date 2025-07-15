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
```
