import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MockMonsterSystem } from '../ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../ecosystem/mock-environment-state';
import { 
  MCPToolBase, 
  EcosystemObservation, 
  EcosystemObserverArgs,
  FocusArea,
  DEFAULT_FOCUS_AREA
} from '../types/mcp-tool-types';
import { Monster, MonsterState } from '../types/monster-types';
import { Environment, WeatherCondition } from '../types/environment-types';
import logger from '../utils/logger';

export class EcosystemObserverTool implements MCPToolBase {
  constructor(
    private monsterSystem: MockMonsterSystem,
    private environmentState: MockEnvironmentState
  ) {}

  public getToolDefinition(): Tool {
    return {
      name: 'observe_ecosystem',
      description: 'Get detailed natural language description of current ecosystem state including monster behaviors, environmental conditions, and suggested actions for the player.',
      inputSchema: {
        type: 'object',
        properties: {
          route_id: {
            type: 'string',
            description: 'Route/habitat to observe (e.g., "forest_path", "mountain_ridge")'
          },
          focus: {
            type: 'string',
            description: 'Specific aspect to focus on: "monsters", "environment", "interactions", or "all"',
            enum: ['monsters', 'environment', 'interactions', 'all'],
            default: 'all'
          }
        },
        required: ['route_id'],
        additionalProperties: false
      }
    };
  }

