/**
 * TypeScript interfaces for Payment Processing functionality
 * Consolidated payment types for Credit-Notice and Debit-Notice processing
 */

export interface CreditNoticeMessage {
  Action: 'Credit-Notice';
  Data: {
    sender: string;
    quantity: string;
    message: string;
  };
  Tags: {
    'X-Service-Type'?: string;
    'X-Request-ID'?: string;
    'X-Provider-ID'?: string;
    [key: string]: string | undefined;
  };
}

export interface DebitNoticeMessage {
  Action: 'Debit-Notice';
  Data: {
    recipient: string;
    quantity: string;
    message: string;
  };
  Tags: {
    'X-Service-Type'?: string;
    'X-Request-ID'?: string;
    'X-Provider-ID'?: string;
    [key: string]: string | undefined;
  };
}

export interface PaymentProcessingResult {
  success: boolean;
  transaction_id: string;
  amount: string;
  error_message?: string;
  refund_processed?: boolean;
  provider_amount?: string;
  marketplace_fee?: string;
}

export interface PaymentValidationResult {
  valid: boolean;
  error_message?: string;
  fraud_detected?: boolean;
  refund_required?: boolean;
}

export interface RefundRequest {
  original_transaction_id: string;
  refund_amount: string;
  reason: string;
  request_id: string;
}

export interface TransactionHistory {
  transaction_id: string;
  request_id: string;
  from_process: string;
  to_process: string;
  amount: string;
  service_type: string;
  success: boolean;
  timestamp: number;
  credit_notice_sent: boolean;
  debit_notice_sent: boolean;
  x_metadata: Record<string, string>;
}

export interface AuditTrailEntry {
  audit_id: string;
  timestamp: number;
  entry_type: string;
  data: Record<string, unknown>;
  system_snapshot: {
    active_requests: number;
    transaction_count: number;
    marketplace_balance: string;
  };
}

export interface TokenBalanceResult {
  success: boolean;
  balance: string;
  cached: boolean;
  error_message?: string;
}

export interface TokenTransferResult {
  success: boolean;
  transfer_id: string;
  error_message?: string;
}

export interface FinancialReconciliationReport {
  report_timestamp: number;
  total_payments_received: string;
  total_payments_distributed: string;
  total_marketplace_fees: string;
  total_refunds_processed: string;
  balance_check: {
    expected_balance: string;
    marketplace_treasury_balance: string;
    balance_matches: boolean;
  };
}

export interface BalanceIntegrityVerification {
  verification_timestamp: number;
  balance_integrity_valid: boolean;
  discrepancies: Array<{
    type: string;
    expected: string;
    recorded: string;
    difference: string;
  }>;
  total_discrepancy_amount: string;
}

export interface PaymentHealthStatus {
  success: boolean;
  status: string;
  timestamp: number;
  active_requests: number;
  transaction_count: number;
  marketplace_treasury: Record<string, unknown>;
  token_integration_status: Record<string, unknown>;
}

export interface CompletePaymentWorkflowResult {
  creditNoticeResult: PaymentProcessingResult;
  debitNoticeResult: PaymentProcessingResult;
  validationResult: PaymentValidationResult;
  success: boolean;
  error_message?: string;
}

export interface TokenAuthorizationResult {
  authorized: boolean;
  error_message?: string;
}

export interface PaymentHandlerConfig {
  processId: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}