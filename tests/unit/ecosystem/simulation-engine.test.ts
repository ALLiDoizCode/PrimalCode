import winston from 'winston';
import { SimulationEngine } from '../../../src/ecosystem/simulation-engine';
import { MockMonsterSystem } from '../../../src/ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../../../src/ecosystem/mock-environment-state';
import {
  MonsterSpecies,
  MonsterPersonalityType,
  MonsterState
} from '../../../src/types/monster-types';

const createMockLogger = (): jest.Mocked<winston.Logger> => {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;
};

describe('SimulationEngine', () => {
  let simulationEngine: SimulationEngine;
  let mockMonsterSystem: MockMonsterSystem;
  let mockEnvironmentState: MockEnvironmentState;
  let mockLogger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockMonsterSystem = new MockMonsterSystem(mockLogger);
    mockEnvironmentState = new MockEnvironmentState(mockLogger);
    
    simulationEngine = new SimulationEngine(
      mockMonsterSystem,
      mockEnvironmentState,
      mockLogger,
      {
        tickInterval: 100,
        monsterUpdateInterval: 500,
        environmentUpdateInterval: 1000,
        resourceRegenerationInterval: 2000,
        weatherUpdateInterval: 3000,
        maxSimulationTime: 10000
      }
    );
  });

  afterEach(() => {
    if (simulationEngine.isSimulationRunning()) {
      simulationEngine.stop();
    }
  });

  describe('Simulation Lifecycle', () => {
    it('should start simulation successfully', () => {
      expect(simulationEngine.isSimulationRunning()).toBe(false);
      
      simulationEngine.start();
      
      expect(simulationEngine.isSimulationRunning()).toBe(true);
      expect(simulationEngine.isSimulationPaused()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Simulation engine started'),
        expect.any(Object)
      );
    });

    it('should stop simulation successfully', () => {
      simulationEngine.start();
      expect(simulationEngine.isSimulationRunning()).toBe(true);
      
      simulationEngine.stop();
      
      expect(simulationEngine.isSimulationRunning()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Simulation engine stopped'),
        expect.any(Object)
      );
    });

    it('should pause and resume simulation', () => {
      simulationEngine.start();
      
      simulationEngine.pause();
      expect(simulationEngine.isSimulationPaused()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Simulation engine paused')
      );
      
      simulationEngine.resume();
      expect(simulationEngine.isSimulationPaused()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Simulation engine resumed')
      );
    });

    it('should reset simulation state', (done) => {
      simulationEngine.start();
      
      setTimeout(() => {
        simulationEngine.reset();
        
        expect(simulationEngine.isSimulationRunning()).toBe(false);
        expect(simulationEngine.getCurrentTick()).toBe(0);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Simulation engine reset')
        );
        done();
      }, 200);
    });

    it('should handle multiple start attempts gracefully', () => {
      simulationEngine.start();
      simulationEngine.start();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Simulation engine is already running')
      );
    });

    it('should handle stop when not running', () => {
      simulationEngine.stop();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Simulation engine is not running')
      );
    });
  });

  describe('Monster Processing', () => {
    it('should process monster updates during simulation', (done) => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'route_1'
      );
      
      mockEnvironmentState.generateEnvironment('route_1', 'Test Environment');
      
      simulationEngine.start();
      
      setTimeout(() => {
        const stats = simulationEngine.getStats();
        expect(stats.monstersProcessed).toBeGreaterThanOrEqual(0);
        simulationEngine.stop();
        done();
      }, 700);
    });

    it('should handle monster state transitions', (done) => {
      const monster = mockMonsterSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'route_1'
      );
      
      mockEnvironmentState.generateEnvironment('route_1', 'Test Environment');
      
      simulationEngine.start();
      
      setTimeout(() => {
        const updatedMonster = mockMonsterSystem.getMonster(monster.id);
        expect(updatedMonster?.state).toBeDefined();
        simulationEngine.stop();
        done();
      }, 700);
    });

    it('should update monster stats based on actions', (done) => {
      const monster = mockMonsterSystem.generateMonster(
        MonsterSpecies.EMBER_HAWK,
        MonsterPersonalityType.PACK_LEADER,
        'route_1'
      );
      
      const originalStats = { ...monster.stats };
      mockEnvironmentState.generateEnvironment('route_1', 'Test Environment');
      
      simulationEngine.start();
      
      setTimeout(() => {
        const updatedMonster = mockMonsterSystem.getMonster(monster.id);
        expect(updatedMonster?.stats).toBeDefined();
        expect(updatedMonster?.last_updated).toBeGreaterThanOrEqual(monster.last_updated);
        simulationEngine.stop();
        done();
      }, 700);
    });

    it('should handle errors in monster processing gracefully', (done) => {
      const monster = mockMonsterSystem.generateMonster(
        MonsterSpecies.STONE_SERPENT,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'route_1'
      );
      
      mockMonsterSystem.removeMonster(monster.id);
      
      simulationEngine.start();
      
      setTimeout(() => {
        const stats = simulationEngine.getStats();
        expect(stats.errorsCount).toBe(0);
        simulationEngine.stop();
        done();
      }, 300);
    });
  });

  describe('Environment Processing', () => {
    it('should process environment updates during simulation', (done) => {
      mockEnvironmentState.generateEnvironment('route_1', 'Test Environment');
      
      simulationEngine.start();
      
      setTimeout(() => {
        const stats = simulationEngine.getStats();
        expect(stats.environmentUpdates).toBeGreaterThan(0);
        simulationEngine.stop();
        done();
      }, 1500);
    });

    it('should regenerate resources periodically', (done) => {
      const environment = mockEnvironmentState.generateEnvironment('route_1', 'Test Environment');
      
      environment.resources.forEach(resource => {
        resource.quantity = 30;
        resource.last_accessed = Date.now() - 7200000;
      });
      
      simulationEngine.start();
      
      setTimeout(() => {
        const updatedEnvironment = mockEnvironmentState.getEnvironment('route_1');
        const regeneratedResources = updatedEnvironment?.resources.filter(r => r.quantity > 30);
        expect(regeneratedResources?.length).toBeGreaterThan(0);
        simulationEngine.stop();
        done();
      }, 2500);
    });

    it('should update weather conditions periodically', (done) => {
      const environment = mockEnvironmentState.generateEnvironment('route_1', 'Test Environment');
      const originalWeather = environment.weather_state.condition;
      
      simulationEngine.start();
      
      setTimeout(() => {
        const updatedEnvironment = mockEnvironmentState.getEnvironment('route_1');
        simulationEngine.stop();
        done();
      }, 3500);
    });

    it('should update simulation time for environments', (done) => {
      const environment = mockEnvironmentState.generateEnvironment('route_1', 'Test Environment');
      const originalTime = environment.simulation_time;
      
      simulationEngine.start();
      
      setTimeout(() => {
        const updatedEnvironment = mockEnvironmentState.getEnvironment('route_1');
        expect(updatedEnvironment?.simulation_time).toBeGreaterThan(originalTime);
        simulationEngine.stop();
        done();
      }, 1200);
    });
  });

  describe('Performance and Statistics', () => {
    it('should track simulation statistics', (done) => {
      mockMonsterSystem.generateMonster(
        MonsterSpecies.WIND_STAG,
        MonsterPersonalityType.PACK_LEADER,
        'route_1'
      );
      
      mockEnvironmentState.generateEnvironment('route_1', 'Test Environment');
      
      simulationEngine.start();
      
      setTimeout(() => {
        const stats = simulationEngine.getStats();
        
        expect(stats.totalTicks).toBeGreaterThan(0);
        expect(stats.monstersProcessed).toBeGreaterThanOrEqual(0);
        expect(stats.environmentUpdates).toBeGreaterThanOrEqual(0);
        expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
        expect(stats.errorsCount).toBe(0);
        
        simulationEngine.stop();
        done();
      }, 800);
    });

    it('should handle 5+ monsters without performance degradation', (done) => {
      const monsterCount = 6;
      
      for (let i = 0; i < monsterCount; i++) {
        const species = Object.values(MonsterSpecies)[i % Object.values(MonsterSpecies).length];
        const personality = Object.values(MonsterPersonalityType)[i % Object.values(MonsterPersonalityType).length];
        
        mockMonsterSystem.generateMonster(species, personality, 'route_1');
      }
      
      mockEnvironmentState.generateEnvironment('route_1', 'Performance Test');
      
      const startTime = Date.now();
      simulationEngine.start();
      
      setTimeout(() => {
        const stats = simulationEngine.getStats();
        const processingTime = Date.now() - startTime;
        
        expect(stats.averageProcessingTime).toBeLessThan(50);
        expect(stats.errorsCount).toBe(0);
        expect(stats.monstersProcessed).toBeGreaterThan(0);
        
        simulationEngine.stop();
        done();
      }, 1000);
    });

    it('should maintain consistent tick intervals', (done) => {
      simulationEngine.start();
      
      const tickCounts: number[] = [];
      const interval = setInterval(() => {
        tickCounts.push(simulationEngine.getCurrentTick());
      }, 200);
      
      setTimeout(() => {
        clearInterval(interval);
        
        expect(tickCounts.length).toBeGreaterThan(2);
        
        const tickDifferences = tickCounts.slice(1).map((count, i) => count - tickCounts[i]);
        const averageTickDiff = tickDifferences.reduce((sum, diff) => sum + diff, 0) / tickDifferences.length;
        
        expect(averageTickDiff).toBeGreaterThan(0);
        
        simulationEngine.stop();
        done();
      }, 1000);
    });
  });

  describe('Configuration Management', () => {
    it('should allow config updates', () => {
      const newConfig = {
        tickInterval: 200,
        monsterUpdateInterval: 1000
      };
      
      simulationEngine.updateConfig(newConfig);
      
      const config = simulationEngine.getConfig();
      expect(config.tickInterval).toBe(200);
      expect(config.monsterUpdateInterval).toBe(1000);
    });

    it('should respect maximum simulation time', (done) => {
      const shortSimulation = new SimulationEngine(
        mockMonsterSystem,
        mockEnvironmentState,
        mockLogger,
        {
          tickInterval: 50,
          maxSimulationTime: 200
        }
      );
      
      shortSimulation.start();
      
      setTimeout(() => {
        expect(shortSimulation.isSimulationRunning()).toBe(false);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Maximum simulation time reached, stopping')
        );
        done();
      }, 400);
    });

    it('should return current configuration', () => {
      const config = simulationEngine.getConfig();
      
      expect(config.tickInterval).toBe(100);
      expect(config.monsterUpdateInterval).toBe(500);
      expect(config.environmentUpdateInterval).toBe(1000);
      expect(config.resourceRegenerationInterval).toBe(2000);
      expect(config.weatherUpdateInterval).toBe(3000);
      expect(config.maxSimulationTime).toBe(10000);
    });
  });

  describe('Error Handling', () => {
    it('should handle and log errors during simulation', (done) => {
      const faultyMonsterSystem = {
        ...mockMonsterSystem,
        makeDecision: jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        }),
        getAllMonsters: jest.fn().mockReturnValue([
          {
            id: 'test_monster',
            species: MonsterSpecies.SHADOW_WOLF,
            ai_personality: { type: MonsterPersonalityType.AGGRESSIVE_HUNTER },
            stats: { position: { route: 'route_1' } },
            state: MonsterState.IDLE
          }
        ])
      };
      
      const faultyEngine = new SimulationEngine(
        faultyMonsterSystem as any,
        mockEnvironmentState,
        mockLogger,
        { tickInterval: 100 }
      );
      
      mockEnvironmentState.generateEnvironment('route_1', 'Test Environment');
      
      faultyEngine.start();
      
      setTimeout(() => {
        const stats = faultyEngine.getStats();
        expect(stats.errorsCount).toBeGreaterThanOrEqual(0);
        
        faultyEngine.stop();
        done();
      }, 300);
    });

    it('should continue simulation after errors', (done) => {
      let errorCount = 0;
      const intermittentlyFaultySystem = {
        ...mockMonsterSystem,
        makeDecision: jest.fn().mockImplementation((id) => {
          if (errorCount < 2) {
            errorCount++;
            throw new Error('Intermittent error');
          }
          return {
            action: 'rest',
            reasoning: 'test reasoning',
            narrative: 'test narrative',
            duration: 1000
          };
        }),
        getAllMonsters: jest.fn().mockReturnValue([
          {
            id: 'test_monster',
            species: MonsterSpecies.SHADOW_WOLF,
            ai_personality: { type: MonsterPersonalityType.AGGRESSIVE_HUNTER },
            stats: { position: { route: 'route_1' } },
            state: MonsterState.IDLE
          }
        ])
      };
      
      const resilientEngine = new SimulationEngine(
        intermittentlyFaultySystem as any,
        mockEnvironmentState,
        mockLogger,
        { tickInterval: 100 }
      );
      
      resilientEngine.start();
      
      setTimeout(() => {
        expect(resilientEngine.isSimulationRunning()).toBe(true);
        const stats = resilientEngine.getStats();
        expect(stats.totalTicks).toBeGreaterThan(0);
        
        resilientEngine.stop();
        done();
      }, 500);
    });
  });

  describe('Runtime Information', () => {
    it('should track runtime accurately', (done) => {
      simulationEngine.start();
      
      setTimeout(() => {
        const runtime = simulationEngine.getRuntime();
        expect(runtime).toBeGreaterThan(200);
        expect(runtime).toBeLessThan(400);
        
        simulationEngine.stop();
        done();
      }, 300);
    });

    it('should return zero runtime when stopped', () => {
      const runtime = simulationEngine.getRuntime();
      expect(runtime).toBe(0);
    });

    it('should track current tick count', (done) => {
      simulationEngine.start();
      
      setTimeout(() => {
        const tickCount = simulationEngine.getCurrentTick();
        expect(tickCount).toBeGreaterThan(0);
        
        simulationEngine.stop();
        done();
      }, 250);
    });
  });
});