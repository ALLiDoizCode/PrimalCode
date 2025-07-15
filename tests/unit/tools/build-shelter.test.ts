import { BuildShelterTool } from '../../../src/tools/build-shelter';
import { MockMonsterSystem } from '../../../src/ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../../../src/ecosystem/mock-environment-state';
import { MonsterPersonalityType, MonsterSpecies } from '../../../src/types/monster-types';
import logger from '../../../src/utils/logger';

describe('BuildShelterTool', () => {
  let tool: BuildShelterTool;
  let mockMonsterSystem: MockMonsterSystem;
  let mockEnvironmentState: MockEnvironmentState;

  beforeEach(() => {
    mockMonsterSystem = new MockMonsterSystem(logger);
    mockEnvironmentState = new MockEnvironmentState(logger);
    tool = new BuildShelterTool(mockMonsterSystem, mockEnvironmentState);
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = tool.getToolDefinition();
      
      expect(definition.name).toBe('build_shelter');
      expect(definition.description).toContain('Create safe zones that monsters can utilize');
      expect(definition.inputSchema.required).toEqual(['route_id', 'location', 'shelter_type']);
      expect((definition.inputSchema.properties as any).shelter_type.enum).toEqual(['cave', 'burrow', 'tree', 'rock']);
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

    it('should build shelter and generate narrative response', async () => {
      const args = {
        route_id: 'test_route',
        location: { x: 50, y: 50 },
        shelter_type: 'cave'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Shelter Construction Completed Successfully');
      expect(result).toContain('Construction Details:');
      expect(result).toContain('sturdy cave has been excavated');
      expect(result).toContain('Utilization Predictions:');
      expect(result).toContain('Aggressive Hunters');
      expect(result).toContain('Ecosystem Impact:');
    });

    it('should handle different shelter types appropriately', async () => {
      const burrowArgs = {
        route_id: 'test_route',
        location: { x: 30, y: 30 },
        shelter_type: 'burrow'
      };

      const result = await tool.execute(burrowArgs);

      expect(result).toContain('intricate burrow system');
      expect(result).toContain('multiple chambers');
    });

    it('should handle tree shelter construction', async () => {
      const treeArgs = {
        route_id: 'test_route',
        location: { x: 25, y: 25 },
        shelter_type: 'tree'
      };

      const result = await tool.execute(treeArgs);

      expect(result).toContain('fortified tree shelter');
      expect(result).toContain('elevated position');
    });

    it('should handle rock shelter construction', async () => {
      const rockArgs = {
        route_id: 'test_route',
        location: { x: 60, y: 60 },
        shelter_type: 'rock'
      };

      const result = await tool.execute(rockArgs);

      expect(result).toContain('robust rock shelter');
      expect(result).toContain('defensive stronghold');
    });

    it('should generate utilization predictions based on personalities', async () => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.WIND_STAG,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route',
        { x: 15, y: 15 }
      );

      const args = {
        route_id: 'test_route',
        location: { x: 20, y: 20 },
        shelter_type: 'burrow'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Cautious Foragers');
      expect(result).toContain('primary habitat');
    });

    it('should handle pack leader utilization patterns', async () => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.PACK_LEADER,
        'test_route',
        { x: 20, y: 20 }
      );

      const args = {
        route_id: 'test_route',
        location: { x: 25, y: 25 },
        shelter_type: 'cave'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Pack Leaders');
      expect(result).toContain('pack headquarters');
      expect(result).toContain('hierarchical');
    });

    it('should analyze proximity effects', async () => {
      const args = {
        route_id: 'test_route',
        location: { x: 10, y: 10 }, // Very close to existing monster
        shelter_type: 'cave'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Proximity Analysis');
      expect(result).toContain('immediate shelter range');
    });

    it('should analyze capacity implications', async () => {
      // Add more monsters to test capacity analysis
      mockMonsterSystem.generateMonster(
        MonsterSpecies.EMBER_HAWK,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route',
        { x: 15, y: 15 }
      );

      const args = {
        route_id: 'test_route',
        location: { x: 25, y: 25 },
        shelter_type: 'burrow'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Capacity Analysis');
      expect(result).toContain('population');
    });

    it('should provide ecosystem impact analysis', async () => {
      const args = {
        route_id: 'test_route',
        location: { x: 40, y: 40 },
        shelter_type: 'tree'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Ecosystem Balance');
      expect(result).toContain('territorial');
    });

    it('should handle high territorial pressure scenarios', async () => {
      const environment = mockEnvironmentState.getEnvironment('test_route');
      if (environment) {
        environment.ecosystem_balance.territory_pressure = 0.8;
      }

      const args = {
        route_id: 'test_route',
        location: { x: 35, y: 35 },
        shelter_type: 'cave'
      };

      const result = await tool.execute(args);

      expect(result).toContain('reduce territorial pressure');
    });

    it('should handle invalid route_id', async () => {
      const args = {
        route_id: 'invalid_route',
        location: { x: 50, y: 50 },
        shelter_type: 'cave'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Shelter Construction Failed');
      expect(result).toContain('Environment not found');
    });

    it('should validate required parameters', async () => {
      const invalidArgs = {
        route_id: 'test_route',
        location: { x: 50 }, // Missing y coordinate
        shelter_type: 'cave'
      };

      const result = await tool.execute(invalidArgs);

      expect(result).toContain('Shelter Construction Failed');
      expect(result).toContain('numeric x and y coordinates');
    });

    it('should handle empty monster environment', async () => {
      const emptyEnvironment = mockEnvironmentState.generateEnvironment('empty_route', 'Empty Forest');
      
      const args = {
        route_id: 'empty_route',
        location: { x: 50, y: 50 },
        shelter_type: 'cave'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Shelter Construction Completed Successfully');
      expect(result).toContain('no creatures are immediately visible');
      expect(result).toContain('valuable refuge for wildlife');
    });

    it('should include capacity information in construction description', async () => {
      const args = {
        route_id: 'test_route',
        location: { x: 45, y: 45 },
        shelter_type: 'burrow'
      };

      const result = await tool.execute(args);

      expect(result).toContain('capacity');
      expect(result).toMatch(/house \d+ creatures/);
    });

    it('should notify monster system of environmental change', async () => {
      const notifySpy = jest.spyOn(mockMonsterSystem, 'notifyEnvironmentalChange');
      
      const args = {
        route_id: 'test_route',
        location: { x: 50, y: 50 },
        shelter_type: 'cave'
      };

      await tool.execute(args);

      expect(notifySpy).toHaveBeenCalledWith('test_route', 'shelter_built', { x: 50, y: 50 });
    });

    it('should handle stability information', async () => {
      const args = {
        route_id: 'test_route',
        location: { x: 40, y: 40 },
        shelter_type: 'rock'
      };

      const result = await tool.execute(args);

      expect(result).toMatch(/exceptional stability|solid craftsmanship|exceptional craftsmanship/);
    });

    it('should generate different utilization patterns for different shelter types', async () => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.STONE_SERPENT,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'test_route',
        { x: 30, y: 30 }
      );

      const treeArgs = {
        route_id: 'test_route',
        location: { x: 35, y: 35 },
        shelter_type: 'tree'
      };

      const result = await tool.execute(treeArgs);

      expect(result).toContain('hunting perch');
      expect(result).toContain('vantage point');
    });

    it('should handle high monster density scenarios', async () => {
      // Add many monsters to test high density
      for (let i = 0; i < 6; i++) {
        mockMonsterSystem.generateMonster(
          MonsterSpecies.WIND_STAG,
          MonsterPersonalityType.CAUTIOUS_FORAGER,
          'test_route',
          { x: 20 + i, y: 20 + i }
        );
      }

      const args = {
        route_id: 'test_route',
        location: { x: 25, y: 25 },
        shelter_type: 'cave'
      };

      const result = await tool.execute(args);

      expect(result).toContain('population density');
      expect(result).toContain('territorial');
    });

    it('should analyze predator impact on shelter usage', async () => {
      const environment = mockEnvironmentState.getEnvironment('test_route');
      if (environment) {
        environment.ecosystem_balance.predator_count = 5;
        environment.ecosystem_balance.prey_count = 3;
      }

      const args = {
        route_id: 'test_route',
        location: { x: 55, y: 55 },
        shelter_type: 'burrow'
      };

      const result = await tool.execute(args);

      expect(result).toContain('Predator Impact');
      expect(result).toContain('dominant hunting creatures');
    });
  });
});