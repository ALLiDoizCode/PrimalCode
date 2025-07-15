import { ModifyWeatherTool } from '../../../src/tools/modify-weather';
import { MockMonsterSystem } from '../../../src/ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../../../src/ecosystem/mock-environment-state';
import { MonsterPersonalityType, MonsterSpecies } from '../../../src/types/monster-types';
import { WeatherCondition } from '../../../src/types/environment-types';
import logger from '../../../src/utils/logger';

describe('ModifyWeatherTool', () => {
  let tool: ModifyWeatherTool;
  let mockMonsterSystem: MockMonsterSystem;
  let mockEnvironmentState: MockEnvironmentState;

  beforeEach(() => {
    mockMonsterSystem = new MockMonsterSystem(logger);
    mockEnvironmentState = new MockEnvironmentState(logger);
    tool = new ModifyWeatherTool(mockMonsterSystem, mockEnvironmentState);
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = tool.getToolDefinition();
      
      expect(definition.name).toBe('modify_weather');
      expect(definition.description).toContain('Trigger weather changes to influence monster behavior');
      expect(definition.inputSchema.required).toEqual(['route_id', 'weather_type', 'intensity']);
      expect((definition.inputSchema.properties as any).weather_type.enum).toEqual(['rain', 'heat', 'storm', 'normal']);
      expect((definition.inputSchema.properties as any).intensity.minimum).toBe(0.0);
      expect((definition.inputSchema.properties as any).intensity.maximum).toBe(1.0);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      const environment = mockEnvironmentState.generateEnvironment('test_route', 'Test Forest');
      mockMonsterSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'test_route',
        { x: 10, y: 10 }
      );
    });

    it('should modify weather and generate narrative response', async () => {
      const args = {
        route_id: 'test_route',
        weather_type: 'rain',
        intensity: 0.7
      };

      const result = await tool.execute(args);

      expect(result).toContain('Weather Conditions Modified Successfully');
      expect(result).toContain('Weather Change:');
      expect(result).toContain('rain begins to fall');
      expect(result).toContain('Behavioral Adaptations:');
      expect(result).toContain('Aggressive Hunters');
      expect(result).toContain('Ecosystem Impact:');
    });

    it('should handle different weather types appropriately', async () => {
      const heatArgs = {
        route_id: 'test_route',
        weather_type: 'heat',
        intensity: 0.8
      };

      const result = await tool.execute(heatArgs);

      expect(result).toContain('temperature rises dramatically');
      expect(result).toContain('thermal energy');
    });

    it('should handle storm weather with appropriate intensity', async () => {
      const stormArgs = {
        route_id: 'test_route',
        weather_type: 'storm',
        intensity: 0.9
      };

      const result = await tool.execute(stormArgs);

      expect(result).toContain('storm system approaches');
      expect(result).toContain('Thunder rumbles');
      expect(result).toContain('intense storm');
    });

    it('should generate behavioral adaptations based on personalities', async () => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.WIND_STAG,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route',
        { x: 15, y: 15 }
      );

      const args = {
        route_id: 'test_route',
        weather_type: 'rain',
        intensity: 0.6
      };

      const result = await tool.execute(args);

      expect(result).toContain('Cautious Foragers');
      expect(result).toContain('seek immediate shelter');
    });

    it('should handle pack leader adaptations', async () => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.PACK_LEADER,
        'test_route',
        { x: 20, y: 20 }
      );

      const args = {
        route_id: 'test_route',
        weather_type: 'storm',
        intensity: 0.8
      };

      const result = await tool.execute(args);

      expect(result).toContain('Pack Leaders');
      expect(result).toContain('pack cohesion');
    });

    it('should provide ecosystem impact analysis', async () => {
      const args = {
        route_id: 'test_route',
        weather_type: 'rain',
        intensity: 0.5
      };

      const result = await tool.execute(args);

      expect(result).toContain('Ecosystem Balance');
      expect(result).toContain('enhance resource regeneration');
    });

    it('should handle heat impact on ecosystem', async () => {
      const args = {
        route_id: 'test_route',
        weather_type: 'heat',
        intensity: 0.9
      };

      const result = await tool.execute(args);

      expect(result).toContain('stress the ecosystem');
      expect(result).toContain('water resources');
    });

    it('should handle invalid route_id', async () => {
      const args = {
        route_id: 'invalid_route',
        weather_type: 'rain',
        intensity: 0.5
      };

      const result = await tool.execute(args);

      expect(result).toContain('Weather Modification Failed');
      expect(result).toContain('Environment not found');
    });

    it('should validate intensity parameter', async () => {
      const invalidArgs = {
        route_id: 'test_route',
        weather_type: 'rain',
        intensity: 1.5 // Invalid intensity > 1.0
      };

      const result = await tool.execute(invalidArgs);

      expect(result).toContain('Weather Modification Failed');
      expect(result).toContain('intensity must be a number between 0.0 and 1.0');
    });

    it('should handle empty monster environment', async () => {
      const emptyEnvironment = mockEnvironmentState.generateEnvironment('empty_route', 'Empty Forest');
      
      const args = {
        route_id: 'empty_route',
        weather_type: 'storm',
        intensity: 0.4
      };

      const result = await tool.execute(args);

      expect(result).toContain('Weather Conditions Modified Successfully');
      expect(result).toContain('no creatures are immediately visible');
      expect(result).toContain('influence the behavior patterns');
    });

    it('should generate intensity-based descriptions', async () => {
      const lowIntensityArgs = {
        route_id: 'test_route',
        weather_type: 'rain',
        intensity: 0.2
      };

      const result = await tool.execute(lowIntensityArgs);

      expect(result).toContain('gentle rain');
      expect(result).toContain('subtle');
    });

    it('should generate high intensity descriptions', async () => {
      const highIntensityArgs = {
        route_id: 'test_route',
        weather_type: 'heat',
        intensity: 0.9
      };

      const result = await tool.execute(highIntensityArgs);

      expect(result).toContain('intense heat');
      expect(result).toContain('dramatic');
    });

    it('should notify monster system of environmental change', async () => {
      const notifySpy = jest.spyOn(mockMonsterSystem, 'notifyEnvironmentalChange');
      
      const args = {
        route_id: 'test_route',
        weather_type: 'rain',
        intensity: 0.6
      };

      await tool.execute(args);

      expect(notifySpy).toHaveBeenCalledWith('test_route', 'weather_changed', { x: 50, y: 50 });
    });

    it('should handle normal weather restoration', async () => {
      const args = {
        route_id: 'test_route',
        weather_type: 'normal',
        intensity: 0.5
      };

      const result = await tool.execute(args);

      expect(result).toContain('weather patterns stabilize');
      expect(result).toContain('natural rhythms resume');
    });

    it('should include visibility and humidity information', async () => {
      const args = {
        route_id: 'test_route',
        weather_type: 'rain',
        intensity: 0.7
      };

      const result = await tool.execute(args);

      expect(result).toContain('visibility:');
      expect(result).toContain('humidity:');
    });

    it('should generate overall ecosystem response', async () => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.EMBER_HAWK,
        MonsterPersonalityType.PACK_LEADER,
        'test_route',
        { x: 25, y: 25 }
      );

      const args = {
        route_id: 'test_route',
        weather_type: 'storm',
        intensity: 0.8
      };

      const result = await tool.execute(args);

      expect(result).toContain('Overall Ecosystem Response');
      expect(result).toContain('major behavioral adaptations');
    });
  });
});