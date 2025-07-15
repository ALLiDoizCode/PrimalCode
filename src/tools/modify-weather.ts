import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MockMonsterSystem } from '../ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../ecosystem/mock-environment-state';
import { 
  MCPToolBase, 
  ModifyWeatherArgs,
  EnvironmentalModificationResult
} from '../types/mcp-tool-types';
import { WeatherCondition } from '../types/environment-types';
import { MonsterPersonalityType } from '../types/monster-types';
import logger from '../utils/logger';

export class ModifyWeatherTool implements MCPToolBase {
  constructor(
    private monsterSystem: MockMonsterSystem,
    private environmentState: MockEnvironmentState
  ) {}

  public getToolDefinition(): Tool {
    return {
      name: 'modify_weather',
      description: 'Trigger weather changes to influence monster behavior and ecosystem dynamics',
      inputSchema: {
        type: 'object',
        properties: {
          route_id: {
            type: 'string',
            description: 'Route/habitat to modify'
          },
          weather_type: {
            type: 'string',
            description: 'Type of weather to trigger',
            enum: ['rain', 'heat', 'storm', 'normal']
          },
          intensity: {
            type: 'number',
            description: 'Weather intensity level (0.0 to 1.0)',
            minimum: 0.0,
            maximum: 1.0
          }
        },
        required: ['route_id', 'weather_type', 'intensity'],
        additionalProperties: false
      }
    };
  }

