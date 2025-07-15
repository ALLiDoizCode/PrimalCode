# Testing Strategy

## Testing Pyramid
```
                  E2E Tests
                 /        \
            Integration Tests
               /            \
          MCP Tool Tests  AO Process Tests
```

## Test Organization

### MCP Tool Tests
```
tests/unit/tools/
├── ecosystem-observer.test.ts
├── environment-modifier.test.ts
├── monster-analyzer.test.ts
├── route-manager.test.ts
├── influence-tracker.test.ts
└── capture-mechanics.test.ts
```

### AO Process Tests
```
tests/unit/ao-processes/
├── monster-process.test.lua
├── environment-process.test.lua
├── player-process.test.lua
└── message-handlers.test.lua
```

### Integration Tests
```
tests/integration/
├── mcp-ao-communication.test.ts
├── ai-decision-flow.test.ts
├── ecosystem-workflows.test.ts
└── player-progression.test.ts
```

## Test Examples

### MCP Tool Test
```typescript
describe('EcosystemObserver', () => {
  let tool: EcosystemObserverTool;
  let mockAOClient: jest.Mocked<AOClient>;
  
  beforeEach(() => {
    mockAOClient = createMockAOClient();
    tool = new EcosystemObserverTool(mockAOClient);
  });
  
  it('should generate engaging ecosystem description', async () => {
    // Arrange
    const mockEnvironment = createMockEnvironment();
    const mockMonsters = createMockMonsters();
    mockAOClient.queryEnvironment.mockResolvedValue(mockEnvironment);
    mockAOClient.queryMonsters.mockResolvedValue(mockMonsters);
    
    // Act
    const result = await tool.execute({ route_id: 'forest_path' });
    
    // Assert
    expect(result.currentState).toContain('forest path');
    expect(result.monsterBehaviors).toHaveLength(mockMonsters.length);
    expect(result.suggestedActions).toBeInstanceOf(Array);
  });
});
```

### AO Process Test
```lua
-- Monster Process Test
local monster = require('./monster-process')

describe("Monster Decision Making", function()
  it("should make hunting decision when hungry", function()
    -- Arrange
    local test_monster = {
      stats = { hunger = 80, energy = 60, health = 100 },
      ai_personality = { aggression = 0.7 },
      environmental_awareness = { detected_prey = {"small_creature"} }
    }
    
    -- Act
    local decision = monster.make_decision(test_monster)
    
    -- Assert
    assert.equal(decision.action, "hunt")
    assert.equal(decision.target, "small_creature")
  end)
end)
```

### E2E Test
```typescript
describe('Complete Ecosystem Management Flow', () => {
  it('should allow player to modify environment and observe monster adaptation', async () => {
    // Arrange
    const player = await setupTestPlayer();
    const route = await setupTestRoute();
    
    // Act - Place food in ecosystem
    await mcpClient.callTool('modify_environment', {
      route_id: route.id,
      modification_type: 'food',
      location: { x: 100, y: 100 }
    });
    
    // Wait for monster adaptation
    await wait(30000);
    
    // Observe ecosystem changes
    const observation = await mcpClient.callTool('observe_ecosystem', {
      route_id: route.id
    });
    
    // Assert
    expect(observation.currentState).toContain('food source');
    expect(observation.monsterBehaviors).toContain('foraging');
  });
});
```
