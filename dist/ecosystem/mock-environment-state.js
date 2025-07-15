"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockEnvironmentState = void 0;
const environment_types_1 = require("../types/environment-types");
// Configuration constants for better maintainability
const DEFAULT_WORLD_SIZE = 100;
const MIN_STRUCTURE_COUNT = 5;
const MAX_ADDITIONAL_STRUCTURES = 10;
const MIN_RESOURCE_COUNT = 8;
const MAX_ADDITIONAL_RESOURCES = 12;
const MIN_RESOURCE_QUANTITY = 20;
const MIN_STRUCTURE_STABILITY = 0.7;
const MIN_RESOURCE_QUALITY = 0.3;
const DAY_IN_MILLISECONDS = 86400000;
const WEATHER_TRANSITIONS = {
    [environment_types_1.WeatherCondition.CLEAR]: [environment_types_1.WeatherCondition.CLOUDY, environment_types_1.WeatherCondition.FOG],
    [environment_types_1.WeatherCondition.CLOUDY]: [environment_types_1.WeatherCondition.CLEAR, environment_types_1.WeatherCondition.RAIN, environment_types_1.WeatherCondition.STORM],
    [environment_types_1.WeatherCondition.RAIN]: [environment_types_1.WeatherCondition.CLOUDY, environment_types_1.WeatherCondition.STORM, environment_types_1.WeatherCondition.CLEAR],
    [environment_types_1.WeatherCondition.STORM]: [environment_types_1.WeatherCondition.RAIN, environment_types_1.WeatherCondition.CLOUDY],
    [environment_types_1.WeatherCondition.FOG]: [environment_types_1.WeatherCondition.CLEAR, environment_types_1.WeatherCondition.CLOUDY],
    [environment_types_1.WeatherCondition.SNOW]: [environment_types_1.WeatherCondition.CLOUDY, environment_types_1.WeatherCondition.CLEAR]
};
const RESOURCE_GENERATION_RATES = {
    [environment_types_1.ResourceType.FOOD]: 0.1,
    [environment_types_1.ResourceType.WATER]: 0.05,
    [environment_types_1.ResourceType.SHELTER]: 0.01,
    [environment_types_1.ResourceType.HUNTING_GROUND]: 0.03,
    [environment_types_1.ResourceType.TERRITORY]: 0.02
};
class MockEnvironmentState {
    environments = new Map();
    logger;
    resourceIdCounter = 1;
    structureIdCounter = 1;
    constructor(logger) {
        this.logger = logger;
    }
    generateEnvironment(routeId, routeName) {
        const currentTime = Date.now();
        const environment = {
            route_id: routeId,
            name: routeName,
            structures: this.generateStructures(),
            resources: this.generateResources(),
            weather_state: this.generateWeatherState(),
            ecosystem_balance: this.generateEcosystemBalance(),
            route_info: this.generateRouteInfo(routeId, routeName),
            last_modified: currentTime,
            simulation_time: currentTime
        };
        this.environments.set(routeId, environment);
        this.logger.info(`Generated environment for route ${routeId}`, { routeName });
        return environment;
    }
    generateStructures() {
        const structureTypes = Object.values(environment_types_1.StructureType);
        const structureCount = MIN_STRUCTURE_COUNT + Math.floor(Math.random() * MAX_ADDITIONAL_STRUCTURES);
        return Array.from({ length: structureCount }, () => ({
            id: `structure_${this.structureIdCounter++}`,
            type: structureTypes[Math.floor(Math.random() * structureTypes.length)],
            position: {
                x: Math.random() * DEFAULT_WORLD_SIZE,
                y: Math.random() * DEFAULT_WORLD_SIZE
            },
            capacity: Math.floor(Math.random() * 5) + 1,
            occupied: Math.random() < 0.3,
            stability: MIN_STRUCTURE_STABILITY + Math.random() * (1 - MIN_STRUCTURE_STABILITY),
            last_modified: Date.now() - Math.random() * DAY_IN_MILLISECONDS
        }));
    }
    generateResources() {
        const resourceTypes = Object.values(environment_types_1.ResourceType);
        const resourceCount = MIN_RESOURCE_COUNT + Math.floor(Math.random() * MAX_ADDITIONAL_RESOURCES);
        return Array.from({ length: resourceCount }, () => {
            const type = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
            return {
                id: `resource_${this.resourceIdCounter++}`,
                type,
                quality: MIN_RESOURCE_QUALITY + Math.random() * (1 - MIN_RESOURCE_QUALITY),
                quantity: Math.floor(Math.random() * 100) + MIN_RESOURCE_QUANTITY,
                regeneration_rate: RESOURCE_GENERATION_RATES[type],
                last_accessed: Date.now() - Math.random() * 3600000,
                position: {
                    x: Math.random() * DEFAULT_WORLD_SIZE,
                    y: Math.random() * DEFAULT_WORLD_SIZE
                }
            };
        });
    }
    generateWeatherState() {
        const conditions = Object.values(environment_types_1.WeatherCondition);
        const currentCondition = conditions[Math.floor(Math.random() * conditions.length)];
        return {
            condition: currentCondition,
            temperature: -10 + Math.random() * 40,
            humidity: 0.3 + Math.random() * 0.7,
            wind_speed: Math.random() * 25,
            visibility: 0.2 + Math.random() * 0.8,
            forecast: this.generateWeatherForecast(currentCondition)
        };
    }
    generateWeatherForecast(currentCondition) {
        const forecast = [currentCondition];
        const forecastLength = 3 + Math.floor(Math.random() * 4);
        for (let i = 1; i < forecastLength; i++) {
            const previousCondition = forecast[i - 1];
            const possibleTransitions = WEATHER_TRANSITIONS[previousCondition];
            const nextCondition = possibleTransitions[Math.floor(Math.random() * possibleTransitions.length)];
            forecast.push(nextCondition);
        }
        return forecast;
    }
    generateEcosystemBalance() {
        const predatorCount = Math.floor(Math.random() * 5) + 1;
        const preyCount = Math.floor(Math.random() * 15) + 5;
        return {
            predator_count: predatorCount,
            prey_count: preyCount,
            resource_abundance: 0.4 + Math.random() * 0.6,
            territory_pressure: Math.random(),
            seasonal_factor: 0.5 + Math.random() * 0.5
        };
    }
    generateRouteInfo(routeId, routeName) {
        const routeNumbers = ['1', '2', '3', '4', '5'];
        const connectedRoutes = routeNumbers
            .filter(num => num !== routeId.split('_')[1])
            .slice(0, 2 + Math.floor(Math.random() * 2))
            .map(num => `route_${num}`);
        const landmarks = [
            'Ancient Oak Grove',
            'Crystal Stream',
            'Windswept Ridge',
            'Shadowed Vale',
            'Moonlit Clearing',
            'Granite Outcrop'
        ];
        return {
            route_id: routeId,
            name: routeName,
            difficulty: Math.random(),
            safety_level: Math.random(),
            connected_routes: connectedRoutes,
            landmarks: landmarks.slice(0, 2 + Math.floor(Math.random() * 3))
        };
    }
    updateWeather(routeId) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            throw new Error(`Environment for route ${routeId} not found`);
        }
        const currentWeather = environment.weather_state;
        const possibleTransitions = WEATHER_TRANSITIONS[currentWeather.condition];
        const newCondition = possibleTransitions[Math.floor(Math.random() * possibleTransitions.length)];
        const newWeather = {
            condition: newCondition,
            temperature: currentWeather.temperature + (Math.random() - 0.5) * 5,
            humidity: Math.max(0, Math.min(1, currentWeather.humidity + (Math.random() - 0.5) * 0.2)),
            wind_speed: Math.max(0, currentWeather.wind_speed + (Math.random() - 0.5) * 10),
            visibility: Math.max(0.1, Math.min(1, currentWeather.visibility + (Math.random() - 0.5) * 0.3)),
            forecast: this.generateWeatherForecast(newCondition)
        };
        environment.weather_state = newWeather;
        environment.last_modified = Date.now();
        this.logger.debug(`Weather updated for route ${routeId}`, {
            oldCondition: currentWeather.condition,
            newCondition: newCondition
        });
        return newWeather;
    }
    regenerateResources(routeId) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            throw new Error(`Environment for route ${routeId} not found`);
        }
        const currentTime = Date.now();
        let resourcesRegenerated = 0;
        environment.resources.forEach(resource => {
            const timeSinceLastAccess = currentTime - resource.last_accessed;
            const regenerationAmount = (timeSinceLastAccess / 3600000) * resource.regeneration_rate * 100;
            if (regenerationAmount > 0) {
                resource.quantity = Math.min(100, resource.quantity + regenerationAmount);
                resourcesRegenerated++;
            }
        });
        environment.last_modified = currentTime;
        if (resourcesRegenerated > 0) {
            this.logger.debug(`Regenerated ${resourcesRegenerated} resources in route ${routeId}`);
        }
    }
    accessResource(routeId, resourceId, amount) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            throw new Error(`Environment for route ${routeId} not found`);
        }
        const resource = environment.resources.find(r => r.id === resourceId);
        if (!resource) {
            throw new Error(`Resource ${resourceId} not found in route ${routeId}`);
        }
        if (resource.quantity < amount) {
            return false;
        }
        resource.quantity -= amount;
        resource.last_accessed = Date.now();
        environment.last_modified = Date.now();
        this.logger.debug(`Accessed resource ${resourceId} in route ${routeId}`, {
            amount,
            remainingQuantity: resource.quantity
        });
        return true;
    }
    updateEcosystemBalance(routeId, predatorChange, preyChange) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            throw new Error(`Environment for route ${routeId} not found`);
        }
        const balance = environment.ecosystem_balance;
        balance.predator_count = Math.max(0, balance.predator_count + predatorChange);
        balance.prey_count = Math.max(0, balance.prey_count + preyChange);
        const totalCreatures = balance.predator_count + balance.prey_count;
        if (totalCreatures > 0) {
            balance.territory_pressure = Math.min(1, (balance.predator_count / totalCreatures) * 2);
        }
        environment.last_modified = Date.now();
        this.logger.debug(`Ecosystem balance updated for route ${routeId}`, {
            predators: balance.predator_count,
            prey: balance.prey_count,
            pressure: balance.territory_pressure
        });
    }
    createEnvironmentChange(routeId, changeType, description, impactLevel, position, radius, duration) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            throw new Error(`Environment for route ${routeId} not found`);
        }
        const change = {
            type: changeType,
            description,
            impact_level: impactLevel,
            affected_area: {
                x: position.x,
                y: position.y,
                radius
            },
            duration,
            timestamp: Date.now()
        };
        this.applyEnvironmentChange(environment, change);
        this.logger.info(`Environment change applied to route ${routeId}`, {
            type: changeType,
            description,
            impactLevel
        });
        return change;
    }
    applyEnvironmentChange(environment, change) {
        const affectedArea = change.affected_area;
        switch (change.type) {
            case 'resource_depletion':
                environment.resources.forEach(resource => {
                    const distance = Math.sqrt(Math.pow(resource.position.x - affectedArea.x, 2) +
                        Math.pow(resource.position.y - affectedArea.y, 2));
                    if (distance <= affectedArea.radius) {
                        resource.quantity *= (1 - change.impact_level);
                        resource.quality *= (1 - change.impact_level * 0.5);
                    }
                });
                break;
            case 'structure_damage':
                environment.structures.forEach(structure => {
                    const distance = Math.sqrt(Math.pow(structure.position.x - affectedArea.x, 2) +
                        Math.pow(structure.position.y - affectedArea.y, 2));
                    if (distance <= affectedArea.radius) {
                        structure.stability *= (1 - change.impact_level);
                        structure.last_modified = Date.now();
                    }
                });
                break;
            case 'weather_change':
                if (change.impact_level > 0.5) {
                    environment.weather_state = this.generateWeatherState();
                }
                break;
            case 'ecosystem_shift': {
                const balance = environment.ecosystem_balance;
                balance.resource_abundance *= (1 - change.impact_level * 0.3);
                balance.territory_pressure += change.impact_level * 0.2;
                break;
            }
        }
        environment.last_modified = Date.now();
    }
    getEnvironment(routeId) {
        return this.environments.get(routeId);
    }
    getAllEnvironments() {
        return Array.from(this.environments.values());
    }
    getResourcesByType(routeId, resourceType) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            return [];
        }
        return environment.resources.filter(resource => resource.type === resourceType);
    }
    getStructuresByType(routeId, structureType) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            return [];
        }
        return environment.structures.filter(structure => structure.type === structureType);
    }
    getAvailableStructures(routeId) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            return [];
        }
        return environment.structures.filter(structure => !structure.occupied);
    }
    updateSimulationTime(routeId, timeIncrement) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            throw new Error(`Environment for route ${routeId} not found`);
        }
        environment.simulation_time += timeIncrement;
        environment.last_modified = Date.now();
    }
    addFoodSource(routeId, location, foodType) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            throw new Error(`Environment for route ${routeId} not found`);
        }
        const foodResource = {
            id: `food_${this.resourceIdCounter++}`,
            type: environment_types_1.ResourceType.FOOD,
            quality: 0.7 + Math.random() * 0.3,
            quantity: 50 + Math.random() * 50,
            regeneration_rate: RESOURCE_GENERATION_RATES[environment_types_1.ResourceType.FOOD],
            last_accessed: Date.now(),
            position: {
                x: location.x,
                y: location.y
            }
        };
        environment.resources.push(foodResource);
        environment.last_modified = Date.now();
        this.logger.info(`Added food source to route ${routeId}`, {
            foodType,
            location,
            quality: foodResource.quality
        });
        return foodResource;
    }
    modifyWeather(routeId, weatherType, intensity) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            throw new Error(`Environment for route ${routeId} not found`);
        }
        const weatherConditions = {
            rain: environment_types_1.WeatherCondition.RAIN,
            heat: environment_types_1.WeatherCondition.CLEAR,
            storm: environment_types_1.WeatherCondition.STORM,
            normal: environment_types_1.WeatherCondition.CLEAR
        };
        const newCondition = weatherConditions[weatherType] || environment_types_1.WeatherCondition.CLEAR;
        const currentWeather = environment.weather_state;
        const newWeather = {
            condition: newCondition,
            temperature: newCondition === environment_types_1.WeatherCondition.CLEAR ? 15 + (intensity * 15) : currentWeather.temperature,
            humidity: newCondition === environment_types_1.WeatherCondition.RAIN ? 0.7 + (intensity * 0.3) : currentWeather.humidity,
            wind_speed: newCondition === environment_types_1.WeatherCondition.STORM ? 15 + (intensity * 15) : currentWeather.wind_speed,
            visibility: newCondition === environment_types_1.WeatherCondition.RAIN ? 0.5 - (intensity * 0.3) : currentWeather.visibility,
            forecast: this.generateWeatherForecast(newCondition)
        };
        environment.weather_state = newWeather;
        environment.last_modified = Date.now();
        this.logger.info(`Modified weather for route ${routeId}`, {
            weatherType,
            intensity,
            newCondition
        });
        return newWeather;
    }
    buildShelter(routeId, location, shelterType) {
        const environment = this.environments.get(routeId);
        if (!environment) {
            throw new Error(`Environment for route ${routeId} not found`);
        }
        const shelterStructures = {
            cave: environment_types_1.StructureType.CAVE,
            burrow: environment_types_1.StructureType.BURROW,
            tree: environment_types_1.StructureType.TREE,
            rock: environment_types_1.StructureType.ROCK
        };
        const shelter = {
            id: `shelter_${this.structureIdCounter++}`,
            type: shelterStructures[shelterType] || environment_types_1.StructureType.CAVE,
            position: {
                x: location.x,
                y: location.y
            },
            capacity: 2 + Math.floor(Math.random() * 3),
            occupied: false,
            stability: 0.8 + Math.random() * 0.2,
            last_modified: Date.now()
        };
        environment.structures.push(shelter);
        environment.last_modified = Date.now();
        this.logger.info(`Built shelter in route ${routeId}`, {
            shelterType,
            location,
            capacity: shelter.capacity
        });
        return shelter;
    }
}
exports.MockEnvironmentState = MockEnvironmentState;
//# sourceMappingURL=mock-environment-state.js.map