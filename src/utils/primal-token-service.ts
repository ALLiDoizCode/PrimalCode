import { 
  TokenValidationResult, 
  TokenDeductionResult, 
  PrimalTokenTransaction,
  Player,
  PRIMAL_TOKEN_COSTS
} from '../types/primal-token-types';
import { IdGenerator } from './id-generator';

export class PrimalTokenService {
  private mockPlayer: Player = {
    wallet_address: "mock_player_address",
    primal_token_balance: 1000, // Starting with 1000 tokens for testing
    unlocked_tools: [],
    ecosystem_mastery: [],
    capture_collection: [],
    session_history: [],
    token_transaction_history: []
  };

  public validateTokenBalance(requiredAmount: number): TokenValidationResult {
    const valid = this.mockPlayer.primal_token_balance >= requiredAmount;
    
    return {
      valid,
      current_balance: this.mockPlayer.primal_token_balance,
      required_amount: requiredAmount,
      message: valid 
        ? `Sufficient balance: ${this.mockPlayer.primal_token_balance} tokens available`
        : `Insufficient balance: ${this.mockPlayer.primal_token_balance} tokens available, ${requiredAmount} required`
    };
  }

  public deductTokens(amount: number, purpose: string, modificationId?: string): TokenDeductionResult {
    const validation = this.validateTokenBalance(amount);
    
    if (!validation.valid) {
      return {
        success: false,
        transaction_id: '',
        new_balance: this.mockPlayer.primal_token_balance,
        message: validation.message
      };
    }

    // Generate transaction ID
    const transactionId = IdGenerator.generateTransactionId();

    // Deduct tokens
    this.mockPlayer.primal_token_balance -= amount;

    // Record transaction
    const transaction: PrimalTokenTransaction = {
      transaction_id: transactionId,
      amount,
      type: "deduction",
      purpose,
      timestamp: new Date(),
      modification_id: modificationId
    };

    this.mockPlayer.token_transaction_history.push(transaction);

    return {
      success: true,
      transaction_id: transactionId,
      new_balance: this.mockPlayer.primal_token_balance,
      message: `Successfully deducted ${amount} tokens. New balance: ${this.mockPlayer.primal_token_balance}`
    };
  }

  public getTokenCost(modificationType: keyof typeof PRIMAL_TOKEN_COSTS): number {
    return PRIMAL_TOKEN_COSTS[modificationType];
  }

  public getCurrentBalance(): number {
    return this.mockPlayer.primal_token_balance;
  }

  public getTransactionHistory(): PrimalTokenTransaction[] {
    return [...this.mockPlayer.token_transaction_history];
  }

  // For testing purposes - reset balance
  public resetBalance(newBalance: number = 1000): void {
    this.mockPlayer.primal_token_balance = newBalance;
    this.mockPlayer.token_transaction_history = [];
  }
}