export declare enum WeatherCondition {
    CLEAR = "clear",
    CLOUDY = "cloudy",
    RAIN = "rain",
    STORM = "storm",
    FOG = "fog",
    SNOW = "snow"
}
export declare enum ResourceType {
    FOOD = "food",
    WATER = "water",
    SHELTER = "shelter",
    HUNTING_GROUND = "hunting_ground",
    TERRITORY = "territory"
}
export declare enum StructureType {
    CAVE = "cave",
    TREE = "tree",
    ROCK = "rock",
    WATER_SOURCE = "water_source",
    CLEARING = "clearing",
    BURROW = "burrow"
}
export interface WeatherState {
    condition: WeatherCondition;
    temperature: number;
    humidity: number;
    wind_speed: number;
    visibility: number;
    forecast: WeatherCondition[];
}
export interface Resource {
    id: string;
    type: ResourceType;
    quality: number;
    quantity: number;
    regeneration_rate: number;
    last_accessed: number;
    position: {
        x: number;
        y: number;
    };
}
export interface Structure {
    id: string;
    type: StructureType;
    position: {
        x: number;
        y: number;
    };
    capacity: number;
    occupied: boolean;
    stability: number;
    last_modified: number;
}
export interface RouteInfo {
    route_id: string;
    name: string;
    difficulty: number;
    safety_level: number;
    connected_routes: string[];
    landmarks: string[];
}
export interface EcosystemBalance {
    predator_count: number;
    prey_count: number;
    resource_abundance: number;
    territory_pressure: number;
    seasonal_factor: number;
}
export interface Environment {
    route_id: string;
    name: string;
    structures: Structure[];
    resources: Resource[];
    weather_state: WeatherState;
    ecosystem_balance: EcosystemBalance;
    route_info: RouteInfo;
    last_modified: number;
    simulation_time: number;
}
export interface EnvironmentChange {
    type: 'resource_depletion' | 'weather_change' | 'structure_damage' | 'ecosystem_shift';
    description: string;
    impact_level: number;
    affected_area: {
        x: number;
        y: number;
        radius: number;
    };
    duration: number;
    timestamp: number;
}
//# sourceMappingURL=environment-types.d.ts.map