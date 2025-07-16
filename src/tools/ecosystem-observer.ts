import { z } from 'zod';
import { MockMonsterRepository } from '../ecosystem/monster-state';
import { MockEnvironmentState } from '../ecosystem/environment-state';
import { Monster, MonsterState } from '../types/monster-types';
import { Environment, WeatherCondition } from '../types/environment-types';


// Ecosystem observer input schema
const EcosystemObserverInput = z.object({
  route_id: z.string().describe('Route/habitat to observe'),
  focus: z.string().optional().describe('Specific aspect to focus on (monsters, environment, interactions)')
});

// Ecosystem observer output interface
interface EcosystemObserverOutput {
  currentState: string;
  monsterBehaviors: string[];
  environmentalConditions: string;
  interestingObservations: string[];
  suggestedActions: string[];
  timestamp: string;
}

/**
 * Ecosystem Observer MCP tool for PrimalCode ecosystem observation
 * Provides detailed natural language descriptions of current ecosystem state
 */
export class EcosystemObserverTool {
  private monsterRepository: MockMonsterRepository;
  private environmentState: MockEnvironmentState;

  constructor(monsterRepository?: MockMonsterRepository, environmentState?: MockEnvironmentState) {
    this.monsterRepository = monsterRepository || new MockMonsterRepository();
    this.environmentState = environmentState || new MockEnvironmentState();
    
    // Initialize with some monsters for demonstration
    if (this.monsterRepository.getMonsterCount() === 0) {
      this.monsterRepository.generateAndAddMultiple(5);
    }
  }

  async execute(input: z.infer<typeof EcosystemObserverInput>): Promise<EcosystemObserverOutput> {
    try {

      const environment = this.environmentState.getEnvironment(input.route_id);
      const monsters = this.monsterRepository.getMonstersByRoute(input.route_id);

      if (!environment) {
        // Create environment if it doesn't exist
        const newEnvironment = this.environmentState.createEnvironment(input.route_id);
        return this.generateObservation(newEnvironment, monsters, input.focus);
      }

      return this.generateObservation(environment, monsters, input.focus);

    } catch (error) {
      return {
        currentState: 'Unable to observe ecosystem due to technical difficulties',
        monsterBehaviors: [],
        environmentalConditions: 'Environmental sensors offline',
        interestingObservations: ['Technical issues detected in observation systems'],
        suggestedActions: ['Please try again later or contact system administrator'],
        timestamp: new Date().toISOString()
      };
    }
  }

  private generateObservation(
    environment: Environment, 
    monsters: Monster[], 
    focus?: string
  ): EcosystemObserverOutput {
    const currentState = this.generateCurrentStateDescription(environment, monsters);
    const monsterBehaviors = this.generateMonsterBehaviorDescriptions(monsters);
    const environmentalConditions = this.generateEnvironmentalDescription(environment);
    const interestingObservations = this.generateInterestingObservations(environment, monsters);
    const suggestedActions = this.generateSuggestedActions(environment, monsters, focus);

    return {
      currentState,
      monsterBehaviors,
      environmentalConditions,
      interestingObservations,
      suggestedActions,
      timestamp: new Date().toISOString()
    };
  }

  private generateCurrentStateDescription(environment: Environment, monsters: Monster[]): string {
    const routeName = this.formatRouteName(environment.route_id);
    const monsterCount = monsters.length;
    const weatherDesc = this.getWeatherDescription(environment.weather_state.current_condition);
    const balanceDesc = this.getEcosystemBalanceDescription(environment.ecosystem_balance);

    return `The ${routeName} is currently ${weatherDesc} with ${monsterCount} creatures present. ` +
           `The ecosystem ${balanceDesc} and shows ${environment.structures.length} environmental structures ` +
           `and ${environment.resources.length} resource pools scattered throughout the area.`;
  }

