import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MockMonsterSystem } from '../ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../ecosystem/mock-environment-state';
import { 
  MCPToolBase, 
  PlaceFoodArgs,
  EnvironmentalModificationResult
} from '../types/mcp-tool-types';
import { MonsterPersonalityType } from '../types/monster-types';
import logger from '../utils/logger';

export class PlaceFoodTool implements MCPToolBase {
  constructor(
    private monsterSystem: MockMonsterSystem,
    private environmentState: MockEnvironmentState
  ) {}

  public getToolDefinition(): Tool {
    return {
      name: 'place_food',
      description: 'Add food sources to influence monster behavior patterns',
      inputSchema: {
        type: 'object',
        properties: {
          route_id: {
            type: 'string',
            description: 'Route/habitat to modify'
          },
          location: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            },
            required: ['x', 'y'],
            description: 'Coordinates where food should be placed'
          },
          food_type: {
            type: 'string',
            description: 'Type of food to place (meat, plants, water)',
            enum: ['meat', 'plants', 'water']
          }
        },
        required: ['route_id', 'location', 'food_type'],
        additionalProperties: false
      }
    };
  }

  public async execute(args: Record<string, unknown>): Promise<string> {
    try {
      logger.info('Executing place_food tool', { args });

      const { route_id, location, food_type } = args as unknown as PlaceFoodArgs;

      if (!route_id || typeof route_id !== 'string') {
        throw new Error('route_id is required and must be a string');
      }

      if (!location || typeof location !== 'object' || location === null) {
        throw new Error('location is required and must be an object with x and y coordinates');
      }

      if (!food_type || typeof food_type !== 'string') {
        throw new Error('food_type is required and must be a string');
      }

      const locationObj = location as { x: number; y: number };
      if (typeof locationObj.x !== 'number' || typeof locationObj.y !== 'number') {
        throw new Error('location must contain numeric x and y coordinates');
      }

      const result = await this.placeFoodSource(route_id, locationObj, food_type);
      return this.formatPlacementResponse(result);

    } catch (error) {
      logger.error('Error executing place_food tool', { error, args });
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ **Food Placement Failed**\n\nUnable to place food source: ${errorMsg}\n\nPlease verify the route_id and location coordinates are valid and try again.`;
    }
  }

  private async placeFoodSource(
    routeId: string, 
    location: { x: number; y: number }, 
    foodType: string
  ): Promise<EnvironmentalModificationResult> {
    const environment = this.environmentState.getEnvironment(routeId);
    if (!environment) {
      throw new Error(`Environment not found for route: ${routeId}`);
    }

    const nearbyMonsters = this.monsterSystem.getMonstersByRoute(routeId);
    const foodResource = this.environmentState.addFoodSource(routeId, location, foodType);
    
    this.monsterSystem.notifyEnvironmentalChange(routeId, 'food_placed', location);

    const placementConfirmation = this.generatePlacementDescription(foodType, location, foodResource);
    const behavioralPredictions = this.generateBehavioralPredictions(nearbyMonsters, foodType, location);
    const ecosystemImpact = this.generateEcosystemImpact(environment, foodResource, foodType);

    return {
      placementConfirmation,
      behavioralPredictions,
      ecosystemImpact,
      timestamp: Date.now()
    };
  }

  private generatePlacementDescription(
    foodType: string, 
    location: { x: number; y: number }, 
    foodResource: { quality: number; quantity: number }
  ): string {
    const foodDescriptions: Record<string, string> = {
      meat: `A fresh carcass has been strategically placed at coordinates (${location.x}, ${location.y}), its scent already beginning to drift on the wind. The rich aroma of protein will draw predators and scavengers from across the territory.`,
      plants: `Nutritious vegetation has been cultivated at (${location.x}, ${location.y}), creating a verdant patch that stands out against the natural landscape. The fresh growth promises sustenance for herbivorous creatures.`,
      water: `A pristine water source has been established at coordinates (${location.x}, ${location.y}), its crystal-clear surface reflecting the sky above. This essential resource will become a gathering point for all manner of woodland creatures.`
    };

    const qualityModifier = foodResource.quality > 0.8 ? 
      ' The exceptional quality of this resource makes it particularly enticing to discerning creatures.' :
      ' The resource appears fresh and appealing, suitable for attracting local wildlife.';

    return foodDescriptions[foodType] + qualityModifier;
  }

  private generateBehavioralPredictions(
    nearbyMonsters: Array<{ ai_personality: { type: string }; stats: { position: { x: number; y: number } } }>, 
    foodType: string, 
    location: { x: number; y: number }
  ): string {
    if (nearbyMonsters.length === 0) {
      return `While no creatures are immediately visible, the ${foodType} source will likely attract wildlife from neighboring territories within the next few hours. Patient observation is recommended.`;
    }

    const predictions: string[] = [];
    const personalityGroups = this.groupMonstersByPersonality(nearbyMonsters);

    if (personalityGroups.aggressive_hunters.length > 0) {
      predictions.push(
        `**Aggressive Hunters** (${personalityGroups.aggressive_hunters.length} detected): ${
          foodType === 'meat' ? 
            'Will approach boldly and directly, likely arriving first and potentially defending the resource aggressively.' :
            'May investigate with interest but will prioritize hunting over foraging, using the location as a potential ambush point.'
        }`
      );
    }

    if (personalityGroups.cautious_foragers.length > 0) {
      predictions.push(
        `**Cautious Foragers** (${personalityGroups.cautious_foragers.length} detected): ${
          foodType === 'plants' ? 
            'Will observe from a distance before approaching carefully, likely waiting for aggressive types to leave before feeding.' :
            'May show minimal interest but will remember the location for future reference, approaching only when territorial pressure is low.'
        }`
      );
    }

    if (personalityGroups.pack_leaders.length > 0) {
      predictions.push(
        `**Pack Leaders** (${personalityGroups.pack_leaders.length} detected): Will assess the resource strategically, potentially coordinating group access and establishing feeding hierarchies based on pack dynamics.`
      );
    }

    const proximityEffect = this.calculateProximityEffect(nearbyMonsters, location);
    predictions.push(proximityEffect);

    return predictions.join('\n\n');
  }

  private groupMonstersByPersonality(monsters: Array<{ ai_personality: { type: string } }>): Record<string, Array<{ ai_personality: { type: string } }>> {
    return {
      aggressive_hunters: monsters.filter(m => m.ai_personality.type === MonsterPersonalityType.AGGRESSIVE_HUNTER),
      cautious_foragers: monsters.filter(m => m.ai_personality.type === MonsterPersonalityType.CAUTIOUS_FORAGER),
      pack_leaders: monsters.filter(m => m.ai_personality.type === MonsterPersonalityType.PACK_LEADER)
    };
  }

  private calculateProximityEffect(monsters: Array<{ stats: { position: { x: number; y: number } } }>, location: { x: number; y: number }): string {
    const nearbyMonsters = monsters.filter(monster => {
      const distance = Math.sqrt(
        Math.pow(monster.stats.position.x - location.x, 2) +
        Math.pow(monster.stats.position.y - location.y, 2)
      );
      return distance <= 25;
    });

    if (nearbyMonsters.length === 0) {
      return '**Proximity Analysis**: No creatures are within immediate detection range. The food source will likely be discovered through scent trails and environmental cues.';
    }

    const averageDistance = nearbyMonsters.reduce((sum, monster) => {
      return sum + Math.sqrt(
        Math.pow(monster.stats.position.x - location.x, 2) +
        Math.pow(monster.stats.position.y - location.y, 2)
      );
    }, 0) / nearbyMonsters.length;

    if (averageDistance <= 10) {
      return `**Proximity Analysis**: ${nearbyMonsters.length} creature(s) are in immediate proximity. Expect rapid response and potential territorial conflicts.`;
    } else if (averageDistance <= 20) {
      return `**Proximity Analysis**: ${nearbyMonsters.length} creature(s) are within moderate range. Discovery is likely within the next feeding cycle.`;
    } else {
      return `**Proximity Analysis**: ${nearbyMonsters.length} creature(s) are at detection range. Initial interest will depend on scent dispersion and wind patterns.`;
    }
  }

  private generateEcosystemImpact(environment: { ecosystem_balance: { resource_abundance: number; predator_count: number; prey_count: number }; resources: Array<{ type: string }> }, foodResource: { quality: number }, foodType: string): string {
    const currentBalance = environment.ecosystem_balance;
    const resourceDensity = environment.resources.filter((r) => r.type === 'food').length;
    
    let impact = `**Ecosystem Balance**: The addition of ${foodType} will `;
    
    if (currentBalance.resource_abundance < 0.4) {
      impact += 'significantly improve the struggling ecosystem, potentially reducing territorial conflicts and supporting population growth.';
    } else if (currentBalance.resource_abundance > 0.8) {
      impact += 'create abundance that may alter predator-prey dynamics, potentially leading to population shifts and behavioral changes.';
    } else {
      impact += 'maintain the current ecosystem balance while providing additional foraging opportunities for local wildlife.';
    }

    if (resourceDensity > 10) {
      impact += ' **Warning**: High resource density detected - monitor for potential over-feeding and dependency behaviors.';
    }

    const predatorRatio = currentBalance.predator_count / (currentBalance.predator_count + currentBalance.prey_count);
    if (predatorRatio > 0.4 && foodType === 'meat') {
      impact += ' **Strategic Note**: Abundant predators present - meat placement may intensify competition and territorial disputes.';
    }

    return impact;
  }

  private formatPlacementResponse(result: EnvironmentalModificationResult): string {
    let response = `🍯 **Food Source Placed Successfully**\n\n`;
    
    response += `**Placement Details:**\n${result.placementConfirmation}\n\n`;
    response += `**Behavioral Predictions:**\n${result.behavioralPredictions}\n\n`;
    response += `**Ecosystem Impact:**\n${result.ecosystemImpact}\n\n`;
    response += `*Environmental modification completed at ${new Date(result.timestamp).toLocaleTimeString()}*`;

    return response;
  }
}