  public async execute(args: Record<string, unknown>): Promise<string> {
    try {
      logger.info('Executing modify_weather tool', { args });

      const { route_id, weather_type, intensity } = args as unknown as ModifyWeatherArgs;

      if (!route_id || typeof route_id !== 'string') {
        throw new Error('route_id is required and must be a string');
      }

      if (!weather_type || typeof weather_type !== 'string') {
        throw new Error('weather_type is required and must be a string');
      }

      if (typeof intensity !== 'number' || intensity < 0 || intensity > 1) {
        throw new Error('intensity must be a number between 0.0 and 1.0');
      }

      const result = await this.modifyWeatherConditions(route_id, weather_type, intensity);
      return this.formatWeatherResponse(result);

    } catch (error) {
      logger.error('Error executing modify_weather tool', { error, args });
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ **Weather Modification Failed**\n\nUnable to modify weather conditions: ${errorMsg}\n\nPlease verify the route_id and weather parameters are valid and try again.`;
    }
  }

  private async modifyWeatherConditions(
    routeId: string, 
    weatherType: string, 
    intensity: number
  ): Promise<EnvironmentalModificationResult> {
    const environment = this.environmentState.getEnvironment(routeId);
    if (!environment) {
      throw new Error(`Environment not found for route: ${routeId}`);
    }

    const nearbyMonsters = this.monsterSystem.getMonstersByRoute(routeId);
    const previousWeather = environment.weather_state.condition;
    const newWeather = this.environmentState.modifyWeather(routeId, weatherType, intensity);
    
    this.monsterSystem.notifyEnvironmentalChange(routeId, 'weather_changed', { x: 50, y: 50 });

    const placementConfirmation = this.generateWeatherChangeDescription(weatherType, intensity, previousWeather, newWeather);
    const behavioralPredictions = this.generateBehavioralAdaptations(nearbyMonsters, weatherType, intensity);
    const ecosystemImpact = this.generateEcosystemImpact(environment, weatherType, intensity);

    return {
      placementConfirmation,
      behavioralPredictions,
      ecosystemImpact,
      timestamp: Date.now()
    };
  }

  private generateWeatherChangeDescription(
    weatherType: string, 
    intensity: number, 
    previousWeather: WeatherCondition,
    newWeather: any
  ): string {
    const intensityDescriptors = {
      low: intensity <= 0.3 ? 'gentle' : intensity <= 0.6 ? 'moderate' : 'intense',
      effect: intensity <= 0.3 ? 'subtle' : intensity <= 0.6 ? 'noticeable' : 'dramatic'
    };

    const weatherDescriptions: Record<string, string> = {
      rain: `${intensityDescriptors.low} rain begins to fall across the territory, transforming the landscape with its ${intensityDescriptors.effect} presence. Droplets cascade through the canopy, creating a rhythmic symphony that will alter the behavior of every creature in the ecosystem.`,
      heat: `The temperature rises dramatically, bringing ${intensityDescriptors.low} heat that radiates from the earth itself. The air shimmers with thermal energy, creating an oppressive atmosphere that will force all creatures to adapt their daily routines.`,
      storm: `Dark clouds gather with ominous intent as a ${intensityDescriptors.low} storm system approaches. Thunder rumbles in the distance while fierce winds begin to whip through the trees, signaling a period of turbulent weather that will test the survival instincts of all wildlife.`,
      normal: `The weather patterns stabilize, returning to balanced conditions after the previous atmospheric disturbance. A sense of calm ${intensityDescriptors.effect === 'dramatic' ? 'dramatically' : 'gradually'} settles over the territory as natural rhythms resume.`
    };

    const transitionNote = previousWeather !== newWeather.condition ? 
      ` This represents a significant shift from the previous ${previousWeather} conditions.` : 
      ' The weather modification enhances the current atmospheric conditions.';

    return weatherDescriptions[weatherType] + transitionNote + ` Current visibility: ${Math.round(newWeather.visibility * 100)}%, humidity: ${Math.round(newWeather.humidity * 100)}%.`;
  }

  private generateBehavioralAdaptations(
    nearbyMonsters: any[], 
    weatherType: string, 
    intensity: number
  ): string {
    if (nearbyMonsters.length === 0) {
      return `While no creatures are immediately visible, the weather change will influence the behavior patterns of any wildlife that enters the territory. Expect altered movement patterns and activity levels.`;
    }

    const adaptations: string[] = [];
    const personalityGroups = this.groupMonstersByPersonality(nearbyMonsters);

    const weatherEffects = this.getWeatherEffectsByPersonality(weatherType, intensity);

    if (personalityGroups.aggressive_hunters.length > 0) {
      adaptations.push(
        `**Aggressive Hunters** (${personalityGroups.aggressive_hunters.length} detected): ${weatherEffects.aggressive_hunters}`
      );
    }

    if (personalityGroups.cautious_foragers.length > 0) {
      adaptations.push(
        `**Cautious Foragers** (${personalityGroups.cautious_foragers.length} detected): ${weatherEffects.cautious_foragers}`
      );
    }

    if (personalityGroups.pack_leaders.length > 0) {
      adaptations.push(
        `**Pack Leaders** (${personalityGroups.pack_leaders.length} detected): ${weatherEffects.pack_leaders}`
      );
    }

    const overallAdaptation = this.generateOverallAdaptation(nearbyMonsters, weatherType, intensity);
    adaptations.push(overallAdaptation);

    return adaptations.join('\n\n');
  }

  private getWeatherEffectsByPersonality(weatherType: string, intensity: number): Record<string, string> {
    const intensityModifier = intensity > 0.6 ? 'dramatically' : intensity > 0.3 ? 'significantly' : 'subtly';
    
    const effects: Record<string, Record<string, string>> = {
      rain: {
        aggressive_hunters: `Will ${intensityModifier} alter hunting patterns, using the sound of rain to mask their approach while taking advantage of reduced visibility to ambush prey.`,
        cautious_foragers: `Will seek immediate shelter and wait for conditions to improve, ${intensityModifier} reducing their foraging activities until the rain subsides.`,
        pack_leaders: `Will ${intensityModifier} coordinate group movements toward protective structures, ensuring pack safety while maintaining territorial awareness.`
      },
      heat: {
        aggressive_hunters: `Will ${intensityModifier} shift to dawn and dusk hunting patterns, conserving energy during peak heat while becoming more aggressive during cooler periods.`,
        cautious_foragers: `Will ${intensityModifier} increase their search for water sources and shaded areas, potentially venturing into new territories despite their natural caution.`,
        pack_leaders: `Will ${intensityModifier} reorganize pack schedules around thermal comfort, establishing cooling stations and heat-avoidance protocols.`
      },
      storm: {
        aggressive_hunters: `Will ${intensityModifier} become more defensive, abandoning active hunting in favor of securing safe positions until the storm passes.`,
        cautious_foragers: `Will ${intensityModifier} retreat to the deepest available shelters, remaining hidden until environmental stability returns.`,
        pack_leaders: `Will ${intensityModifier} prioritize pack cohesion and emergency shelter protocols, potentially leading groups to pre-established storm refuges.`
      },
      normal: {
        aggressive_hunters: `Will ${intensityModifier} return to standard hunting patterns, taking advantage of improved visibility and predictable conditions.`,
        cautious_foragers: `Will ${intensityModifier} resume normal foraging activities, gradually expanding their range as confidence in stable conditions returns.`,
        pack_leaders: `Will ${intensityModifier} reestablish regular territorial patrols and pack coordination activities now that environmental stress has reduced.`
      }
    };

    return effects[weatherType] || effects.normal;
  }

  private generateOverallAdaptation(monsters: any[], weatherType: string, intensity: number): string {
    const activeMonsters = monsters.filter(m => m.state !== 'RESTING').length;
    const adaptationLevel = intensity > 0.6 ? 'major' : intensity > 0.3 ? 'moderate' : 'minor';
    
    let adaptation = `**Overall Ecosystem Response**: The ${weatherType} conditions will trigger ${adaptationLevel} behavioral adaptations across all ${monsters.length} creatures in the territory. `;

    if (weatherType === 'rain' || weatherType === 'storm') {
      adaptation += `Expect ${activeMonsters} currently active creatures to seek shelter, with activity levels decreasing by approximately ${Math.round(intensity * 60)}% until conditions improve.`;
    } else if (weatherType === 'heat') {
      adaptation += `Anticipate ${activeMonsters} creatures to shift their activity patterns, with ${Math.round(intensity * 70)}% likely to become more active during cooler periods.`;
    } else {
      adaptation += `${activeMonsters} creatures will gradually return to normal activity patterns, with behavioral stabilization occurring over the next few hours.`;
    }

    return adaptation;
  }

  private groupMonstersByPersonality(monsters: any[]): Record<string, any[]> {
    return {
      aggressive_hunters: monsters.filter(m => m.ai_personality.type === MonsterPersonalityType.AGGRESSIVE_HUNTER),
      cautious_foragers: monsters.filter(m => m.ai_personality.type === MonsterPersonalityType.CAUTIOUS_FORAGER),
      pack_leaders: monsters.filter(m => m.ai_personality.type === MonsterPersonalityType.PACK_LEADER)
    };
  }

  private generateEcosystemImpact(environment: any, weatherType: string, intensity: number): string {
    const currentBalance = environment.ecosystem_balance;
    const resourceCount = environment.resources.length;
    
    let impact = `**Ecosystem Balance**: The ${weatherType} modification will `;
    
    if (weatherType === 'rain') {
      impact += `enhance resource regeneration rates by approximately ${Math.round(intensity * 30)}%, potentially supporting increased wildlife populations and reducing territorial pressure.`;
    } else if (weatherType === 'heat') {
      impact += `stress the ecosystem's water resources, potentially increasing competition by ${Math.round(intensity * 40)}% and forcing creatures to adapt their territorial ranges.`;
    } else if (weatherType === 'storm') {
      impact += `temporarily disrupt normal ecosystem functions, reducing resource accessibility by ${Math.round(intensity * 50)}% while creating opportunities for territorial reorganization.`;
    } else {
      impact += 'restore natural balance to the ecosystem, allowing normal resource utilization patterns and behavioral cycles to resume.';
    }

    if (currentBalance.territory_pressure > 0.7 && weatherType === 'storm') {
      impact += ' **Strategic Note**: High territorial pressure detected - the storm may provide opportunities for weaker creatures to claim new territories while dominant ones seek shelter.';
    }

    if (resourceCount < 5 && weatherType === 'heat') {
      impact += ' **Warning**: Limited resources detected - heat stress may create critical survival challenges for local wildlife.';
    }

    return impact;
  }

  private formatWeatherResponse(result: EnvironmentalModificationResult): string {
    let response = `🌦️ **Weather Conditions Modified Successfully**\n\n`;
    
    response += `**Weather Change:**\n${result.placementConfirmation}\n\n`;
    response += `**Behavioral Adaptations:**\n${result.behavioralPredictions}\n\n`;
    response += `**Ecosystem Impact:**\n${result.ecosystemImpact}\n\n`;
    response += `*Weather modification completed at ${new Date(result.timestamp).toLocaleTimeString()}*`;

    return response;
  }
}