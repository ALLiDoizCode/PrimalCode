import { EcosystemObserverTool } from '../../../src/tools/ecosystem-observer';
import { MockMonsterSystem } from '../../../src/ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../../../src/ecosystem/mock-environment-state';
import { MonsterSpecies, MonsterPersonalityType, MonsterState } from '../../../src/types/monster-types';
import { WeatherCondition } from '../../../src/types/environment-types';
import logger from '../../../src/utils/logger';

jest.mock('../../../src/utils/logger');

describe('EcosystemObserverTool', () => {
  let tool: EcosystemObserverTool;
  let mockMonsterSystem: MockMonsterSystem;
  let mockEnvironmentState: MockEnvironmentState;

  beforeEach(() => {
    mockMonsterSystem = new MockMonsterSystem(logger);
    mockEnvironmentState = new MockEnvironmentState(logger);
    tool = new EcosystemObserverTool(mockMonsterSystem, mockEnvironmentState);
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = tool.getToolDefinition();
      
      expect(definition.name).toBe('observe_ecosystem');
      expect(definition.description).toContain('ecosystem state');
      expect(definition.inputSchema.required).toContain('route_id');
      expect((definition.inputSchema.properties as any)?.focus?.enum).toEqual(['monsters', 'environment', 'interactions', 'all']);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Create test environment
      mockEnvironmentState.generateEnvironment('test_route', 'Test Forest');
      
      // Create test monsters
      mockMonsterSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'test_route'
      );
      mockMonsterSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route'
      );
    });

    it('should generate engaging ecosystem description for valid route', async () => {
      const result = await tool.execute({ route_id: 'test_route' });
      
      expect(result).toContain('🌿 **Ecosystem Observation: test_route**');
      expect(result).toContain('**Current State:**');
      expect(result).toContain('Test Forest');
      expect(result).toContain('**Creature Behaviors:**');
      expect(result).toContain('**Suggested Actions:**');
      expect(result).toContain('shadow_wolf');
      expect(result).toContain('frost_bear');
    });

    it('should handle focus parameter correctly', async () => {
      const monsterFocusResult = await tool.execute({ 
        route_id: 'test_route', 
        focus: 'monsters' 
      });
      
      expect(monsterFocusResult).toContain('**Creature Behaviors:**');
      expect(monsterFocusResult).toContain('shadow_wolf');
      
      const environmentFocusResult = await tool.execute({ 
        route_id: 'test_route', 
        focus: 'environment' 
      });
      
      expect(environmentFocusResult).toContain('**Current State:**');
      // Should not contain creature behaviors when focusing on environment
      expect(environmentFocusResult).not.toContain('**Creature Behaviors:**');
    });

    it('should include timestamp in observation', async () => {
      const result = await tool.execute({ route_id: 'test_route' });
      
      expect(result).toMatch(/Observation recorded at \d{1,2}:\d{2}:\d{2}/);
    });

    it('should provide context-appropriate suggested actions', async () => {
      const result = await tool.execute({ route_id: 'test_route' });
      
      expect(result).toContain('**Suggested Actions:**');
      expect(result).toMatch(/\d+\./); // Should contain numbered actions
    });

    it('should handle empty ecosystem gracefully', async () => {
      mockEnvironmentState.generateEnvironment('empty_route', 'Empty Area');
      
      const result = await tool.execute({ route_id: 'empty_route' });
      
      expect(result).toContain('🌿 **Ecosystem Observation: empty_route**');
      expect(result).toContain('No creature behaviors to observe');
    });

    it('should handle different weather conditions', async () => {
      const environment = mockEnvironmentState.getEnvironment('test_route');
      if (environment) {
        environment.weather_state.condition = WeatherCondition.STORM;
      }
      
      const result = await tool.execute({ route_id: 'test_route' });
      
      expect(result).toContain('storm');
    });

    it('should return error for invalid route_id', async () => {
      const result = await tool.execute({ route_id: 'nonexistent_route' });
      
      expect(result).toContain('❌ **Ecosystem Observation Failed**');
      expect(result).toContain('Environment not found');
    });

    it('should return error for missing route_id', async () => {
      const result = await tool.execute({});
      
      expect(result).toContain('❌ **Ecosystem Observation Failed**');
      expect(result).toContain('route_id is required');
    });

    it('should handle monster behavior generation correctly', async () => {
      const result = await tool.execute({ route_id: 'test_route' });
      
      // Should contain monster narrative and reasoning
      expect(result).toContain('**Creature Behaviors:**');
      // Should include monster decision narratives
      const behaviorSection = result.split('**Creature Behaviors:**')[1];
      if (behaviorSection) {
        expect(behaviorSection).toContain('**shadow_wolf**:');
      }
    });

    it('should provide ecosystem balance insights', async () => {
      const result = await tool.execute({ route_id: 'test_route' });
      
      // Should contain ecosystem balance information
      expect(result).toContain('ecosystem');
      // Should contain environmental stability information
      expect(result).toMatch(/(balance|ecosystem|territorial|predator|prey)/i);
    });

    it('should handle interaction focus correctly', async () => {
      const result = await tool.execute({ 
        route_id: 'test_route', 
        focus: 'interactions' 
      });
      
      expect(result).toContain('**Current State:**');
      // Should focus on creature-environment interactions
      expect(result).toMatch(/(interaction|territorial|compete|coexist|respectful|aware)/i);
    });

    it('should generate consistent response format', async () => {
      const result = await tool.execute({ route_id: 'test_route' });
      
      // Check for consistent markdown formatting
      expect(result).toMatch(/^🌿 \*\*Ecosystem Observation:/);
      expect(result).toMatch(/\*\*Current State:\*\*/);
      expect(result).toMatch(/\*\*Suggested Actions:\*\*/);
      expect(result).toMatch(/\*Observation recorded at/);
    });
  });

  describe('error handling', () => {
    it('should handle monster system errors gracefully', async () => {
      // Create a scenario where monster decision throws an error
      jest.spyOn(mockMonsterSystem, 'makeDecision').mockImplementation(() => {
        throw new Error('Monster decision failed');
      });
      
      mockEnvironmentState.generateEnvironment('error_route', 'Error Test');
      mockMonsterSystem.generateMonster(
        MonsterSpecies.EMBER_HAWK,
        MonsterPersonalityType.PACK_LEADER,
        'error_route'
      );
      
      const result = await tool.execute({ route_id: 'error_route' });
      
      expect(result).toContain('❌ **Ecosystem Observation Failed**');
    });

    it('should validate input parameters', async () => {
      const invalidInputs = [
        { route_id: null },
        { route_id: 123 },
        { route_id: '' },
        { route_id: 'valid_route', focus: 'invalid_focus' }
      ];
      
      for (const input of invalidInputs) {
        const result = await tool.execute(input);
        expect(result).toContain('❌ **Ecosystem Observation Failed**');
      }
    });
  });

  describe('narrative generation', () => {
    beforeEach(() => {
      mockEnvironmentState.generateEnvironment('narrative_test', 'Narrative Forest');
      mockMonsterSystem.generateMonster(
        MonsterSpecies.WIND_STAG,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'narrative_test'
      );
    });

    it('should generate engaging and descriptive narratives', async () => {
      const result = await tool.execute({ route_id: 'narrative_test' });
      
      // Check for engaging descriptive language
      expect(result).toMatch(/(alive|rhythm|shadow|light|mysterious|graceful)/i);
      
      // Should contain narrative elements, not just data
      expect(result).not.toMatch(/^[A-Z_]+:/); // Should not be just data fields
    });

    it('should include species-specific behavior descriptions', async () => {
      const result = await tool.execute({ route_id: 'narrative_test' });
      
      expect(result).toContain('wind_stag');
      // Should contain species-specific narrative elements
      expect(result).toMatch(/(bound|swift|ethereal|graceful)/i);
    });
  });
});