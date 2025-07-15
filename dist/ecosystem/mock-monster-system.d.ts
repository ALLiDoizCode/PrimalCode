import winston from 'winston';
import { Monster, MonsterSpecies, MonsterState, MonsterPersonalityType, MonsterDecision } from '../types/monster-types';
export declare class MockMonsterSystem {
    private monsters;
    private logger;
    private monsterIdCounter;
    constructor(logger: winston.Logger);
    generateMonster(species: MonsterSpecies, personalityType: MonsterPersonalityType, route: string, position?: {
        x: number;
        y: number;
    }): Monster;
    private generateStatsForSpecies;
    private generatePersonalityVariation;
    private generateEnvironmentalAwareness;
    private generateResourceMemory;
    makeDecision(monsterId: string): MonsterDecision;
    private selectAction;
    private applyContextualModifiers;
    private generateReasoning;
    private generateNarrative;
    private determineResponseType;
    private calculateTargetPosition;
    private calculateActionDuration;
    updateMonsterState(monsterId: string, newState: MonsterState): void;
    getMonster(monsterId: string): Monster | undefined;
    getAllMonsters(): Monster[];
    removeMonster(monsterId: string): boolean;
    getMonstersByPersonality(personalityType: MonsterPersonalityType): Monster[];
    getMonstersByRoute(route: string): Monster[];
    notifyEnvironmentalChange(routeId: string, changeType: string, location: {
        x: number;
        y: number;
    }): void;
}
//# sourceMappingURL=mock-monster-system.d.ts.map