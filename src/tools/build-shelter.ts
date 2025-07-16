import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PrimalTokenService } from '../utils/primal-token-service';
import { MockEnvironmentState } from '../ecosystem/environment-state';
import { EnvironmentalStructure } from '../types/environment-types';

export interface BuildShelterRequest {
  route_id: string;
  location: { x: number; y: number };
  shelter_type: 'cave' | 'tree_hollow' | 'rock_outcrop' | 'burrow';
  capacity?: number;
}

export interface BuildShelterResponse {
  success: boolean;
  shelter_confirmation: string;
  expected_monster_response: string;
  ecosystem_impact: string[];
  token_transaction: {
    cost: number;
    transaction_id: string;
    new_balance: number;
  };
  modification_id: string;
  shelter_details: {
    type: string;
    capacity: number;
    safety_level: number;
    weather_protection: number;
    accessibility: number;
  };
}

export class BuildShelterTool {
  private tokenService: PrimalTokenService;
  private environmentState: MockEnvironmentState;

  constructor(tokenService: PrimalTokenService, environmentState: MockEnvironmentState) {
    this.tokenService = tokenService;
    this.environmentState = environmentState;
  }

  async execute(request: BuildShelterRequest): Promise<BuildShelterResponse> {
    const tokenCost = this.tokenService.getTokenCost('BUILD_SHELTER');
    const modificationId = `shelter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    // Validate location bounds
    if (request.location.x < 0 || request.location.x > 1000 || 
        request.location.y < 0 || request.location.y > 1000) {
      throw new Error('Location must be within bounds (0-1000, 0-1000)');
    }

    // Check for nearby structures to avoid overlap
    const nearbyStructures = environment.structures.filter(structure => {
      const distance = Math.sqrt(
        Math.pow(structure.position.x - request.location.x, 2) + 
        Math.pow(structure.position.y - request.location.y, 2)
      );
      return distance < 50; // 50 unit minimum distance
    });

    if (nearbyStructures.length > 0) {
      throw new Error('Cannot build shelter: Too close to existing structures. Minimum 50 units distance required.');
    }

    // Deduct tokens
    const deduction = this.tokenService.deductTokens(tokenCost, `Build ${request.shelter_type} shelter`, modificationId);
    if (!deduction.success) {
      throw new Error(deduction.message);
    }

    // Calculate shelter properties
    const capacity = request.capacity || this.getDefaultCapacity(request.shelter_type);
    const shelterProperties = this.generateShelterProperties(request.shelter_type, capacity);

    // Create shelter structure
    const shelterStructure: EnvironmentalStructure = {
      id: `shelter_${modificationId}`,
      type: 'shelter',
      position: request.location,
      properties: {
        shelter_type: request.shelter_type,
        capacity,
        safety_level: shelterProperties.safety_level,
        weather_protection: shelterProperties.weather_protection,
        accessibility: shelterProperties.accessibility,
        structural_integrity: shelterProperties.structural_integrity,
        concealment: shelterProperties.concealment,
        comfort_rating: shelterProperties.comfort_rating
      },
      influence_radius: this.getShelterInfluenceRadius(request.shelter_type, capacity),
      last_modified: new Date()
    };

    // Update environment
    const updatedStructures = [...environment.structures, shelterStructure];
    this.environmentState.updateEnvironment(request.route_id, {
      structures: updatedStructures
    });

    // Generate response
    const shelterConfirmation = this.generateShelterConfirmation(request.shelter_type, capacity, request.location);
    const expectedMonsterResponse = this.generateExpectedMonsterResponse(request.shelter_type, shelterProperties, environment);
    const ecosystemImpact = this.generateEcosystemImpact(request.shelter_type, shelterProperties, environment);

    return {
      success: true,
      shelter_confirmation: shelterConfirmation,
      expected_monster_response: expectedMonsterResponse,
      ecosystem_impact: ecosystemImpact,
      token_transaction: {
        cost: tokenCost,
        transaction_id: deduction.transaction_id,
        new_balance: deduction.new_balance
      },
      modification_id: modificationId,
      shelter_details: {
        type: request.shelter_type,
        capacity,
        safety_level: shelterProperties.safety_level,
        weather_protection: shelterProperties.weather_protection,
        accessibility: shelterProperties.accessibility
      }
    };
  }

  private getDefaultCapacity(shelterType: string): number {
    const capacityMap: Record<string, number> = {
      cave: 8,
      tree_hollow: 4,
      rock_outcrop: 6,
      burrow: 3
    };
    return capacityMap[shelterType] || 5;
  }

  private generateShelterProperties(shelterType: string, capacity: number): Record<string, number> {
    const baseProperties: Record<string, Record<string, number>> = {
      cave: {
        safety_level: 0.9,
        weather_protection: 0.95,
        accessibility: 0.6,
        structural_integrity: 0.95,
        concealment: 0.8,
        comfort_rating: 0.7
      },
      tree_hollow: {
        safety_level: 0.7,
        weather_protection: 0.8,
        accessibility: 0.8,
        structural_integrity: 0.75,
        concealment: 0.9,
        comfort_rating: 0.6
      },
      rock_outcrop: {
        safety_level: 0.8,
        weather_protection: 0.7,
        accessibility: 0.9,
        structural_integrity: 0.9,
        concealment: 0.5,
        comfort_rating: 0.5
      },
      burrow: {
        safety_level: 0.85,
        weather_protection: 0.9,
        accessibility: 0.4,
        structural_integrity: 0.8,
        concealment: 0.95,
        comfort_rating: 0.8
      }
    };

    const base = baseProperties[shelterType] || baseProperties.cave;
    
    // Adjust properties based on capacity
    const capacityModifier = Math.max(0.8, Math.min(1.2, capacity / 5)); // 5 is baseline capacity
    
    return {
      safety_level: Math.min(1.0, base.safety_level * capacityModifier),
      weather_protection: base.weather_protection,
      accessibility: Math.max(0.1, base.accessibility / Math.sqrt(capacityModifier)), // Larger shelters are harder to access
      structural_integrity: Math.min(1.0, base.structural_integrity * capacityModifier),
      concealment: Math.max(0.1, base.concealment / capacityModifier), // Larger shelters are more visible
      comfort_rating: Math.min(1.0, base.comfort_rating * capacityModifier)
    };
  }

  private getShelterInfluenceRadius(shelterType: string, capacity: number): number {
    const baseRadius: Record<string, number> = {
      cave: 120,
      tree_hollow: 80,
      rock_outcrop: 100,
      burrow: 60
    };

    const base = baseRadius[shelterType] || 90;
    return base + (capacity * 5); // Larger shelters have wider influence
  }

  private generateShelterConfirmation(shelterType: string, capacity: number, location: { x: number; y: number }): string {
    const shelterDescriptions: Record<string, string> = {
      cave: "a secure cave system with multiple chambers and natural ventilation",
      tree_hollow: "a comfortable tree hollow with reinforced bark walls and natural camouflage",
      rock_outcrop: "a sturdy rock shelter with strategic vantage points and wind protection",
      burrow: "an underground burrow network with multiple entrances and excellent concealment"
    };

    const capacityDescription = capacity <= 3 ? "intimate" : capacity <= 6 ? "moderate" : "spacious";

    return `Successfully constructed ${shelterDescriptions[shelterType]} at coordinates (${location.x}, ${location.y}). ` +
           `This ${capacityDescription} shelter can accommodate up to ${capacity} creatures and features excellent ` +
           `structural integrity with natural materials that blend seamlessly into the surrounding environment. ` +
           `The shelter is now ready for immediate occupancy and will provide reliable protection from weather and predators.`;
  }

  private generateExpectedMonsterResponse(shelterType: string, properties: Record<string, number>, environment: import('../types/environment-types').Environment): string {
    const weatherCondition = environment.weather_state.current_condition;
    const existingShelters = environment.structures.filter((s) => s.type === 'shelter' || s.type === 'den').length;

    const responses: Record<string, string> = {
      cave: `Cave-dwelling and larger creatures will be attracted to this highly secure shelter within 1-2 hours. ` +
            `Expect territorial establishment by dominant species, followed by hierarchical sharing arrangements with ` +
            `smaller compatible creatures. The excellent safety rating will make this a preferred nesting and resting site.`,
      tree_hollow: `Arboreal and climbing species will discover this shelter within 30-60 minutes. Smaller, agile ` +
                   `creatures will establish primary residency while maintaining excellent concealment from ground predators. ` +
                   `Social nesting behaviors may develop among compatible tree-dwelling species.`,
      rock_outcrop: `Rocky terrain specialists and medium-sized creatures will claim this vantage point within 1-2 hours. ` +
                    `The open accessibility will create a social hub for territorial displays and inter-species communication. ` +
                    `Expect increased vigilance behaviors and coordinated group activities.`,
      burrow: `Ground-dwelling and burrowing species will locate this underground network within 2-3 hours through scent ` +
              `and ground vibration detection. The high concealment will attract shy and vulnerable species seeking ` +
              `maximum protection. Complex tunnel social structures may emerge over time.`
    };

    let baseResponse = responses[shelterType] || "Creatures will respond to the new shelter based on their habitat preferences.";

    // Add weather context
    if (weatherCondition === 'rainy' || weatherCondition === 'stormy') {
      baseResponse += " The current adverse weather conditions will significantly accelerate shelter-seeking behaviors.";
    } else if (weatherCondition === 'sunny') {
      baseResponse += " The pleasant weather allows for careful shelter evaluation and gradual occupancy patterns.";
    }

    // Add scarcity context
    if (existingShelters < 3) {
      baseResponse += " High demand due to shelter scarcity will create immediate competition and rapid occupancy.";
    } else if (existingShelters > 6) {
      baseResponse += " Abundant shelter options will allow for selective occupancy based on species-specific preferences.";
    }

    return baseResponse;
  }

  private generateEcosystemImpact(shelterType: string, properties: Record<string, number>, environment: import('../types/environment-types').Environment): string[] {
    const impacts = [];

    // Base impacts for shelter type
    const shelterImpacts: Record<string, string[]> = {
      cave: [
        "Enhanced ecosystem stability through secure nesting opportunities",
        "Potential for multi-species cohabitation and reduced territorial conflicts",
        "Increased survival rates during extreme weather events"
      ],
      tree_hollow: [
        "Improved vertical ecosystem utilization and canopy activity",
        "Enhanced predator-prey balance through elevated safe zones",
        "Potential for establishing complex arboreal social networks"
      ],
      rock_outcrop: [
        "Creation of new territorial boundaries and social interaction zones",
        "Enhanced ecosystem monitoring through elevated vantage points",
        "Improved inter-species communication and coordination opportunities"
      ],
      burrow: [
        "Strengthened ground-level ecosystem security and stability",
        "Increased protection for vulnerable species and young creatures",
        "Potential for underground territorial network development"
      ]
    };

    impacts.push(...(shelterImpacts[shelterType] || ["General shelter-based ecosystem enhancement"]));

    // Property-based impacts
    if (properties.safety_level > 0.8) {
      impacts.push("High safety rating will attract breeding pairs and family groups");
    }

    if (properties.weather_protection > 0.8) {
      impacts.push("Excellent weather protection will create year-round population stability");
    }

    if (properties.concealment > 0.8) {
      impacts.push("Superior concealment will provide sanctuary for stressed or recovering creatures");
    }

    // Environmental context impacts
    const currentBalance = environment.ecosystem_balance;
    if (currentBalance < 0.5) {
      impacts.push("Critical shelter addition will help stabilize ecosystem stress and population dynamics");
    } else if (currentBalance > 0.8) {
      impacts.push("Shelter enhancement will optimize already thriving ecosystem population distribution");
    }

    const resourceCount = environment.resources.length;
    if (resourceCount > 6) {
      impacts.push("Abundant resources combined with new shelter will create premium habitat zones");
    }

    return impacts;
  }

  static getToolDefinition(): Tool {
    return {
      name: 'build_shelter',
      description: 'Create safe zones and shelter structures for monsters to utilize, enhancing ecosystem stability. Costs 50 Primal tokens per shelter.',
      inputSchema: {
        type: 'object',
        properties: {
          route_id: {
            type: 'string',
            description: 'Route identifier where shelter will be built'
          },
          location: {
            type: 'object',
            properties: {
              x: { type: 'number', minimum: 0, maximum: 1000 },
              y: { type: 'number', minimum: 0, maximum: 1000 }
            },
            required: ['x', 'y'],
            description: 'Coordinates for shelter placement (0-1000 range)'
          },
          shelter_type: {
            type: 'string',
            enum: ['cave', 'tree_hollow', 'rock_outcrop', 'burrow'],
            description: 'Type of shelter to build'
          },
          capacity: {
            type: 'number',
            minimum: 1,
            maximum: 15,
            description: 'Number of monsters the shelter can accommodate (optional, defaults vary by type)'
          }
        },
        required: ['route_id', 'location', 'shelter_type']
      }
    };
  }
}