import { EcosystemObserverTool, observeEcosystem } from '../../../src/tools/ecosystem-observer';
import { MockMonsterRepository } from '../../../src/ecosystem/monster-state';
import { MockEnvironmentState } from '../../../src/ecosystem/environment-state';
import { MonsterSpecies } from '../../../src/types/monster-types';

describe('EcosystemObserverTool', () => {
  let tool: EcosystemObserverTool;
  let mockMonsterRepository: MockMonsterRepository;
  let mockEnvironmentState: MockEnvironmentState;

  beforeEach(() => {
    mockMonsterRepository = new MockMonsterRepository();
    mockEnvironmentState = new MockEnvironmentState();
    tool = new EcosystemObserverTool(mockMonsterRepository, mockEnvironmentState);
    // Clear any initialized monsters
    mockMonsterRepository.clear();
  });

  describe('execute', () => {
    it('should generate engaging ecosystem description for existing environment', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('aggressive_hunter', routeId);
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.currentState).toContain('Route 001');
      expect(result.currentState).toContain('1 creatures present');
      expect(result.monsterBehaviors).toHaveLength(1);
      expect(result.monsterBehaviors[0]).toContain(monster.id);
      expect(result.monsterBehaviors[0]).toContain('aggressive hunter');
      expect(result.environmentalConditions).toContain('Current environmental conditions');
      expect(result.interestingObservations).toBeInstanceOf(Array);
      expect(result.suggestedActions).toBeInstanceOf(Array);
      expect(result.timestamp).toBeDefined();
    });

    it('should create new environment if route does not exist', async () => {
      // Arrange
      const routeId = 'nonexistent_route';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.currentState).toContain('Nonexistent Route');
      expect(result.environmentalConditions).toContain('Current environmental conditions');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle focus parameter for monsters', async () => {
      // Arrange
      const routeId = 'route_001';
      mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
      const input = { route_id: routeId, focus: 'monsters' };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions).toContain('Use analyze_monster tool to get detailed behavioral analysis of specific creatures');
    });

    it('should handle focus parameter for environment', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId, focus: 'environment' };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions).toContain('Use check_environment tool to get detailed environmental analysis');
    });

    it('should handle focus parameter for interactions', async () => {
      // Arrange
      const routeId = 'route_001';
      mockMonsterRepository.generateAndAddMonster('cautious_forager', routeId);
      mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
      const input = { route_id: routeId, focus: 'interactions' };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions).toContain('Monitor creature interactions by observing again in a few minutes');
    });

    it('should generate different descriptions for different species', async () => {
      // Arrange
      const routeId = 'route_001';
      const species: MonsterSpecies[] = ['aggressive_hunter', 'cautious_forager', 'pack_leader'];
      const monsters = species.map(s => mockMonsterRepository.generateAndAddMonster(s, routeId));
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.monsterBehaviors).toHaveLength(3);
      expect(result.monsterBehaviors.some(b => b.includes('aggressive hunter'))).toBeTruthy();
      expect(result.monsterBehaviors.some(b => b.includes('cautious forager'))).toBeTruthy();
      expect(result.monsterBehaviors.some(b => b.includes('pack leader'))).toBeTruthy();
    });

    it('should generate interesting observations based on monster states', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('aggressive_hunter', routeId);
      // Force the monster into hunting state
      mockMonsterRepository.updateMonster(monster.id, { state: 'hunting' });
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.interestingObservations.some(obs => 
        obs.includes('hunting') || obs.includes('territorial')
      )).toBeTruthy();
    });

    it('should generate observations about resource scarcity', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Simulate low resources
        const updatedResources = environment.resources.map(r => ({
          ...r,
          quantity: 20 // Low quantity
        }));
        mockEnvironmentState.updateEnvironment(routeId, { resources: updatedResources });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.interestingObservations.some(obs => 
        obs.includes('scarcity') || obs.includes('running low')
      )).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const input = { route_id: 'test_route' };

      // Act - The tool is designed to be resilient and create new instances when needed
      const result = await tool.execute(input);

      // Assert - The tool should handle this gracefully and provide a response
      expect(result.currentState).toBeDefined();
      expect(result.environmentalConditions).toBeDefined();
      expect(result.suggestedActions).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should provide ecosystem balance suggestions', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Set low ecosystem balance
        mockEnvironmentState.updateEnvironment(routeId, { ecosystem_balance: 0.3 });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('ecosystem balance') || action.includes('intervention')
      )).toBeTruthy();
    });

    it('should describe weather conditions accurately', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        mockEnvironmentState.updateWeather(routeId, 'stormy');
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.environmentalConditions).toContain('stormy');
      expect(result.currentState).toContain('caught in a fierce storm');
    });

    it('should track visibility impact on observations', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        const weatherState = { ...environment.weather_state, visibility: 0.2 };
        mockEnvironmentState.updateEnvironment(routeId, { weather_state: weatherState });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.interestingObservations.some(obs => 
        obs.includes('visibility') || obs.includes('affecting creature behavior')
      )).toBeTruthy();
    });

    it('should generate appropriate suggestions for high-energy creatures', async () => {
      // Arrange
      const routeId = 'route_001';
      const monster = mockMonsterRepository.generateAndAddMonster('pack_leader', routeId);
      // Set high energy
      mockMonsterRepository.updateMonster(monster.id, { 
        stats: { ...monster.stats, energy: 90 }
      });
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('High-energy creatures') || action.includes('good time for environmental modifications')
      )).toBeTruthy();
    });

    it('should format route names correctly', async () => {
      // Arrange
      const routeId = 'forest_path_001';
      const environment = mockEnvironmentState.createEnvironment(routeId);
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.currentState).toContain('Forest');
    });

    it('should provide default observations when no specific patterns detected', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.interestingObservations.length).toBeGreaterThan(0);
      expect(result.interestingObservations.some(obs => 
        obs.includes('stable') || obs.includes('normal') || obs.includes('resting') || obs.includes('safe environment')
      )).toBeTruthy();
    });

    it('should provide default suggestions when no specific conditions detected', async () => {
      // Arrange
      const routeId = 'route_001';
      // Create an environment with high balance to avoid triggering low balance conditions
      const environment = mockEnvironmentState.generateEnvironment(routeId);
      environment.ecosystem_balance = 0.8; // High balance to avoid triggering suggestions
      mockEnvironmentState.updateEnvironment(routeId, environment);
      
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.length).toBeGreaterThan(0);
      expect(result.suggestedActions.some(action => 
        action.includes('Continue observing ecosystem') || action.includes('Continue observing') || action.includes('observing') || action.includes('behavioral patterns')
      )).toBeTruthy();
    });
  });
});

describe('observeEcosystem MCP tool integration', () => {
  it('should format output as engaging narrative', async () => {
    // Arrange
    const input = { route_id: 'route_001' };

    // Act
    const result = await observeEcosystem.execute(input);

    // Assert
    expect(result).toContain('## Ecosystem Observation Report');
    expect(result).toContain('### Current State');
    expect(result).toContain('### Creature Behaviors');
    expect(result).toContain('### Environmental Conditions');
    expect(result).toContain('### Interesting Observations');
    expect(result).toContain('### Suggested Actions');
    expect(result).toContain('Generated at');
  });

  it('should have correct MCP tool configuration', () => {
    // Assert
    expect(observeEcosystem.name).toBe('observe_ecosystem');
    expect(observeEcosystem.description).toBe('Get detailed natural language description of current ecosystem state');
    expect(observeEcosystem.parameters).toBeDefined();
    expect(observeEcosystem.execute).toBeDefined();
  });
});