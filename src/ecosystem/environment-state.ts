import {
  Environment,
  EnvironmentalStructure,
  ResourcePool,
  InfluencePoint,
  WeatherState,
  WeatherCondition,
  ResourceType
} from '../types/environment-types';

export class MockEnvironmentState {
  private environments: Map<string, Environment> = new Map();
  private weatherPatterns: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'foggy'];
  private structureTypes = ['den', 'water_source', 'shelter', 'hunting_ground', 'territory_marker'];

  constructor() {
    // Initialize default routes
    this.initializeDefaultRoutes();
  }

  private initializeDefaultRoutes(): void {
    const defaultRoutes = ['route_001', 'route_002', 'route_003'];
    defaultRoutes.forEach(routeId => {
      this.environments.set(routeId, this.generateEnvironment(routeId));
    });
  }

  generateEnvironment(routeId: string): Environment {
    return {
      route_id: routeId,
      structures: this.generateStructures(),
      resources: this.generateResources(),
      weather_state: this.generateWeatherState(),
      influence_points: this.generateInfluencePoints(),
      ecosystem_balance: this.calculateEcosystemBalance(),
      last_modified: new Date()
    };
  }

  private generateStructures(): EnvironmentalStructure[] {
    const structures: EnvironmentalStructure[] = [];
    const structureCount = 3 + Math.floor(Math.random() * 5); // 3-7 structures

    for (let i = 0; i < structureCount; i++) {
      const structureType = this.structureTypes[Math.floor(Math.random() * this.structureTypes.length)];
      
      structures.push({
        id: `structure_${i + 1}`,
        type: structureType,
        position: {
          x: Math.floor(Math.random() * 1000),
          y: Math.floor(Math.random() * 1000)
        },
        properties: this.generateStructureProperties(structureType),
        influence_radius: 50 + Math.floor(Math.random() * 100),
        last_modified: new Date()
      });
    }

    return structures;
  }

  private generateStructureProperties(structureType: string): Record<string, unknown> {
    const baseProperties: Record<string, Record<string, unknown>> = {
      den: {
        capacity: 5 + Math.floor(Math.random() * 10),
        safety_level: 0.7 + Math.random() * 0.3,
        accessibility: 0.5 + Math.random() * 0.5
      },
      water_source: {
        flow_rate: 10 + Math.random() * 90,
        purity: 0.6 + Math.random() * 0.4,
        seasonal: Math.random() > 0.7
      },
      shelter: {
        weather_protection: 0.8 + Math.random() * 0.2,
        visibility: 0.3 + Math.random() * 0.4,
        structural_integrity: 0.7 + Math.random() * 0.3
      },
      hunting_ground: {
        prey_density: 0.4 + Math.random() * 0.6,
        terrain_advantage: 0.5 + Math.random() * 0.5,
        competition_level: Math.random()
      },
      territory_marker: {
        scent_strength: 0.6 + Math.random() * 0.4,
        visibility: 0.7 + Math.random() * 0.3,
        territorial_claim: Math.random()
      }
    };

    return baseProperties[structureType] || {};
  }

  private generateResources(): ResourcePool[] {
    const resources: ResourcePool[] = [];
    const resourceTypes: ResourceType[] = ['food', 'water', 'shelter', 'nesting_material', 'territory_marker'];
    const resourceCount = 4 + Math.floor(Math.random() * 6); // 4-9 resources

    for (let i = 0; i < resourceCount; i++) {
      const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
      
      resources.push({
        id: `resource_${i + 1}`,
        type: resourceType,
        position: {
          x: Math.floor(Math.random() * 1000),
          y: Math.floor(Math.random() * 1000)
        },
        quantity: 20 + Math.floor(Math.random() * 80), // 20-100
        quality: 0.3 + Math.random() * 0.7, // 0.3-1.0
        regeneration_rate: this.getRegenerationRate(resourceType),
        last_accessed: new Date(Date.now() - Math.random() * 86400000) // Random time in last 24h
      });
    }

    return resources;
  }

  private getRegenerationRate(resourceType: ResourceType): number {
    const rates: Record<ResourceType, number> = {
      food: 5 + Math.random() * 10, // 5-15 per interval
      water: 10 + Math.random() * 15, // 10-25 per interval
      shelter: 0.5 + Math.random() * 2, // 0.5-2.5 per interval
      nesting_material: 2 + Math.random() * 5, // 2-7 per interval
      territory_marker: 1 + Math.random() * 3 // 1-4 per interval
    };

    return rates[resourceType];
  }

  private generateInfluencePoints(): InfluencePoint[] {
    const influencePoints: InfluencePoint[] = [];
    const pointCount = 2 + Math.floor(Math.random() * 4); // 2-5 influence points

    for (let i = 0; i < pointCount; i++) {
      const createdAt = new Date(Date.now() - Math.random() * 86400000 * 3); // Up to 3 days ago
      const duration = 86400000 * (1 + Math.random() * 6); // 1-7 days duration
      
      influencePoints.push({
        id: `influence_${i + 1}`,
        position: {
          x: Math.floor(Math.random() * 1000),
          y: Math.floor(Math.random() * 1000)
        },
        strength: 0.3 + Math.random() * 0.7, // 0.3-1.0
        type: ['territorial', 'resource_based', 'social', 'environmental'][Math.floor(Math.random() * 4)],
        owner_id: Math.random() > 0.5 ? `monster_${Math.floor(Math.random() * 5) + 1}` : undefined,
        created_at: createdAt,
        expires_at: new Date(createdAt.getTime() + duration)
      });
    }

    return influencePoints;
  }

  private generateWeatherState(): WeatherState {
    const condition = this.weatherPatterns[Math.floor(Math.random() * this.weatherPatterns.length)];
    
    return {
      current_condition: condition,
      temperature: this.getTemperatureForCondition(condition),
      humidity: this.getHumidityForCondition(condition),
      wind_speed: Math.random() * 30, // 0-30 km/h
      visibility: this.getVisibilityForCondition(condition),
      last_updated: new Date()
    };
  }

  private getTemperatureForCondition(condition: WeatherCondition): number {
    const tempRanges: Record<WeatherCondition, [number, number]> = {
      sunny: [20, 30],
      cloudy: [15, 25],
      rainy: [10, 20],
      stormy: [12, 18],
      foggy: [8, 18],
      snowy: [-5, 5]
    };

    const [min, max] = tempRanges[condition];
    return min + Math.random() * (max - min);
  }

  private getHumidityForCondition(condition: WeatherCondition): number {
    const humidityRanges: Record<WeatherCondition, [number, number]> = {
      sunny: [30, 60],
      cloudy: [50, 80],
      rainy: [80, 100],
      stormy: [85, 100],
      foggy: [90, 100],
      snowy: [70, 90]
    };

    const [min, max] = humidityRanges[condition];
    return min + Math.random() * (max - min);
  }

  private getVisibilityForCondition(condition: WeatherCondition): number {
    const visibilityRanges: Record<WeatherCondition, [number, number]> = {
      sunny: [0.9, 1.0],
      cloudy: [0.7, 0.9],
      rainy: [0.4, 0.7],
      stormy: [0.2, 0.5],
      foggy: [0.1, 0.4],
      snowy: [0.3, 0.6]
    };

    const [min, max] = visibilityRanges[condition];
    return min + Math.random() * (max - min);
  }

  private calculateEcosystemBalance(): number {
    // Simplified ecosystem balance calculation
    // In a real system, this would consider resource availability, monster populations, etc.
    return 0.4 + Math.random() * 0.6; // 0.4-1.0
  }

  // Public API methods
  getEnvironment(routeId: string): Environment | undefined {
    return this.environments.get(routeId);
  }

  getAllEnvironments(): Environment[] {
    return Array.from(this.environments.values());
  }

  updateEnvironment(routeId: string, updates: Partial<Environment>): boolean {
    const environment = this.environments.get(routeId);
    if (!environment) return false;

    this.environments.set(routeId, {
      ...environment,
      ...updates,
      last_modified: new Date()
    });
    return true;
  }

  updateWeather(routeId: string, condition?: WeatherCondition): boolean {
    const environment = this.environments.get(routeId);
    if (!environment) return false;

    const newCondition = condition || this.weatherPatterns[Math.floor(Math.random() * this.weatherPatterns.length)];
    const newWeatherState = this.generateWeatherState();
    newWeatherState.current_condition = newCondition;

    return this.updateEnvironment(routeId, {
      weather_state: newWeatherState
    });
  }

  updateResources(routeId: string): boolean {
    const environment = this.environments.get(routeId);
    if (!environment) return false;

    const updatedResources = environment.resources.map(resource => ({
      ...resource,
      quantity: Math.min(100, resource.quantity + resource.regeneration_rate),
      last_accessed: resource.last_accessed
    }));

    return this.updateEnvironment(routeId, {
      resources: updatedResources
    });
  }

  consumeResource(routeId: string, resourceId: string, amount: number): boolean {
    const environment = this.environments.get(routeId);
    if (!environment) return false;

    const resource = environment.resources.find(r => r.id === resourceId);
    if (!resource || resource.quantity < amount) return false;

    const updatedResources = environment.resources.map(r => 
      r.id === resourceId 
        ? { ...r, quantity: r.quantity - amount, last_accessed: new Date() }
        : r
    );

    return this.updateEnvironment(routeId, {
      resources: updatedResources
    });
  }

  addInfluencePoint(routeId: string, point: Omit<InfluencePoint, 'id'>): boolean {
    const environment = this.environments.get(routeId);
    if (!environment) return false;

    const newPoint: InfluencePoint = {
      ...point,
      id: `influence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const updatedInfluencePoints = [...environment.influence_points, newPoint];

    return this.updateEnvironment(routeId, {
      influence_points: updatedInfluencePoints
    });
  }

  cleanupExpiredInfluencePoints(routeId: string): boolean {
    const environment = this.environments.get(routeId);
    if (!environment) return false;

    const now = new Date();
    const activePoints = environment.influence_points.filter(point => 
      !point.expires_at || point.expires_at > now
    );

    return this.updateEnvironment(routeId, {
      influence_points: activePoints
    });
  }

  createEnvironment(routeId: string): Environment {
    const environment = this.generateEnvironment(routeId);
    this.environments.set(routeId, environment);
    return environment;
  }

  removeEnvironment(routeId: string): boolean {
    return this.environments.delete(routeId);
  }

  getEnvironmentCount(): number {
    return this.environments.size;
  }
}