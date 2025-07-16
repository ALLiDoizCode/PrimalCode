import { PlaceFoodTool, PlaceFoodRequest } from '../../../src/tools/place-food';
import { PrimalTokenService } from '../../../src/utils/primal-token-service';
import { MockEnvironmentState } from '../../../src/ecosystem/environment-state';

describe('PlaceFoodTool', () => {
  let tool: PlaceFoodTool;
  let tokenService: PrimalTokenService;
  let environmentState: MockEnvironmentState;

  beforeEach(() => {
    tokenService = new PrimalTokenService();
    environmentState = new MockEnvironmentState();
    tool = new PlaceFoodTool(tokenService, environmentState);
    
    // Reset token balance for each test
    tokenService.resetBalance(1000);
  });

  describe('execute', () => {
    const validRequest: PlaceFoodRequest = {
      route_id: 'route_001',
      location: { x: 100, y: 100 },
      food_type: 'berries',
      quantity: 50
    };

    it('should successfully place food with valid parameters', async () => {
      const result = await tool.execute(validRequest);

      expect(result.success).toBe(true);
      expect(result.placement_confirmation).toContain('berries');
      expect(result.placement_confirmation).toContain('(100, 100)');
      expect(result.expected_monster_response).toContain('foraging');
      expect(result.ecosystem_impact).toBeInstanceOf(Array);
      expect(result.ecosystem_impact.length).toBeGreaterThan(0);
      expect(result.token_transaction.cost).toBe(10);
      expect(result.token_transaction.new_balance).toBe(990);
      expect(result.modification_id).toMatch(/^food_/);
    });

    it('should handle different food types correctly', async () => {
      const meatRequest = { ...validRequest, food_type: 'meat' as const };
      const result = await tool.execute(meatRequest);

      expect(result.success).toBe(true);
      expect(result.placement_confirmation).toContain('meat');
      expect(result.expected_monster_response).toContain('Carnivorous');
    });

    it('should use default quantity when not specified', async () => {
      const requestWithoutQuantity = {
        route_id: 'route_001',
        location: { x: 200, y: 200 },
        food_type: 'nectar' as const
      };

      const result = await tool.execute(requestWithoutQuantity);

      expect(result.success).toBe(true);
      expect(result.placement_confirmation).toContain('50'); // Default quantity
    });

    it('should fail with insufficient tokens', async () => {
      tokenService.resetBalance(5); // Less than required 10 tokens

      await expect(tool.execute(validRequest)).rejects.toThrow('Insufficient Primal tokens');
    });

    it('should fail with invalid route', async () => {
      const invalidRequest = { ...validRequest, route_id: 'nonexistent_route' };

      await expect(tool.execute(invalidRequest)).rejects.toThrow('Route nonexistent_route not found');
    });

    it('should fail with out-of-bounds location', async () => {
      const invalidLocationRequest = { ...validRequest, location: { x: 1500, y: 100 } };

      await expect(tool.execute(invalidLocationRequest)).rejects.toThrow('Location must be within bounds');
    });

    it('should provide different responses for different food types', async () => {
      const insectsRequest = { ...validRequest, food_type: 'insects' as const };
      const result = await tool.execute(insectsRequest);

      expect(result.expected_monster_response).toContain('Insectivorous');
      expect(result.expected_monster_response).toContain('30-60 minutes');
    });

    it('should include weather context in monster response', async () => {
      // Update weather to rainy
      environmentState.updateWeather('route_001', 'rainy');

      const result = await tool.execute(validRequest);

      expect(result.expected_monster_response).toContain('rainy');
    });

    it('should generate appropriate ecosystem impacts', async () => {
      const result = await tool.execute(validRequest);

      expect(result.ecosystem_impact.some(impact => /herbivore|foraging|seed/i.test(impact))).toBe(true);
      expect(result.ecosystem_impact.length).toBeGreaterThanOrEqual(3);
    });

    it('should record token transaction correctly', async () => {
      const initialBalance = tokenService.getCurrentBalance();
      const result = await tool.execute(validRequest);

      expect(result.token_transaction.cost).toBe(10);
      expect(result.token_transaction.new_balance).toBe(initialBalance - 10);
      expect(result.token_transaction.transaction_id).toMatch(/^tx_/);

      // Verify transaction in history
      const history = tokenService.getTransactionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].amount).toBe(10);
      expect(history[0].type).toBe('deduction');
      expect(history[0].purpose).toContain('berries');
    });

    it('should update environment state with food resource and structure', async () => {
      const environment = environmentState.getEnvironment('route_001');
      const initialResourceCount = environment?.resources.length || 0;
      const initialStructureCount = environment?.structures.length || 0;

      await tool.execute(validRequest);

      const updatedEnvironment = environmentState.getEnvironment('route_001');
      expect(updatedEnvironment?.resources.length).toBe(initialResourceCount + 1);
      expect(updatedEnvironment?.structures.length).toBe(initialStructureCount + 1);

      // Check food resource properties
      const addedResource = updatedEnvironment?.resources.find(r => 
        r.type === 'food' && r.position.x === 100 && r.position.y === 100
      );
      expect(addedResource).toBeDefined();
      expect(addedResource?.position).toEqual({ x: 100, y: 100 });
      expect(addedResource?.quantity).toBe(50);

      // Check food structure properties
      const addedStructure = updatedEnvironment?.structures.find(s => 
        s.type === 'food_source' && s.position.x === 100 && s.position.y === 100
      );
      expect(addedStructure).toBeDefined();
      expect(addedStructure?.position).toEqual({ x: 100, y: 100 });
      expect(addedStructure?.properties.food_type).toBe('berries');
    });
  });

  describe('getToolDefinition', () => {
    it('should return valid MCP tool definition', () => {
      const definition = PlaceFoodTool.getToolDefinition();

      expect(definition.name).toBe('place_food');
      expect(definition.description).toContain('10 Primal tokens');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties).toHaveProperty('route_id');
      expect(definition.inputSchema.properties).toHaveProperty('location');
      expect(definition.inputSchema.properties).toHaveProperty('food_type');
      expect(definition.inputSchema.required).toEqual(['route_id', 'location', 'food_type']);
    });

    it('should include proper food type enum values', () => {
      const definition = PlaceFoodTool.getToolDefinition();
      const foodTypeProperty = definition.inputSchema.properties?.food_type as any;

      expect(foodTypeProperty?.enum).toEqual(['berries', 'meat', 'insects', 'nectar']);
    });

    it('should include proper location constraints', () => {
      const definition = PlaceFoodTool.getToolDefinition();
      const locationProperty = definition.inputSchema.properties?.location as any;

      expect(locationProperty?.properties?.x?.minimum).toBe(0);
      expect(locationProperty?.properties?.x?.maximum).toBe(1000);
      expect(locationProperty?.properties?.y?.minimum).toBe(0);
      expect(locationProperty?.properties?.y?.maximum).toBe(1000);
    });
  });
});