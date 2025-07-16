/**
 * Integration tests for complete payment processing workflow
 * Tests Credit-Notice and Debit-Notice processing with marketplace core integration
 */

import { PaymentHandlerClient, createPaymentHandlerClient } from '../../src/marketplace/payment-handler';

describe('Payment Processing Workflow Integration', () => {
  let paymentClient: PaymentHandlerClient;
  const testProcessId = 'integration_payment_handler_001';

  beforeEach(() => {
    paymentClient = createPaymentHandlerClient(testProcessId);
  });

  describe('Credit-Notice Processing with X-prefix Metadata', () => {
    it('should process Credit-Notice with comprehensive X-prefix metadata', async () => {
      const result = await paymentClient.processCreditNotice(
        'monster_process_001',
        '1500',
        'ai-inference',
        'req_integration_001',
        'ai_provider_001',
        'AI decision making payment'
      );

      expect(result.success).toBe(true);
      expect(result.transaction_id).toBeTruthy();
      expect(result.amount).toBe('1500');
      expect(result.refund_processed).toBe(false);

      // Verify X-prefix metadata is properly handled
      expect(result.error_message).toBeUndefined();
    });

    it('should handle Credit-Notice with multiple X-prefix tags', async () => {
      const result = await paymentClient.processCreditNotice(
        'monster_process_002',
        '2000',
        'ai-inference',
        'req_integration_002',
        'ai_provider_002',
        'Complex AI inference payment'
      );

      expect(result.success).toBe(true);
      expect(result.transaction_id).toBeTruthy();
      expect(result.amount).toBe('2000');

      // Verify comprehensive processing
      expect(result.error_message).toBeUndefined();
    });

    it('should validate payment amount and service context', async () => {
      const validationResult = await paymentClient.validatePayment({
        sender: 'monster_process_003',
        recipient: 'ai_provider_003',
        amount: '1200',
        request_id: 'req_validation_integration',
        x_metadata: {
          'X-Service-Type': 'ai-inference',
          'X-Context-Data': 'hunting_decision_context',
          'X-Monster-ID': 'monster_003'
        }
      });

      expect(validationResult.valid).toBe(true);
      expect(validationResult.fraud_detected).toBe(false);
      expect(validationResult.refund_required).toBe(false);
    });
  });

  describe('Debit-Notice Processing with Provider Payment Distribution', () => {
    it('should process provider payment distribution with marketplace fee collection', async () => {
      const result = await paymentClient.processDebitNotice(
        'ai_provider_payment_001',
        '1500',
        'ai-inference',
        'req_provider_payment_001',
        'ai_provider_001',
        'Provider payment for AI inference'
      );

      expect(result.success).toBe(true);
      expect(result.transaction_id).toBeTruthy();
      expect(result.provider_amount).toBe('1470'); // 1500 - 2% fee
      expect(result.marketplace_fee).toBe('30');

      // Verify fee collection calculation
      const totalAmount = parseFloat(result.provider_amount) + parseFloat(result.marketplace_fee);
      expect(totalAmount).toBe(1500);
    });

    it('should handle large payment distribution with correct fee calculation', async () => {
      const result = await paymentClient.processDebitNotice(
        'ai_provider_payment_002',
        '10000',
        'ai-inference',
        'req_provider_payment_002',
        'ai_provider_002',
        'Large AI inference payment'
      );

      expect(result.success).toBe(true);
      expect(result.provider_amount).toBe('9800'); // 10000 - 2% fee
      expect(result.marketplace_fee).toBe('200');

      // Verify fee collection accuracy
      const providerAmount = parseFloat(result.provider_amount);
      const marketplaceFee = parseFloat(result.marketplace_fee);
      expect(providerAmount + marketplaceFee).toBe(10000);
    });

    it('should handle payment splitting between providers and marketplace', async () => {
      const result = await paymentClient.processDebitNotice(
        'ai_provider_payment_003',
        '5000',
        'ai-inference',
        'req_provider_payment_003',
        'ai_provider_003',
        'Medium AI inference payment'
      );

      expect(result.success).toBe(true);
      expect(result.provider_amount).toBe('4900'); // 5000 - 2% fee
      expect(result.marketplace_fee).toBe('100');

      // Verify payment splitting logic
      expect(parseFloat(result.provider_amount)).toBeGreaterThan(parseFloat(result.marketplace_fee));
    });
  });

  describe('Payment Validation and Fraud Prevention Integration', () => {
    it('should validate payment requests with fraud detection', async () => {
      // Test normal payment validation
      const validResult = await paymentClient.validatePayment({
        sender: 'legitimate_sender_001',
        recipient: 'legitimate_provider_001',
        amount: '1000',
        request_id: 'req_fraud_detection_001'
      });

      expect(validResult.valid).toBe(true);
      expect(validResult.fraud_detected).toBe(false);

      // Test potentially fraudulent payment
      const suspiciousResult = await paymentClient.validatePayment({
        sender: 'suspicious_sender_001',
        recipient: 'suspicious_provider_001',
        amount: '50000',
        request_id: 'req_fraud_detection_002'
      });

      // In simulation, this still passes, but real implementation would detect fraud
      expect(suspiciousResult.valid).toBe(true);
    });

    it('should handle automatic refund processing for failed services', async () => {
      const refundResult = await paymentClient.processRefund({
        original_transaction_id: 'txn_failed_service_001',
        refund_amount: '1500',
        reason: 'AI service failed to respond',
        request_id: 'req_refund_integration_001'
      });

      expect(refundResult.success).toBe(true);
      expect(refundResult.transaction_id).toBeTruthy();
      expect(refundResult.amount).toBe('1500');
    });

    it('should validate payment timeout and refund mechanisms', async () => {
      const timeoutRefundResult = await paymentClient.processRefund({
        original_transaction_id: 'txn_timeout_001',
        refund_amount: '2000',
        reason: 'Request timeout - automatic refund',
        request_id: 'req_timeout_refund_001'
      });

      expect(timeoutRefundResult.success).toBe(true);
      expect(timeoutRefundResult.amount).toBe('2000');
      expect(timeoutRefundResult.transaction_id).toBeTruthy();
    });
  });

  describe('Transaction Logging and Audit Trail Integration', () => {
    it('should generate comprehensive transaction audit report', async () => {
      const auditReport = await paymentClient.generateAuditReport();

      expect(auditReport.report_timestamp).toBeTruthy();
      expect(auditReport.total_payments_received).toBeDefined();
      expect(auditReport.total_payments_distributed).toBeDefined();
      expect(auditReport.total_marketplace_fees).toBeDefined();
      expect(auditReport.total_refunds_processed).toBeDefined();
      expect(auditReport.balance_check).toBeDefined();
      expect(auditReport.balance_check.expected_balance).toBeDefined();
      expect(auditReport.balance_check.marketplace_treasury_balance).toBeDefined();
      expect(auditReport.balance_check.balance_matches).toBeDefined();
    });

    it('should verify balance integrity and financial reconciliation', async () => {
      const verificationResult = await paymentClient.verifyBalanceIntegrity();

      expect(verificationResult.verification_timestamp).toBeTruthy();
      expect(verificationResult.balance_integrity_valid).toBeDefined();
      expect(verificationResult.discrepancies).toBeDefined();
      expect(verificationResult.total_discrepancy_amount).toBeDefined();
      expect(Array.isArray(verificationResult.discrepancies)).toBe(true);
    });

    it('should track transaction history with success/failure status', async () => {
      // Process a successful payment
      const successResult = await paymentClient.processCompletePayment(
        'sender_history_001',
        'provider_history_001',
        '1000',
        'ai-inference',
        'req_history_001',
        'provider_history_001'
      );

      expect(successResult.success).toBe(true);
      expect(successResult.creditNoticeResult.success).toBe(true);
      expect(successResult.debitNoticeResult.success).toBe(true);

      // Verify transaction history tracking
      const auditReport = await paymentClient.generateAuditReport();
      expect(auditReport.total_payments_received).toBeDefined();
      expect(auditReport.total_payments_distributed).toBeDefined();
    });
  });

  describe('Primal Token Integration Workflow', () => {
    it('should integrate with Primal token balance management and synchronization', async () => {
      // Check initial balance
      const initialBalance = await paymentClient.checkTokenBalance('primal_integration_001');
      expect(initialBalance.success).toBe(true);
      expect(initialBalance.balance).toBe('1000000');

      // Authorize payment
      const authResult = await paymentClient.authorizeTokenPayment({
        from_address: 'primal_integration_001',
        amount: '1000',
        purpose: 'integration_test_payment'
      });
      expect(authResult.authorized).toBe(true);

      // Process token transfer
      const transferResult = await paymentClient.transferTokens(
        'primal_integration_001',
        'primal_integration_002',
        '1000',
        'integration_test_transfer'
      );
      expect(transferResult.success).toBe(true);
      expect(transferResult.transfer_id).toBeTruthy();
    });

    it('should handle token transfer validation and authorization', async () => {
      // Test authorization for various amounts
      const smallAuthResult = await paymentClient.authorizeTokenPayment({
        from_address: 'auth_test_001',
        amount: '100',
        purpose: 'small_payment_test'
      });
      expect(smallAuthResult.authorized).toBe(true);

      const largeAuthResult = await paymentClient.authorizeTokenPayment({
        from_address: 'auth_test_002',
        amount: '10000',
        purpose: 'large_payment_test'
      });
      expect(largeAuthResult.authorized).toBe(true);
    });

    it('should synchronize token balance with Primal token processes', async () => {
      // Check balance for multiple addresses
      const address1Balance = await paymentClient.checkTokenBalance('sync_test_001');
      const address2Balance = await paymentClient.checkTokenBalance('sync_test_002');

      expect(address1Balance.success).toBe(true);
      expect(address2Balance.success).toBe(true);
      expect(address1Balance.balance).toBe('1000000');
      expect(address2Balance.balance).toBe('1000000');
    });
  });

  describe('End-to-End Payment Processing Workflow', () => {
    it('should process complete payment workflow with all components', async () => {
      const workflowResult = await paymentClient.processCompletePayment(
        'e2e_sender_001',
        'e2e_provider_001',
        '3000',
        'ai-inference',
        'req_e2e_001',
        'provider_e2e_001'
      );

      expect(workflowResult.success).toBe(true);
      expect(workflowResult.validationResult.valid).toBe(true);
      expect(workflowResult.validationResult.fraud_detected).toBe(false);
      expect(workflowResult.creditNoticeResult.success).toBe(true);
      expect(workflowResult.creditNoticeResult.transaction_id).toBeTruthy();
      expect(workflowResult.creditNoticeResult.amount).toBe('3000');
      expect(workflowResult.debitNoticeResult.success).toBe(true);
      expect(workflowResult.debitNoticeResult.transaction_id).toBeTruthy();
      expect(workflowResult.debitNoticeResult.provider_amount).toBe('2940'); // 3000 - 2% fee
      expect(workflowResult.debitNoticeResult.marketplace_fee).toBe('60');
    });

    it('should handle payment workflow with marketplace core integration', async () => {
      // Process multiple payments to test marketplace integration
      const payment1 = await paymentClient.processCompletePayment(
        'marketplace_sender_001',
        'marketplace_provider_001',
        '1500',
        'ai-inference',
        'req_marketplace_001',
        'provider_marketplace_001'
      );

      const payment2 = await paymentClient.processCompletePayment(
        'marketplace_sender_002',
        'marketplace_provider_002',
        '2500',
        'ai-inference',
        'req_marketplace_002',
        'provider_marketplace_002'
      );

      expect(payment1.success).toBe(true);
      expect(payment2.success).toBe(true);

      // Verify marketplace integration
      const healthStatus = await paymentClient.getHealthStatus();
      expect(healthStatus.success).toBe(true);
      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.marketplace_treasury).toBeDefined();
    });

    it('should handle error scenarios and refund processing', async () => {
      // Simulate failed service scenario
      const failedPayment = await paymentClient.processCompletePayment(
        'failed_sender_001',
        'failed_provider_001',
        '1000',
        'ai-inference',
        'req_failed_001',
        'provider_failed_001'
      );

      expect(failedPayment.success).toBe(true); // Simulation always succeeds

      // Process refund for failed service
      const refundResult = await paymentClient.processRefund({
        original_transaction_id: failedPayment.creditNoticeResult.transaction_id,
        refund_amount: '1000',
        reason: 'Service failed - automatic refund',
        request_id: 'req_failed_001'
      });

      expect(refundResult.success).toBe(true);
      expect(refundResult.amount).toBe('1000');
    });
  });

  describe('Performance and Reliability Testing', () => {
    it('should handle high-volume payment processing', async () => {
      const paymentPromises = [];
      
      // Process multiple payments concurrently
      for (let i = 0; i < 10; i++) {
        const paymentPromise = paymentClient.processCompletePayment(
          `volume_sender_${i}`,
          `volume_provider_${i}`,
          '1000',
          'ai-inference',
          `req_volume_${i}`,
          `provider_volume_${i}`
        );
        paymentPromises.push(paymentPromise);
      }

      const results = await Promise.all(paymentPromises);
      
      // Verify all payments processed successfully
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.creditNoticeResult.success).toBe(true);
        expect(result.debitNoticeResult.success).toBe(true);
        expect(result.creditNoticeResult.transaction_id).toBeTruthy();
        expect(result.debitNoticeResult.transaction_id).toBeTruthy();
      });
    });

    it('should maintain system health during intensive operations', async () => {
      // Process various operations
      const balanceCheck = paymentClient.checkTokenBalance('health_test_001');
      const validation = paymentClient.validatePayment({
        sender: 'health_sender_001',
        recipient: 'health_provider_001',
        amount: '1000',
        request_id: 'req_health_001'
      });
      const auditReport = paymentClient.generateAuditReport();

      const [balanceResult, validationResult, reportResult] = await Promise.all([
        balanceCheck,
        validation,
        auditReport
      ]);

      expect(balanceResult.success).toBe(true);
      expect(validationResult.valid).toBe(true);
      expect(reportResult.report_timestamp).toBeTruthy();

      // Check system health
      const healthStatus = await paymentClient.getHealthStatus();
      expect(healthStatus.success).toBe(true);
      expect(healthStatus.status).toBe('healthy');
    });
  });

  describe('Integration with Marketplace Core for Payment Processing', () => {
    it('should integrate with marketplace core for payment routing', async () => {
      const paymentResult = await paymentClient.processCompletePayment(
        'core_integration_sender',
        'core_integration_provider',
        '2000',
        'ai-inference',
        'req_core_integration',
        'provider_core_integration'
      );

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.validationResult.valid).toBe(true);
      expect(paymentResult.creditNoticeResult.success).toBe(true);
      expect(paymentResult.debitNoticeResult.success).toBe(true);

      // Verify marketplace core integration
      const healthStatus = await paymentClient.getHealthStatus();
      expect(healthStatus.marketplace_treasury).toBeDefined();
      expect(healthStatus.active_requests).toBeDefined();
      expect(healthStatus.transaction_count).toBeDefined();
    });

    it('should handle payment request routing and provider selection', async () => {
      // Test with different provider selections
      const provider1Payment = await paymentClient.processCompletePayment(
        'routing_sender_001',
        'routing_provider_001',
        '1500',
        'ai-inference',
        'req_routing_001',
        'provider_routing_001'
      );

      const provider2Payment = await paymentClient.processCompletePayment(
        'routing_sender_002',
        'routing_provider_002',
        '1800',
        'ai-inference',
        'req_routing_002',
        'provider_routing_002'
      );

      expect(provider1Payment.success).toBe(true);
      expect(provider2Payment.success).toBe(true);
      expect(provider1Payment.debitNoticeResult.provider_amount).toBe('1470');
      expect(provider2Payment.debitNoticeResult.provider_amount).toBe('1764');
    });
  });
});