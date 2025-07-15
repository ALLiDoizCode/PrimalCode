import { MonsterAnalyzerTool, analyzeMonster } from '../../../src/tools/monster-analyzer';
import { MockMonsterRepository } from '../../../src/ecosystem/monster-state';
import { MockEnvironmentState } from '../../../src/ecosystem/environment-state';
import { MonsterSpecies } from '../../../src/types/monster-types';

describe('MonsterAnalyzerTool', () => {
  let tool: MonsterAnalyzerTool;
  let mockMonsterRepository: MockMonsterRepository;
  let mockEnvironmentState: MockEnvironmentState;

  beforeEach(() => {
    mockMonsterRepository = new MockMonsterRepository();
    mockEnvironmentState = new MockEnvironmentState();
    tool = new MonsterAnalyzerTool(mockMonsterRepository, mockEnvironmentState);
    // Clear any initialized monsters
    mockMonsterRepository.clear();
  });

  describe('execute', () => {
    it('should analyze existing monster in correct route', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('aggressive_hunter', routeId);
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.monster_id).toBe(monster.id);
      expect(result.species).toBe('Aggressive Hunter');
      expect(result.personalityProfile).toContain('aggressive');
      expect(result.currentBehavior).toContain('Currently');
      expect(result.environmentalInteractions).toBeInstanceOf(Array);
      expect(result.behavioralPredictions).toBeInstanceOf(Array);
      expect(result.interactionInsights).toBeInstanceOf(Array);
      expect(result.suggestedActions).toBeInstanceOf(Array);
      expect(result.timestamp).toBeDefined();
    });

    it('should return not found response for non-existent monster', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { monster_id: 'nonexistent_monster', route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.monster_id).toBe('nonexistent_monster');
      expect(result.species).toBe('Unknown');
      expect(result.personalityProfile).toContain('not found');
      expect(result.suggestedActions).toContain('Verify monster ID');
    });

    it('should return environment missing response for non-existent route', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('cautious_forager', routeId);
      const input = { monster_id: monster.id, route_id: 'nonexistent_route' };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.monster_id).toBe(monster.id);
      expect(result.species).toBe('Unknown');
      expect(result.personalityProfile).toContain('Environment data');
      expect(result.suggestedActions).toContain('Verify route ID');
    });

    it('should return wrong route response for monster in different route', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
      const input = { monster_id: monster.id, route_id: 'route_002' };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.monster_id).toBe(monster.id);
      expect(result.currentBehavior).toContain(`Currently located in route ${routeId}`);
      expect(result.suggestedActions).toContain(`Use analyze_monster with route_id: ${routeId}`);
    });

    it('should generate different personality profiles for different species', async () => {
      // Arrange
      const routeId = 'route_001';
      const species: MonsterSpecies[] = ['aggressive_hunter', 'cautious_forager', 'pack_leader'];
      const monsters = species.map(s => mockMonsterRepository.generateAndAddMonster(s, routeId));

      for (const monster of monsters) {
        // Act
        const result = await tool.execute({ monster_id: monster.id, route_id: routeId });

        // Assert
        expect(result.personalityProfile).toContain(monster.species.replace('_', ' '));
        
        if (monster.species === 'aggressive_hunter') {
          expect(result.personalityProfile).toContain('aggressive');
        } else if (monster.species === 'cautious_forager') {
          expect(result.personalityProfile).toContain('passive');
        } else if (monster.species === 'pack_leader') {
          expect(result.personalityProfile).toContain('pack');
        }
      }
    });

    it('should analyze hunting behavior correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('aggressive_hunter', routeId);
      mockMonsterRepository.updateMonster(monster.id, { state: 'hunting' });
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.currentBehavior).toContain('actively hunting');
      expect(result.currentBehavior).toContain('pursuing prey');
    });

    it('should analyze foraging behavior correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('cautious_forager', routeId);
      mockMonsterRepository.updateMonster(monster.id, { state: 'foraging' });
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.currentBehavior).toContain('Searching for resources');
      expect(result.currentBehavior).toContain('hunger levels');
    });

    it('should analyze socializing behavior correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
      mockMonsterRepository.updateMonster(monster.id, { state: 'socializing' });
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.currentBehavior).toContain('Engaging with other creatures');
      expect(result.currentBehavior).toContain('pack tendency');
    });

    it('should analyze territorial behavior correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('aggressive_hunter', routeId);
      mockMonsterRepository.updateMonster(monster.id, { state: 'territorial' });
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.currentBehavior).toContain('Defending its territory');
      expect(result.currentBehavior).toContain('aggression levels');
    });

    it('should analyze environmental interactions correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('cautious_forager', routeId);
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.environmentalInteractions.length).toBeGreaterThan(0);
      expect(result.environmentalInteractions.some(interaction => 
        interaction.includes('structure') || interaction.includes('resource') || interaction.includes('weather')
      )).toBeTruthy();
    });

    it('should generate behavioral predictions based on stats', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('aggressive_hunter', routeId);
      // Set low health
      mockMonsterRepository.updateMonster(monster.id, {
        stats: { ...monster.stats, health: 20 }
      });
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.behavioralPredictions.some(prediction => 
        prediction.includes('shelter') || prediction.includes('rest')
      )).toBeTruthy();
    });

    it('should generate interaction insights for multiple creatures', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster1 = mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
      const monster2 = mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
      const input = { monster_id: monster1.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.interactionInsights.some(insight => 
        insight.includes('Compatible') || insight.includes('cooperation')
      )).toBeTruthy();
    });

    it('should suggest caution for aggressive hunting monsters', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('aggressive_hunter', routeId);
      mockMonsterRepository.updateMonster(monster.id, { 
        state: 'hunting',
        ai_personality: { ...monster.ai_personality, aggression: 0.9 }
      });
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('caution') || action.includes('aggressive')
      )).toBeTruthy();
    });

    it('should suggest group behavior observations for socializing creatures', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
      mockMonsterRepository.updateMonster(monster.id, { 
        state: 'socializing',
        ai_personality: { ...monster.ai_personality, pack_tendency: 0.9 }
      });
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('group behavior') || action.includes('pack interaction')
      )).toBeTruthy();
    });

    it('should handle weather adaptation in environmental interactions', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('cautious_forager', routeId);
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        mockEnvironmentState.updateWeather(routeId, 'stormy');
      }
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.environmentalInteractions.some(interaction => 
        interaction.includes('stormy') || interaction.includes('conditions')
      )).toBeTruthy();
    });

    it('should identify influence resistance patterns', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('resistance') || action.includes('influence')
      )).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const input = { monster_id: 'test_monster', route_id: 'test_route' };

      // Act - The tool is designed to handle non-existent monsters gracefully
      const result = await tool.execute(input);

      // Assert - Should return a not found response
      expect(result.monster_id).toBe('test_monster');
      expect(result.personalityProfile).toContain('not found');
      expect(result.suggestedActions).toContain('Verify monster ID');
    });

    it('should format species names correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('aggressive_hunter', routeId);
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.species).toBe('Aggressive Hunter');
    });

    it('should provide resource monitoring suggestions', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('cautious_forager', routeId);
      const input = { monster_id: monster.id, route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('resource locations') || action.includes('environmental planning')
      )).toBeTruthy();
    });
  });
});