  public async execute(args: Record<string, unknown>): Promise<string> {
    try {
      logger.info('Executing ecosystem observation', { args });

      const { route_id, focus = DEFAULT_FOCUS_AREA } = args as EcosystemObserverArgs;

      if (!route_id || typeof route_id !== 'string') {
        throw new Error('route_id is required and must be a string');
      }

      const observation = await this.observeEcosystem(route_id, focus as FocusArea);
      return this.formatObservationResponse(observation);

    } catch (error) {
      logger.error('Error executing ecosystem observation', { error, args });
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ **Ecosystem Observation Failed**\n\nUnable to observe the ecosystem: ${errorMsg}\n\nPlease verify the route_id is valid and try again.`;
    }
  }

  private async observeEcosystem(routeId: string, focus: FocusArea): Promise<EcosystemObservation> {
    const environment = this.environmentState.getEnvironment(routeId);
    const monsters = this.monsterSystem.getMonstersByRoute(routeId);

    if (!environment) {
      throw new Error(`Environment not found for route: ${routeId}`);
    }

    const currentState = this.generateCurrentStateDescription(environment, monsters, focus);
    const monsterBehaviors = this.generateMonsterBehaviorDescriptions(monsters, focus);
    const suggestedActions = this.generateSuggestedActions(environment, monsters, focus);

    return {
      currentState,
      monsterBehaviors,
      suggestedActions,
      route: routeId,
      timestamp: Date.now()
    };
  }

  private generateCurrentStateDescription(
    environment: Environment, 
    monsters: Monster[], 
    focus: FocusArea
  ): string {
    const descriptions: string[] = [];

    // Always include basic location info
    descriptions.push(`The ${environment.name} stretches before you, alive with the subtle rhythms of nature.`);

    if (focus === FocusArea.ALL || focus === FocusArea.ENVIRONMENT) {
      descriptions.push(this.generateWeatherDescription(environment.weather_state.condition));
      descriptions.push(this.generateResourceDescription(environment));
      descriptions.push(this.generateEcosystemBalanceDescription(environment));
    }

    if (focus === FocusArea.ALL || focus === FocusArea.MONSTERS) {
      descriptions.push(this.generateMonsterPresenceDescription(monsters));
    }

    if (focus === FocusArea.ALL || focus === FocusArea.INTERACTIONS) {
      descriptions.push(this.generateInteractionDescription(environment, monsters));
    }

    return descriptions.join(' ');
  }

  private generateWeatherDescription(condition: WeatherCondition): string {
    const weatherDescriptions: Record<WeatherCondition, string> = {
      [WeatherCondition.CLEAR]: 'Brilliant sunlight filters through the canopy, casting dancing shadows across the forest floor.',
      [WeatherCondition.CLOUDY]: 'Thick clouds gather overhead, creating a moody atmosphere that seems to heighten every sound.',
      [WeatherCondition.RAIN]: 'Gentle rain patters against leaves, creating a rhythmic symphony that masks the movements of hidden creatures.',
      [WeatherCondition.STORM]: 'Thunder rumbles ominously as fierce winds whip through the trees, sending creatures scurrying for shelter.',
      [WeatherCondition.FOG]: 'Mysterious fog drifts between the trees, limiting visibility and creating an otherworldly ambiance.',
      [WeatherCondition.SNOW]: 'Fresh snow blankets the ground, muffling sounds and revealing the tracks of every creature that has passed.'
    };

    return weatherDescriptions[condition];
  }

  private generateResourceDescription(environment: Environment): string {
    const resourceCount = environment.resources.length;
    const highQualityResources = environment.resources.filter(r => r.quality > 0.7).length;
    
    if (resourceCount === 0) {
      return 'The land appears barren, with few resources visible to sustain the local wildlife.';
    }

    if (highQualityResources > resourceCount * 0.6) {
      return 'Rich resources abound throughout the area, from pristine water sources to abundant food supplies.';
    } else if (highQualityResources > resourceCount * 0.3) {
      return 'Moderate resources are scattered throughout the region, enough to support the local ecosystem.';
    } else {
      return 'Resources are scarce here, forcing creatures to compete fiercely for survival.';
    }
  }

  private generateEcosystemBalanceDescription(environment: Environment): string {
    const balance = environment.ecosystem_balance;
    const ratio = balance.predator_count / (balance.predator_count + balance.prey_count);

    if (ratio > 0.4) {
      return 'The ecosystem feels tense with predatory pressure, as hunters outnumber their prey in this dangerous landscape.';
    } else if (ratio > 0.2) {
      return 'A delicate balance exists between predator and prey, creating natural cycles of tension and calm.';
    } else {
      return 'Prey animals move more freely here, though wise creatures remain vigilant for the few predators that do call this place home.';
    }
  }

  private generateMonsterPresenceDescription(monsters: Monster[]): string {
    if (monsters.length === 0) {
      return 'An eerie silence pervades the area, with no signs of monster activity visible.';
    }

    const activeMonsters = monsters.filter(m => m.state !== MonsterState.RESTING).length;
    const species = [...new Set(monsters.map(m => m.species))];
    
    if (monsters.length === 1) {
      return `A solitary ${monsters[0].species} ${this.getMonsterActivityDescription(monsters[0].state)} in the shadows.`;
    }

    const description = `${monsters.length} creatures inhabit this space, including ${species.join(', ')}.`;
    if (activeMonsters > monsters.length * 0.7) {
      return `${description} Most are actively moving about their territory, creating an atmosphere of constant motion.`;
    } else if (activeMonsters > monsters.length * 0.3) {
      return `${description} Some rest while others patrol, maintaining the natural rhythms of the ecosystem.`;
    } else {
      return `${description} Most seem to be resting, creating an unusually peaceful moment in the wilderness.`;
    }
  }

  private getMonsterActivityDescription(state: MonsterState): string {
    const activityDescriptions: Record<MonsterState, string> = {
      [MonsterState.IDLE]: 'observes its surroundings with alert awareness',
      [MonsterState.HUNTING]: 'prowls with predatory intent',
      [MonsterState.RESTING]: 'rests in the peaceful shadows',
      [MonsterState.FEEDING]: 'feeds contentedly on its recent catch',
      [MonsterState.MOVING]: 'moves purposefully through its territory',
      [MonsterState.ALERTING]: 'stands alert, sensing danger in the air',
      [MonsterState.FLEEING]: 'flees from some unseen threat'
    };

    return activityDescriptions[state];
  }

  private generateInteractionDescription(environment: Environment, monsters: Monster[]): string {
    if (monsters.length === 0) {
      return 'Without creatures present, the environment exists in undisturbed tranquility.';
    }

    const weatherImpact = this.getWeatherImpactOnBehavior(environment.weather_state.condition);
    const territorialTension = environment.ecosystem_balance.territory_pressure;

    let description = weatherImpact;

    if (territorialTension > 0.7) {
      description += ' Territorial disputes seem likely as creatures compete for limited space and resources.';
    } else if (territorialTension > 0.4) {
      description += ' The creatures maintain respectful distances, each aware of the others\' presence.';
    } else {
      description += ' The abundant space allows creatures to coexist with minimal conflict.';
    }

    return description;
  }

  private getWeatherImpactOnBehavior(condition: WeatherCondition): string {
    const impacts: Record<WeatherCondition, string> = {
      [WeatherCondition.CLEAR]: 'The clear weather encourages active behavior among the local wildlife.',
      [WeatherCondition.CLOUDY]: 'The overcast conditions create a subdued atmosphere that affects creature movement patterns.',
      [WeatherCondition.RAIN]: 'The rain drives most creatures to seek shelter, changing their usual routines.',
      [WeatherCondition.STORM]: 'The stormy weather forces all creatures into defensive positions.',
      [WeatherCondition.FOG]: 'The fog creates uncertainty, making creatures more cautious in their movements.',
      [WeatherCondition.SNOW]: 'The snow affects creature mobility, forcing adaptations in their behavior patterns.'
    };

    return impacts[condition];
  }

  private generateMonsterBehaviorDescriptions(monsters: Monster[], focus: FocusArea): string[] {
    if (focus === FocusArea.ENVIRONMENT) {
      return [];
    }

    if (monsters.length === 0) {
      return ['No creature behaviors to observe in this empty landscape.'];
    }

    return monsters.slice(0, 5).map(monster => {
      const decision = this.monsterSystem.makeDecision(monster.id);
      return `**${monster.species}**: ${decision.narrative} ${decision.reasoning}`;
    });
  }

  private generateSuggestedActions(
    environment: Environment, 
    monsters: Monster[], 
    focus: FocusArea
  ): string[] {
    const actions: string[] = [];

    if (focus === FocusArea.ALL || focus === FocusArea.ENVIRONMENT) {
      if (environment.ecosystem_balance.resource_abundance < 0.4) {
        actions.push('Consider creating resource enhancement structures to support the struggling ecosystem');
      }

      if (environment.weather_state.condition === WeatherCondition.STORM) {
        actions.push('Wait for the storm to pass before making any major environmental modifications');
      }
    }

    if (focus === FocusArea.ALL || focus === FocusArea.MONSTERS) {
      if (monsters.length === 0) {
        actions.push('This area could benefit from introducing carefully selected creatures to restore ecological balance');
      } else if (monsters.length > 10) {
        actions.push('Monitor for overpopulation signs - the ecosystem may be approaching its carrying capacity');
      }

      const huntingMonsters = monsters.filter(m => m.state === MonsterState.HUNTING).length;
      if (huntingMonsters > monsters.length * 0.6) {
        actions.push('High hunting activity detected - ensure prey populations remain sustainable');
      }
    }

    if (focus === FocusArea.ALL || focus === FocusArea.INTERACTIONS) {
      if (environment.ecosystem_balance.territory_pressure > 0.8) {
        actions.push('Consider territorial expansion options to reduce competition stress among creatures');
      }

      const availableStructures = environment.structures.filter(s => !s.occupied).length;
      if (availableStructures === 0 && monsters.length > 0) {
        actions.push('Create additional shelter structures to provide more territorial options for creatures');
      }
    }

    if (actions.length === 0) {
      actions.push('The ecosystem appears balanced - continue monitoring for any developing changes');
    }

    return actions;
  }

  private formatObservationResponse(observation: EcosystemObservation): string {
    let response = `🌿 **Ecosystem Observation: ${observation.route}**\n\n`;
    
    response += `**Current State:**\n${observation.currentState}\n\n`;

    if (observation.monsterBehaviors.length > 0) {
      response += `**Creature Behaviors:**\n`;
      observation.monsterBehaviors.forEach(behavior => {
        response += `${behavior}\n\n`;
      });
    }

    response += `**Suggested Actions:**\n`;
    observation.suggestedActions.forEach((action, index) => {
      response += `${index + 1}. ${action}\n`;
    });

    response += `\n*Observation recorded at ${new Date(observation.timestamp).toLocaleTimeString()}*`;

    return response;
  }
}