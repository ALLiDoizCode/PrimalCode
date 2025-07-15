import { z } from 'zod';
import { MockEnvironmentState } from '../ecosystem/environment-state';
import { MockMonsterRepository } from '../ecosystem/monster-state';
import { Environment, ResourceType } from '../types/environment-types';


// Environment checker input schema
const EnvironmentCheckerInput = z.object({
  route_id: z.string().describe('Route to check environmental conditions'),
  focus: z.string().optional().describe('Specific environmental aspect to focus on (weather, resources, structures)')
});

// Environment checker output interface
interface EnvironmentCheckerOutput {
  route_id: string;
  overallConditions: string;
  weatherAnalysis: string;
  resourceStatus: string[];
  structureAnalysis: string[];
  ecosystemHealth: string;
  influenceActivity: string;
  environmentalTrends: string[];
  balanceFactors: string[];
  suggestedActions: string[];
  timestamp: string;
}

/**
 * Environment Checker MCP tool for PrimalCode environmental analysis
 * Provides detailed descriptions of environmental conditions and modifications
 */
export class EnvironmentCheckerTool {
  private environmentState: MockEnvironmentState;
  private monsterRepository: MockMonsterRepository;

  constructor(environmentState?: MockEnvironmentState, monsterRepository?: MockMonsterRepository) {
    this.environmentState = environmentState || new MockEnvironmentState();
    this.monsterRepository = monsterRepository || new MockMonsterRepository();
    
    // Initialize with some monsters for environmental impact analysis
    if (this.monsterRepository.getMonsterCount() === 0) {
      this.monsterRepository.generateAndAddMultiple(5);
    }
  }

  async execute(input: z.infer<typeof EnvironmentCheckerInput>): Promise<EnvironmentCheckerOutput> {
    try {

      const environment = this.environmentState.getEnvironment(input.route_id);
      
      if (!environment) {
        // Create environment if it doesn't exist
        const newEnvironment = this.environmentState.createEnvironment(input.route_id);
        return this.generateEnvironmentAnalysis(newEnvironment, input.focus);
      }

      return this.generateEnvironmentAnalysis(environment, input.focus);

    } catch (error) {
      return {
        route_id: input.route_id,
        overallConditions: 'Unable to assess environmental conditions due to technical difficulties',
        weatherAnalysis: 'Weather monitoring systems offline',
        resourceStatus: ['Resource sensors unavailable'],
        structureAnalysis: ['Structure detection systems offline'],
        ecosystemHealth: 'Ecosystem monitoring systems require maintenance',
        influenceActivity: 'Influence detection systems offline',
        environmentalTrends: ['Technical issues prevent trend analysis'],
        balanceFactors: ['Balance calculations unavailable'],
        suggestedActions: ['Please try again later or contact system administrator'],
        timestamp: new Date().toISOString()
      };
    }
  }

  private generateEnvironmentAnalysis(environment: Environment, focus?: string): EnvironmentCheckerOutput {
    const overallConditions = this.generateOverallConditionsDescription(environment);
    const weatherAnalysis = this.generateWeatherAnalysis(environment);
    const resourceStatus = this.generateResourceStatus(environment);
    const structureAnalysis = this.generateStructureAnalysis(environment);
    const ecosystemHealth = this.generateEcosystemHealth(environment);
    const influenceActivity = this.generateInfluenceActivity(environment);
    const environmentalTrends = this.generateEnvironmentalTrends(environment);
    const balanceFactors = this.generateBalanceFactors(environment);
    const suggestedActions = this.generateSuggestedActions(environment, focus);

    return {
      route_id: environment.route_id,
      overallConditions,
      weatherAnalysis,
      resourceStatus,
      structureAnalysis,
      ecosystemHealth,
      influenceActivity,
      environmentalTrends,
      balanceFactors,
      suggestedActions,
      timestamp: new Date().toISOString()
    };
  }