describe('analyzeMonster MCP tool integration', () => {
  let mockMonsterRepository: MockMonsterRepository;
  let mockEnvironmentState: MockEnvironmentState;

  beforeEach(() => {
    mockMonsterRepository = new MockMonsterRepository();
    mockEnvironmentState = new MockEnvironmentState();
    // Clear any initialized monsters
    mockMonsterRepository.clear();
  });

  it('should format output as engaging narrative', async () => {
    // Arrange
    const routeId = 'route_001';
    const monster = mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
    const input = { monster_id: monster.id, route_id: routeId };

    // Act
    const result = await analyzeMonster.execute(input);

    // Assert
    expect(result).toContain('## Monster Analysis Report');
    expect(result).toContain('### Personality Profile');
    expect(result).toContain('### Current Behavior');
    expect(result).toContain('### Environmental Interactions');
    expect(result).toContain('### Behavioral Predictions');
    expect(result).toContain('### Interaction Insights');
    expect(result).toContain('### Suggested Actions');
    expect(result).toContain('Generated at');
  });

  it('should have correct MCP tool configuration', () => {
    // Assert
    expect(analyzeMonster.name).toBe('analyze_monster');
    expect(analyzeMonster.description).toBe('Get detailed behavioral analysis for individual creatures');
    expect(analyzeMonster.parameters).toBeDefined();
    expect(analyzeMonster.execute).toBeDefined();
  });
});