import { Monster, MonsterState, MonsterDecision } from '../types/monster-types';
import { Environment, WeatherCondition } from '../types/environment-types';
import { MockMonsterRepository } from './monster-state';
import { MockEnvironmentState } from './environment-state';

export interface SimulationConfig {
  updateInterval: number; // milliseconds
  hungerDecayRate: number; // hunger points per update
  energyDecayRate: number; // energy points per update
  weatherChangeChance: number; // 0-1 probability per update
  resourceRegenerationRate: number; // 0-1 rate per update
}

export class MockSimulationEngine {
  private intervalId?: ReturnType<typeof setInterval>;
  private isRunning = false;
  private config: SimulationConfig;
  private monsterRepository: MockMonsterRepository;
  private environmentState: MockEnvironmentState;
  private decisionEngine: MockDecisionEngine;

  constructor(
    monsterRepository: MockMonsterRepository,
    environmentState: MockEnvironmentState,
    config: Partial<SimulationConfig> = {}
  ) {
    this.monsterRepository = monsterRepository;
    this.environmentState = environmentState;
    this.decisionEngine = new MockDecisionEngine();
    
    this.config = {
      updateInterval: 5000, // 5 seconds
      hungerDecayRate: 2,
      energyDecayRate: 1,
      weatherChangeChance: 0.1,
      resourceRegenerationRate: 0.8,
      ...config
    };
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.updateSimulation();
    }, this.config.updateInterval);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private updateSimulation(): void {
    const monsters = this.monsterRepository.getAllMonsters();
    const environments = this.environmentState.getAllEnvironments();

    // Update monster states
    monsters.forEach(monster => {
      this.updateMonsterStats(monster);
      this.updateMonsterBehavior(monster);
    });

    // Update environment states
    environments.forEach(environment => {
      this.updateEnvironmentState(environment);
    });
  }

  private updateMonsterStats(monster: Monster): void {
    const updates: Partial<Monster> = {
      stats: {
        ...monster.stats,
        hunger: Math.min(100, monster.stats.hunger + this.config.hungerDecayRate),
        energy: Math.max(0, monster.stats.energy - this.config.energyDecayRate)
      }
    };

    // Health changes based on hunger and energy
    if (monster.stats.hunger > 80) {
      updates.stats!.health = Math.max(0, monster.stats.health - 1);
    } else if (monster.stats.hunger < 20 && monster.stats.energy > 50) {
      updates.stats!.health = Math.min(100, monster.stats.health + 0.5);
    }

    this.monsterRepository.updateMonster(monster.id, updates);
  }

  private updateMonsterBehavior(monster: Monster): void {
    const environment = this.environmentState.getEnvironment(monster.stats.position.route);
    if (!environment) return;

    const decision = this.decisionEngine.makeDecision(monster, environment);
    
    // Apply decision effects
    this.applyDecisionEffects(monster, decision);

    // Update monster state and last decision
    this.monsterRepository.updateMonster(monster.id, {
      state: this.getNewStateFromDecision(decision),
      last_decision: decision.timestamp
    });
  }

  private updateEnvironmentState(environment: Environment): void {
    // Update weather
    if (Math.random() < this.config.weatherChangeChance) {
      this.environmentState.updateWeather(environment.route_id);
    }

    // Regenerate resources
    if (Math.random() < this.config.resourceRegenerationRate) {
      this.environmentState.updateResources(environment.route_id);
    }

    // Clean up expired Primal tokens
    this.environmentState.cleanupExpiredInfluencePoints(environment.route_id);
  }

  private applyDecisionEffects(monster: Monster, decision: MonsterDecision): void {
    const effects: Partial<Monster> = { stats: { ...monster.stats } };

    switch (decision.action) {
      case 'hunt':
        effects.stats!.energy = Math.max(0, monster.stats.energy - 10);
        effects.stats!.hunger = Math.max(0, monster.stats.hunger - 20);
        break;
      case 'forage':
        effects.stats!.energy = Math.max(0, monster.stats.energy - 5);
        effects.stats!.hunger = Math.max(0, monster.stats.hunger - 15);
        break;
      case 'rest':
        effects.stats!.energy = Math.min(100, monster.stats.energy + 15);
        break;
      case 'move':
        effects.stats!.energy = Math.max(0, monster.stats.energy - 8);
        // Update position slightly
        effects.stats!.position = {
          ...monster.stats.position,
          x: Math.max(0, Math.min(1000, monster.stats.position.x + (Math.random() - 0.5) * 100)),
          y: Math.max(0, Math.min(1000, monster.stats.position.y + (Math.random() - 0.5) * 100))
        };
        break;
    }

    this.monsterRepository.updateMonster(monster.id, effects);
  }

  private getNewStateFromDecision(decision: MonsterDecision): MonsterState {
    const actionStateMap: Record<string, MonsterState> = {
      hunt: 'hunting',
      forage: 'foraging',
      rest: 'resting',
      move: 'moving',
      socialize: 'socializing',
      flee: 'fleeing',
      territorial: 'territorial'
    };

    return actionStateMap[decision.action] || 'resting';
  }

  getStatus(): { isRunning: boolean; config: SimulationConfig } {
    return {
      isRunning: this.isRunning,
      config: this.config
    };
  }

  updateConfig(newConfig: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

export class MockDecisionEngine {
  makeDecision(monster: Monster, environment: Environment): MonsterDecision {
    const decision = this.generateDecisionForSpecies(monster, environment);
    
    return {
      monster_id: monster.id,
      action: decision.action,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      timestamp: new Date(),
      environmental_factors: this.calculateEnvironmentalFactors(environment)
    };
  }

  private generateDecisionForSpecies(monster: Monster, environment: Environment): {
    action: string;
    reasoning: string;
    confidence: number;
  } {
    switch (monster.species) {
      case 'aggressive_hunter':
        return this.generateAggressiveHunterDecision(monster, environment);
      case 'cautious_forager':
        return this.generateCautiousForagerDecision(monster, environment);
      case 'pack_leader':
        return this.generatePackLeaderDecision(monster, environment);
      default:
        return {
          action: 'rest',
          reasoning: 'Unknown species, defaulting to rest',
          confidence: 0.5
        };
    }
  }

  private generateAggressiveHunterDecision(monster: Monster, environment: Environment): {
    action: string;
    reasoning: string;
    confidence: number;
  } {
    // Aggressive hunters prioritize hunting when hungry, territory when threatened
    if (monster.stats.hunger > 60) {
      return {
        action: 'hunt',
        reasoning: 'High hunger level drives hunting behavior',
        confidence: 0.8 + monster.ai_personality.aggression * 0.2
      };
    }

    if (monster.stats.energy < 30) {
      return {
        action: 'rest',
        reasoning: 'Low energy requires rest before hunting',
        confidence: 0.7
      };
    }

    if (environment.influence_points.length > 2) {
      return {
        action: 'territorial',
        reasoning: 'Multiple Primal tokens detected, asserting territory',
        confidence: 0.6 + monster.ai_personality.aggression * 0.3
      };
    }

    return {
      action: 'move',
      reasoning: 'Patrolling territory for hunting opportunities',
      confidence: 0.6
    };
  }

  private generateCautiousForagerDecision(monster: Monster, environment: Environment): {
    action: string;
    reasoning: string;
    confidence: number;
  } {
    // Cautious foragers prioritize safety and consistent resource gathering
    if (monster.stats.energy < 20) {
      return {
        action: 'rest',
        reasoning: 'Critical energy level requires immediate rest',
        confidence: 0.9
      };
    }

    if (environment.weather_state.current_condition === 'stormy' || 
        environment.weather_state.visibility < 0.5) {
      return {
        action: 'rest',
        reasoning: 'Poor weather conditions favor hiding and resting',
        confidence: 0.8
      };
    }

    if (monster.stats.hunger > 40) {
      return {
        action: 'forage',
        reasoning: 'Moderate hunger level triggers careful foraging',
        confidence: 0.7 + monster.ai_personality.intelligence * 0.2
      };
    }

    if (environment.influence_points.some(ip => ip.type === 'territorial')) {
      return {
        action: 'flee',
        reasoning: 'Territorial Primal token detected, avoiding conflict',
        confidence: 0.8
      };
    }

    return {
      action: 'move',
      reasoning: 'Cautiously exploring for safe foraging opportunities',
      confidence: 0.5
    };
  }

  private generatePackLeaderDecision(monster: Monster, environment: Environment): {
    action: string;
    reasoning: string;
    confidence: number;
  } {
    // Pack leaders balance personal needs with group coordination
    if (monster.stats.energy < 25) {
      return {
        action: 'rest',
        reasoning: 'Pack leader needs energy to coordinate group activities',
        confidence: 0.8
      };
    }

    if (monster.ai_personality.pack_tendency > 0.7) {
      return {
        action: 'socialize',
        reasoning: 'High pack tendency drives group coordination behavior',
        confidence: 0.8 + monster.ai_personality.pack_tendency * 0.2
      };
    }

    if (monster.stats.hunger > 50) {
      return {
        action: 'hunt',
        reasoning: 'Pack leader must hunt to maintain strength and set example',
        confidence: 0.7 + monster.ai_personality.intelligence * 0.2
      };
    }

    if (environment.influence_points.length > 3) {
      return {
        action: 'territorial',
        reasoning: 'Multiple Primal tokens require pack territory management',
        confidence: 0.9
      };
    }

    return {
      action: 'move',
      reasoning: 'Patrolling pack territory and assessing group needs',
      confidence: 0.7
    };
  }

  private calculateEnvironmentalFactors(environment: Environment): Record<string, number> {
    return {
      resource_availability: environment.resources.reduce((sum, r) => sum + r.quantity, 0) / environment.resources.length / 100,
      weather_favorability: this.getWeatherFavorability(environment.weather_state.current_condition),
      primal_token_pressure: environment.influence_points.length / 10,
      ecosystem_health: environment.ecosystem_balance,
      structure_density: environment.structures.length / 10
    };
  }

  private getWeatherFavorability(condition: WeatherCondition): number {
    const favorability: Record<WeatherCondition, number> = {
      sunny: 0.9,
      cloudy: 0.7,
      rainy: 0.4,
      stormy: 0.1,
      foggy: 0.3,
      snowy: 0.2
    };

    return favorability[condition] || 0.5;
  }
}