  private generateMonsterBehaviorDescriptions(monsters: Monster[]): string[] {
    return monsters.map(monster => {
      const personality = this.getPersonalityDescription(monster);
      const state = this.getStateDescription(monster.state);
      const position = `at coordinates (${monster.stats.position.x}, ${monster.stats.position.y})`;
      const health = this.getHealthDescription(monster.stats.health);
      const energy = this.getEnergyDescription(monster.stats.energy);

      return `${monster.id}: A ${personality} ${monster.species.replace('_', ' ')} is currently ${state} ${position}. ` +
             `The creature appears ${health} and seems ${energy}. ` +
             `It has detected ${monster.environmental_awareness.detected_structures.length} environmental features ` +
             `and remembers ${monster.environmental_awareness.resource_memory.length} resource locations.`;
    });
  }

  private generateEnvironmentalDescription(environment: Environment): string {
    const weather = environment.weather_state;
    const temperature = Math.round(weather.temperature);
    const humidity = Math.round(weather.humidity);
    const visibility = Math.round(weather.visibility * 100);
    const windSpeed = Math.round(weather.wind_speed);

    const structureTypes = [...new Set(environment.structures.map(s => s.type))];
    const resourceTypes = [...new Set(environment.resources.map(r => r.type))];

    return `Current environmental conditions: ${weather.current_condition} weather at ${temperature}°C ` +
           `with ${humidity}% humidity and ${visibility}% visibility. Wind speed is ${windSpeed} km/h. ` +
           `The area contains ${structureTypes.join(', ')} structures and ` +
           `${resourceTypes.join(', ')} resource types. ` +
           `There are ${environment.influence_points.length} active Primal tokens affecting creature behavior.`;
  }

  private generateInterestingObservations(environment: Environment, monsters: Monster[]): string[] {
    const observations: string[] = [];

    // Monster interaction observations
    const huntingMonsters = monsters.filter(m => m.state === 'hunting');
    const restingMonsters = monsters.filter(m => m.state === 'resting');
    const socialMonsters = monsters.filter(m => m.state === 'socializing');

    if (huntingMonsters.length > 0) {
      observations.push(`${huntingMonsters.length} creature(s) are actively hunting - territorial tensions may be rising`);
    }

    if (socialMonsters.length > 0) {
      observations.push(`Pack behaviors observed with ${socialMonsters.length} creature(s) engaging in social interactions`);
    }

    if (restingMonsters.length === monsters.length) {
      observations.push('All creatures in the area are resting - this could indicate a safe environment or recent feeding');
    }

    // Environmental observations
    const lowResources = environment.resources.filter(r => r.quantity < 30);
    if (lowResources.length > 0) {
      observations.push(`Resource scarcity detected: ${lowResources.length} resource pool(s) running low`);
    }

    const recentInfluence = environment.influence_points.filter(ip => 
      Date.now() - ip.created_at.getTime() < 86400000 // Last 24 hours
    );
    if (recentInfluence.length > 0) {
      observations.push(`Recent environmental modifications detected: ${recentInfluence.length} new Primal token(s)`);
    }

    // Weather impact observations
    if (environment.weather_state.visibility < 0.5) {
      observations.push('Poor visibility conditions are affecting creature behavior and movement patterns');
    }

    if (environment.weather_state.temperature < 10) {
      observations.push('Cold weather is causing creatures to seek shelter and conserve energy');
    }

    return observations.length > 0 ? observations : ['The ecosystem appears stable with normal creature activity patterns'];
  }

  private generateSuggestedActions(environment: Environment, monsters: Monster[], focus?: string): string[] {
    const suggestions: string[] = [];

    // Focus-specific suggestions
    if (focus === 'monsters') {
      suggestions.push('Use analyze_monster tool to get detailed behavioral analysis of specific creatures');
      if (monsters.length > 0) {
        const interestingMonster = monsters.find(m => m.state === 'hunting' || m.state === 'territorial') || monsters[0];
        suggestions.push(`Consider analyzing ${interestingMonster.id} for deeper behavioral insights`);
      }
    } else if (focus === 'environment') {
      suggestions.push('Use check_environment tool to get detailed environmental analysis');
      if (environment.resources.some(r => r.quantity < 50)) {
        suggestions.push('Consider environmental modifications to restore resource balance');
      }
    } else if (focus === 'interactions') {
      suggestions.push('Monitor creature interactions by observing again in a few minutes');
      if (monsters.length > 1) {
        suggestions.push('Look for pack formation patterns or territorial disputes');
      }
    }

    // General suggestions based on ecosystem state
    if (environment.ecosystem_balance < 0.6) {
      suggestions.push('Ecosystem balance is low - consider environmental interventions');
    }

    if (monsters.some(m => m.stats.health < 50)) {
      suggestions.push('Some creatures appear to be in poor health - investigate environmental stressors');
    }

    const highEnergyMonsters = monsters.filter(m => m.stats.energy > 80);
    if (highEnergyMonsters.length > 0) {
      suggestions.push('High-energy creatures present - good time for environmental modifications');
    }

    return suggestions.length > 0 ? suggestions : ['Continue observing ecosystem for behavioral patterns'];
  }

