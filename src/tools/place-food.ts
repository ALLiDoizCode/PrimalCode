import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PrimalTokenService } from '../utils/primal-token-service';
import { MockEnvironmentState } from '../ecosystem/environment-state';
import { ResourcePool, EnvironmentalStructure } from '../types/environment-types';
import { EnvironmentalToolBase } from '../utils/environmental-tool-base';

export interface PlaceFoodRequest {
  route_id: string;
  location: { x: number; y: number };
  food_type: 'berries' | 'meat' | 'insects' | 'nectar';
  quantity?: number;
}

export interface PlaceFoodResponse {
  success: boolean;
  placement_confirmation: string;
  expected_monster_response: string;
  ecosystem_impact: string[];
  token_transaction: {
    cost: number;
    transaction_id: string;
    new_balance: number;
  };
  modification_id: string;
}

export class PlaceFoodTool extends EnvironmentalToolBase {
  constructor(tokenService: PrimalTokenService, environmentState: MockEnvironmentState) {
    super(tokenService, environmentState);
  }

  async execute(request: PlaceFoodRequest): Promise<PlaceFoodResponse> {
    const modificationId = this.generateModificationId('food');

    // Validate prerequisites (token balance, environment, location)
    const { tokenCost, environment } = await this.validateModificationPrerequisites(
      request.route_id, 
      request.location, 
      'PLACE_FOOD'
    );

    // Deduct tokens
    const deduction = await this.deductTokensWithValidation(
      tokenCost, 
      `Place ${request.food_type} food`, 
      modificationId
    );

    // Create food resource
    const quantity = request.quantity || 50;
    const foodResource: ResourcePool = {
      id: `food_${modificationId}`,
      type: 'food',
      position: request.location,
      quantity,
      quality: this.getFoodQuality(request.food_type),
      regeneration_rate: this.getFoodRegenerationRate(request.food_type),
      last_accessed: new Date()
    };

    // Create environmental structure for food source
    const foodStructure: EnvironmentalStructure = {
      id: `structure_${modificationId}`,
      type: 'food_source',
      position: request.location,
      properties: {
        food_type: request.food_type,
        initial_quantity: quantity,
        attractiveness: this.getFoodAttractiveness(request.food_type),
        decay_rate: this.getFoodDecayRate(request.food_type)
      },
      influence_radius: this.getFoodInfluenceRadius(request.food_type),
      last_modified: new Date()
    };

    // Update environment
    const updatedResources = [...environment.resources, foodResource];
    const updatedStructures = [...environment.structures, foodStructure];
    
    this.environmentState.updateEnvironment(request.route_id, {
      resources: updatedResources,
      structures: updatedStructures
    });

    // Generate response
    const placementConfirmation = this.generatePlacementConfirmation(request.food_type, quantity, request.location);
    const expectedMonsterResponse = this.generateExpectedMonsterResponse(request.food_type, environment);
    const ecosystemImpact = this.generateEcosystemImpact(request.food_type, environment);

    return {
      success: true,
      placement_confirmation: placementConfirmation,
      expected_monster_response: expectedMonsterResponse,
      ecosystem_impact: ecosystemImpact,
      token_transaction: this.buildTokenTransactionResponse(tokenCost, deduction),
      modification_id: modificationId
    };
  }

  private getFoodQuality(foodType: string): number {
    const qualityMap: Record<string, number> = {
      berries: 0.7,
      meat: 0.9,
      insects: 0.6,
      nectar: 0.8
    };
    return qualityMap[foodType] || 0.5;
  }

  private getFoodRegenerationRate(foodType: string): number {
    const regenMap: Record<string, number> = {
      berries: 8,
      meat: 2,
      insects: 12,
      nectar: 5
    };
    return regenMap[foodType] || 5;
  }

  private getFoodAttractiveness(foodType: string): number {
    const attractivenessMap: Record<string, number> = {
      berries: 0.6,
      meat: 0.9,
      insects: 0.5,
      nectar: 0.8
    };
    return attractivenessMap[foodType] || 0.5;
  }

  private getFoodDecayRate(foodType: string): number {
    const decayMap: Record<string, number> = {
      berries: 0.05,
      meat: 0.15,
      insects: 0.03,
      nectar: 0.08
    };
    return decayMap[foodType] || 0.05;
  }

  private getFoodInfluenceRadius(foodType: string): number {
    const radiusMap: Record<string, number> = {
      berries: 80,
      meat: 150,
      insects: 60,
      nectar: 100
    };
    return radiusMap[foodType] || 75;
  }

  private generatePlacementConfirmation(foodType: string, quantity: number, location: { x: number; y: number }): string {
    const foodDescriptions: Record<string, string> = {
      berries: "clusters of ripe, colorful berries",
      meat: "fresh, aromatic meat portions",
      insects: "protein-rich insect colonies",
      nectar: "sweet, fragrant nectar pools"
    };

    return `Successfully placed ${quantity} units of ${foodDescriptions[foodType]} at coordinates (${location.x}, ${location.y}). ` +
           `The food source radiates an enticing aroma that will gradually spread through the surrounding area, ` +
           `creating a natural beacon that should attract nearby creatures within the next few hours.`;
  }

