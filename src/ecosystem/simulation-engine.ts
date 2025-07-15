import winston from 'winston';
import { MockMonsterSystem } from './mock-monster-system';
import { MockEnvironmentState } from './mock-environment-state';
import { Monster, MonsterState, MonsterDecision } from '../types/monster-types';
import { Environment } from '../types/environment-types';

// Configuration constants for better maintainability
const DEFAULT_TICK_INTERVAL = 1000;
const DEFAULT_MONSTER_UPDATE_INTERVAL = 5000;
const DEFAULT_ENVIRONMENT_UPDATE_INTERVAL = 30000;
const DEFAULT_RESOURCE_REGENERATION_INTERVAL = 60000;
const DEFAULT_WEATHER_UPDATE_INTERVAL = 300000;
const DEFAULT_MAX_SIMULATION_TIME = 3600000;
const SIMULATION_STATUS_LOG_INTERVAL = 60;

interface SimulationConfig {
  tickInterval: number;
  monsterUpdateInterval: number;
  environmentUpdateInterval: number;
  resourceRegenerationInterval: number;
  weatherUpdateInterval: number;
  maxSimulationTime: number;
}

interface SimulationStats {
  totalTicks: number;
  monstersProcessed: number;
  environmentUpdates: number;
  averageProcessingTime: number;
  errorsCount: number;
}

interface MonsterSchedule {
  monsterId: string;
  nextUpdate: number;
  currentAction?: MonsterDecision;
  actionStartTime?: number;
}

export class SimulationEngine {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private simulationTimer?: ReturnType<typeof setInterval>;
  private currentTick: number = 0;
  private startTime: number = 0;
  private logger: winston.Logger;
  
  private config: SimulationConfig;
  private stats: SimulationStats;
  private monsterSchedules: Map<string, MonsterSchedule> = new Map();
  private lastEnvironmentUpdate: number = 0;
  private lastResourceRegeneration: number = 0;
  private lastWeatherUpdate: number = 0;
  
  private monsterSystem: MockMonsterSystem;
  private environmentState: MockEnvironmentState;

  constructor(
    monsterSystem: MockMonsterSystem,
    environmentState: MockEnvironmentState,
    logger: winston.Logger,
    config?: Partial<SimulationConfig>
  ) {
    this.monsterSystem = monsterSystem;
    this.environmentState = environmentState;
    this.logger = logger;
    
    this.config = {
      tickInterval: DEFAULT_TICK_INTERVAL,
      monsterUpdateInterval: DEFAULT_MONSTER_UPDATE_INTERVAL,
      environmentUpdateInterval: DEFAULT_ENVIRONMENT_UPDATE_INTERVAL,
      resourceRegenerationInterval: DEFAULT_RESOURCE_REGENERATION_INTERVAL,
      weatherUpdateInterval: DEFAULT_WEATHER_UPDATE_INTERVAL,
      maxSimulationTime: DEFAULT_MAX_SIMULATION_TIME,
      ...config
    };
    
    this.stats = {
      totalTicks: 0,
      monstersProcessed: 0,
      environmentUpdates: 0,
      averageProcessingTime: 0,
      errorsCount: 0
    };
  }

