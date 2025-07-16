import { ModifyWeatherTool, ModifyWeatherRequest } from '../../../src/tools/modify-weather';
import { PrimalTokenService } from '../../../src/utils/primal-token-service';
import { MockEnvironmentState } from '../../../src/ecosystem/environment-state';

describe('ModifyWeatherTool', () => {
  let tool: ModifyWeatherTool;
  let tokenService: PrimalTokenService;
  let environmentState: MockEnvironmentState;

  beforeEach(() => {
    tokenService = new PrimalTokenService();
    environmentState = new MockEnvironmentState();
    tool = new ModifyWeatherTool(tokenService, environmentState);
    
    // Reset token balance for each test
    tokenService.resetBalance(1000);
  });

  describe('execute', () => {
    const validRequest: ModifyWeatherRequest = {
      route_id: 'route_001',
      weather_type: 'rain',
      intensity: 0.7,
      duration: 120
    };

    it('should successfully modify weather with valid parameters', async () => {
      const environment = environmentState.getEnvironment('route_001');
      const previousCondition = environment?.weather_state.current_condition;

      const result = await tool.execute(validRequest);

      expect(result.success).toBe(true);
      expect(result.weather_confirmation).toContain('rainfall');
      expect(result.expected_monster_response).toContain('shelter');
      expect(result.ecosystem_impact).toBeInstanceOf(Array);
      expect(result.ecosystem_impact.length).toBeGreaterThan(0);
      expect(result.token_transaction.cost).toBe(25);
      expect(result.token_transaction.new_balance).toBe(975);
      expect(result.modification_id).toMatch(/^weather_/);
      expect(result.weather_details.previous_condition).toBe(previousCondition);
      expect(result.weather_details.new_condition).toBe('rainy');
      expect(result.weather_details.intensity).toBe(0.7);
      expect(result.weather_details.duration_minutes).toBe(120);
    });

    it('should handle different weather types correctly', async () => {
      const stormRequest = { ...validRequest, weather_type: 'storm' as const };
      const result = await tool.execute(stormRequest);

      expect(result.success).toBe(true);
      expect(result.weather_confirmation).toContain('storm');
      expect(result.expected_monster_response).toContain('immediate storm-response');
      expect(result.weather_details.new_condition).toBe('stormy');
    });

    it('should use default values when intensity and duration not specified', async () => {
      const minimalRequest = {
        route_id: 'route_001',
        weather_type: 'heat' as const
      };

      const result = await tool.execute(minimalRequest);

      expect(result.success).toBe(true);
      expect(result.weather_details.intensity).toBe(0.7); // Default intensity
      expect(result.weather_details.duration_minutes).toBe(60); // Default duration
    });

    it('should clamp intensity values to valid range', async () => {
      const highIntensityRequest = { ...validRequest, intensity: 1.5 };
      const result = await tool.execute(highIntensityRequest);

      expect(result.weather_details.intensity).toBe(1.0); // Clamped to max

      const lowIntensityRequest = { ...validRequest, intensity: -0.5 };
      const result2 = await tool.execute(lowIntensityRequest);

      expect(result2.weather_details.intensity).toBe(0.1); // Clamped to min
    });

    it('should clamp duration values to valid range', async () => {
      const longDurationRequest = { ...validRequest, duration: 600 };
      const result = await tool.execute(longDurationRequest);

      expect(result.weather_details.duration_minutes).toBe(480); // Clamped to 8 hours max

      const shortDurationRequest = { ...validRequest, duration: 1 };
      const result2 = await tool.execute(shortDurationRequest);

      expect(result2.weather_details.duration_minutes).toBe(5); // Clamped to 5 minutes min
    });

    it('should fail with insufficient tokens', async () => {
      tokenService.resetBalance(20); // Less than required 25 tokens

      await expect(tool.execute(validRequest)).rejects.toThrow('Insufficient Primal tokens');
    });

    it('should fail with invalid route', async () => {
      const invalidRequest = { ...validRequest, route_id: 'nonexistent_route' };

      await expect(tool.execute(invalidRequest)).rejects.toThrow('Route nonexistent_route not found');
    });

    it('should provide different responses for different weather types', async () => {
      const clearRequest = { ...validRequest, weather_type: 'clear' as const };
      const result = await tool.execute(clearRequest);

      expect(result.expected_monster_response).toContain('exploration');
      expect(result.expected_monster_response).toContain('visibility');
    });

    it('should include shelter context in monster response', async () => {
      // Modify environment to have limited shelters
      const environment = environmentState.getEnvironment('route_001');
      if (environment) {
        const limitedShelters = environment.structures.slice(0, 2); // Keep only 2 shelters
        environmentState.updateEnvironment('route_001', { structures: limitedShelters });
      }

      const result = await tool.execute(validRequest);

      expect(result.expected_monster_response).toContain('Limited shelter');
    });

    it('should generate appropriate ecosystem impacts', async () => {
      const result = await tool.execute(validRequest);

      expect(result.ecosystem_impact.some(impact => /water|scent|ground-level/i.test(impact))).toBe(true);
      expect(result.ecosystem_impact.length).toBeGreaterThanOrEqual(3);
    });

    it('should record token transaction correctly', async () => {
      const initialBalance = tokenService.getCurrentBalance();
      const result = await tool.execute(validRequest);

      expect(result.token_transaction.cost).toBe(25);
      expect(result.token_transaction.new_balance).toBe(initialBalance - 25);
      expect(result.token_transaction.transaction_id).toMatch(/^tx_/);

      // Verify transaction in history
      const history = tokenService.getTransactionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].amount).toBe(25);
      expect(history[0].type).toBe('deduction');
      expect(history[0].purpose).toContain('rain');
    });

    it('should update environment weather state correctly', async () => {
      const environment = environmentState.getEnvironment('route_001');
      const previousWeather = environment?.weather_state;

      await tool.execute(validRequest);

      const updatedEnvironment = environmentState.getEnvironment('route_001');
      const newWeather = updatedEnvironment?.weather_state;

      expect(newWeather?.current_condition).toBe('rainy');
      expect(newWeather?.humidity).toBeGreaterThan(previousWeather?.humidity || 0);
      expect(newWeather?.visibility).toBeLessThanOrEqual(1.0);
      expect(newWeather?.last_updated).toBeInstanceOf(Date);
    });

    it('should handle weather conversion correctly', async () => {
      const weatherMappings = [
        { input: 'rain', expected: 'rainy' },
        { input: 'heat', expected: 'sunny' },
        { input: 'clear', expected: 'sunny' },
        { input: 'storm', expected: 'stormy' }
      ];

      for (const mapping of weatherMappings) {
        const request = { ...validRequest, weather_type: mapping.input as any };
        const result = await tool.execute(request);
        expect(result.weather_details.new_condition).toBe(mapping.expected);
      }
    });
  });

  describe('getToolDefinition', () => {
    it('should return valid MCP tool definition', () => {
      const definition = ModifyWeatherTool.getToolDefinition();

      expect(definition.name).toBe('modify_weather');
      expect(definition.description).toContain('25 Primal tokens');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties).toHaveProperty('route_id');
      expect(definition.inputSchema.properties).toHaveProperty('weather_type');
      expect(definition.inputSchema.properties).toHaveProperty('intensity');
      expect(definition.inputSchema.properties).toHaveProperty('duration');
      expect(definition.inputSchema.required).toEqual(['route_id', 'weather_type']);
    });

    it('should include proper weather type enum values', () => {
      const definition = ModifyWeatherTool.getToolDefinition();
      const weatherTypeProperty = definition.inputSchema.properties?.weather_type as any;

      expect(weatherTypeProperty?.enum).toEqual(['rain', 'heat', 'clear', 'storm']);
    });

    it('should include proper intensity constraints', () => {
      const definition = ModifyWeatherTool.getToolDefinition();
      const intensityProperty = definition.inputSchema.properties?.intensity as any;

      expect(intensityProperty?.minimum).toBe(0.1);
      expect(intensityProperty?.maximum).toBe(1.0);
    });

    it('should include proper duration constraints', () => {
      const definition = ModifyWeatherTool.getToolDefinition();
      const durationProperty = definition.inputSchema.properties?.duration as any;

      expect(durationProperty?.minimum).toBe(5);
      expect(durationProperty?.maximum).toBe(480);
    });
  });
});