  private generateExpectedMonsterResponse(foodType: string, environment: import('../types/environment-types').Environment): string {
    const nearbyStructures = environment.structures.length;
    const weatherCondition = environment.weather_state.current_condition;

    const responses: Record<string, string> = {
      berries: `Herbivorous creatures will likely begin foraging behavior within 2-3 hours. Expect to see increased ` +
               `exploration patterns as monsters follow scent trails. Small to medium-sized creatures will establish ` +
               `temporary feeding territories around the berry clusters.`,
      meat: `Carnivorous and omnivorous monsters will be drawn by the strong scent within 1-2 hours. Larger predators ` +
              `may establish patrol routes near the meat source. Competitive feeding behaviors and territorial disputes ` +
              `are likely as multiple creatures vie for this high-value resource.`,
      insects: `Insectivorous species will exhibit rapid response within 30-60 minutes. Expect increased ground-level ` +
               `foraging and hunting behaviors. Smaller monsters will likely establish feeding schedules around the ` +
               `insect colonies, potentially becoming more predictable in their movements.`,
      nectar: `Flying and climbing creatures will respond to the sweet scent within 1-2 hours. Aerial activity will ` +
              `increase significantly as monsters adjust their flight patterns to include regular visits to the nectar source. ` +
              `Social feeding behaviors may emerge among compatible species.`
    };

    let baseResponse = responses[foodType] || "Monsters will respond to the new food source based on their dietary preferences.";

    // Add environmental context
    if (weatherCondition === 'rainy') {
      baseResponse += " The current rainy conditions will amplify scent dispersal but may delay initial approach behaviors.";
    } else if (weatherCondition === 'sunny') {
      baseResponse += " The clear weather conditions will help scent travel efficiently, likely accelerating monster response times.";
    }

    if (nearbyStructures > 5) {
      baseResponse += " The high density of existing structures in this area may create competition for territory around the new food source.";
    }

    return baseResponse;
  }

  private generateEcosystemImpact(foodType: string, environment: import('../types/environment-types').Environment): string[] {
    const impacts = [];

    // Base impacts for food type
    const foodImpacts: Record<string, string[]> = {
      berries: [
        "Increased herbivore activity in the immediate area",
        "Potential seed dispersal as creatures consume and move berries",
        "Seasonal feeding pattern establishment"
      ],
      meat: [
        "Elevated predator presence and hunting activity",
        "Possible scavenger attraction and cleanup behaviors",
        "Temporary territorial boundary shifts among carnivores"
      ],
      insects: [
        "Enhanced ground-level ecosystem activity",
        "Improved nutrient cycling from increased insectivore presence",
        "Potential for establishing sustainable feeding micro-environments"
      ],
      nectar: [
        "Increased pollination activity from creature movement",
        "Enhanced vertical ecosystem utilization",
        "Potential for symbiotic relationships between species"
      ]
    };

    impacts.push(...(foodImpacts[foodType] || ["General ecosystem activity increase"]));

    // Environmental context impacts
    const currentBalance = environment.ecosystem_balance;
    if (currentBalance < 0.5) {
      impacts.push("Food addition will help stabilize the currently stressed ecosystem balance");
    } else if (currentBalance > 0.8) {
      impacts.push("Food addition to an already thriving ecosystem may create resource abundance effects");
    }

    const resourceCount = environment.resources.length;
    if (resourceCount < 5) {
      impacts.push("Significant ecosystem enhancement due to current resource scarcity");
    } else if (resourceCount > 8) {
      impacts.push("Minor ecosystem enhancement due to already abundant resource availability");
    }

    return impacts;
  }

  static getToolDefinition(): Tool {
    return {
      name: 'place_food',
      description: 'Add food sources at specified locations to attract monsters and influence their behavior patterns. Costs 10 Primal tokens per placement.',
      inputSchema: {
        type: 'object',
        properties: {
          route_id: {
            type: 'string',
            description: 'Route identifier where food will be placed'
          },
          location: {
            type: 'object',
            properties: {
              x: { type: 'number', minimum: 0, maximum: 1000 },
              y: { type: 'number', minimum: 0, maximum: 1000 }
            },
            required: ['x', 'y'],
            description: 'Coordinates for food placement (0-1000 range)'
          },
          food_type: {
            type: 'string',
            enum: ['berries', 'meat', 'insects', 'nectar'],
            description: 'Type of food to place'
          },
          quantity: {
            type: 'number',
            minimum: 10,
            maximum: 100,
            description: 'Amount of food to place (optional, defaults to 50)'
          }
        },
        required: ['route_id', 'location', 'food_type']
      }
    };
  }
}