  start(): void {
    if (this.isRunning) {
      this.logger.warn('Simulation engine is already running');
      return;
    }
    
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.currentTick = 0;
    
    this.initializeMonsterSchedules();
    this.resetStats();
    
    this.simulationTimer = setInterval(() => {
      this.processTick();
    }, this.config.tickInterval);
    
    this.logger.info('Simulation engine started', {
      config: this.config,
      monsterCount: this.monsterSystem.getAllMonsters().length
    });
  }

  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Simulation engine is not running');
      return;
    }
    
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = undefined;
    }
    
    const runtime = Date.now() - this.startTime;
    this.logger.info('Simulation engine stopped', {
      runtime,
      stats: this.stats
    });
  }

  pause(): void {
    if (!this.isRunning) {
      this.logger.warn('Cannot pause: simulation engine is not running');
      return;
    }
    
    this.isPaused = true;
    this.logger.info('Simulation engine paused');
  }

  resume(): void {
    if (!this.isRunning) {
      this.logger.warn('Cannot resume: simulation engine is not running');
      return;
    }
    
    this.isPaused = false;
    this.logger.info('Simulation engine resumed');
  }

  reset(): void {
    this.stop();
    this.monsterSchedules.clear();
    this.resetStats();
    this.currentTick = 0;
    this.logger.info('Simulation engine reset');
  }

  private initializeMonsterSchedules(): void {
    const monsters = this.monsterSystem.getAllMonsters();
    const currentTime = Date.now();
    
    monsters.forEach(monster => {
      const schedule: MonsterSchedule = {
        monsterId: monster.id,
        nextUpdate: currentTime + Math.random() * this.config.monsterUpdateInterval
      };
      
      this.monsterSchedules.set(monster.id, schedule);
    });
    
    this.logger.debug(`Initialized schedules for ${monsters.length} monsters`);
  }

  private processTick(): void {
    if (this.isPaused) {
      return;
    }
    
    const tickStartTime = Date.now();
    const runtime = tickStartTime - this.startTime;
    
    if (runtime > this.config.maxSimulationTime) {
      this.logger.info('Maximum simulation time reached, stopping');
      this.stop();
      return;
    }
    
    try {
      this.currentTick++;
      this.stats.totalTicks++;
      
      this.processMonsterUpdates(tickStartTime);
      this.processEnvironmentUpdates(tickStartTime);
      this.processResourceRegeneration(tickStartTime);
      this.processWeatherUpdates(tickStartTime);
      
      const processingTime = Date.now() - tickStartTime;
      this.updateProcessingStats(processingTime);
      
      if (this.currentTick % SIMULATION_STATUS_LOG_INTERVAL === 0) {
        this.logSimulationStatus();
      }
      
    } catch (error) {
      this.stats.errorsCount++;
      this.logger.error('Error during simulation tick', {
        error: error instanceof Error ? error.message : String(error),
        tick: this.currentTick
      });
    }
  }

  private processMonsterUpdates(currentTime: number): void {
    const monsters = this.monsterSystem.getAllMonsters();
    let processedCount = 0;
    
    monsters.forEach(monster => {
      const schedule = this.monsterSchedules.get(monster.id);
      if (!schedule) {
        this.createMonsterSchedule(monster.id, currentTime);
        return;
      }
      
      if (currentTime >= schedule.nextUpdate) {
        this.updateMonster(monster, schedule, currentTime);
        processedCount++;
      }
    });
    
    this.stats.monstersProcessed += processedCount;
  }

  private updateMonster(monster: Monster, schedule: MonsterSchedule, currentTime: number): void {
    try {
      if (schedule.currentAction && schedule.actionStartTime) {
        const actionElapsed = currentTime - schedule.actionStartTime;
        
        if (actionElapsed >= schedule.currentAction.duration) {
          this.completeMonsterAction(monster, schedule.currentAction);
          schedule.currentAction = undefined;
          schedule.actionStartTime = undefined;
        } else {
          return;
        }
      }
      
      const decision = this.monsterSystem.makeDecision(monster.id);
      
      schedule.currentAction = decision;
      schedule.actionStartTime = currentTime;
      schedule.nextUpdate = currentTime + decision.duration;
      
      const environment = this.getMonsterEnvironment(monster);
      this.executeMonsterAction(monster, decision);
      
      if (environment) {
        this.applyActionEffects(monster, decision, environment);
      }
      
    } catch (error) {
      this.logger.error(`Error updating monster ${monster.id}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private completeMonsterAction(monster: Monster, action: MonsterDecision): void {
    this.updateMonsterStats(monster, action);
    
    if (action.target_position) {
      monster.stats.position = action.target_position;
    }
    
    this.monsterSystem.updateMonsterState(monster.id, MonsterState.IDLE);
    
    this.logger.debug(`Monster ${monster.id} completed action: ${action.action}`);
  }

  private executeMonsterAction(monster: Monster, decision: MonsterDecision): void {
    const actionState = this.getActionState(decision.action);
    this.monsterSystem.updateMonsterState(monster.id, actionState);
  }

  private getActionState(action: string): MonsterState {
    const actionStateMap: Record<string, MonsterState> = {
      hunt: MonsterState.HUNTING,
      forage: MonsterState.FEEDING,
      rest: MonsterState.RESTING,
      patrol: MonsterState.MOVING,
      hide: MonsterState.ALERTING,
      explore: MonsterState.MOVING
    };
    
    return actionStateMap[action] || MonsterState.IDLE;
  }

  private updateMonsterStats(monster: Monster, action: MonsterDecision): void {
    const stats = monster.stats;
    const actionEffects = this.getActionEffects(action.action);
    
    stats.energy = Math.max(0, stats.energy + actionEffects.energy);
    stats.hunger = Math.max(0, Math.min(stats.maxHunger, stats.hunger + actionEffects.hunger));
    stats.health = Math.max(0, Math.min(stats.maxHealth, stats.health + actionEffects.health));
    
    monster.last_updated = Date.now();
  }

  private getActionEffects(action: string): { energy: number; hunger: number; health: number } {
    const effectsMap: Record<string, { energy: number; hunger: number; health: number }> = {
      hunt: { energy: -15, hunger: -10, health: 0 },
      forage: { energy: -5, hunger: -20, health: 0 },
      rest: { energy: 20, hunger: 5, health: 2 },
      patrol: { energy: -10, hunger: 3, health: 0 },
      hide: { energy: -2, hunger: 2, health: 0 },
      explore: { energy: -12, hunger: 8, health: 0 }
    };
    
    return effectsMap[action] || { energy: 0, hunger: 0, health: 0 };
  }

  private applyActionEffects(monster: Monster, decision: MonsterDecision, environment: Environment): void {
    switch (decision.action) {
      case 'forage':
        this.handleForaging(monster, environment);
        break;
      case 'hunt':
        this.handleHunting(monster, environment);
        break;
      case 'rest':
        this.handleResting(monster, environment);
        break;
    }
  }

  private handleForaging(monster: Monster, environment: Environment): void {
    const nearbyResources = environment.resources.filter(resource => 
      resource.type === 'food' && 
      this.calculateDistance(monster.stats.position, resource.position) < 10
    );
    
    if (nearbyResources.length > 0) {
      const bestResource = nearbyResources.reduce((best, current) => 
        current.quality > best.quality ? current : best
      );
      
      const accessAmount = Math.min(20, bestResource.quantity);
      if (this.environmentState.accessResource(environment.route_id, bestResource.id, accessAmount)) {
        monster.stats.hunger = Math.max(0, monster.stats.hunger - accessAmount);
        this.logger.debug(`Monster ${monster.id} foraged ${accessAmount} food`);
      }
    }
  }

  private handleHunting(monster: Monster, environment: Environment): void {
    const huntingSuccess = Math.random() < (monster.ai_personality.aggression * 0.5);
    
    if (huntingSuccess) {
      const preyValue = 30 + Math.random() * 20;
      monster.stats.hunger = Math.max(0, monster.stats.hunger - preyValue);
      this.environmentState.updateEcosystemBalance(environment.route_id, 0, -1);
      this.logger.debug(`Monster ${monster.id} successfully hunted prey`);
    } else {
      monster.stats.energy -= 5;
      this.logger.debug(`Monster ${monster.id} hunt failed`);
    }
  }

  private handleResting(monster: Monster, environment: Environment): void {
    const shelters = environment.structures.filter(s => s.type === 'cave' && !s.occupied);
    
    if (shelters.length > 0) {
      const shelter = shelters[0];
      shelter.occupied = true;
      monster.stats.energy = Math.min(monster.stats.maxEnergy, monster.stats.energy + 10);
      this.logger.debug(`Monster ${monster.id} rested in shelter ${shelter.id}`);
    }
  }

  private processEnvironmentUpdates(currentTime: number): void {
    if (currentTime - this.lastEnvironmentUpdate >= this.config.environmentUpdateInterval) {
      const environments = this.environmentState.getAllEnvironments();
      
      environments.forEach(environment => {
        this.environmentState.updateSimulationTime(environment.route_id, this.config.environmentUpdateInterval);
        this.stats.environmentUpdates++;
      });
      
      this.lastEnvironmentUpdate = currentTime;
    }
  }

  private processResourceRegeneration(currentTime: number): void {
    if (currentTime - this.lastResourceRegeneration >= this.config.resourceRegenerationInterval) {
      const environments = this.environmentState.getAllEnvironments();
      
      environments.forEach(environment => {
        this.environmentState.regenerateResources(environment.route_id);
      });
      
      this.lastResourceRegeneration = currentTime;
    }
  }

  private processWeatherUpdates(currentTime: number): void {
    if (currentTime - this.lastWeatherUpdate >= this.config.weatherUpdateInterval) {
      const environments = this.environmentState.getAllEnvironments();
      
      environments.forEach(environment => {
        this.environmentState.updateWeather(environment.route_id);
      });
      
      this.lastWeatherUpdate = currentTime;
    }
  }

  private createMonsterSchedule(monsterId: string, currentTime: number): void {
    const schedule: MonsterSchedule = {
      monsterId,
      nextUpdate: currentTime + Math.random() * this.config.monsterUpdateInterval
    };
    
    this.monsterSchedules.set(monsterId, schedule);
  }

  private getMonsterEnvironment(monster: Monster): Environment | undefined {
    return this.environmentState.getEnvironment(monster.stats.position.route);
  }

  private buildEnvironmentContext(environment: Environment | undefined, monster: Monster): Record<string, unknown> {
    if (!environment) return {};
    
    return {
      weather: environment.weather_state,
      resources: environment.resources.filter(r => 
        this.calculateDistance(monster.stats.position, r.position) < 20
      ),
      structures: environment.structures.filter(s => 
        this.calculateDistance(monster.stats.position, s.position) < 15
      ),
      ecosystemBalance: environment.ecosystem_balance
    };
  }

  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
  }

  private updateProcessingStats(processingTime: number): void {
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalTicks - 1) + processingTime) / this.stats.totalTicks;
  }

  private resetStats(): void {
    this.stats = {
      totalTicks: 0,
      monstersProcessed: 0,
      environmentUpdates: 0,
      averageProcessingTime: 0,
      errorsCount: 0
    };
  }

  private logSimulationStatus(): void {
    const runtime = Date.now() - this.startTime;
    const monsterCount = this.monsterSystem.getAllMonsters().length;
    
    this.logger.info('Simulation status', {
      runtime,
      tick: this.currentTick,
      monsterCount,
      stats: this.stats,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    });
  }

  getStats(): SimulationStats {
    return { ...this.stats };
  }

  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Simulation config updated', { config: this.config });
  }

  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  isSimulationPaused(): boolean {
    return this.isPaused;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  getRuntime(): number {
    return this.isRunning ? Date.now() - this.startTime : 0;
  }
}