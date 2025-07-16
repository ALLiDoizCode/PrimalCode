import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PrimalTokenService } from '../utils/primal-token-service';
import { MockEnvironmentState } from '../ecosystem/environment-state';
import { WeatherCondition, WeatherState } from '../types/environment-types';

export interface ModifyWeatherRequest {
  route_id: string;
  weather_type: 'rain' | 'heat' | 'clear' | 'storm';
  intensity?: number;
  duration?: number;
}

export interface ModifyWeatherResponse {
  success: boolean;
  weather_confirmation: string;
  expected_monster_response: string;
  ecosystem_impact: string[];
  token_transaction: {
    cost: number;
    transaction_id: string;
    new_balance: number;
  };
  modification_id: string;
  weather_details: {
    previous_condition: WeatherCondition;
    new_condition: WeatherCondition;
    intensity: number;
    duration_minutes: number;
  };
}

export class ModifyWeatherTool {
  private tokenService: PrimalTokenService;
  private environmentState: MockEnvironmentState;

  constructor(tokenService: PrimalTokenService, environmentState: MockEnvironmentState) {
    this.tokenService = tokenService;
    this.environmentState = environmentState;
  }

  async execute(request: ModifyWeatherRequest): Promise<ModifyWeatherResponse> {
    const tokenCost = this.tokenService.getTokenCost('MODIFY_WEATHER');
    const modificationId = `weather_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate token balance
    const validation = this.tokenService.validateTokenBalance(tokenCost);
    if (!validation.valid) {
      throw new Error(`Insufficient Primal tokens: ${validation.message}`);
    }

    // Validate environment exists
    const environment = this.environmentState.getEnvironment(request.route_id);
    if (!environment) {
      throw new Error(`Route ${request.route_id} not found`);
    }

    // Validate intensity
    const intensity = Math.max(0.1, Math.min(1.0, request.intensity || 0.7));
    const duration = Math.max(5, Math.min(480, request.duration || 60)); // 5 minutes to 8 hours

    // Store previous weather state
    const previousCondition = environment.weather_state.current_condition;

    // Deduct tokens
    const deduction = this.tokenService.deductTokens(tokenCost, `Modify weather to ${request.weather_type}`, modificationId);
    if (!deduction.success) {
      throw new Error(deduction.message);
    }

    // Convert weather type to WeatherCondition
    const newCondition = this.convertToWeatherCondition(request.weather_type);

    // Create new weather state
    const newWeatherState: WeatherState = {
      current_condition: newCondition,
      temperature: this.getTemperatureForWeather(newCondition, intensity),
      humidity: this.getHumidityForWeather(newCondition, intensity),
      wind_speed: this.getWindSpeedForWeather(newCondition, intensity),
      visibility: this.getVisibilityForWeather(newCondition, intensity),
      last_updated: new Date()
    };

    // Update environment weather
    this.environmentState.updateEnvironment(request.route_id, {
      weather_state: newWeatherState
    });

    // Generate response
    const weatherConfirmation = this.generateWeatherConfirmation(request.weather_type, intensity, duration);
    const expectedMonsterResponse = this.generateExpectedMonsterResponse(request.weather_type, previousCondition, environment);
    const ecosystemImpact = this.generateEcosystemImpact(request.weather_type, intensity, environment);

    return {
      success: true,
      weather_confirmation: weatherConfirmation,
      expected_monster_response: expectedMonsterResponse,
      ecosystem_impact: ecosystemImpact,
      token_transaction: {
        cost: tokenCost,
        transaction_id: deduction.transaction_id,
        new_balance: deduction.new_balance
      },
      modification_id: modificationId,
      weather_details: {
        previous_condition: previousCondition,
        new_condition: newCondition,
        intensity,
        duration_minutes: duration
      }
    };
  }

  private convertToWeatherCondition(weatherType: string): WeatherCondition {
    const conversionMap: Record<string, WeatherCondition> = {
      rain: 'rainy',
      heat: 'sunny',
      clear: 'sunny',
      storm: 'stormy'
    };
    return conversionMap[weatherType] || 'sunny';
  }

  private getTemperatureForWeather(condition: WeatherCondition, intensity: number): number {
    const baseTemps: Record<WeatherCondition, number> = {
      sunny: 25,
      rainy: 15,
      stormy: 12,
      cloudy: 20,
      foggy: 10,
      snowy: 0
    };

    const baseTemp = baseTemps[condition] || 20;
    const variation = (intensity - 0.5) * 10; // ±5 degrees based on intensity
    return baseTemp + variation;
  }

  private getHumidityForWeather(condition: WeatherCondition, intensity: number): number {
    const baseHumidity: Record<WeatherCondition, number> = {
      sunny: 45,
      rainy: 90,
      stormy: 95,
      cloudy: 65,
      foggy: 95,
      snowy: 80
    };

    const base = baseHumidity[condition] || 50;
    const variation = (intensity - 0.5) * 20; // ±10% based on intensity
    return Math.max(0, Math.min(100, base + variation));
  }

  private getWindSpeedForWeather(condition: WeatherCondition, intensity: number): number {
    const baseWindSpeed: Record<WeatherCondition, number> = {
      sunny: 5,
      rainy: 15,
      stormy: 35,
      cloudy: 10,
      foggy: 3,
      snowy: 12
    };

    const base = baseWindSpeed[condition] || 8;
    return base * intensity;
  }

  private getVisibilityForWeather(condition: WeatherCondition, intensity: number): number {
    const baseVisibility: Record<WeatherCondition, number> = {
      sunny: 0.95,
      rainy: 0.6,
      stormy: 0.3,
      cloudy: 0.8,
      foggy: 0.2,
      snowy: 0.5
    };

    const base = baseVisibility[condition] || 0.8;
    const reduction = (1 - intensity) * 0.2; // Better visibility with lower intensity
    return Math.max(0.1, Math.min(1.0, base + reduction));
  }

  private generateWeatherConfirmation(weatherType: string, intensity: number, duration: number): string {
    const intensityDescriptions = {
      low: intensity < 0.4 ? 'gentle' : intensity < 0.7 ? 'moderate' : 'intense',
      descriptor: intensity < 0.4 ? 'light' : intensity < 0.7 ? 'steady' : 'heavy'
    };

    const weatherDescriptions: Record<string, string> = {
      rain: `${intensityDescriptions.descriptor} rainfall begins to fall across the area. Droplets create rippling patterns on water surfaces and the air fills with the fresh scent of petrichor.`,
      heat: `The temperature rises as ${intensityDescriptions.low} heat waves begin to shimmer across the landscape. The sun's intensity increases, creating warm thermal currents.`,
      clear: `The sky clears dramatically as clouds dissipate and bright sunshine breaks through. Visibility improves and natural light bathes the entire ecosystem.`,
      storm: `Thunder rumbles in the distance as a ${intensityDescriptions.low} storm system moves in. Lightning flickers on the horizon and wind begins to pick up strength.`
    };

