import { BuildShelterTool, BuildShelterRequest } from '../../../src/tools/build-shelter';
import { PrimalTokenService } from '../../../src/utils/primal-token-service';
import { MockEnvironmentState } from '../../../src/ecosystem/environment-state';

describe('BuildShelterTool', () => {
  let tool: BuildShelterTool;
  let tokenService: PrimalTokenService;
  let environmentState: MockEnvironmentState;

  beforeEach(() => {
    tokenService = new PrimalTokenService();
    environmentState = new MockEnvironmentState();
    tool = new BuildShelterTool(tokenService, environmentState);
    
    // Reset token balance for each test
    tokenService.resetBalance(1000);
  });

  describe('execute', () => {
    const validRequest: BuildShelterRequest = {
      route_id: 'route_001',
      location: { x: 500, y: 500 },
      shelter_type: 'cave',
      capacity: 8
    };

    it('should successfully build shelter with valid parameters', async () => {
      const result = await tool.execute(validRequest);

      expect(result.success).toBe(true);
      expect(result.shelter_confirmation).toContain('cave system');
      expect(result.shelter_confirmation).toContain('(500, 500)');
      expect(result.expected_monster_response).toContain('Cave-dwelling');
      expect(result.ecosystem_impact).toBeInstanceOf(Array);
      expect(result.ecosystem_impact.length).toBeGreaterThan(0);
      expect(result.token_transaction.cost).toBe(50);
      expect(result.token_transaction.new_balance).toBe(950);
      expect(result.modification_id).toMatch(/^shelter_/);
      expect(result.shelter_details.type).toBe('cave');
      expect(result.shelter_details.capacity).toBe(8);
      expect(result.shelter_details.safety_level).toBeGreaterThan(0.8);
    });

    it('should handle different shelter types correctly', async () => {
      const burrowRequest = { ...validRequest, location: { x: 300, y: 300 }, shelter_type: 'burrow' as const };
      const result = await tool.execute(burrowRequest);

      expect(result.success).toBe(true);
      expect(result.shelter_confirmation).toContain('underground burrow');
      expect(result.expected_monster_response).toContain('Ground-dwelling');
      expect(result.shelter_details.type).toBe('burrow');
    });

    it('should use default capacity when not specified', async () => {
      const requestWithoutCapacity = {
        route_id: 'route_001',
        location: { x: 300, y: 300 },
        shelter_type: 'tree_hollow' as const
      };

      const result = await tool.execute(requestWithoutCapacity);

      expect(result.success).toBe(true);
      expect(result.shelter_details.capacity).toBe(4); // Default for tree_hollow
    });

    it('should fail with insufficient tokens', async () => {
      tokenService.resetBalance(40); // Less than required 50 tokens

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

    it('should fail when too close to existing structures', async () => {
      // First shelter placement
      await tool.execute(validRequest);

      // Second shelter too close (within 50 units)
      const tooCloseRequest = { ...validRequest, location: { x: 520, y: 520 } };

      await expect(tool.execute(tooCloseRequest)).rejects.toThrow('Too close to existing structures');
    });

    it('should provide different responses for different shelter types', async () => {
      const rockRequest = { ...validRequest, shelter_type: 'rock_outcrop' as const };
      const result = await tool.execute(rockRequest);

      expect(result.expected_monster_response).toContain('vantage point');
      expect(result.expected_monster_response).toContain('medium-sized');
    });

    it('should include weather context in monster response', async () => {
      // Update weather to stormy
      environmentState.updateWeather('route_001', 'stormy');

      const result = await tool.execute(validRequest);

      expect(result.expected_monster_response).toContain('adverse weather');
    });

    it('should adjust shelter properties based on capacity', async () => {
      const smallShelterRequest = { ...validRequest, location: { x: 50, y: 50 }, capacity: 2 };
      const smallResult = await tool.execute(smallShelterRequest);

      const largeShelterRequest = { ...validRequest, location: { x: 750, y: 750 }, capacity: 12 };
      const largeResult = await tool.execute(largeShelterRequest);

      // Larger shelters should be less concealed and harder to access
      expect(largeResult.shelter_details.accessibility).toBeLessThan(smallResult.shelter_details.accessibility);
    });

    it('should generate appropriate ecosystem impacts', async () => {
      const result = await tool.execute(validRequest);

      expect(result.ecosystem_impact.some(impact => /stability|nesting|survival/i.test(impact))).toBe(true);
      expect(result.ecosystem_impact.length).toBeGreaterThanOrEqual(3);
    });

    it('should record token transaction correctly', async () => {
      const initialBalance = tokenService.getCurrentBalance();
      const result = await tool.execute(validRequest);

      expect(result.token_transaction.cost).toBe(50);
      expect(result.token_transaction.new_balance).toBe(initialBalance - 50);
      expect(result.token_transaction.transaction_id).toMatch(/^tx_/);

      // Verify transaction in history
      const history = tokenService.getTransactionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].amount).toBe(50);
      expect(history[0].type).toBe('deduction');
      expect(history[0].purpose).toContain('cave');
    });

    it('should update environment state with shelter structure', async () => {
      const environment = environmentState.getEnvironment('route_001');
      const initialStructureCount = environment?.structures.length || 0;

      await tool.execute(validRequest);

      const updatedEnvironment = environmentState.getEnvironment('route_001');
      expect(updatedEnvironment?.structures.length).toBe(initialStructureCount + 1);

      // Check shelter structure properties
      const addedStructure = updatedEnvironment?.structures.find(s => 
        s.type === 'shelter' && s.position.x === 500 && s.position.y === 500
      );
      expect(addedStructure).toBeDefined();
      expect(addedStructure?.position).toEqual({ x: 500, y: 500 });
      expect(addedStructure?.properties.shelter_type).toBe('cave');
      expect(addedStructure?.properties.capacity).toBe(8);
      expect(addedStructure?.properties.safety_level).toBeGreaterThan(0.8);
      expect(addedStructure?.influence_radius).toBeGreaterThan(100);
    });

    it('should generate correct capacity descriptions', async () => {
      const smallRequest = { ...validRequest, location: { x: 100, y: 100 }, capacity: 2 };
      const smallResult = await tool.execute(smallRequest);
      expect(smallResult.shelter_confirmation).toContain('intimate');

      const mediumRequest = { ...validRequest, location: { x: 200, y: 200 }, capacity: 5 };
      const mediumResult = await tool.execute(mediumRequest);
      expect(mediumResult.shelter_confirmation).toContain('moderate');

      const largeRequest = { ...validRequest, location: { x: 700, y: 700 }, capacity: 10 };
      const largeResult = await tool.execute(largeRequest);
      expect(largeResult.shelter_confirmation).toContain('spacious');
    });

    it('should have appropriate default capacities for each shelter type', async () => {
      // Reset token balance for each iteration and use isolated service instances
      tokenService.resetBalance(1000);

      const shelterTypes = [
        { type: 'cave', expectedCapacity: 8 },
        { type: 'tree_hollow', expectedCapacity: 4 },
        { type: 'rock_outcrop', expectedCapacity: 6 },
        { type: 'burrow', expectedCapacity: 3 }
      ];

      for (let i = 0; i < shelterTypes.length; i++) {
        const shelter = shelterTypes[i];
        // Create a fresh environment state for each test
        const freshEnvironmentState = new MockEnvironmentState();
        const freshTool = new BuildShelterTool(tokenService, freshEnvironmentState);

        const request = {
          route_id: 'route_001',
          location: { x: 200 + (i * 200), y: 200 + (i * 200) }, // Ensure no overlaps
          shelter_type: shelter.type as any
        };

        const result = await freshTool.execute(request);
        expect(result.shelter_details.capacity).toBe(shelter.expectedCapacity);
      }
    });
  });

  describe('getToolDefinition', () => {
    it('should return valid MCP tool definition', () => {
      const definition = BuildShelterTool.getToolDefinition();

      expect(definition.name).toBe('build_shelter');
      expect(definition.description).toContain('50 Primal tokens');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties).toHaveProperty('route_id');
      expect(definition.inputSchema.properties).toHaveProperty('location');
      expect(definition.inputSchema.properties).toHaveProperty('shelter_type');
      expect(definition.inputSchema.properties).toHaveProperty('capacity');
      expect(definition.inputSchema.required).toEqual(['route_id', 'location', 'shelter_type']);
    });

    it('should include proper shelter type enum values', () => {
      const definition = BuildShelterTool.getToolDefinition();
      const shelterTypeProperty = definition.inputSchema.properties?.shelter_type as any;

      expect(shelterTypeProperty?.enum).toEqual(['cave', 'tree_hollow', 'rock_outcrop', 'burrow']);
    });

    it('should include proper location constraints', () => {
      const definition = BuildShelterTool.getToolDefinition();
      const locationProperty = definition.inputSchema.properties?.location as any;

      expect(locationProperty?.properties?.x?.minimum).toBe(0);
      expect(locationProperty?.properties?.x?.maximum).toBe(1000);
      expect(locationProperty?.properties?.y?.minimum).toBe(0);
      expect(locationProperty?.properties?.y?.maximum).toBe(1000);
    });

    it('should include proper capacity constraints', () => {
      const definition = BuildShelterTool.getToolDefinition();
      const capacityProperty = definition.inputSchema.properties?.capacity as any;

      expect(capacityProperty?.minimum).toBe(1);
      expect(capacityProperty?.maximum).toBe(15);
    });
  });
});