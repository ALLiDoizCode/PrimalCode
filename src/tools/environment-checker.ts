import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MockEnvironmentState } from '../ecosystem/mock-environment-state';
import { MockMonsterSystem } from '../ecosystem/mock-monster-system';
import { 
  MCPToolBase, 
  EnvironmentCheck, 
  EnvironmentCheckerArgs
} from '../types/mcp-tool-types';
import { Environment, WeatherCondition, ResourceType, StructureType, WeatherState } from '../types/environment-types';
import logger from '../utils/logger';

export class EnvironmentCheckerTool implements MCPToolBase {
  constructor(
    private environmentState: MockEnvironmentState,
    private monsterSystem: MockMonsterSystem
  ) {}

  public getToolDefinition(): Tool {
    return {
      name: 'check_environment',
      description: 'Provides comprehensive descriptions of weather conditions, resources, and player modifications affecting the ecosystem and monster behavior.',
      inputSchema: {
        type: 'object',
        properties: {
          route_id: {
            type: 'string',
            description: 'Route/habitat to check environmental conditions for'
          }
        },
        required: ['route_id'],
        additionalProperties: false
      }
    };
  }

  public async execute(args: Record<string, unknown>): Promise<string> {
    try {
      logger.info('Executing environment check', { args });

      const { route_id } = args as EnvironmentCheckerArgs;

      if (!route_id || typeof route_id !== 'string') {
        throw new Error('route_id is required and must be a string');
      }

      const environmentCheck = await this.checkEnvironment(route_id);
      return this.formatEnvironmentResponse(environmentCheck);

    } catch (error) {
      logger.error('Error executing environment check', { error, args });
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ **Environment Check Failed**\n\nUnable to check the environment: ${errorMsg}\n\nPlease verify the route_id is valid and try again.`;
    }
  }

  private async checkEnvironment(routeId: string): Promise<EnvironmentCheck> {
    const environment = this.environmentState.getEnvironment(routeId);

    if (!environment) {
      throw new Error(`Environment not found for route: ${routeId}`);
    }

    const environmentalDetails = this.generateEnvironmentalDetails(environment);
    const weatherConditions = this.generateWeatherConditions(environment);
    const resourceAvailability = this.generateResourceAvailability(environment);
    const recommendations = this.generateRecommendations(environment);

    return {
      environmentalDetails,
      weatherConditions,
      resourceAvailability,
      recommendations,
      route: routeId,
      timestamp: Date.now()
    };
  }

  private generateEnvironmentalDetails(environment: Environment): string {
    let details = `**${environment.name}** spans a diverse landscape with ${environment.structures.length} distinct structures and ${environment.resources.length} resource locations. `;

    // Route characteristics
    const routeInfo = environment.route_info;
    details += `This ${this.getDifficultyDescription(routeInfo.difficulty)} route `;
    details += `with ${this.getSafetyDescription(routeInfo.safety_level)} safety levels `;
    details += `connects to ${routeInfo.connected_routes.length} adjacent territories. `;

    // Landmark details
    if (routeInfo.landmarks.length > 0) {
      details += `Notable landmarks include ${routeInfo.landmarks.slice(0, 3).join(', ')}`;
      if (routeInfo.landmarks.length > 3) {
        details += ` among others`;
      }
      details += `. `;
    }

    // Ecosystem balance overview
    const balance = environment.ecosystem_balance;
    details += `The ecosystem maintains ${balance.predator_count} predators and ${balance.prey_count} prey creatures, `;
    details += `creating ${this.getTerritorialPressureDescription(balance.territory_pressure)} territorial dynamics. `;

    // Seasonal factors
    details += `Current seasonal conditions contribute to ${this.getSeasonalDescription(balance.seasonal_factor)} environmental stability.`;

    return details;
  }

  private getDifficultyDescription(difficulty: number): string {
    if (difficulty > 0.8) return 'extremely challenging';
    if (difficulty > 0.6) return 'demanding';
    if (difficulty > 0.4) return 'moderately difficult';
    if (difficulty > 0.2) return 'manageable';
    return 'accessible';
  }

  private getSafetyDescription(safety: number): string {
    if (safety > 0.8) return 'exceptionally secure';
    if (safety > 0.6) return 'relatively safe';
    if (safety > 0.4) return 'moderately risky';
    if (safety > 0.2) return 'dangerous';
    return 'highly perilous';
  }

  private getTerritorialPressureDescription(pressure: number): string {
    if (pressure > 0.8) return 'intense competitive';
    if (pressure > 0.6) return 'active territorial';
    if (pressure > 0.4) return 'moderate competitive';
    if (pressure > 0.2) return 'peaceful coexistence';
    return 'minimal territorial';
  }

  private getSeasonalDescription(factor: number): string {
    if (factor > 0.8) return 'peak seasonal';
    if (factor > 0.6) return 'strong seasonal';
    if (factor > 0.4) return 'moderate seasonal';
    if (factor > 0.2) return 'mild seasonal';
    return 'minimal seasonal';
  }

  private generateWeatherConditions(environment: Environment): string {
    const weather = environment.weather_state;
    let conditions = `**Current Weather**: ${this.getWeatherDescription(weather.condition)}\n`;
    
    conditions += `**Temperature**: ${weather.temperature.toFixed(1)}°C - ${this.getTemperatureDescription(weather.temperature)}\n`;
    conditions += `**Humidity**: ${(weather.humidity * 100).toFixed(0)}% - ${this.getHumidityDescription(weather.humidity)}\n`;
    conditions += `**Wind Speed**: ${weather.wind_speed.toFixed(1)} km/h - ${this.getWindDescription(weather.wind_speed)}\n`;
    conditions += `**Visibility**: ${(weather.visibility * 100).toFixed(0)}% - ${this.getVisibilityDescription(weather.visibility)}\n`;

    // Weather forecast
    if (weather.forecast && weather.forecast.length > 1) {
      conditions += `**Short-term Forecast**: `;
      const forecast = weather.forecast.slice(1, 4).map(condition => 
        this.getWeatherEmoji(condition) + ' ' + condition.replace('_', ' ')
      ).join(' → ');
      conditions += forecast + '\n';
    }

    // Weather impact analysis
    conditions += `\n**Environmental Impact**: ${this.getWeatherImpactDescription(weather)}`;

    return conditions;
  }

  private getWeatherDescription(condition: WeatherCondition): string {
    const descriptions = {
      [WeatherCondition.CLEAR]: '☀️ Clear skies with abundant sunlight filtering through the canopy',
      [WeatherCondition.CLOUDY]: '☁️ Overcast conditions with thick cloud cover limiting natural light',
      [WeatherCondition.RAIN]: '🌧️ Steady rainfall creating a rhythmic percussion against vegetation',
      [WeatherCondition.STORM]: '⛈️ Violent thunderstorm with fierce winds and driving precipitation',
      [WeatherCondition.FOG]: '🌫️ Dense fog reducing visibility and creating mysterious atmosphere',
      [WeatherCondition.SNOW]: '❄️ Falling snow blanketing the landscape in pristine white'
    };

    return descriptions[condition];
  }

  private getWeatherEmoji(condition: WeatherCondition): string {
    const emojis = {
      [WeatherCondition.CLEAR]: '☀️',
      [WeatherCondition.CLOUDY]: '☁️',
      [WeatherCondition.RAIN]: '🌧️',
      [WeatherCondition.STORM]: '⛈️',
      [WeatherCondition.FOG]: '🌫️',
      [WeatherCondition.SNOW]: '❄️'
    };

    return emojis[condition];
  }

  private getTemperatureDescription(temp: number): string {
    if (temp > 25) return 'warm and comfortable for most activities';
    if (temp > 15) return 'mild conditions ideal for exploration';
    if (temp > 5) return 'cool conditions requiring some preparation';
    if (temp > -5) return 'cold conditions affecting creature behavior';
    return 'freezing conditions forcing survival adaptations';
  }

  private getHumidityDescription(humidity: number): string {
    if (humidity > 0.8) return 'extremely humid, affecting comfort and visibility';
    if (humidity > 0.6) return 'high moisture content in the air';
    if (humidity > 0.4) return 'moderate humidity levels';
    if (humidity > 0.2) return 'dry conditions with low moisture';
    return 'arid environment with minimal atmospheric moisture';
  }

  private getWindDescription(speed: number): string {
    if (speed > 20) return 'strong winds affecting movement and sound';
    if (speed > 15) return 'moderate winds creating noticeable effects';
    if (speed > 10) return 'gentle breezes providing air circulation';
    if (speed > 5) return 'light winds barely perceptible';
    return 'calm conditions with minimal air movement';
  }

  private getVisibilityDescription(visibility: number): string {
    if (visibility > 0.8) return 'excellent visibility across the entire area';
    if (visibility > 0.6) return 'good visibility with clear sightlines';
    if (visibility > 0.4) return 'moderate visibility with some obscured areas';
    if (visibility > 0.2) return 'poor visibility limiting observation range';
    return 'severely limited visibility creating navigation challenges';
  }

  private getWeatherImpactDescription(weather: WeatherState): string {
    const impacts: string[] = [];

    // Temperature impacts
    if (weather.temperature < 0) {
      impacts.push('freezing temperatures are slowing creature metabolism and forcing energy conservation');
    } else if (weather.temperature > 30) {
      impacts.push('high temperatures are driving creatures to seek shade and water sources');
    }

    // Precipitation impacts
    if (weather.condition === WeatherCondition.RAIN || weather.condition === WeatherCondition.STORM) {
      impacts.push('precipitation is affecting scent trails and forcing creatures into sheltered areas');
    }

    // Visibility impacts
    if (weather.visibility < 0.5) {
      impacts.push('reduced visibility is altering predator-prey dynamics and increasing cautious behavior');
    }

    // Wind impacts
    if (weather.wind_speed > 15) {
      impacts.push('strong winds are disrupting normal movement patterns and communication signals');
    }

    if (impacts.length === 0) {
      impacts.push('current conditions are ideal for normal creature activities and behaviors');
    }

    return impacts.join('; ');
  }

  private generateResourceAvailability(environment: Environment): string {
    const resources = environment.resources;
    let availability = `**Resource Distribution Analysis**:\n`;

    // Analyze by resource type
    const resourcesByType = new Map<ResourceType, typeof resources>();
    resources.forEach(resource => {
      if (!resourcesByType.has(resource.type)) {
        resourcesByType.set(resource.type, []);
      }
      resourcesByType.get(resource.type)!.push(resource);
    });

    resourcesByType.forEach((typeResources, type) => {
      const avgQuality = typeResources.reduce((sum, r) => sum + r.quality, 0) / typeResources.length;
      const totalQuantity = typeResources.reduce((sum, r) => sum + r.quantity, 0);
      const avgRegen = typeResources.reduce((sum, r) => sum + r.regeneration_rate, 0) / typeResources.length;

      availability += `• **${this.formatResourceType(type)}**: ${typeResources.length} sources, `;
      availability += `${this.getQualityDescription(avgQuality)} quality (${(avgQuality * 100).toFixed(0)}%), `;
      availability += `${totalQuantity.toFixed(0)} total units, `;
      availability += `${this.getRegenerationDescription(avgRegen)} regeneration\n`;
    });

    // Overall resource assessment
    const overallQuality = resources.reduce((sum, r) => sum + r.quality, 0) / resources.length;
    const totalAbundance = environment.ecosystem_balance.resource_abundance;

    availability += `\n**Overall Assessment**: `;
    availability += `${this.getAbundanceDescription(totalAbundance)} resource availability `;
    availability += `with ${this.getQualityDescription(overallQuality)} average quality. `;

    // Resource pressure analysis
    const monsters = this.monsterSystem.getMonstersByRoute(environment.route_id);
    const resourcePressure = monsters.length / resources.length;
    availability += `Current creature-to-resource ratio suggests ${this.getResourcePressureDescription(resourcePressure)} competition levels.`;

    return availability;
  }

  private formatResourceType(type: ResourceType): string {
    const formatted = {
      [ResourceType.FOOD]: 'Food Sources',
      [ResourceType.WATER]: 'Water Sources',
      [ResourceType.SHELTER]: 'Shelter Locations',
      [ResourceType.HUNTING_GROUND]: 'Hunting Grounds',
      [ResourceType.TERRITORY]: 'Territorial Markers'
    };

    return formatted[type];
  }

  private getQualityDescription(quality: number): string {
    if (quality > 0.8) return 'exceptional';
    if (quality > 0.6) return 'high';
    if (quality > 0.4) return 'moderate';
    if (quality > 0.2) return 'low';
    return 'poor';
  }

  private getRegenerationDescription(rate: number): string {
    if (rate > 0.08) return 'rapid';
    if (rate > 0.05) return 'steady';
    if (rate > 0.02) return 'slow';
    return 'minimal';
  }

  private getAbundanceDescription(abundance: number): string {
    if (abundance > 0.8) return 'abundant';
    if (abundance > 0.6) return 'plentiful';
    if (abundance > 0.4) return 'adequate';
    if (abundance > 0.2) return 'scarce';
    return 'critically low';
  }

  private getResourcePressureDescription(pressure: number): string {
    if (pressure > 2) return 'intense';
    if (pressure > 1.5) return 'high';
    if (pressure > 1) return 'moderate';
    if (pressure > 0.5) return 'low';
    return 'minimal';
  }

  private generateRecommendations(environment: Environment): string[] {
    const recommendations: string[] = [];
    const weather = environment.weather_state;
    const balance = environment.ecosystem_balance;
    const resources = environment.resources;
    const monsters = this.monsterSystem.getMonstersByRoute(environment.route_id);

    // Weather-based recommendations
    if (weather.condition === WeatherCondition.STORM) {
      recommendations.push('Postpone major environmental modifications until storm conditions pass');
    } else if (weather.condition === WeatherCondition.CLEAR && weather.temperature > 15) {
      recommendations.push('Optimal conditions for infrastructure development and creature observation');
    }

    if (weather.visibility < 0.4) {
      recommendations.push('Enhanced lighting or visibility improvements would benefit both creatures and observation');
    }

    // Resource-based recommendations
    const lowQualityResources = resources.filter(r => r.quality < 0.3).length;
    if (lowQualityResources > resources.length * 0.3) {
      recommendations.push('Consider resource enhancement or replacement for degraded sources');
    }

    const foodSources = resources.filter(r => r.type === ResourceType.FOOD);
    if (foodSources.length < 2) {
      recommendations.push('Additional food sources would improve ecosystem sustainability');
    }

    const waterSources = resources.filter(r => r.type === ResourceType.WATER);
    if (waterSources.length < 1) {
      recommendations.push('Critical need for water sources to support creature population');
    }

    // Monster population recommendations  
    if (monsters.length === 0) {
      recommendations.push('This area could benefit from introducing carefully selected creatures to restore ecological balance');
    } else if (monsters.length > 10) {
      recommendations.push('Monitor for overpopulation signs - the ecosystem may be approaching its carrying capacity');
    }

    // Ecosystem balance recommendations
    if (balance.territory_pressure > 0.8) {
      recommendations.push('High territorial pressure - consider expanding available space or adding territorial markers');
    }

    if (balance.predator_count > balance.prey_count) {
      recommendations.push('Predator-prey imbalance detected - monitor for potential ecosystem instability');
    }

    if (balance.resource_abundance < 0.3) {
      recommendations.push('Low resource abundance threatening ecosystem viability - immediate intervention recommended');
    }

    // Structure recommendations
    const shelters = environment.structures.filter(s => s.type === StructureType.CAVE || s.type === StructureType.BURROW);
    const availableShelters = shelters.filter(s => !s.occupied);
    
    if (availableShelters.length === 0 && shelters.length < 3) {
      recommendations.push('Additional shelter structures needed to support creature population during adverse conditions');
    }

    // Seasonal recommendations
    if (balance.seasonal_factor < 0.4) {
      recommendations.push('Seasonal stress indicators suggest preparation for environmental challenges');
    }

    // Safety recommendations
    if (environment.route_info.safety_level < 0.3) {
      recommendations.push('Low safety levels may require defensive structures or hazard mitigation');
    }

    if (recommendations.length === 0) {
      recommendations.push('Environment appears well-balanced - continue regular monitoring for optimal maintenance');
    }

    return recommendations;
  }

  private formatEnvironmentResponse(check: EnvironmentCheck): string {
    let response = `🌍 **Environment Check: ${check.route}**\n\n`;
    
    response += `**Environmental Overview:**\n${check.environmentalDetails}\n\n`;
    
    response += `**Weather Conditions:**\n${check.weatherConditions}\n\n`;
    
    response += `**Resource Availability:**\n${check.resourceAvailability}\n\n`;
    
    response += `**Recommendations:**\n`;
    check.recommendations.forEach((recommendation, index) => {
      response += `${index + 1}. ${recommendation}\n`;
    });
    
    response += `\n*Environment check completed at ${new Date(check.timestamp).toLocaleTimeString()}*`;
    
    return response;
  }
}