  private generateOverallConditionsDescription(environment: Environment): string {
    const routeName = this.formatRouteName(environment.route_id);
    const weather = environment.weather_state.current_condition;
    const temperature = Math.round(environment.weather_state.temperature);
    const structureCount = environment.structures.length;
    const resourceCount = environment.resources.length;
    const influenceCount = environment.influence_points.length;
    const balance = environment.ecosystem_balance;

    let conditions = `The ${routeName} is experiencing ${weather} conditions at ${temperature}°C. `;
    
    conditions += `The environment contains ${structureCount} structures, ${resourceCount} resource pools, `;
    conditions += `and ${influenceCount} active influence points. `;
    
    if (balance > 0.8) {
      conditions += 'The ecosystem is thriving with excellent balance and stability.';
    } else if (balance > 0.6) {
      conditions += 'The ecosystem maintains good balance with minor fluctuations.';
    } else if (balance > 0.4) {
      conditions += 'The ecosystem shows signs of stress and requires attention.';
    } else {
      conditions += 'The ecosystem is severely unbalanced and needs immediate intervention.';
    }

    return conditions;
  }

  private generateWeatherAnalysis(environment: Environment): string {
    const weather = environment.weather_state;
    const condition = weather.current_condition;
    const temperature = Math.round(weather.temperature);
    const humidity = Math.round(weather.humidity);
    const windSpeed = Math.round(weather.wind_speed);
    const visibility = Math.round(weather.visibility * 100);

    let analysis = `Current weather: ${condition} conditions with ${temperature}°C temperature, `;
    analysis += `${humidity}% humidity, ${windSpeed} km/h wind speed, and ${visibility}% visibility. `;

    // Weather impact analysis
    switch (condition) {
      case 'sunny':
        analysis += 'Optimal conditions for creature activity and resource gathering. ';
        if (temperature > 25) {
          analysis += 'High temperature may drive creatures to seek shade and water sources. ';
        }
        break;
      case 'rainy':
        analysis += 'Wet conditions are increasing water resource availability but reducing creature visibility. ';
        if (visibility < 50) {
          analysis += 'Poor visibility is significantly impacting creature hunting and movement patterns. ';
        }
        break;
      case 'cloudy':
        analysis += 'Moderate conditions with stable temperature and good creature comfort levels. ';
        break;
      case 'stormy':
        analysis += 'Severe weather is forcing creatures to seek shelter and disrupting normal activities. ';
        analysis += 'High wind speeds and poor visibility create dangerous conditions for movement. ';
        break;
      case 'foggy':
        analysis += 'Dense fog severely limits visibility and creature navigation abilities. ';
        analysis += 'Creatures may be disoriented and more vulnerable to environmental hazards. ';
        break;
      case 'snowy':
        analysis += 'Cold conditions with snow cover affecting creature movement and resource access. ';
        if (temperature < 0) {
          analysis += 'Freezing temperatures pose significant survival challenges for creatures. ';
        }
        break;
    }

    // Weather stability analysis
    const timeSinceUpdate = Date.now() - weather.last_updated.getTime();
    const hoursStable = Math.floor(timeSinceUpdate / (60 * 60 * 1000));
    analysis += `Weather has been stable for ${hoursStable} hours, providing predictable conditions for ecosystem inhabitants.`;

    return analysis;
  }

