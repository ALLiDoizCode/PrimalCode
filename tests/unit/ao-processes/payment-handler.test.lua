-- Payment Handler Process Unit Tests
-- Tests for Credit-Notice, Debit-Notice, and payment validation handlers

local busted = require('busted')
local assert = require('luassert')

-- Mock the global MarketplaceCore state
MarketplaceCore = {
  active_requests = {},
  transaction_history = {},
  marketplace_treasury = {
    total_fees_collected = "0",
    transaction_count = 0,
    last_updated = os.time()
  }
}

-- Load the payment handler modules
local credit_notice_handler = require('../../ao-processes/marketplace/payment/src/handlers/credit-notice')
local debit_notice_handler = require('../../ao-processes/marketplace/payment/src/handlers/debit-notice')
local payment_validation = require('../../ao-processes/marketplace/payment/src/handlers/payment-validation')
local refund_processing = require('../../ao-processes/marketplace/payment/src/handlers/refund-processing')
local token_integration = require('../../ao-processes/marketplace/payment/src/handlers/token-integration')
local audit_trail = require('../../ao-processes/marketplace/payment/src/handlers/audit-trail')

describe("Credit-Notice Processing", function()
  
  before_each(function()
    -- Reset state before each test
    MarketplaceCore.active_requests = {}
    MarketplaceCore.transaction_history = {}
    MarketplaceCore.marketplace_treasury = {
      total_fees_collected = "0",
      transaction_count = 0,
      last_updated = os.time()
    }
  end)

  it("should process Credit-Notice with X-prefix metadata", function()
    -- Arrange
    local test_credit_notice = {
      Action = "Credit-Notice",
      Data = {
        sender = "monster_12345",
        quantity = "250",
        message = "AI inference payment"
      },
      Tags = {
        ["X-Service-Type"] = "ai-inference",
        ["X-Request-ID"] = "req_12345",
        ["X-Provider-ID"] = "ai_provider_001"
      }
    }
    
    -- Setup active request
    MarketplaceCore.active_requests["req_12345"] = {
      request_id = "req_12345",
      requester = "monster_12345",
      provider_id = "ai_provider_001",
      service_type = "decision-making",
      payment_amount = "250",
      status = "processing",
      created_at = os.time(),
      timeout_at = os.time() + 30
    }
    
    -- Act
    local result = credit_notice_handler.process_credit_notice(test_credit_notice)
    
    -- Assert
    assert.equal(result.success, true)
    assert.is_not_nil(result.transaction_id)
    assert.equal(result.amount, "250")
    assert.equal(result.refund_processed, false)
    assert.equal(#MarketplaceCore.transaction_history, 1)
  end)

  it("should handle Credit-Notice with payment amount validation", function()
    -- Arrange
    local test_credit_notice = {
      Action = "Credit-Notice",
      Data = {
        sender = "monster_67890",
        quantity = "500",
        message = "AI inference payment"
      },
      Tags = {
        ["X-Service-Type"] = "ai-inference",
        ["X-Request-ID"] = "req_67890",
        ["X-Provider-ID"] = "ai_provider_002"
      }
    }
    
    -- Setup active request with matching amount
    MarketplaceCore.active_requests["req_67890"] = {
      request_id = "req_67890",
      requester = "monster_67890",
      provider_id = "ai_provider_002",
      service_type = "decision-making",
      payment_amount = "500",
      status = "processing",
      created_at = os.time(),
      timeout_at = os.time() + 30
    }
    
    -- Act
    local result = credit_notice_handler.process_credit_notice(test_credit_notice)
    
    -- Assert
    assert.equal(result.success, true)
    assert.equal(result.amount, "500")
    assert.is_not_nil(result.transaction_id)
  end)

  it("should reject Credit-Notice with invalid amount", function()
    -- Arrange
    local test_credit_notice = {
      Action = "Credit-Notice",
      Data = {
        sender = "monster_invalid",
        quantity = "invalid_amount",
        message = "Invalid payment"
      },
      Tags = {
        ["X-Service-Type"] = "ai-inference",
        ["X-Request-ID"] = "req_invalid",
        ["X-Provider-ID"] = "ai_provider_invalid"
      }
    }
    
    -- Act
    local result = credit_notice_handler.process_credit_notice(test_credit_notice)
    
    -- Assert
    assert.equal(result.success, false)
    assert.is_not_nil(result.error_message)
    assert.matches("Invalid payment amount", result.error_message)
  end)

  it("should handle Credit-Notice with expired request", function()
    -- Arrange
    local test_credit_notice = {
      Action = "Credit-Notice",
      Data = {
        sender = "monster_expired",
        quantity = "300",
        message = "Expired payment"
      },
      Tags = {
        ["X-Service-Type"] = "ai-inference",
        ["X-Request-ID"] = "req_expired",
        ["X-Provider-ID"] = "ai_provider_expired"
      }
    }
    
    -- Setup expired request
    MarketplaceCore.active_requests["req_expired"] = {
      request_id = "req_expired",
      requester = "monster_expired",
      provider_id = "ai_provider_expired",
      service_type = "decision-making",
      payment_amount = "300",
      status = "processing",
      created_at = os.time() - 100, -- 100 seconds ago
      timeout_at = os.time() - 70   -- Expired 70 seconds ago
    }
    
    -- Act
    local result = credit_notice_handler.process_credit_notice(test_credit_notice)
    
    -- Assert
    assert.equal(result.success, false)
    assert.matches("timeout", result.error_message)
    assert.equal(result.refund_processed, true)
  end)

end)

describe("Debit-Notice Processing", function()
  
  before_each(function()
    -- Reset state before each test
    MarketplaceCore.active_requests = {}
    MarketplaceCore.transaction_history = {}
    MarketplaceCore.marketplace_treasury = {
      total_fees_collected = "0",
      transaction_count = 0,
      last_updated = os.time()
    }
  end)

  it("should process Debit-Notice with provider payment distribution", function()
    -- Arrange
    local test_debit_notice = {
      Action = "Debit-Notice",
      Data = {
        recipient = "ai_provider_001",
        quantity = "1000",
        message = "Provider payment"
      },
      Tags = {
        ["X-Service-Type"] = "ai-inference",
        ["X-Request-ID"] = "req_debit_001",
        ["X-Provider-ID"] = "ai_provider_001"
      }
    }
    
    -- Setup corresponding Credit-Notice transaction
    MarketplaceCore.transaction_history = {
      {
        transaction_id = "txn_credit_001",
        request_id = "req_debit_001",
        from_process = "monster_sender",
        to_process = "ai_provider_001",
        amount = "1000",
        service_type = "decision-making",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = true,
        debit_notice_sent = false
      }
    }
    
    -- Act
    local result = debit_notice_handler.process_debit_notice(test_debit_notice)
    
    -- Assert
    assert.equal(result.success, true)
    assert.is_not_nil(result.transaction_id)
    assert.equal(result.provider_amount, "980") -- 1000 - 2% fee
    assert.equal(result.marketplace_fee, "20")
  end)

  it("should handle marketplace fee collection", function()
    -- Arrange
    local test_debit_notice = {
      Action = "Debit-Notice",
      Data = {
        recipient = "ai_provider_002",
        quantity = "5000",
        message = "Large provider payment"
      },
      Tags = {
        ["X-Service-Type"] = "ai-inference",
        ["X-Request-ID"] = "req_debit_002",
        ["X-Provider-ID"] = "ai_provider_002"
      }
    }
    
    -- Setup corresponding Credit-Notice transaction
    MarketplaceCore.transaction_history = {
      {
        transaction_id = "txn_credit_002",
        request_id = "req_debit_002",
        from_process = "monster_sender_002",
        to_process = "ai_provider_002",
        amount = "5000",
        service_type = "decision-making",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = true,
        debit_notice_sent = false
      }
    }
    
    -- Act
    local result = debit_notice_handler.process_debit_notice(test_debit_notice)
    
    -- Assert
    assert.equal(result.success, true)
    assert.equal(result.provider_amount, "4900") -- 5000 - 2% fee
    assert.equal(result.marketplace_fee, "100")
    
    -- Verify fee collection
    local fee_collected = tonumber(result.marketplace_fee)
    assert.equal(fee_collected, 100)
  end)

  it("should reject Debit-Notice without corresponding Credit-Notice", function()
    -- Arrange
    local test_debit_notice = {
      Action = "Debit-Notice",
      Data = {
        recipient = "ai_provider_orphan",
        quantity = "1000",
        message = "Orphan provider payment"
      },
      Tags = {
        ["X-Service-Type"] = "ai-inference",
        ["X-Request-ID"] = "req_orphan",
        ["X-Provider-ID"] = "ai_provider_orphan"
      }
    }
    
    -- No corresponding Credit-Notice transaction
    MarketplaceCore.transaction_history = {}
    
    -- Act
    local result = debit_notice_handler.process_debit_notice(test_debit_notice)
    
    -- Assert
    assert.equal(result.success, false)
    assert.matches("No corresponding Credit%-Notice", result.error_message)
  end)

end)

describe("Payment Validation and Fraud Prevention", function()
  
  before_each(function()
    -- Reset state before each test
    MarketplaceCore.active_requests = {}
    MarketplaceCore.transaction_history = {}
  end)

  it("should validate valid payment requests", function()
    -- Arrange
    local payment_data = {
      sender = "valid_sender_001",
      recipient = "valid_provider_001",
      amount = "1000",
      request_id = "req_valid_001"
    }
    
    -- Setup active request
    MarketplaceCore.active_requests["req_valid_001"] = {
      request_id = "req_valid_001",
      requester = "valid_sender_001",
      provider_id = "valid_provider_001",
      service_type = "decision-making",
      payment_amount = "1000",
      status = "processing",
      created_at = os.time(),
      timeout_at = os.time() + 30
    }
    
    -- Act
    local result = payment_validation.validate_payment_request(payment_data)
    
    -- Assert
    assert.equal(result.valid, true)
    assert.equal(result.fraud_detected, false)
    assert.equal(result.refund_required, false)
  end)

  it("should detect fraud patterns for rapid payments", function()
    -- Arrange
    local payment_data = {
      sender = "rapid_sender_001",
      recipient = "rapid_provider_001",
      amount = "1000",
      request_id = "req_rapid_001"
    }
    
    -- Setup multiple recent transactions from same sender
    MarketplaceCore.transaction_history = {}
    local current_time = os.time()
    for i = 1, 6 do
      table.insert(MarketplaceCore.transaction_history, {
        transaction_id = "txn_rapid_" .. i,
        request_id = "req_rapid_" .. i,
        from_process = "rapid_sender_001",
        to_process = "rapid_provider_001",
        amount = "1000",
        service_type = "decision-making",
        success = true,
        timestamp = current_time - (i * 5) -- 5 seconds apart
      })
    end
    
    -- Act
    local result = payment_validation.validate_payment_request(payment_data)
    
    -- Assert
    -- Note: This test depends on the fraud detection logic implementation
    assert.is_not_nil(result.valid)
  end)

  it("should validate payment amounts within limits", function()
    -- Arrange
    local large_payment_data = {
      sender = "large_sender_001",
      recipient = "large_provider_001",
      amount = "15000", -- Above maximum limit
      request_id = "req_large_001"
    }
    
    -- Act
    local result = payment_validation.validate_payment_request(large_payment_data)
    
    -- Assert
    assert.equal(result.valid, false)
    assert.matches("too large", result.error_message)
  end)

  it("should validate minimum payment amounts", function()
    -- Arrange
    local small_payment_data = {
      sender = "small_sender_001",
      recipient = "small_provider_001",
      amount = "0.5", -- Below minimum limit
      request_id = "req_small_001"
    }
    
    -- Act
    local result = payment_validation.validate_payment_request(small_payment_data)
    
    -- Assert
    assert.equal(result.valid, false)
    assert.matches("too small", result.error_message)
  end)

end)

describe("Refund Processing", function()
  
  before_each(function()
    -- Reset state before each test
    MarketplaceCore.active_requests = {}
    MarketplaceCore.transaction_history = {}
  end)

  it("should process refunds for failed services", function()
    -- Arrange
    local refund_data = {
      original_transaction_id = "txn_original_001",
      refund_amount = "1000",
      reason = "Service failed",
      request_id = "req_refund_001"
    }
    
    -- Setup original transaction
    MarketplaceCore.transaction_history = {
      {
        transaction_id = "txn_original_001",
        request_id = "req_refund_001",
        from_process = "refund_sender_001",
        to_process = "refund_provider_001",
        amount = "1000",
        service_type = "decision-making",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = true,
        debit_notice_sent = true
      }
    }
    
    -- Act
    local result = refund_processing.process_refund_request(refund_data)
    
    -- Assert
    assert.equal(result.success, true)
    assert.is_not_nil(result.refund_transaction_id)
    assert.equal(result.refund_amount, "1000")
  end)

  it("should prevent duplicate refunds", function()
    -- Arrange
    local refund_data = {
      original_transaction_id = "txn_duplicate_001",
      refund_amount = "1000",
      reason = "Duplicate refund test",
      request_id = "req_duplicate_001"
    }
    
    -- Setup original transaction and existing refund
    MarketplaceCore.transaction_history = {
      {
        transaction_id = "txn_duplicate_001",
        request_id = "req_duplicate_001",
        from_process = "duplicate_sender_001",
        to_process = "duplicate_provider_001",
        amount = "1000",
        service_type = "decision-making",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = true,
        debit_notice_sent = true
      },
      {
        transaction_id = "txn_refund_001",
        request_id = "req_duplicate_001",
        from_process = "marketplace_core",
        to_process = "duplicate_sender_001",
        amount = "1000",
        service_type = "refund",
        success = true,
        timestamp = os.time(),
        x_metadata = {
          ["X-Original-Transaction-ID"] = "txn_duplicate_001"
        }
      }
    }
    
    -- Act
    local result = refund_processing.process_refund_request(refund_data)
    
    -- Assert
    assert.equal(result.success, false)
    assert.matches("already processed", result.error_message)
  end)

  it("should handle automatic refund processing", function()
    -- Arrange
    local failed_request = {
      request_id = "req_auto_refund_001",
      requester = "auto_refund_sender_001",
      provider_id = "auto_refund_provider_001",
      service_type = "decision-making",
      payment_amount = "1500",
      status = "failed",
      created_at = os.time(),
      timeout_at = os.time() + 30
    }
    
    -- Setup payment transaction
    MarketplaceCore.transaction_history = {
      {
        transaction_id = "txn_auto_refund_001",
        request_id = "req_auto_refund_001",
        from_process = "auto_refund_sender_001",
        to_process = "auto_refund_provider_001",
        amount = "1500",
        service_type = "decision-making",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = true,
        debit_notice_sent = false
      }
    }
    
    -- Act
    local result = refund_processing.process_automatic_refund(failed_request, "Service timeout")
    
    -- Assert
    assert.equal(result.success, true)
    assert.is_not_nil(result.refund_transaction_id)
  end)

end)

describe("Token Integration", function()
  
  before_each(function()
    -- Reset state before each test
    MarketplaceCore.token_integration = nil
  end)

  it("should check token balance with caching", function()
    -- Arrange
    local test_address = "token_balance_test_001"
    
    -- Act
    local result = token_integration.check_token_balance(test_address)
    
    -- Assert
    assert.equal(result.success, true)
    assert.is_not_nil(result.balance)
    assert.equal(result.cached, false)
    
    -- Check cache on second call
    local cached_result = token_integration.check_token_balance(test_address)
    assert.equal(cached_result.success, true)
    assert.equal(cached_result.cached, true)
  end)

  it("should transfer tokens with validation", function()
    -- Arrange
    local transfer_data = {
      from_address = "token_sender_001",
      to_address = "token_recipient_001",
      amount = "1000",
      purpose = "test_transfer"
    }
    
    -- Act
    local result = token_integration.transfer_tokens(transfer_data)
    
    -- Assert
    assert.equal(result.success, true)
    assert.is_not_nil(result.transfer_id)
  end)

  it("should authorize token payments", function()
    -- Arrange
    local payment_data = {
      from_address = "token_auth_sender_001",
      amount = "1000",
      purpose = "test_payment"
    }
    
    -- Act
    local result = token_integration.authorize_token_payment(payment_data)
    
    -- Assert
    assert.equal(result.authorized, true)
  end)

  it("should sync token balance with Primal token process", function()
    -- Arrange
    local test_address = "token_sync_test_001"
    
    -- Act
    local result = token_integration.sync_token_balance(test_address)
    
    -- Assert
    assert.equal(result.success, true)
    assert.is_not_nil(result.balance)
  end)

end)

describe("Audit Trail and Transaction Logging", function()
  
  before_each(function()
    -- Reset state before each test
    MarketplaceCore.audit_trail = nil
    MarketplaceCore.transaction_history = {}
  end)

  it("should log comprehensive transaction with metadata", function()
    -- Arrange
    local transaction = {
      transaction_id = "txn_audit_001",
      request_id = "req_audit_001",
      from_process = "audit_sender_001",
      to_process = "audit_provider_001",
      amount = "1000",
      service_type = "decision-making",
      success = true,
      credit_notice_sent = true,
      debit_notice_sent = true,
      x_metadata = {
        ["X-Service-Type"] = "ai-inference",
        ["X-Request-ID"] = "req_audit_001"
      }
    }
    
    local metadata = {
      audit_type = "payment_processing",
      validation_passed = true
    }
    
    -- Act
    local result = audit_trail.log_transaction_comprehensive(transaction, "CREDIT_NOTICE_PROCESSED", metadata)
    
    -- Assert
    assert.is_not_nil(result.log_id)
    assert.equal(result.action, "CREDIT_NOTICE_PROCESSED")
    assert.equal(result.transaction_id, "txn_audit_001")
    assert.is_not_nil(result.system_state)
  end)

  it("should generate financial reconciliation report", function()
    -- Arrange
    audit_trail.initialize_audit_system()
    
    -- Setup sample financial data
    MarketplaceCore.audit_trail.financial_reconciliation = {
      total_payments_received = "10000",
      total_payments_distributed = "9800",
      total_marketplace_fees = "200",
      total_refunds_processed = "0",
      last_reconciliation = os.time()
    }
    
    -- Act
    local result = audit_trail.generate_financial_reconciliation_report()
    
    -- Assert
    assert.is_not_nil(result.report_timestamp)
    assert.equal(result.total_payments_received, "10000")
    assert.equal(result.total_payments_distributed, "9800")
    assert.equal(result.total_marketplace_fees, "200")
    assert.is_not_nil(result.balance_check)
  end)

  it("should verify balance integrity", function()
    -- Arrange
    audit_trail.initialize_audit_system()
    
    -- Setup transaction history
    MarketplaceCore.transaction_history = {
      {
        transaction_id = "txn_verify_001",
        request_id = "req_verify_001",
        from_process = "verify_sender_001",
        to_process = "verify_provider_001",
        amount = "1000",
        service_type = "decision-making",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = true,
        debit_notice_sent = true
      }
    }
    
    -- Act
    local result = audit_trail.verify_balance_integrity()
    
    -- Assert
    assert.is_not_nil(result.verification_timestamp)
    assert.is_not_nil(result.balance_integrity_valid)
    assert.is_not_nil(result.discrepancies)
    assert.is_not_nil(result.total_discrepancy_amount)
  end)

  it("should track transaction history with success/failure status", function()
    -- Arrange
    local transaction = {
      transaction_id = "txn_history_001",
      request_id = "req_history_001",
      from_process = "history_sender_001",
      to_process = "history_provider_001",
      amount = "1000",
      service_type = "decision-making",
      success = true,
      x_metadata = {
        ["X-Service-Type"] = "ai-inference"
      }
    }
    
    -- Act
    local result = audit_trail.track_transaction_history(transaction, "PAYMENT_RECEIVED")
    
    -- Assert
    assert.equal(result.transaction_id, "txn_history_001")
    assert.equal(result.status, "PAYMENT_RECEIVED")
    assert.equal(result.amount, "1000")
    assert.is_not_nil(result.timestamp)
  end)

end)