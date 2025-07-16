import { PrimalTokenService } from './primal-token-service';
import { MockEnvironmentState } from '../ecosystem/environment-state';
import { IdGenerator } from './id-generator';

/**
 * Base class for environmental modification tools providing common functionality
 */
export abstract class EnvironmentalToolBase {
  protected tokenService: PrimalTokenService;
  protected environmentState: MockEnvironmentState;

  constructor(tokenService: PrimalTokenService, environmentState: MockEnvironmentState) {
    this.tokenService = tokenService;
    this.environmentState = environmentState;
  }

  /**
   * Validates common prerequisites for environmental modifications
   * @param routeId - The route to validate
   * @param location - The location coordinates to validate
   * @param tokenCostKey - The key for token cost lookup
   * @returns Object with validation results and environment
   */
  protected async validateModificationPrerequisites(
    routeId: string, 
    location: { x: number; y: number }, 
    tokenCostKey: keyof typeof import('../types/primal-token-types').PRIMAL_TOKEN_COSTS
  ): Promise<{ tokenCost: number; environment: import('../types/environment-types').Environment }> {
    const tokenCost = this.tokenService.getTokenCost(tokenCostKey);

    // Validate token balance
    const validation = this.tokenService.validateTokenBalance(tokenCost);
    if (!validation.valid) {
      throw new Error(`Insufficient Primal tokens: ${validation.message}`);
    }

    // Validate environment exists
    const environment = this.environmentState.getEnvironment(routeId);
    if (!environment) {
      throw new Error(`Route ${routeId} not found`);
    }

    // Validate location bounds
    if (location.x < 0 || location.x > 1000 || 
        location.y < 0 || location.y > 1000) {
      throw new Error('Location must be within bounds (0-1000, 0-1000)');
    }

    return { tokenCost, environment };
  }

  /**
   * Performs token deduction with standardized error handling
   * @param tokenCost - Amount of tokens to deduct
   * @param purpose - Purpose description for the transaction
   * @param modificationId - ID of the modification
   * @returns Deduction result
   */
  protected async deductTokensWithValidation(
    tokenCost: number, 
    purpose: string, 
    modificationId: string
  ): Promise<import('../types/primal-token-types').TokenDeductionResult> {
    const deduction = this.tokenService.deductTokens(tokenCost, purpose, modificationId);
    if (!deduction.success) {
      throw new Error(deduction.message);
    }
    return deduction;
  }

  /**
   * Generates a modification ID for this tool type
   * @param toolType - The type of tool (food, weather, shelter)
   * @returns Unique modification ID
   */
  protected generateModificationId(toolType: string): string {
    return IdGenerator.generateModificationId(toolType);
  }

  /**
   * Builds standard token transaction response object
   * @param tokenCost - Cost of the operation
   * @param deduction - Result from token deduction
   * @returns Token transaction object
   */
  protected buildTokenTransactionResponse(tokenCost: number, deduction: import('../types/primal-token-types').TokenDeductionResult): { cost: number; transaction_id: string; new_balance: number } {
    return {
      cost: tokenCost,
      transaction_id: deduction.transaction_id,
      new_balance: deduction.new_balance
    };
  }

  /**
   * Validates proximity to existing structures (for shelter building)
   * @param environment - Current environment state
   * @param location - Proposed location
   * @param minimumDistance - Minimum required distance
   * @throws Error if too close to existing structures
   */
  protected validateProximityToStructures(
    environment: import('../types/environment-types').Environment, 
    location: { x: number; y: number }, 
    minimumDistance: number = 50
  ): void {
    const nearbyStructures = environment.structures.filter((structure) => {
      const distance = Math.sqrt(
        Math.pow(structure.position.x - location.x, 2) + 
        Math.pow(structure.position.y - location.y, 2)
      );
      return distance < minimumDistance;
    });

    if (nearbyStructures.length > 0) {
      throw new Error(`Cannot build structure: Too close to existing structures. Minimum ${minimumDistance} units distance required.`);
    }
  }
}