  private generateResourceStatus(environment: Environment): string[] {
    const status: string[] = [];
    
    // Resource type analysis
    const resourceTypes = new Map<ResourceType, { count: number; avgQuantity: number; avgQuality: number }>();
    
    environment.resources.forEach(resource => {
      if (!resourceTypes.has(resource.type)) {
        resourceTypes.set(resource.type, { count: 0, avgQuantity: 0, avgQuality: 0 });
      }
      const typeData = resourceTypes.get(resource.type)!;
      typeData.count++;
      typeData.avgQuantity += resource.quantity;
      typeData.avgQuality += resource.quality;
    });

    // Calculate averages and generate status
    resourceTypes.forEach((data, type) => {
      data.avgQuantity /= data.count;
      data.avgQuality /= data.count;
      
      let typeStatus = `${type.toUpperCase()}: ${data.count} pool(s), `;
      typeStatus += `${Math.round(data.avgQuantity)}% average quantity, `;
      typeStatus += `${Math.round(data.avgQuality * 100)}% average quality`;
      
      // Add resource condition assessment
      if (data.avgQuantity < 30) {
        typeStatus += ' - CRITICAL: Low quantities detected';
      } else if (data.avgQuantity < 50) {
        typeStatus += ' - WARNING: Below optimal levels';
      } else if (data.avgQuantity > 80) {
        typeStatus += ' - EXCELLENT: Abundant supply';
      } else {
        typeStatus += ' - GOOD: Adequate supply';
      }
      
      status.push(typeStatus);
    });

    // Resource regeneration analysis
    const totalRegenerationRate = environment.resources.reduce((sum, r) => sum + r.regeneration_rate, 0);
    const avgRegenerationRate = totalRegenerationRate / environment.resources.length;
    status.push(`Resource regeneration rate: ${avgRegenerationRate.toFixed(1)} units/interval average`);

    // Recent resource access analysis
    const recentlyAccessed = environment.resources.filter(r => 
      Date.now() - r.last_accessed.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    status.push(`${recentlyAccessed.length}/${environment.resources.length} resource pools accessed in last 24 hours`);

    return status;
  }

  private generateStructureAnalysis(environment: Environment): string[] {
    const analysis: string[] = [];
    
    // Structure type distribution
    const structureTypes = new Map<string, number>();
    environment.structures.forEach(structure => {
      structureTypes.set(structure.type, (structureTypes.get(structure.type) || 0) + 1);
    });

    structureTypes.forEach((count, type) => {
      analysis.push(`${type.toUpperCase()}: ${count} structure(s) - ${this.getStructureDescription(type)}`);
    });

    // Structure modification analysis
    const recentlyModified = environment.structures.filter(s => 
      Date.now() - s.last_modified.getTime() < 7 * 24 * 60 * 60 * 1000 // Last week
    );
    
    if (recentlyModified.length > 0) {
      analysis.push(`${recentlyModified.length} structure(s) modified in the last week`);
    }

    // Structure influence analysis
    const totalInfluenceRadius = environment.structures.reduce((sum, s) => sum + s.influence_radius, 0);
    const avgInfluenceRadius = totalInfluenceRadius / environment.structures.length;
    analysis.push(`Average structure influence radius: ${Math.round(avgInfluenceRadius)} units`);

    // Structure density analysis
    const structureDensity = environment.structures.length / (1000 * 1000); // Per square unit
    if (structureDensity > 0.01) {
      analysis.push('High structure density - rich environmental complexity');
    } else if (structureDensity > 0.005) {
      analysis.push('Moderate structure density - balanced environment');
    } else {
      analysis.push('Low structure density - sparse environment');
    }

    return analysis;
  }

  private generateEcosystemHealth(environment: Environment): string {
    const balance = environment.ecosystem_balance;
    const resourceHealth = this.calculateResourceHealth(environment);
    const structureHealth = this.calculateStructureHealth(environment);
    const weatherImpact = this.calculateWeatherImpact(environment);
    const influenceImpact = this.calculateInfluenceImpact(environment);
    
    let health = `Ecosystem balance: ${Math.round(balance * 100)}% `;
    
    if (balance > 0.8) {
      health += '(EXCELLENT) - ';
    } else if (balance > 0.6) {
      health += '(GOOD) - ';
    } else if (balance > 0.4) {
      health += '(FAIR) - ';
    } else {
      health += '(POOR) - ';
    }

    health += `Resource health: ${Math.round(resourceHealth * 100)}%, `;
    health += `Structure stability: ${Math.round(structureHealth * 100)}%, `;
    health += `Weather impact: ${Math.round(weatherImpact * 100)}%, `;
    health += `Influence pressure: ${Math.round(influenceImpact * 100)}%. `;

    // Health trend analysis
    const monsters = this.monsterRepository.getMonstersByRoute(environment.route_id);
    const averageMonsterHealth = monsters.reduce((sum, m) => sum + m.stats.health, 0) / Math.max(monsters.length, 1);
    
    health += `Inhabitant health average: ${Math.round(averageMonsterHealth)}%. `;

    // Critical issues
    const criticalIssues = [];
    if (balance < 0.4) criticalIssues.push('severe ecosystem imbalance');
    if (resourceHealth < 0.3) criticalIssues.push('critical resource depletion');
    if (averageMonsterHealth < 40) criticalIssues.push('inhabitant health crisis');
    
    if (criticalIssues.length > 0) {
      health += `CRITICAL ISSUES: ${criticalIssues.join(', ')}.`;
    } else {
      health += 'No critical issues detected.';
    }

    return health;
  }

  private generateInfluenceActivity(environment: Environment): string {
    const influences = environment.influence_points;
    
    if (influences.length === 0) {
      return 'No active influence points detected - environment operating under natural conditions.';
    }

    let activity = `${influences.length} active influence point(s) detected. `;
    
    // Influence type analysis
    const influenceTypes = new Map<string, number>();
    influences.forEach(influence => {
      influenceTypes.set(influence.type, (influenceTypes.get(influence.type) || 0) + 1);
    });

    const typeDescriptions = Array.from(influenceTypes.entries())
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
    activity += `Types: ${typeDescriptions}. `;

    // Influence strength analysis
    const avgStrength = influences.reduce((sum, i) => sum + i.strength, 0) / influences.length;
    activity += `Average influence strength: ${Math.round(avgStrength * 100)}%. `;

    // Temporal analysis
    const recent = influences.filter(i => Date.now() - i.created_at.getTime() < 24 * 60 * 60 * 1000);
    const expiringSoon = influences.filter(i => 
      i.expires_at && i.expires_at.getTime() - Date.now() < 24 * 60 * 60 * 1000
    );

    if (recent.length > 0) {
      activity += `${recent.length} influence point(s) created in last 24 hours. `;
    }
    
    if (expiringSoon.length > 0) {
      activity += `${expiringSoon.length} influence point(s) expiring within 24 hours. `;
    }

    // Ownership analysis
    const owned = influences.filter(i => i.owner_id);
    if (owned.length > 0) {
      activity += `${owned.length} influence point(s) have specific owners, indicating directed environmental modifications.`;
    } else {
      activity += 'All influence points are unowned, indicating natural environmental phenomena.';
    }

    return activity;
  }

  private generateEnvironmentalTrends(environment: Environment): string[] {
    const trends: string[] = [];
    
    // Resource trends
    const lowResources = environment.resources.filter(r => r.quantity < 30);
    const highQualityResources = environment.resources.filter(r => r.quality > 0.8);
    
    if (lowResources.length > environment.resources.length * 0.5) {
      trends.push('Resource depletion trend detected - multiple pools running low');
    }
    
    if (highQualityResources.length > environment.resources.length * 0.7) {
      trends.push('High resource quality trend - environment maintaining excellent standards');
    }

    // Weather stability trends
    const weatherStability = this.calculateWeatherStability(environment);
    if (weatherStability > 0.8) {
      trends.push('Weather stability trend - predictable conditions supporting ecosystem health');
    } else if (weatherStability < 0.4) {
      trends.push('Weather volatility trend - frequent changes stressing ecosystem inhabitants');
    }

    // Influence trends
    const recentInfluences = environment.influence_points.filter(i => 
      Date.now() - i.created_at.getTime() < 7 * 24 * 60 * 60 * 1000
    );
    
    if (recentInfluences.length > environment.influence_points.length * 0.7) {
      trends.push('Increasing environmental modification trend - significant recent human intervention');
    }

    // Structure modification trends
    const recentStructureChanges = environment.structures.filter(s => 
      Date.now() - s.last_modified.getTime() < 7 * 24 * 60 * 60 * 1000
    );
    
    if (recentStructureChanges.length > 0) {
      trends.push(`Infrastructure development trend - ${recentStructureChanges.length} structure(s) recently modified`);
    }

    // Ecosystem balance trends
    if (environment.ecosystem_balance > 0.8) {
      trends.push('Positive ecosystem trend - balance improving and stabilizing');
    } else if (environment.ecosystem_balance < 0.4) {
      trends.push('Negative ecosystem trend - balance declining and requiring intervention');
    }

    return trends.length > 0 ? trends : ['Stable environmental conditions - no significant trends detected'];
  }

  private generateBalanceFactors(environment: Environment): string[] {
    const factors: string[] = [];
    
    // Resource balance factors
    const resourceBalance = this.calculateResourceBalance(environment);
    factors.push(`Resource distribution: ${Math.round(resourceBalance * 100)}% balanced`);
    
    // Structural balance factors
    const structureBalance = this.calculateStructureBalance(environment);
    factors.push(`Structure placement: ${Math.round(structureBalance * 100)}% optimal`);
    
    // Weather impact factors
    const weatherImpact = this.calculateWeatherImpact(environment);
    factors.push(`Weather conditions: ${Math.round(weatherImpact * 100)}% favorable`);
    
    // Influence pressure factors
    const influenceBalance = this.calculateInfluenceBalance(environment);
    factors.push(`Influence pressure: ${Math.round(influenceBalance * 100)}% sustainable`);
    
    // Inhabitant impact factors
    const monsters = this.monsterRepository.getMonstersByRoute(environment.route_id);
    const populationPressure = Math.min(monsters.length / 10, 1); // Assume 10 is optimal
    factors.push(`Population pressure: ${Math.round(populationPressure * 100)}% of capacity`);
    
    // Carrying capacity factors
    const carryingCapacity = this.calculateCarryingCapacity(environment);
    factors.push(`Carrying capacity: ${Math.round(carryingCapacity * 100)}% of maximum sustainable population`);

    return factors;
  }

  private generateSuggestedActions(environment: Environment, focus?: string): string[] {
    const suggestions: string[] = [];
    
    // Focus-specific suggestions
    if (focus === 'weather') {
      suggestions.push('Monitor weather patterns for optimal timing of environmental modifications');
      if (environment.weather_state.visibility < 0.5) {
        suggestions.push('Wait for improved visibility before making major environmental changes');
      }
    } else if (focus === 'resources') {
      const lowResources = environment.resources.filter(r => r.quantity < 30);
      if (lowResources.length > 0) {
        suggestions.push(`Replenish ${lowResources.length} resource pool(s) to prevent ecosystem stress`);
      }
    } else if (focus === 'structures') {
      const oldStructures = environment.structures.filter(s => 
        Date.now() - s.last_modified.getTime() > 30 * 24 * 60 * 60 * 1000
      );
      if (oldStructures.length > 0) {
        suggestions.push(`Consider updating ${oldStructures.length} aging structure(s) for better environmental integration`);
      }
    }

    // General environmental suggestions
    if (environment.ecosystem_balance < 0.6) {
      suggestions.push('Implement ecosystem restoration measures to improve balance');
    }

    const expiring = environment.influence_points.filter(i => 
      i.expires_at && i.expires_at.getTime() - Date.now() < 24 * 60 * 60 * 1000
    );
    if (expiring.length > 0) {
      suggestions.push(`${expiring.length} influence point(s) expiring soon - consider renewal if needed`);
    }

    // Resource-specific suggestions
    const criticalResources = environment.resources.filter(r => r.quantity < 20);
    if (criticalResources.length > 0) {
      suggestions.push(`URGENT: ${criticalResources.length} resource pool(s) critically low`);
    }

    // Monitoring suggestions
    suggestions.push('Use observe_ecosystem to understand creature adaptation to current conditions');
    suggestions.push('Monitor ecosystem balance changes after any environmental modifications');

    return suggestions;
  }

  // Helper calculation methods
  private calculateResourceHealth(environment: Environment): number {
    const avgQuantity = environment.resources.reduce((sum, r) => sum + r.quantity, 0) / environment.resources.length;
    const avgQuality = environment.resources.reduce((sum, r) => sum + r.quality, 0) / environment.resources.length;
    return (avgQuantity / 100 + avgQuality) / 2;
  }

  private calculateStructureHealth(environment: Environment): number {
    const recentlyModified = environment.structures.filter(s => 
      Date.now() - s.last_modified.getTime() < 30 * 24 * 60 * 60 * 1000
    );
    return recentlyModified.length / environment.structures.length;
  }

  private calculateWeatherImpact(environment: Environment): number {
    const weather = environment.weather_state;
    let impact = 0.5; // Base neutral impact
    
    // Adjust based on weather conditions
    switch (weather.current_condition) {
      case 'sunny': impact = 0.9; break;
      case 'cloudy': impact = 0.7; break;
      case 'rainy': impact = 0.6; break;
      case 'stormy': impact = 0.3; break;
      case 'foggy': impact = 0.4; break;
      case 'snowy': impact = 0.5; break;
    }
    
    // Adjust for visibility
    impact *= weather.visibility;
    
    return Math.max(0, Math.min(1, impact));
  }

  private calculateInfluenceImpact(environment: Environment): number {
    const influences = environment.influence_points;
    if (influences.length === 0) return 1.0;
    
    const avgStrength = influences.reduce((sum, i) => sum + i.strength, 0) / influences.length;
    const pressureLevel = Math.min(influences.length / 5, 1); // Assume 5 is high pressure
    
    return Math.max(0, 1 - (avgStrength * pressureLevel));
  }

  private calculateResourceBalance(environment: Environment): number {
    const resourceTypes = new Map<ResourceType, number>();
    environment.resources.forEach(r => {
      resourceTypes.set(r.type, (resourceTypes.get(r.type) || 0) + 1);
    });
    
    const variance = Array.from(resourceTypes.values()).reduce((sum, count) => {
      const avg = environment.resources.length / resourceTypes.size;
      return sum + Math.pow(count - avg, 2);
    }, 0) / resourceTypes.size;
    
    return Math.max(0, 1 - variance / 10);
  }

  private calculateStructureBalance(environment: Environment): number {
    // Simple balance calculation based on structure distribution
    const structureSpread = environment.structures.reduce((sum, s) => {
      return sum + Math.sqrt(s.position.x * s.position.x + s.position.y * s.position.y);
    }, 0) / environment.structures.length;
    
    return Math.min(1, structureSpread / 500); // Normalize to 0-1 range
  }

  private calculateInfluenceBalance(environment: Environment): number {
    const influences = environment.influence_points;
    if (influences.length === 0) return 1.0;
    
    const avgStrength = influences.reduce((sum, i) => sum + i.strength, 0) / influences.length;
    return Math.max(0, 1 - avgStrength);
  }

  private calculateCarryingCapacity(environment: Environment): number {
    const resourceCapacity = environment.resources.reduce((sum, r) => sum + r.quantity, 0) / 100;
    const structureCapacity = environment.structures.length * 2; // Assume each structure supports 2 creatures
    return Math.min(resourceCapacity, structureCapacity) / 10; // Normalize
  }

  private calculateWeatherStability(environment: Environment): number {
    // Simple stability calculation based on weather conditions
    const stabilityScores = {
      sunny: 0.9,
      cloudy: 0.7,
      rainy: 0.6,
      stormy: 0.3,
      foggy: 0.4,
      snowy: 0.5
    };
    
    return stabilityScores[environment.weather_state.current_condition] || 0.5;
  }

  // Helper methods
  public formatRouteName(routeId: string): string {
    return routeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getStructureDescription(type: string): string {
    const descriptions: Record<string, string> = {
      den: 'creature shelter and breeding ground',
      water_source: 'essential hydration point',
      shelter: 'temporary protection structure',
      hunting_ground: 'predator activity zone',
      territory_marker: 'territorial boundary indicator'
    };
    return descriptions[type] || 'environmental feature';
  }
}

/**
 * Environment Checker MCP tool for PrimalCode environmental analysis
 * Provides detailed descriptions of environmental conditions and modifications
 */
export const checkEnvironment = {
  name: 'check_environment',
  description: 'Get detailed description of current environmental conditions and modifications',
  parameters: EnvironmentCheckerInput,
  execute: async (input: z.infer<typeof EnvironmentCheckerInput>): Promise<string> => {
    const tool = new EnvironmentCheckerTool();
    const result = await tool.execute(input);
    
    // Format as engaging narrative text
    const narrative = [
      `## Environmental Analysis Report - ${tool['formatRouteName'](result.route_id)}`,
      `*Generated at ${new Date().toLocaleString()}*`,
      '',
      `### Overall Conditions`,
      result.overallConditions,
      '',
      `### Weather Analysis`,
      result.weatherAnalysis,
      '',
      `### Resource Status`,
      ...result.resourceStatus.map(status => `- ${status}`),
      '',
      `### Structure Analysis`,
      ...result.structureAnalysis.map(analysis => `- ${analysis}`),
      '',
      `### Ecosystem Health`,
      result.ecosystemHealth,
      '',
      `### Influence Activity`,
      result.influenceActivity,
      '',
      `### Environmental Trends`,
      ...result.environmentalTrends.map(trend => `- ${trend}`),
      '',
      `### Balance Factors`,
      ...result.balanceFactors.map(factor => `- ${factor}`),
      '',
      `### Suggested Actions`,
      ...result.suggestedActions.map(action => `- ${action}`)
    ].join('\n');

    return narrative;
  }
};