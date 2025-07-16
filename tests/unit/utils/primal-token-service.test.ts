import { PrimalTokenService } from '../../../src/utils/primal-token-service';
import { PRIMAL_TOKEN_COSTS } from '../../../src/types/primal-token-types';

describe('PrimalTokenService', () => {
  let service: PrimalTokenService;

  beforeEach(() => {
    service = new PrimalTokenService();
    service.resetBalance(1000); // Start with 1000 tokens for each test
  });

  describe('validateTokenBalance', () => {
    it('should return valid true when sufficient balance', () => {
      const result = service.validateTokenBalance(500);

      expect(result.valid).toBe(true);
      expect(result.current_balance).toBe(1000);
      expect(result.required_amount).toBe(500);
      expect(result.message).toContain('Sufficient balance');
    });

    it('should return valid false when insufficient balance', () => {
      const result = service.validateTokenBalance(1500);

      expect(result.valid).toBe(false);
      expect(result.current_balance).toBe(1000);
      expect(result.required_amount).toBe(1500);
      expect(result.message).toContain('Insufficient balance');
    });

    it('should handle exact balance amounts', () => {
      const result = service.validateTokenBalance(1000);

      expect(result.valid).toBe(true);
      expect(result.current_balance).toBe(1000);
      expect(result.required_amount).toBe(1000);
    });

    it('should handle zero token requests', () => {
      const result = service.validateTokenBalance(0);

      expect(result.valid).toBe(true);
      expect(result.current_balance).toBe(1000);
      expect(result.required_amount).toBe(0);
    });
  });

  describe('deductTokens', () => {
    it('should successfully deduct tokens when sufficient balance', () => {
      const result = service.deductTokens(300, 'Test purchase');

      expect(result.success).toBe(true);
      expect(result.new_balance).toBe(700);
      expect(result.transaction_id).toMatch(/^tx_/);
      expect(result.message).toContain('Successfully deducted 300 tokens');
      expect(service.getCurrentBalance()).toBe(700);
    });

    it('should fail to deduct tokens when insufficient balance', () => {
      const result = service.deductTokens(1500, 'Expensive purchase');

      expect(result.success).toBe(false);
      expect(result.new_balance).toBe(1000); // Balance unchanged
      expect(result.transaction_id).toBe('');
      expect(result.message).toContain('Insufficient balance');
      expect(service.getCurrentBalance()).toBe(1000);
    });

    it('should record transaction in history on successful deduction', () => {
      const result = service.deductTokens(100, 'Food placement', 'mod_123');

      expect(result.success).toBe(true);

      const history = service.getTransactionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].transaction_id).toBe(result.transaction_id);
      expect(history[0].amount).toBe(100);
      expect(history[0].type).toBe('deduction');
      expect(history[0].purpose).toBe('Food placement');
      expect(history[0].modification_id).toBe('mod_123');
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should not record transaction in history on failed deduction', () => {
      const result = service.deductTokens(1500, 'Failed purchase');

      expect(result.success).toBe(false);

      const history = service.getTransactionHistory();
      expect(history).toHaveLength(0);
    });

    it('should handle exact balance deduction', () => {
      const result = service.deductTokens(1000, 'Full balance');

      expect(result.success).toBe(true);
      expect(result.new_balance).toBe(0);
      expect(service.getCurrentBalance()).toBe(0);
    });

    it('should generate unique transaction IDs', () => {
      service.resetBalance(500);
      const result1 = service.deductTokens(100, 'Purchase 1');
      const result2 = service.deductTokens(100, 'Purchase 2');

      expect(result1.transaction_id).not.toBe(result2.transaction_id);
      expect(result1.transaction_id).toMatch(/^tx_/);
      expect(result2.transaction_id).toMatch(/^tx_/);
    });
  });

  describe('getTokenCost', () => {
    it('should return correct costs for each modification type', () => {
      expect(service.getTokenCost('PLACE_FOOD')).toBe(10);
      expect(service.getTokenCost('MODIFY_WEATHER')).toBe(25);
      expect(service.getTokenCost('BUILD_SHELTER')).toBe(50);
    });

    it('should match constants defined in types', () => {
      expect(service.getTokenCost('PLACE_FOOD')).toBe(PRIMAL_TOKEN_COSTS.PLACE_FOOD);
      expect(service.getTokenCost('MODIFY_WEATHER')).toBe(PRIMAL_TOKEN_COSTS.MODIFY_WEATHER);
      expect(service.getTokenCost('BUILD_SHELTER')).toBe(PRIMAL_TOKEN_COSTS.BUILD_SHELTER);
    });
  });

  describe('getCurrentBalance', () => {
    it('should return current balance', () => {
      expect(service.getCurrentBalance()).toBe(1000);

      service.deductTokens(300, 'Test');
      expect(service.getCurrentBalance()).toBe(700);
    });

    it('should reflect balance changes accurately', () => {
      const initialBalance = service.getCurrentBalance();
      service.deductTokens(250, 'Test deduction');
      expect(service.getCurrentBalance()).toBe(initialBalance - 250);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return empty array for new service', () => {
      const history = service.getTransactionHistory();
      expect(history).toEqual([]);
    });

    it('should return copy of transaction history', () => {
      service.deductTokens(100, 'Test 1');
      service.deductTokens(200, 'Test 2');

      const history1 = service.getTransactionHistory();
      const history2 = service.getTransactionHistory();

      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(2);
      expect(history1).not.toBe(history2); // Should be different array instances
      expect(history1).toEqual(history2); // But with same content
    });

    it('should maintain transaction order', () => {
      service.deductTokens(100, 'First purchase');
      service.deductTokens(200, 'Second purchase');
      service.deductTokens(50, 'Third purchase');

      const history = service.getTransactionHistory();
      expect(history).toHaveLength(3);
      expect(history[0].purpose).toBe('First purchase');
      expect(history[1].purpose).toBe('Second purchase');
      expect(history[2].purpose).toBe('Third purchase');
    });

    it('should include all transaction details', () => {
      service.deductTokens(150, 'Detailed test', 'mod_456');

      const history = service.getTransactionHistory();
      const transaction = history[0];

      expect(transaction.amount).toBe(150);
      expect(transaction.type).toBe('deduction');
      expect(transaction.purpose).toBe('Detailed test');
      expect(transaction.modification_id).toBe('mod_456');
      expect(transaction.timestamp).toBeInstanceOf(Date);
      expect(transaction.transaction_id).toMatch(/^tx_/);
    });
  });

  describe('resetBalance', () => {
    it('should reset balance to specified amount', () => {
      service.deductTokens(300, 'Test');
      expect(service.getCurrentBalance()).toBe(700);

      service.resetBalance(500);
      expect(service.getCurrentBalance()).toBe(500);
    });

    it('should clear transaction history', () => {
      service.deductTokens(100, 'Test 1');
      service.deductTokens(200, 'Test 2');
      expect(service.getTransactionHistory()).toHaveLength(2);

      service.resetBalance(800);
      expect(service.getTransactionHistory()).toHaveLength(0);
    });

    it('should use default balance of 1000 when no amount specified', () => {
      service.deductTokens(500, 'Test');
      expect(service.getCurrentBalance()).toBe(500);

      service.resetBalance();
      expect(service.getCurrentBalance()).toBe(1000);
    });

    it('should handle zero balance reset', () => {
      service.resetBalance(0);
      expect(service.getCurrentBalance()).toBe(0);

      const result = service.validateTokenBalance(1);
      expect(result.valid).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple environmental modifications', () => {
      // Place food
      let result = service.deductTokens(service.getTokenCost('PLACE_FOOD'), 'Place berries');
      expect(result.success).toBe(true);
      expect(service.getCurrentBalance()).toBe(990);

      // Modify weather
      result = service.deductTokens(service.getTokenCost('MODIFY_WEATHER'), 'Make it rain');
      expect(result.success).toBe(true);
      expect(service.getCurrentBalance()).toBe(965);

      // Build shelter
      result = service.deductTokens(service.getTokenCost('BUILD_SHELTER'), 'Build cave');
      expect(result.success).toBe(true);
      expect(service.getCurrentBalance()).toBe(915);

      const history = service.getTransactionHistory();
      expect(history).toHaveLength(3);
      expect(history.reduce((sum, tx) => sum + tx.amount, 0)).toBe(85);
    });

    it('should prevent overspending', () => {
      service.resetBalance(75); // Enough for two modifications

      // First modification succeeds
      let result = service.deductTokens(service.getTokenCost('PLACE_FOOD'), 'Place food');
      expect(result.success).toBe(true);
      expect(service.getCurrentBalance()).toBe(65);

      // Second modification succeeds
      result = service.deductTokens(service.getTokenCost('MODIFY_WEATHER'), 'Weather change');
      expect(result.success).toBe(true);
      expect(service.getCurrentBalance()).toBe(40);

      // Third modification fails (insufficient funds)
      result = service.deductTokens(service.getTokenCost('BUILD_SHELTER'), 'Build shelter');
      expect(result.success).toBe(false);
      expect(service.getCurrentBalance()).toBe(40); // Balance unchanged

      const history = service.getTransactionHistory();
      expect(history).toHaveLength(2); // Only successful transactions recorded
    });
  });
});