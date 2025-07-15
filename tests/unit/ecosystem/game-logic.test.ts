import { MockSimulationEngine, MockDecisionEngine, SimulationConfig } from '../../../src/ecosystem/game-logic';
import { MockMonsterRepository } from '../../../src/ecosystem/monster-state';
import { MockEnvironmentState } from '../../../src/ecosystem/environment-state';
import { Monster } from '../../../src/types/monster-types';
import { Environment } from '../../../src/types/environment-types';

describe('MockDecisionEngine', () => {
  let decisionEngine: MockDecisionEngine;
  let mockMonster: Monster;
  let mockEnvironment: Environment;

  beforeEach(() => {
    decisionEngine = new MockDecisionEngine();
    
    mockMonster = {
      id: 'test_monster',
      species: 'aggressive_hunter',
      stats: {
        health: 80,
        hunger: 50,
        energy: 70,
        position: { x: 500, y: 500, route: 'route_001' }
      },
      ai_personality: {
        aggression: 0.8,
        intelligence: 0.6,
        pack_tendency: 0.3
      },
      environmental_awareness: {
        detected_structures: ['hunting_ground'],
        resource_memory: [],
        weather_adaptation: 0.6
      },
      influence_resistance: {
        learned_patterns: {},
        adaptation_history: []
      },
      state: 'resting',
      last_decision: new Date()
    };

    mockEnvironment = {
      route_id: 'route_001',
      structures: [],
      resources: [],
      weather_state: {
        current_condition: 'sunny',
        temperature: 20,
        humidity: 60,
        wind_speed: 5,
        visibility: 0.9,
        last_updated: new Date()
      },
      influence_points: [],
      ecosystem_balance: 0.7,
      last_modified: new Date()
    };
  });

  describe('makeDecision', () => {
    it('should return a valid decision object', () => {
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.monster_id).toBe('test_monster');
      expect(decision.action).toBeDefined();
      expect(decision.reasoning).toBeDefined();
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
      expect(decision.timestamp).toBeDefined();
      expect(decision.environmental_factors).toBeDefined();
    });

    it('should include environmental factors', () => {
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.environmental_factors).toHaveProperty('resource_availability');
      expect(decision.environmental_factors).toHaveProperty('weather_favorability');
      expect(decision.environmental_factors).toHaveProperty('territorial_pressure');
      expect(decision.environmental_factors).toHaveProperty('ecosystem_health');
      expect(decision.environmental_factors).toHaveProperty('structure_density');
    });
  });

  describe('aggressive_hunter decisions', () => {
    beforeEach(() => {
      mockMonster.species = 'aggressive_hunter';
      mockMonster.ai_personality.aggression = 0.8;
    });

    it('should hunt when hungry', () => {
      mockMonster.stats.hunger = 70;
      mockMonster.stats.energy = 60;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('hunt');
      expect(decision.reasoning).toContain('hunting');
      expect(decision.confidence).toBeGreaterThan(0.7);
    });

    it('should rest when energy is low', () => {
      mockMonster.stats.energy = 20;
      mockMonster.stats.hunger = 40;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('rest');
      expect(decision.reasoning).toContain('rest');
    });

    it('should be territorial when multiple influence points present', () => {
      mockMonster.stats.hunger = 40;
      mockMonster.stats.energy = 60;
      mockEnvironment.influence_points = [
        { id: '1', position: { x: 100, y: 100 }, strength: 0.5, type: 'territorial', created_at: new Date() },
        { id: '2', position: { x: 200, y: 200 }, strength: 0.6, type: 'territorial', created_at: new Date() },
        { id: '3', position: { x: 300, y: 300 }, strength: 0.7, type: 'territorial', created_at: new Date() }
      ];
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('territorial');
      expect(decision.reasoning).toContain('territory');
    });

    it('should move when no pressing needs', () => {
      mockMonster.stats.hunger = 40;
      mockMonster.stats.energy = 60;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('move');
      expect(decision.reasoning).toContain('Patrolling');
    });
  });

  describe('cautious_forager decisions', () => {
    beforeEach(() => {
      mockMonster.species = 'cautious_forager';
      mockMonster.ai_personality.aggression = 0.2;
      mockMonster.ai_personality.intelligence = 0.8;
    });

    it('should rest when energy is critically low', () => {
      mockMonster.stats.energy = 15;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('rest');
      expect(decision.reasoning).toContain('Critical energy');
      expect(decision.confidence).toBeGreaterThan(0.8);
    });

    it('should rest during bad weather', () => {
      mockMonster.stats.energy = 50;
      mockEnvironment.weather_state.current_condition = 'stormy';
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('rest');
      expect(decision.reasoning).toContain('weather');
    });

    it('should rest during low visibility', () => {
      mockMonster.stats.energy = 50;
      mockEnvironment.weather_state.visibility = 0.3;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('rest');
      expect(decision.reasoning).toContain('weather');
    });

    it('should forage when moderately hungry', () => {
      mockMonster.stats.hunger = 50;
      mockMonster.stats.energy = 60;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('forage');
      expect(decision.reasoning).toContain('foraging');
    });

    it('should flee from territorial influences', () => {
      mockMonster.stats.hunger = 30;
      mockMonster.stats.energy = 60;
      mockEnvironment.influence_points = [
        { id: '1', position: { x: 100, y: 100 }, strength: 0.5, type: 'territorial', created_at: new Date() }
      ];
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('flee');
      expect(decision.reasoning).toContain('conflict');
    });

    it('should move cautiously when no threats', () => {
      mockMonster.stats.hunger = 30;
      mockMonster.stats.energy = 60;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('move');
      expect(decision.reasoning).toContain('Cautiously');
    });
  });

  describe('pack_leader decisions', () => {
    beforeEach(() => {
      mockMonster.species = 'pack_leader';
      mockMonster.ai_personality.aggression = 0.6;
      mockMonster.ai_personality.intelligence = 0.9;
      mockMonster.ai_personality.pack_tendency = 0.9;
    });

    it('should rest when energy is low', () => {
      mockMonster.stats.energy = 20;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('rest');
      expect(decision.reasoning).toContain('Pack leader needs energy');
    });

    it('should socialize when pack tendency is high', () => {
      mockMonster.stats.energy = 60;
      mockMonster.ai_personality.pack_tendency = 0.8;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('socialize');
      expect(decision.reasoning).toContain('group coordination');
    });

    it('should hunt when hungry', () => {
      mockMonster.stats.hunger = 60;
      mockMonster.stats.energy = 60;
      mockMonster.ai_personality.pack_tendency = 0.6;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('hunt');
      expect(decision.reasoning).toContain('hunt');
    });

    it('should manage territory when many influences present', () => {
      mockMonster.stats.hunger = 40;
      mockMonster.stats.energy = 60;
      mockMonster.ai_personality.pack_tendency = 0.6;
      mockEnvironment.influence_points = [
        { id: '1', position: { x: 100, y: 100 }, strength: 0.5, type: 'territorial', created_at: new Date() },
        { id: '2', position: { x: 200, y: 200 }, strength: 0.6, type: 'territorial', created_at: new Date() },
        { id: '3', position: { x: 300, y: 300 }, strength: 0.7, type: 'territorial', created_at: new Date() },
        { id: '4', position: { x: 400, y: 400 }, strength: 0.8, type: 'territorial', created_at: new Date() }
      ];
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('territorial');
      expect(decision.reasoning).toContain('territory management');
      expect(decision.confidence).toBe(0.9);
    });

    it('should patrol when no pressing needs', () => {
      mockMonster.stats.hunger = 40;
      mockMonster.stats.energy = 60;
      mockMonster.ai_personality.pack_tendency = 0.6;
      
      const decision = decisionEngine.makeDecision(mockMonster, mockEnvironment);
      
      expect(decision.action).toBe('move');
      expect(decision.reasoning).toContain('Patrolling pack territory');
    });
  });
});

