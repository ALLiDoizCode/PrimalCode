import { PlaceFoodTool } from '../../../src/tools/place-food';
import { MockMonsterSystem } from '../../../src/ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../../../src/ecosystem/mock-environment-state';
import { MonsterPersonalityType, MonsterSpecies, MonsterState } from '../../../src/types/monster-types';
import { WeatherCondition } from '../../../src/types/environment-types';
import logger from '../../../src/utils/logger';

describe('PlaceFoodTool', () => {
  let tool: PlaceFoodTool;
  let mockMonsterSystem: MockMonsterSystem;
  let mockEnvironmentState: MockEnvironmentState;

  beforeEach(() => {
    mockMonsterSystem = new MockMonsterSystem(logger);
    mockEnvironmentState = new MockEnvironmentState(logger);
    tool = new PlaceFoodTool(mockMonsterSystem, mockEnvironmentState);
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = tool.getToolDefinition();
      
      expect(definition.name).toBe('place_food');
      expect(definition.description).toContain('Add food sources to influence monster behavior');
      expect(definition.inputSchema.required).toEqual(['route_id', 'location', 'food_type']);
      expect((definition.inputSchema.properties as any).food_type.enum).toEqual(['meat', 'plants', 'water']);
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

    it('should place food source and generate narrative response', async () => {
      const args = {
        route_id: 'test_route',
        location: { x: 50, y: 50 },
        food_type: 'meat'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Food Source Placed Successfully');
      expect(result).toContain('Placement Details:');
      expect(result).toContain('fresh carcass has been strategically placed');
      expect(result).toContain('Behavioral Predictions:');
      expect(result).toContain('Aggressive Hunters');
      expect(result).toContain('Ecosystem Impact:');
    });

    it('should handle different food types appropriately', async () => {
      const plantsArgs = {
        route_id: 'test_route',
        location: { x: 30, y: 30 },
        food_type: 'plants'
      };

      const result = await tool.execute(plantsArgs);

      expect(result).toContain('Nutritious vegetation has been cultivated');
      expect(result).toContain('herbivorous creatures');
    });

    it('should generate predictions based on monster personalities', async () => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.WIND_STAG,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route',
        { x: 15, y: 15 }
      );

      const args = {
        route_id: 'test_route',
        location: { x: 20, y: 20 },
        food_type: 'plants'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Cautious Foragers');
      expect(result).toContain('observe from a distance');
    });

    it('should handle proximity effects correctly', async () => {
      const args = {
        route_id: 'test_route',
        location: { x: 10, y: 10 }, // Very close to existing monster
        food_type: 'meat'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Proximity Analysis');
      expect(result).toContain('immediate proximity');
    });

    it('should provide ecosystem impact analysis', async () => {
      const args = {
        route_id: 'test_route',
        location: { x: 25, y: 25 },
        food_type: 'water'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Ecosystem Balance');
      expect(result).toContain('Ecosystem Impact');
    });

    it('should handle invalid route_id', async () => {
      const args = {
        route_id: 'invalid_route',
        location: { x: 50, y: 50 },
        food_type: 'meat'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Food Placement Failed');
      expect(result).toContain('Environment not found');
    });

    it('should validate required parameters', async () => {
      const invalidArgs = {
        route_id: 'test_route',
        location: { x: 50 }, // Missing y coordinate
        food_type: 'meat'
      };

      const result = await tool.execute(invalidArgs);

      expect(result).toContain('Food Placement Failed');
      expect(result).toContain('numeric x and y coordinates');
    });

    it('should handle empty monster environment', async () => {
      const emptyEnvironment = mockEnvironmentState.generateEnvironment('empty_route', 'Empty Forest');
      
      const args = {
        route_id: 'empty_route',
        location: { x: 50, y: 50 },
        food_type: 'meat'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Food Source Placed Successfully');
      expect(result).toContain('no creatures are immediately visible');
      expect(result).toContain('attract wildlife from neighboring territories');
    });

    it('should generate quality-based descriptions', async () => {
      const args = {
        route_id: 'test_route',
        location: { x: 40, y: 40 },
        food_type: 'meat'
      };

      const result = await tool.execute(args);

      expect(result).toMatch(/exceptional quality|fresh and appealing|quality/);
    });

    it('should notify monster system of environmental change', async () => {
      const notifySpy = jest.spyOn(mockMonsterSystem, 'notifyEnvironmentalChange');
      
      const args = {
        route_id: 'test_route',
        location: { x: 50, y: 50 },
        food_type: 'meat'
      };

      await tool.execute(args);

      expect(notifySpy).toHaveBeenCalledWith('test_route', 'food_placed', { x: 50, y: 50 });
    });

    it('should handle pack leader behavior predictions', async () => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.PACK_LEADER,
        'test_route',
        { x: 20, y: 20 }
      );

      const args = {
        route_id: 'test_route',
        location: { x: 25, y: 25 },
        food_type: 'meat'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Pack Leaders');
      expect(result).toContain('strategically');
      expect(result).toContain('coordinating group access');
    });
  });
});