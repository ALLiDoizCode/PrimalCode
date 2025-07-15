"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationEngine = void 0;
const monster_types_1 = require("../types/monster-types");
// Configuration constants for better maintainability
const DEFAULT_TICK_INTERVAL = 1000;
const DEFAULT_MONSTER_UPDATE_INTERVAL = 5000;
const DEFAULT_ENVIRONMENT_UPDATE_INTERVAL = 30000;
const DEFAULT_RESOURCE_REGENERATION_INTERVAL = 60000;
const DEFAULT_WEATHER_UPDATE_INTERVAL = 300000;
const DEFAULT_MAX_SIMULATION_TIME = 3600000;
const SIMULATION_STATUS_LOG_INTERVAL = 60;
class SimulationEngine {
    isRunning = false;
    isPaused = false;
    simulationTimer;
    currentTick = 0;
    startTime = 0;
    logger;
    config;
    stats;
    monsterSchedules = new Map();
    lastEnvironmentUpdate = 0;
    lastResourceRegeneration = 0;
    lastWeatherUpdate = 0;
    monsterSystem;
    environmentState;
    constructor(monsterSystem, environmentState, logger, config) {
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
    start() {
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
    stop() {
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
    pause() {
        if (!this.isRunning) {
            this.logger.warn('Cannot pause: simulation engine is not running');
            return;
        }
        this.isPaused = true;
        this.logger.info('Simulation engine paused');
    }
    resume() {
        if (!this.isRunning) {
            this.logger.warn('Cannot resume: simulation engine is not running');
            return;
        }
        this.isPaused = false;
        this.logger.info('Simulation engine resumed');
    }
    reset() {
        this.stop();
        this.monsterSchedules.clear();
        this.resetStats();
        this.currentTick = 0;
        this.logger.info('Simulation engine reset');
    }
    initializeMonsterSchedules() {
        const monsters = this.monsterSystem.getAllMonsters();
        const currentTime = Date.now();
        monsters.forEach(monster => {
            const schedule = {
                monsterId: monster.id,
                nextUpdate: currentTime + Math.random() * this.config.monsterUpdateInterval
            };
            this.monsterSchedules.set(monster.id, schedule);
        });
        this.logger.debug(`Initialized schedules for ${monsters.length} monsters`);
    }
    processTick() {
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
        }
        catch (error) {
            this.stats.errorsCount++;
            this.logger.error('Error during simulation tick', {
                error: error instanceof Error ? error.message : String(error),
                tick: this.currentTick
            });
        }
    }
    processMonsterUpdates(currentTime) {
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
    updateMonster(monster, schedule, currentTime) {
        try {
            if (schedule.currentAction && schedule.actionStartTime) {
                const actionElapsed = currentTime - schedule.actionStartTime;
                if (actionElapsed >= schedule.currentAction.duration) {
                    this.completeMonsterAction(monster, schedule.currentAction);
                    schedule.currentAction = undefined;
                    schedule.actionStartTime = undefined;
                }
                else {
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
        }
        catch (error) {
            this.logger.error(`Error updating monster ${monster.id}`, {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    completeMonsterAction(monster, action) {
        this.updateMonsterStats(monster, action);
        if (action.target_position) {
            monster.stats.position = action.target_position;
        }
        this.monsterSystem.updateMonsterState(monster.id, monster_types_1.MonsterState.IDLE);
        this.logger.debug(`Monster ${monster.id} completed action: ${action.action}`);
    }
    executeMonsterAction(monster, decision) {
        const actionState = this.getActionState(decision.action);
        this.monsterSystem.updateMonsterState(monster.id, actionState);
    }
    getActionState(action) {
        const actionStateMap = {
            hunt: monster_types_1.MonsterState.HUNTING,
            forage: monster_types_1.MonsterState.FEEDING,
            rest: monster_types_1.MonsterState.RESTING,
            patrol: monster_types_1.MonsterState.MOVING,
            hide: monster_types_1.MonsterState.ALERTING,
            explore: monster_types_1.MonsterState.MOVING
        };
        return actionStateMap[action] || monster_types_1.MonsterState.IDLE;
    }
    updateMonsterStats(monster, action) {
        const stats = monster.stats;
        const actionEffects = this.getActionEffects(action.action);
        stats.energy = Math.max(0, stats.energy + actionEffects.energy);
        stats.hunger = Math.max(0, Math.min(stats.maxHunger, stats.hunger + actionEffects.hunger));
        stats.health = Math.max(0, Math.min(stats.maxHealth, stats.health + actionEffects.health));
        monster.last_updated = Date.now();
    }
    getActionEffects(action) {
        const effectsMap = {
            hunt: { energy: -15, hunger: -10, health: 0 },
            forage: { energy: -5, hunger: -20, health: 0 },
            rest: { energy: 20, hunger: 5, health: 2 },
            patrol: { energy: -10, hunger: 3, health: 0 },
            hide: { energy: -2, hunger: 2, health: 0 },
            explore: { energy: -12, hunger: 8, health: 0 }
        };
        return effectsMap[action] || { energy: 0, hunger: 0, health: 0 };
    }
    applyActionEffects(monster, decision, environment) {
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
    handleForaging(monster, environment) {
        const nearbyResources = environment.resources.filter(resource => resource.type === 'food' &&
            this.calculateDistance(monster.stats.position, resource.position) < 10);
        if (nearbyResources.length > 0) {
            const bestResource = nearbyResources.reduce((best, current) => current.quality > best.quality ? current : best);
            const accessAmount = Math.min(20, bestResource.quantity);
            if (this.environmentState.accessResource(environment.route_id, bestResource.id, accessAmount)) {
                monster.stats.hunger = Math.max(0, monster.stats.hunger - accessAmount);
                this.logger.debug(`Monster ${monster.id} foraged ${accessAmount} food`);
            }
        }
    }
    handleHunting(monster, environment) {
        const huntingSuccess = Math.random() < (monster.ai_personality.aggression * 0.5);
        if (huntingSuccess) {
            const preyValue = 30 + Math.random() * 20;
            monster.stats.hunger = Math.max(0, monster.stats.hunger - preyValue);
            this.environmentState.updateEcosystemBalance(environment.route_id, 0, -1);
            this.logger.debug(`Monster ${monster.id} successfully hunted prey`);
        }
        else {
            monster.stats.energy -= 5;
            this.logger.debug(`Monster ${monster.id} hunt failed`);
        }
    }
    handleResting(monster, environment) {
        const shelters = environment.structures.filter(s => s.type === 'cave' && !s.occupied);
        if (shelters.length > 0) {
            const shelter = shelters[0];
            shelter.occupied = true;
            monster.stats.energy = Math.min(monster.stats.maxEnergy, monster.stats.energy + 10);
            this.logger.debug(`Monster ${monster.id} rested in shelter ${shelter.id}`);
        }
    }
    processEnvironmentUpdates(currentTime) {
        if (currentTime - this.lastEnvironmentUpdate >= this.config.environmentUpdateInterval) {
            const environments = this.environmentState.getAllEnvironments();
            environments.forEach(environment => {
                this.environmentState.updateSimulationTime(environment.route_id, this.config.environmentUpdateInterval);
                this.stats.environmentUpdates++;
            });
            this.lastEnvironmentUpdate = currentTime;
        }
    }
    processResourceRegeneration(currentTime) {
        if (currentTime - this.lastResourceRegeneration >= this.config.resourceRegenerationInterval) {
            const environments = this.environmentState.getAllEnvironments();
            environments.forEach(environment => {
                this.environmentState.regenerateResources(environment.route_id);
            });
            this.lastResourceRegeneration = currentTime;
        }
    }
    processWeatherUpdates(currentTime) {
        if (currentTime - this.lastWeatherUpdate >= this.config.weatherUpdateInterval) {
            const environments = this.environmentState.getAllEnvironments();
            environments.forEach(environment => {
                this.environmentState.updateWeather(environment.route_id);
            });
            this.lastWeatherUpdate = currentTime;
        }
    }
    createMonsterSchedule(monsterId, currentTime) {
        const schedule = {
            monsterId,
            nextUpdate: currentTime + Math.random() * this.config.monsterUpdateInterval
        };
        this.monsterSchedules.set(monsterId, schedule);
    }
    getMonsterEnvironment(monster) {
        return this.environmentState.getEnvironment(monster.stats.position.route);
    }
    buildEnvironmentContext(environment, monster) {
        if (!environment)
            return {};
        return {
            weather: environment.weather_state,
            resources: environment.resources.filter(r => this.calculateDistance(monster.stats.position, r.position) < 20),
            structures: environment.structures.filter(s => this.calculateDistance(monster.stats.position, s.position) < 15),
            ecosystemBalance: environment.ecosystem_balance
        };
    }
    calculateDistance(pos1, pos2) {
        return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
    }
    updateProcessingStats(processingTime) {
        this.stats.averageProcessingTime =
            (this.stats.averageProcessingTime * (this.stats.totalTicks - 1) + processingTime) / this.stats.totalTicks;
    }
    resetStats() {
        this.stats = {
            totalTicks: 0,
            monstersProcessed: 0,
            environmentUpdates: 0,
            averageProcessingTime: 0,
            errorsCount: 0
        };
    }
    logSimulationStatus() {
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
    getStats() {
        return { ...this.stats };
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Simulation config updated', { config: this.config });
    }
    isSimulationRunning() {
        return this.isRunning;
    }
    isSimulationPaused() {
        return this.isPaused;
    }
    getCurrentTick() {
        return this.currentTick;
    }
    getRuntime() {
        return this.isRunning ? Date.now() - this.startTime : 0;
    }
}
exports.SimulationEngine = SimulationEngine;
//# sourceMappingURL=simulation-engine.js.map