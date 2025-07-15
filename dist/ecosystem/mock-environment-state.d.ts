import winston from 'winston';
import { Environment, WeatherState, Resource, ResourceType, Structure, StructureType, EnvironmentChange } from '../types/environment-types';
export declare class MockEnvironmentState {
    private environments;
    private logger;
    private resourceIdCounter;
    private structureIdCounter;
    constructor(logger: winston.Logger);
    generateEnvironment(routeId: string, routeName: string): Environment;
    private generateStructures;
    private generateResources;
    private generateWeatherState;
    private generateWeatherForecast;
    private generateEcosystemBalance;
    private generateRouteInfo;
    updateWeather(routeId: string): WeatherState;
    regenerateResources(routeId: string): void;
    accessResource(routeId: string, resourceId: string, amount: number): boolean;
    updateEcosystemBalance(routeId: string, predatorChange: number, preyChange: number): void;
    createEnvironmentChange(routeId: string, changeType: EnvironmentChange['type'], description: string, impactLevel: number, position: {
        x: number;
        y: number;
    }, radius: number, duration: number): EnvironmentChange;
    private applyEnvironmentChange;
    getEnvironment(routeId: string): Environment | undefined;
    getAllEnvironments(): Environment[];
    getResourcesByType(routeId: string, resourceType: ResourceType): Resource[];
    getStructuresByType(routeId: string, structureType: StructureType): Structure[];
    getAvailableStructures(routeId: string): Structure[];
    updateSimulationTime(routeId: string, timeIncrement: number): void;
    addFoodSource(routeId: string, location: {
        x: number;
        y: number;
    }, foodType: string): Resource;
    modifyWeather(routeId: string, weatherType: string, intensity: number): WeatherState;
    buildShelter(routeId: string, location: {
        x: number;
        y: number;
    }, shelterType: string): Structure;
}
//# sourceMappingURL=mock-environment-state.d.ts.map