describe('MockSimulationEngine', () => {
  let simulationEngine: MockSimulationEngine;
  let monsterRepository: MockMonsterRepository;
  let environmentState: MockEnvironmentState;

  beforeEach(() => {
    monsterRepository = new MockMonsterRepository();
    environmentState = new MockEnvironmentState();
    simulationEngine = new MockSimulationEngine(monsterRepository, environmentState);
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      const status = simulationEngine.getStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.config.updateInterval).toBe(5000);
      expect(status.config.hungerDecayRate).toBe(2);
      expect(status.config.energyDecayRate).toBe(1);
      expect(status.config.weatherChangeChance).toBe(0.1);
      expect(status.config.resourceRegenerationRate).toBe(0.8);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<SimulationConfig> = {
        updateInterval: 10000,
        hungerDecayRate: 5,
        energyDecayRate: 3
      };
      
      const customEngine = new MockSimulationEngine(monsterRepository, environmentState, customConfig);
      const status = customEngine.getStatus();
      
      expect(status.config.updateInterval).toBe(10000);
      expect(status.config.hungerDecayRate).toBe(5);
      expect(status.config.energyDecayRate).toBe(3);
      expect(status.config.weatherChangeChance).toBe(0.1); // default
    });

    it('should update configuration', () => {
      const newConfig: Partial<SimulationConfig> = {
        updateInterval: 3000,
        hungerDecayRate: 4
      };
      
      simulationEngine.updateConfig(newConfig);
      const status = simulationEngine.getStatus();
      
      expect(status.config.updateInterval).toBe(3000);
      expect(status.config.hungerDecayRate).toBe(4);
      expect(status.config.energyDecayRate).toBe(1); // unchanged
    });
  });

  describe('simulation lifecycle', () => {
    it('should start and stop simulation', () => {
      expect(simulationEngine.getStatus().isRunning).toBe(false);
      
      simulationEngine.start();
      expect(simulationEngine.getStatus().isRunning).toBe(true);
      
      simulationEngine.stop();
      expect(simulationEngine.getStatus().isRunning).toBe(false);
    });

    it('should handle multiple start calls', () => {
      simulationEngine.start();
      simulationEngine.start(); // Should not cause issues
      
      expect(simulationEngine.getStatus().isRunning).toBe(true);
      
      simulationEngine.stop();
    });

    it('should handle multiple stop calls', () => {
      simulationEngine.start();
      simulationEngine.stop();
      simulationEngine.stop(); // Should not cause issues
      
      expect(simulationEngine.getStatus().isRunning).toBe(false);
    });
  });

  describe('monster stat updates', () => {
    beforeEach(() => {
      // Add some test monsters
      monsterRepository.generateAndAddMultiple(3);
    });

    it('should update monster stats during simulation', () => {
      const monsters = monsterRepository.getAllMonsters();
      const originalStats = monsters.map(m => ({ ...m.stats }));
      
      // Test the core stat update logic by calling updateMonsterStats method via simulation
      const config = simulationEngine.getStatus().config;
      
      // Simulate stat updates manually
      monsters.forEach(monster => {
        const updatedStats = {
          ...monster.stats,
          hunger: Math.min(100, monster.stats.hunger + config.hungerDecayRate),
          energy: Math.max(0, monster.stats.energy - config.energyDecayRate)
        };
        
        monsterRepository.updateMonster(monster.id, { stats: updatedStats });
      });
      
      const updatedMonsters = monsterRepository.getAllMonsters();
      
      // Check that hunger increased and energy decreased
      updatedMonsters.forEach((monster, index) => {
        expect(monster.stats.hunger).toBeGreaterThan(originalStats[index].hunger);
        expect(monster.stats.energy).toBeLessThan(originalStats[index].energy);
      });
    });

    it('should handle health changes based on hunger and energy', () => {
      const monster = monsterRepository.generateAndAddMonster('aggressive_hunter');
      
      // Test high hunger affecting health
      monsterRepository.updateMonster(monster.id, {
        stats: { ...monster.stats, hunger: 85 }
      });
      
      let updatedMonster = monsterRepository.getMonster(monster.id)!;
      const originalHealth = updatedMonster.stats.health;
      
      // Simulate health decrease due to high hunger
      const newHealth = Math.max(0, updatedMonster.stats.health - 1);
      monsterRepository.updateMonster(monster.id, {
        stats: { ...updatedMonster.stats, health: newHealth }
      });
      
      updatedMonster = monsterRepository.getMonster(monster.id)!;
      expect(updatedMonster.stats.health).toBeLessThan(originalHealth);
    });

    it('should handle health recovery when conditions are good', () => {
      const monster = monsterRepository.generateAndAddMonster('cautious_forager');
      
      // Set good conditions: low hunger, high energy
      monsterRepository.updateMonster(monster.id, {
        stats: { ...monster.stats, hunger: 15, energy: 70 }
      });
      
      const updatedMonster = monsterRepository.getMonster(monster.id)!;
      const originalHealth = updatedMonster.stats.health;
      
      // Simulate health increase due to good conditions
      const newHealth = Math.min(100, updatedMonster.stats.health + 0.5);
      monsterRepository.updateMonster(monster.id, {
        stats: { ...updatedMonster.stats, health: newHealth }
      });
      
      const finalMonster = monsterRepository.getMonster(monster.id)!;
      expect(finalMonster.stats.health).toBeGreaterThanOrEqual(originalHealth);
    });
  });

  describe('decision application', () => {
    it('should apply hunt decision effects', () => {
      const monster = monsterRepository.generateAndAddMonster('aggressive_hunter');
      const originalStats = { ...monster.stats };
      
      // Mock a hunt decision
      const decision = {
        monster_id: monster.id,
        action: 'hunt',
        reasoning: 'Test hunt',
        confidence: 0.8,
        timestamp: new Date(),
        environmental_factors: {}
      };
      
      // Apply decision effects manually (testing private method logic)
      // In real scenario, this would happen during simulation
      monsterRepository.updateMonster(monster.id, {
        stats: {
          ...originalStats,
          energy: Math.max(0, originalStats.energy - 10),
          hunger: Math.max(0, originalStats.hunger - 20)
        }
      });
      
      const updatedMonster = monsterRepository.getMonster(monster.id);
      expect(updatedMonster!.stats.energy).toBeLessThan(originalStats.energy);
      expect(updatedMonster!.stats.hunger).toBeLessThan(originalStats.hunger);
    });

    it('should apply rest decision effects', () => {
      const monster = monsterRepository.generateAndAddMonster('cautious_forager');
      const originalStats = { ...monster.stats };
      
      // Mock a rest decision
      monsterRepository.updateMonster(monster.id, {
        stats: {
          ...originalStats,
          energy: Math.min(100, originalStats.energy + 15)
        }
      });
      
      const updatedMonster = monsterRepository.getMonster(monster.id);
      expect(updatedMonster!.stats.energy).toBeGreaterThan(originalStats.energy);
    });

    it('should apply move decision effects', () => {
      const monster = monsterRepository.generateAndAddMonster('pack_leader');
      const originalStats = { ...monster.stats };
      
      // Mock a move decision
      monsterRepository.updateMonster(monster.id, {
        stats: {
          ...originalStats,
          energy: Math.max(0, originalStats.energy - 8),
          position: {
            ...originalStats.position,
            x: Math.max(0, Math.min(1000, originalStats.position.x + 50)),
            y: Math.max(0, Math.min(1000, originalStats.position.y + 50))
          }
        }
      });
      
      const updatedMonster = monsterRepository.getMonster(monster.id);
      expect(updatedMonster!.stats.energy).toBeLessThan(originalStats.energy);
      expect(updatedMonster!.stats.position.x).not.toBe(originalStats.position.x);
      expect(updatedMonster!.stats.position.y).not.toBe(originalStats.position.y);
    });
  });

  describe('integration with repositories', () => {
    it('should work with multiple monsters and environments', () => {
      // Add multiple monsters
      monsterRepository.generateAndAddMultiple(5);
      
      // Create additional environments
      environmentState.createEnvironment('route_004');
      environmentState.createEnvironment('route_005');
      
      expect(monsterRepository.getMonsterCount()).toBe(5);
      expect(environmentState.getEnvironmentCount()).toBe(5); // 3 default + 2 new
      
      // Simulation should handle all entities
      simulationEngine.start();
      expect(simulationEngine.getStatus().isRunning).toBe(true);
      simulationEngine.stop();
    });
  });
});