    return `Weather modification initiated successfully! ${weatherDescriptions[weatherType]} ` +
           `This weather pattern will persist for approximately ${duration} minutes, gradually affecting monster behavior patterns ` +
           `and environmental conditions throughout the area.`;
  }

  private generateExpectedMonsterResponse(weatherType: string, previousCondition: WeatherCondition, environment: import('../types/environment-types').Environment): string {
    const shelterCount = environment.structures.filter((s) => s.type === 'shelter' || s.type === 'den').length;

    const responses: Record<string, string> = {
      rain: `Creatures will begin seeking shelter within 15-30 minutes as the rain intensifies. Expect decreased movement ` +
            `of smaller monsters, while amphibious species may become more active. Territorial behaviors will shift toward ` +
            `defensive positions around existing den sites and covered areas.`,
      heat: `Monsters will adjust their activity patterns to avoid the increasing heat. Expect migration toward water sources ` +
            `and shaded areas within 1-2 hours. Nocturnal species may extend their active periods, while desert-adapted ` +
            `creatures will show increased territorial confidence.`,
      clear: `The improved visibility and comfortable conditions will trigger increased exploration and hunting behaviors. ` +
            `Monsters that were previously sheltering will emerge and resume normal activity patterns. Social interactions ` +
            `and territorial displays are likely to increase significantly.`,
      storm: `All creatures will exhibit immediate storm-response behaviors, seeking the strongest available shelter within ` +
           `10-20 minutes. Pack animals will group together, while solitary species will become highly defensive. ` +
           `Post-storm emergence patterns will create temporary territorial reorganization.`
    };

    let baseResponse = responses[weatherType] || "Monsters will adapt their behavior to the new weather conditions.";

    // Add contextual information
    if (shelterCount < 3) {
      baseResponse += " Limited shelter availability may create competition and stress among creatures seeking protection.";
    } else if (shelterCount > 6) {
      baseResponse += " Abundant shelter options will allow for more flexible behavioral adaptations and reduced stress.";
    }

    if (previousCondition !== 'sunny' && weatherType === 'clear') {
      baseResponse += " The dramatic improvement from previous conditions will likely trigger particularly enthusiastic behavioral responses.";
    }

    return baseResponse;
  }

  private generateEcosystemImpact(weatherType: string, intensity: number, environment: import('../types/environment-types').Environment): string[] {
    const impacts = [];

    // Base impacts for weather type
    const weatherImpacts: Record<string, string[]> = {
      rain: [
        "Increased water availability and resource replenishment",
        "Enhanced scent masking affecting hunting and territorial behaviors",
        "Temporary reduction in airborne activities and increased ground-level interactions"
      ],
      heat: [
        "Accelerated resource consumption as creatures seek cooling mechanisms",
        "Increased competition around water sources and shaded areas",
        "Potential for heat-stress behavioral modifications in temperature-sensitive species"
      ],
      clear: [
        "Optimal conditions for territorial establishment and expansion",
        "Enhanced predator-prey visibility dynamics",
        "Increased efficiency of long-distance communication and mate-finding behaviors"
      ],
      storm: [
        "Temporary ecosystem compression as all species seek immediate shelter",
        "Post-storm resource redistribution and territorial boundary reset",
        "Potential for stress-bonding between normally competitive species"
      ]
    };

    impacts.push(...(weatherImpacts[weatherType] || ["General weather-based behavioral adaptations"]));

    // Intensity-based impacts
    if (intensity > 0.7) {
      impacts.push("High-intensity conditions will create pronounced and potentially lasting behavioral changes");
    } else if (intensity < 0.4) {
      impacts.push("Gentle weather changes will allow for gradual behavioral adaptations with minimal stress");
    }

    // Environmental context impacts
    const currentBalance = environment.ecosystem_balance;
    if (currentBalance < 0.5) {
      impacts.push("Weather modification in a stressed ecosystem may provide necessary environmental stimulus for recovery");
    } else if (currentBalance > 0.8) {
      impacts.push("Weather changes in a thriving ecosystem will enhance existing positive behavioral patterns");
    }

    return impacts;
  }

  static getToolDefinition(): Tool {
    return {
      name: 'modify_weather',
      description: 'Trigger weather changes to influence monster behavior patterns across the ecosystem. Costs 25 Primal tokens per modification.',
      inputSchema: {
        type: 'object',
        properties: {
          route_id: {
            type: 'string',
            description: 'Route identifier where weather will be modified'
          },
          weather_type: {
            type: 'string',
            enum: ['rain', 'heat', 'clear', 'storm'],
            description: 'Type of weather to trigger'
          },
          intensity: {
            type: 'number',
            minimum: 0.1,
            maximum: 1.0,
            description: 'Weather intensity level (optional, defaults to 0.7)'
          },
          duration: {
            type: 'number',
            minimum: 5,
            maximum: 480,
            description: 'Duration in minutes (optional, defaults to 60, max 8 hours)'
          }
        },
        required: ['route_id', 'weather_type']
      }
    };
  }
}