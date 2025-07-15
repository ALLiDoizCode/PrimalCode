import { EnvironmentCheckerTool } from '../../../src/tools/environment-checker';
import { MockEnvironmentState } from '../../../src/ecosystem/mock-environment-state';
import { MockMonsterSystem } from '../../../src/ecosystem/mock-monster-system';
import { WeatherCondition, ResourceType, StructureType } from '../../../src/types/environment-types';
import { MonsterSpecies, MonsterPersonalityType } from '../../../src/types/monster-types';
import logger from '../../../src/utils/logger';

jest.mock('../../../src/utils/logger');

describe('EnvironmentCheckerTool', () => {
  let tool: EnvironmentCheckerTool;
  let mockEnvironmentState: MockEnvironmentState;
  let mockMonsterSystem: MockMonsterSystem;
  let testRouteId: string;

  beforeEach(() => {
    mockEnvironmentState = new MockEnvironmentState(logger);
    mockMonsterSystem = new MockMonsterSystem(logger);
    tool = new EnvironmentCheckerTool(mockEnvironmentState, mockMonsterSystem);
    
    testRouteId = 'test_route';
    // Create test environment
    mockEnvironmentState.generateEnvironment(testRouteId, 'Test Forest');
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = tool.getToolDefinition();
      
      expect(definition.name).toBe('check_environment');
      expect(definition.description).toContain('weather conditions');
      expect(definition.description).toContain('resources');
      expect(definition.description).toContain('player modifications');
      expect(definition.inputSchema.required).toContain('route_id');
    });
  });

  describe('execute', () => {
    it('should generate comprehensive environment check for valid route', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('🌍 **Environment Check: test_route**');
      expect(result).toContain('**Environmental Overview:**');
      expect(result).toContain('**Weather Conditions:**');
      expect(result).toContain('**Resource Availability:**');
      expect(result).toContain('**Recommendations:**');
      expect(result).toContain('Test Forest');
    });

    it('should include detailed weather information', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('**Current Weather**:');
      expect(result).toContain('**Temperature**:');
      expect(result).toContain('**Humidity**:');
      expect(result).toContain('**Wind Speed**:');
      expect(result).toContain('**Visibility**:');
      expect(result).toContain('**Environmental Impact**:');
    });

    it('should analyze resource distribution by type', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('**Resource Distribution Analysis**:');
      expect(result).toMatch(/(Food Sources|Water Sources|Shelter Locations)/);
      expect(result).toMatch(/\d+ sources/);
      expect(result).toMatch(/\(\d+%\)/);
      expect(result).toContain('**Overall Assessment**:');
    });

    it('should provide contextual recommendations', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('**Recommendations:**');
      expect(result).toMatch(/\d+\./); // Should contain numbered recommendations
    });

    it('should include timestamp in check', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/Environment check completed at \d{1,2}:\d{2}:\d{2}/);
    });

    it('should return error for invalid route_id', async () => {
      const result = await tool.execute({ route_id: 'nonexistent_route' });
      
      expect(result).toContain('❌ **Environment Check Failed**');
      expect(result).toContain('Environment not found');
    });

    it('should return error for missing route_id', async () => {
      const result = await tool.execute({});
      
      expect(result).toContain('❌ **Environment Check Failed**');
      expect(result).toContain('route_id is required');
    });

    it('should handle different weather conditions correctly', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        environment.weather_state.condition = WeatherCondition.STORM;
        environment.weather_state.temperature = -5;
        environment.weather_state.wind_speed = 25;
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('⛈️ Violent thunderstorm');
      expect(result).toContain('strong winds');
      expect(result).toContain('freezing temperatures');
    });

    it('should include weather forecast when available', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('**Short-term Forecast**:');
      expect(result).toMatch(/[☀️☁️🌧️⛈️🌫️❄️]/); // Should contain weather emojis
    });
  });

  describe('environmental details analysis', () => {
    it('should describe route characteristics correctly', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('Test Forest');
      expect(result).toMatch(/\d+ distinct structures/);
      expect(result).toMatch(/\d+ resource locations/);
      expect(result).toMatch(/(accessible|manageable|demanding|challenging|extremely challenging)/);
      expect(result).toMatch(/(secure|safe|risky|dangerous|perilous)/);
    });

    it('should include landmark information', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/(landmarks|Oak Grove|Crystal Stream|Ridge|Vale|Clearing|Outcrop)/i);
    });

    it('should analyze ecosystem balance', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/\d+ predators and \d+ prey/);
      expect(result).toMatch(/(intense competitive|active territorial|moderate competitive|peaceful coexistence|minimal territorial)/);
    });

    it('should describe seasonal factors', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/(peak seasonal|strong seasonal|moderate seasonal|mild seasonal|minimal seasonal)/);
    });
  });

  describe('weather conditions analysis', () => {
    it('should provide temperature context', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        environment.weather_state.temperature = 30;
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('warm and comfortable');
    });

    it('should analyze humidity levels', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        environment.weather_state.humidity = 0.9;
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('extremely humid');
    });

    it('should describe wind conditions', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        environment.weather_state.wind_speed = 30;
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('strong winds');
    });

    it('should analyze visibility impact', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        environment.weather_state.visibility = 0.1;
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('severely limited visibility');
    });

    it('should provide weather impact analysis', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        environment.weather_state.condition = WeatherCondition.RAIN;
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('precipitation is affecting scent trails');
    });
  });

  describe('resource availability analysis', () => {
    it('should analyze resources by type', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('**Resource Distribution Analysis**:');
      expect(result).toMatch(/(Food Sources|Water Sources|Shelter Locations|Hunting Grounds|Territorial Markers)/);
    });

    it('should provide quality assessments', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/(exceptional|high|moderate|low|poor) quality/);
    });

    it('should describe regeneration rates', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/(rapid|steady|slow|minimal) regeneration/);
    });

    it('should calculate resource pressure from monsters', async () => {
      // Add monsters to increase resource pressure
      mockMonsterSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        testRouteId
      );
      mockMonsterSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        testRouteId
      );
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/(intense|high|moderate|low|minimal) competition levels/);
    });

    it('should assess overall resource abundance', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/(abundant|plentiful|adequate|scarce|critically low) resource availability/);
    });
  });

  describe('recommendations generation', () => {
    it('should provide weather-based recommendations', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        environment.weather_state.condition = WeatherCondition.STORM;
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('Postpone major environmental modifications until storm conditions pass');
    });

    it('should recommend resource improvements when needed', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        // Set low quality resources
        environment.resources.forEach(resource => {
          resource.quality = 0.1;
        });
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('resource enhancement or replacement');
    });

    it('should recommend shelter when needed', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        // Remove shelter structures
        environment.structures = environment.structures.filter(
          s => s.type !== StructureType.CAVE && s.type !== StructureType.BURROW
        );
      }
      
      // Add monsters that need shelter
      mockMonsterSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        testRouteId
      );
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('shelter structures needed');
    });

    it('should handle ecosystem balance issues', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        environment.ecosystem_balance.territory_pressure = 0.9;
        environment.ecosystem_balance.predator_count = 10;
        environment.ecosystem_balance.prey_count = 2;
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/(territorial pressure|Predator-prey imbalance)/);
    });

    it('should recommend water sources when critical', async () => {
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        // Remove water sources
        environment.resources = environment.resources.filter(
          r => r.type !== ResourceType.WATER
        );
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('Critical need for water sources');
    });

    it('should provide balanced environment feedback', async () => {
      // Create a well-balanced environment
      const environment = mockEnvironmentState.getEnvironment(testRouteId);
      if (environment) {
        environment.weather_state.condition = WeatherCondition.CLEAR;
        environment.weather_state.temperature = 20;
        environment.ecosystem_balance.resource_abundance = 0.8;
        environment.ecosystem_balance.territory_pressure = 0.3;
        environment.route_info.safety_level = 0.7;
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      // Should contain either balanced statement or specific recommendations
      expect(result).toMatch(/(appears well-balanced|optimal conditions|monitoring)/i);
    });
  });

  describe('error handling', () => {
    it('should validate input parameters', async () => {
      const invalidInputs = [
        { route_id: null },
        { route_id: 123 },
        { route_id: '' }
      ];
      
      for (const input of invalidInputs) {
        const result = await tool.execute(input);
        expect(result).toContain('❌ **Environment Check Failed**');
      }
    });

    it('should handle mock system errors gracefully', async () => {
      jest.spyOn(mockEnvironmentState, 'getEnvironment').mockImplementation(() => {
        throw new Error('System error');
      });
      
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toContain('❌ **Environment Check Failed**');
    });
  });

  describe('response formatting', () => {
    it('should use consistent markdown formatting', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/^🌍 \*\*Environment Check:/);
      expect(result).toMatch(/\*\*Environmental Overview:\*\*/);
      expect(result).toMatch(/\*\*Weather Conditions:\*\*/);
      expect(result).toMatch(/\*\*Resource Availability:\*\*/);
      expect(result).toMatch(/\*\*Recommendations:\*\*/);
      expect(result).toMatch(/\*Environment check completed at/);
    });

    it('should include all required sections', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      const requiredSections = [
        '**Environmental Overview:**',
        '**Weather Conditions:**',
        '**Resource Availability:**',
        '**Recommendations:**'
      ];
      
      requiredSections.forEach(section => {
        expect(result).toContain(section);
      });
    });

    it('should format numbered recommendations correctly', async () => {
      const result = await tool.execute({ route_id: testRouteId });
      
      expect(result).toMatch(/\d+\. [A-Z]/); // Should have numbered recommendations
    });
  });

  describe('integration with monster system', () => {
    it('should consider monster population in resource pressure calculation', async () => {
      const noMonstersResult = await tool.execute({ route_id: testRouteId });
      
      // Add monsters
      mockMonsterSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        testRouteId
      );
      mockMonsterSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        testRouteId
      );
      
      const withMonstersResult = await tool.execute({ route_id: testRouteId });
      
      // Results should be different when monsters are present (at least in resource pressure)
      expect(withMonstersResult).toContain('creature-to-resource ratio');
      expect(withMonstersResult).toMatch(/creature-to-resource ratio/);
    });

    it('should provide recommendations based on monster presence', async () => {
      // Add many monsters to test overpopulation
      for (let i = 0; i < 15; i++) {
        mockMonsterSystem.generateMonster(
          MonsterSpecies.WIND_STAG,
          MonsterPersonalityType.CAUTIOUS_FORAGER,
          testRouteId
        );
      }
      
      const result = await tool.execute({ route_id: testRouteId });
      
      // Should contain some form of population management recommendation
      expect(result).toMatch(/(monitor|population|capacity|creature)/i);
    });
  });
});