  // Helper methods for natural language generation
  public formatRouteName(routeId: string): string {
    return routeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getWeatherDescription(condition: WeatherCondition): string {
    const descriptions = {
      sunny: 'bright and clear',
      cloudy: 'overcast with scattered clouds',
      rainy: 'experiencing steady rainfall',
      stormy: 'caught in a fierce storm',
      foggy: 'shrouded in thick fog',
      snowy: 'blanketed in fresh snow'
    };
    return descriptions[condition] || 'experiencing unusual weather';
  }

  private getEcosystemBalanceDescription(balance: number): string {
    if (balance > 0.8) return 'appears highly stable and thriving';
    if (balance > 0.6) return 'maintains good balance';
    if (balance > 0.4) return 'shows some signs of stress';
    return 'appears severely unbalanced';
  }

  private getPersonalityDescription(monster: Monster): string {
    const { aggression, intelligence, pack_tendency } = monster.ai_personality;
    
    if (aggression > 0.7) return intelligence > 0.7 ? 'cunning and aggressive' : 'fierce and instinctive';
    if (pack_tendency > 0.7) return 'highly social and cooperative';
    if (intelligence > 0.7) return 'cautious and intelligent';
    return 'balanced and adaptable';
  }

  private getStateDescription(state: MonsterState): string {
    const stateDescriptions = {
      hunting: 'actively hunting for prey',
      foraging: 'searching for food and resources',
      resting: 'resting and recovering energy',
      moving: 'moving through the territory',
      socializing: 'interacting with other creatures',
      fleeing: 'fleeing from perceived threats',
      territorial: 'defending its territory'
    };
    return stateDescriptions[state] || 'engaged in unknown behavior';
  }

  private getHealthDescription(health: number): string {
    if (health > 80) return 'healthy and vigorous';
    if (health > 60) return 'in good condition';
    if (health > 40) return 'showing signs of wear';
    return 'in poor health';
  }

  private getEnergyDescription(energy: number): string {
    if (energy > 80) return 'highly energetic';
    if (energy > 60) return 'moderately active';
    if (energy > 40) return 'somewhat tired';
    return 'exhausted';
  }
}

/**
 * Ecosystem Observer MCP tool for PrimalCode ecosystem observation
 * Provides detailed natural language descriptions of current ecosystem state
 */
export const observeEcosystem = {
  name: 'observe_ecosystem',
  description: 'Get detailed natural language description of current ecosystem state',
  parameters: EcosystemObserverInput,
  execute: async (input: z.infer<typeof EcosystemObserverInput>): Promise<string> => {
    const tool = new EcosystemObserverTool();
    const result = await tool.execute(input);
    
    // Format as engaging narrative text
    const narrative = [
      `## Ecosystem Observation Report - ${tool['formatRouteName'](input.route_id)}`,
      `*Generated at ${new Date().toLocaleString()}*`,
      '',
      `### Current State`,
      result.currentState,
      '',
      `### Creature Behaviors`,
      ...result.monsterBehaviors.map(behavior => `- ${behavior}`),
      '',
      `### Environmental Conditions`,
      result.environmentalConditions,
      '',
      `### Interesting Observations`,
      ...result.interestingObservations.map(obs => `- ${obs}`),
      '',
      `### Suggested Actions`,
      ...result.suggestedActions.map(action => `- ${action}`)
    ].join('\n');

    return narrative;
  }
};