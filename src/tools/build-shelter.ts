import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MockMonsterSystem } from '../ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../ecosystem/mock-environment-state';
import { 
  MCPToolBase, 
  BuildShelterArgs,
  EnvironmentalModificationResult
} from '../types/mcp-tool-types';
import { MonsterPersonalityType } from '../types/monster-types';
import logger from '../utils/logger';

export class BuildShelterTool implements MCPToolBase {
  constructor(
    private monsterSystem: MockMonsterSystem,
    private environmentState: MockEnvironmentState
  ) {}

  public getToolDefinition(): Tool {
    return {
      name: 'build_shelter',
      description: 'Create safe zones that monsters can utilize for protection and territorial establishment',
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
            description: 'Coordinates where shelter should be built'
          },
          shelter_type: {
            type: 'string',
            description: 'Type of shelter to construct',
            enum: ['cave', 'burrow', 'tree', 'rock']
          }
        },
        required: ['route_id', 'location', 'shelter_type'],
        additionalProperties: false
      }
    };
  }

  public async execute(args: Record<string, unknown>): Promise<string> {
    try {
      logger.info('Executing build_shelter tool', { args });

      const { route_id, location, shelter_type } = args as unknown as BuildShelterArgs;

      if (!route_id || typeof route_id !== 'string') {
        throw new Error('route_id is required and must be a string');
      }

      if (!location || typeof location !== 'object' || location === null) {
        throw new Error('location is required and must be an object with x and y coordinates');
      }

      if (!shelter_type || typeof shelter_type !== 'string') {
        throw new Error('shelter_type is required and must be a string');
      }

      const locationObj = location as { x: number; y: number };
      if (typeof locationObj.x !== 'number' || typeof locationObj.y !== 'number') {
        throw new Error('location must contain numeric x and y coordinates');
      }

      const result = await this.buildShelterStructure(route_id, locationObj, shelter_type);
      return this.formatShelterResponse(result);

    } catch (error) {
      logger.error('Error executing build_shelter tool', { error, args });
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ **Shelter Construction Failed**\n\nUnable to build shelter: ${errorMsg}\n\nPlease verify the route_id, location coordinates, and shelter_type are valid and try again.`;
    }
  }

  private async buildShelterStructure(
    routeId: string, 
    location: { x: number; y: number }, 
    shelterType: string
  ): Promise<EnvironmentalModificationResult> {
    const environment = this.environmentState.getEnvironment(routeId);
    if (!environment) {
      throw new Error(`Environment not found for route: ${routeId}`);
    }

    const nearbyMonsters = this.monsterSystem.getMonstersByRoute(routeId);
    const shelter = this.environmentState.buildShelter(routeId, location, shelterType);
    
    this.monsterSystem.notifyEnvironmentalChange(routeId, 'shelter_built', location);

    const placementConfirmation = this.generateConstructionDescription(shelterType, location, shelter);
    const behavioralPredictions = this.generateUtilizationPredictions(nearbyMonsters, shelterType, location, shelter);
    const ecosystemImpact = this.generateEcosystemImpact(environment, shelter, shelterType);

    return {
      placementConfirmation,
      behavioralPredictions,
      ecosystemImpact,
      timestamp: Date.now()
    };
  }

  private generateConstructionDescription(
    shelterType: string, 
    location: { x: number; y: number }, 
    shelter: any
  ): string {
    const constructionDescriptions: Record<string, string> = {
      cave: `A sturdy cave has been excavated at coordinates (${location.x}, ${location.y}), its natural stone walls providing excellent protection from the elements. The entrance is positioned to offer both security and strategic visibility, with enough interior space to accommodate ${shelter.capacity} creatures comfortably.`,
      burrow: `An intricate burrow system has been constructed at (${location.x}, ${location.y}), featuring multiple chambers and escape routes. The earthen walls provide natural insulation, while the network of tunnels can safely house ${shelter.capacity} creatures with room for expansion.`,
      tree: `A fortified tree shelter has been established at coordinates (${location.x}, ${location.y}), utilizing the natural canopy for concealment and protection. The elevated position offers excellent vantage points while providing secure nesting areas for ${shelter.capacity} creatures.`,
      rock: `A robust rock shelter has been constructed at (${location.x}, ${location.y}), using natural stone formations to create a defensive stronghold. The solid structure can withstand harsh weather conditions while accommodating ${shelter.capacity} creatures in relative safety.`
    };

    const stabilityNote = shelter.stability > 0.9 ? 
      ' The construction displays exceptional stability and durability.' :
      ' The structure shows solid craftsmanship suitable for long-term use.';

    return constructionDescriptions[shelterType] + stabilityNote;
  }

  private generateUtilizationPredictions(
    nearbyMonsters: any[], 
    shelterType: string, 
    location: { x: number; y: number },
    shelter: any
  ): string {
    if (nearbyMonsters.length === 0) {
      return `While no creatures are immediately visible, the ${shelterType} shelter will serve as a valuable refuge for wildlife entering the territory. Its strategic location and ${shelter.capacity}-creature capacity make it an attractive territorial asset.`;
    }

    const predictions: string[] = [];
    const personalityGroups = this.groupMonstersByPersonality(nearbyMonsters);

    const utilizationPatterns = this.getShelterUtilizationByPersonality(shelterType, shelter.capacity);

    if (personalityGroups.aggressive_hunters.length > 0) {
      predictions.push(
        `**Aggressive Hunters** (${personalityGroups.aggressive_hunters.length} detected): ${utilizationPatterns.aggressive_hunters}`
      );
    }

    if (personalityGroups.cautious_foragers.length > 0) {
      predictions.push(
        `**Cautious Foragers** (${personalityGroups.cautious_foragers.length} detected): ${utilizationPatterns.cautious_foragers}`
      );
    }

    if (personalityGroups.pack_leaders.length > 0) {
      predictions.push(
        `**Pack Leaders** (${personalityGroups.pack_leaders.length} detected): ${utilizationPatterns.pack_leaders}`
      );
    }

    const proximityAnalysis = this.analyzeShelterProximity(nearbyMonsters, location, shelter);
    predictions.push(proximityAnalysis);

    const capacityAnalysis = this.analyzeCapacityImplications(nearbyMonsters, shelter);
    predictions.push(capacityAnalysis);

    return predictions.join('\n\n');
  }

  private getShelterUtilizationByPersonality(shelterType: string, capacity: number): Record<string, string> {
    const utilizationPatterns: Record<string, Record<string, string>> = {
      cave: {
        aggressive_hunters: `Will claim the cave as a primary den, using it for rest between hunts and as a defensive position. The enclosed space appeals to their territorial instincts and provides strategic advantages for ambush tactics.`,
        cautious_foragers: `Will use the cave as a secure retreat during dangerous conditions, particularly appreciating the multiple escape routes and natural camouflage it provides. They'll establish emergency supply caches within.`,
        pack_leaders: `Will evaluate the cave as a potential pack headquarters, considering its capacity for group coordination and defense. They may establish hierarchical sleeping arrangements and patrol schedules.`
      },
      burrow: {
        aggressive_hunters: `Will utilize the burrow system for surprise attacks, using the multiple exits for tactical advantages. The underground network appeals to their strategic hunting mindset.`,
        cautious_foragers: `Will fully embrace the burrow as their primary habitat, expanding the tunnel system and creating specialized chambers for different activities. This type of shelter perfectly matches their cautious nature.`,
        pack_leaders: `Will organize the burrow system into a coordinated network, assigning specific chambers to different pack members and establishing communication protocols throughout the tunnels.`
      },
      tree: {
        aggressive_hunters: `Will use the elevated shelter as a hunting perch, taking advantage of the vantage point for prey detection while maintaining a secure base of operations.`,
        cautious_foragers: `Will appreciate the tree shelter's natural camouflage and escape routes, using it as a safe observation post to monitor ground activity before foraging.`,
        pack_leaders: `Will establish the tree shelter as a command center, using the elevated position for territory surveillance and pack coordination while maintaining defensive advantages.`
      },
      rock: {
        aggressive_hunters: `Will claim the rock shelter as a fortress, using its defensive capabilities for territorial dominance while launching hunting expeditions from this secure base.`,
        cautious_foragers: `Will value the rock shelter's solid protection and weather resistance, using it as a long-term residence while maintaining low-profile access routes.`,
        pack_leaders: `Will transform the rock shelter into a pack stronghold, establishing clear territorial boundaries and using the structure as a symbol of group strength and unity.`
      }
    };

    return utilizationPatterns[shelterType] || utilizationPatterns.cave;
  }

  private analyzeShelterProximity(monsters: any[], location: { x: number; y: number }, shelter: any): string {
    const nearbyMonsters = monsters.filter(monster => {
      const distance = Math.sqrt(
        Math.pow(monster.stats.position.x - location.x, 2) +
        Math.pow(monster.stats.position.y - location.y, 2)
      );
      return distance <= 20;
    });

    if (nearbyMonsters.length === 0) {
      return `**Proximity Analysis**: No creatures are within immediate shelter range. The structure will likely attract wildlife seeking secure territory, with discovery expected through territorial exploration patterns.`;
    }

    const competitionLevel = nearbyMonsters.length > shelter.capacity ? 'high' : 'moderate';
    const averageDistance = nearbyMonsters.reduce((sum, monster) => {
      return sum + Math.sqrt(
        Math.pow(monster.stats.position.x - location.x, 2) +
        Math.pow(monster.stats.position.y - location.y, 2)
      );
    }, 0) / nearbyMonsters.length;

    if (averageDistance <= 10) {
      return `**Proximity Analysis**: ${nearbyMonsters.length} creature(s) are in immediate shelter range. Expect ${competitionLevel} competition for occupancy, with territorial establishment likely within hours.`;
    } else {
      return `**Proximity Analysis**: ${nearbyMonsters.length} creature(s) are within detection range. The shelter will be incorporated into territorial considerations, with usage patterns developing over the next day.`;
    }
  }

  private analyzeCapacityImplications(monsters: any[], shelter: any): string {
    const totalMonsters = monsters.length;
    const capacity = shelter.capacity;

    if (totalMonsters === 0) {
      return `**Capacity Analysis**: The shelter's ${capacity}-creature capacity provides excellent accommodation for future wildlife inhabitants, with room for territorial expansion.`;
    }

    if (totalMonsters > capacity * 2) {
      return `**Capacity Analysis**: High population density detected (${totalMonsters} creatures vs ${capacity} capacity). Expect intense competition and potential territorial conflicts over shelter access.`;
    } else if (totalMonsters > capacity) {
      return `**Capacity Analysis**: Moderate population pressure (${totalMonsters} creatures vs ${capacity} capacity). Hierarchical access patterns will likely develop, with dominant creatures claiming priority.`;
    } else {
      return `**Capacity Analysis**: Optimal population balance (${totalMonsters} creatures vs ${capacity} capacity). The shelter can accommodate current inhabitants with minimal territorial stress.`;
    }
  }

  private groupMonstersByPersonality(monsters: any[]): Record<string, any[]> {
    return {
      aggressive_hunters: monsters.filter(m => m.ai_personality.type === MonsterPersonalityType.AGGRESSIVE_HUNTER),
      cautious_foragers: monsters.filter(m => m.ai_personality.type === MonsterPersonalityType.CAUTIOUS_FORAGER),
      pack_leaders: monsters.filter(m => m.ai_personality.type === MonsterPersonalityType.PACK_LEADER)
    };
  }

  private generateEcosystemImpact(environment: any, shelter: any, shelterType: string): string {
    const currentBalance = environment.ecosystem_balance;
    const existingShelters = environment.structures.filter((s: any) => !s.occupied).length;
    
    let impact = `**Ecosystem Balance**: The ${shelterType} shelter will `;
    
    if (currentBalance.territory_pressure > 0.7) {
      impact += `significantly reduce territorial pressure by providing secure refuge options, potentially decreasing conflict by ${Math.round(shelter.capacity * 15)}% through improved territorial distribution.`;
    } else if (currentBalance.territory_pressure < 0.3) {
      impact += `enhance territorial stability by providing additional secure locations, supporting population growth and behavioral diversification within the ecosystem.`;
    } else {
      impact += `maintain healthy territorial balance while providing emergency shelter options during environmental stress periods.`;
    }

    if (existingShelters === 0) {
      impact += ' **Strategic Note**: This is the first available shelter structure - expect rapid territorial reorganization as creatures establish new habitat preferences.';
    } else if (existingShelters > 10) {
      impact += ' **Resource Note**: High shelter density detected - monitor for potential over-development and reduced territorial motivation.';
    }

    const predatorRatio = currentBalance.predator_count / (currentBalance.predator_count + currentBalance.prey_count);
    if (predatorRatio > 0.4) {
      impact += ` **Predator Impact**: High predator presence (${Math.round(predatorRatio * 100)}%) may result in shelter being claimed by dominant hunting creatures, affecting prey access patterns.`;
    }

    return impact;
  }

  private formatShelterResponse(result: EnvironmentalModificationResult): string {
    let response = `🏠 **Shelter Construction Completed Successfully**\n\n`;
    
    response += `**Construction Details:**\n${result.placementConfirmation}\n\n`;
    response += `**Utilization Predictions:**\n${result.behavioralPredictions}\n\n`;
    response += `**Ecosystem Impact:**\n${result.ecosystemImpact}\n\n`;
    response += `*Shelter construction completed at ${new Date(result.timestamp).toLocaleTimeString()}*`;

    return response;
  }
}