import winston from 'winston';
import { MockMonsterSystem } from './mock-monster-system';
import { MockEnvironmentState } from './mock-environment-state';
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
export declare class SimulationEngine {
    private isRunning;
    private isPaused;
    private simulationTimer?;
    private currentTick;
    private startTime;
    private logger;
    private config;
    private stats;
    private monsterSchedules;
    private lastEnvironmentUpdate;
    private lastResourceRegeneration;
    private lastWeatherUpdate;
    private monsterSystem;
    private environmentState;
    constructor(monsterSystem: MockMonsterSystem, environmentState: MockEnvironmentState, logger: winston.Logger, config?: Partial<SimulationConfig>);
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    reset(): void;
    private initializeMonsterSchedules;
    private processTick;
    private processMonsterUpdates;
    private updateMonster;
    private completeMonsterAction;
    private executeMonsterAction;
    private getActionState;
    private updateMonsterStats;
    private getActionEffects;
    private applyActionEffects;
    private handleForaging;
    private handleHunting;
    private handleResting;
    private processEnvironmentUpdates;
    private processResourceRegeneration;
    private processWeatherUpdates;
    private createMonsterSchedule;
    private getMonsterEnvironment;
    private buildEnvironmentContext;
    private calculateDistance;
    private updateProcessingStats;
    private resetStats;
    private logSimulationStatus;
    getStats(): SimulationStats;
    getConfig(): SimulationConfig;
    updateConfig(newConfig: Partial<SimulationConfig>): void;
    isSimulationRunning(): boolean;
    isSimulationPaused(): boolean;
    getCurrentTick(): number;
    getRuntime(): number;
}
export {};
//# sourceMappingURL=simulation-engine.d.ts.map