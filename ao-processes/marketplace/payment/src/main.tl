-- Main payment handler process for Credit-Notice and Debit-Notice processing
local json = require("./utils/json")
local credit_notice_handler = require("./handlers/credit-notice")
local debit_notice_handler = require("./handlers/debit-notice")
local payment_validation = require("./handlers/payment-validation")
local refund_processing = require("./handlers/refund-processing")
local token_integration = require("./handlers/token-integration")
local audit_trail = require("./handlers/audit-trail")

-- Global state for marketplace core
MarketplaceCore = MarketplaceCore or {
  active_requests = {},
  transaction_history = {},
  marketplace_treasury = {
    total_fees_collected = "0",
    transaction_count = 0,
    last_updated = os.time()
  }
}

-- Message handler routing
local Handlers = {
  ["Credit-Notice"] = function(msg)
    local result = credit_notice_handler.process_credit_notice(msg)
    -- Log audit trail
    audit_trail.create_audit_entry("CREDIT_NOTICE_PROCESSED", {
      sender = msg.Data.sender,
      amount = msg.Data.quantity,
      request_id = msg.Tags["X-Request-ID"],
      success = result.success,
      transaction_id = result.transaction_id
    })
    return result
  end,
  
  ["Debit-Notice"] = function(msg)
    local result = debit_notice_handler.process_debit_notice(msg)
    -- Log audit trail
    audit_trail.create_audit_entry("DEBIT_NOTICE_PROCESSED", {
      recipient = msg.Data.recipient,
      amount = msg.Data.quantity,
      request_id = msg.Tags["X-Request-ID"],
      success = result.success,
      transaction_id = result.transaction_id
    })
    return result
  end,
  
  ["Credit-Notice-Response"] = function(msg)
    return credit_notice_handler.handle_credit_notice_response(msg)
  end,
  
  ["Debit-Notice-Confirmation"] = function(msg)
    return debit_notice_handler.handle_debit_notice_confirmation(msg)
  end,
  
  ["Refund-Request"] = function(msg)
    local refund_data = msg.Data or {}
    local result = refund_processing.process_refund_request(refund_data)
    -- Log audit trail
    audit_trail.create_audit_entry("REFUND_PROCESSED", {
      original_transaction_id = refund_data.original_transaction_id,
      refund_amount = refund_data.refund_amount,
      reason = refund_data.reason,
      success = result.success
    })
    return result
  end,
  
  ["Payment-Validation"] = function(msg)
    local payment_data = msg.Data or {}
    local result = payment_validation.validate_payment_request(payment_data)
    -- Log validation failures
    if not result.valid then
      audit_trail.create_audit_entry("PAYMENT_VALIDATION_FAILED", {
        sender = payment_data.sender,
        amount = payment_data.amount,
        failure_reason = result.error_message,
        fraud_detected = result.fraud_detected
      })
    end
    return result
  end,
  
  ["Refund-Timeout"] = function(msg)
    local request_id = msg.Data.request_id or ""
    return refund_processing.handle_refund_timeout(request_id)
  end,
  
  ["Payment-Report"] = function(msg)
    local time_range = msg.Data.time_range or {}
    return refund_processing.generate_refund_report(time_range)
  end,
  
  ["Marketplace-Fee-Collection"] = function(msg)
    local fee_amount = msg.Data.fee_amount or ""
    local request_id = msg.Data.request_id or ""
    return debit_notice_handler.collect_marketplace_fee(fee_amount, request_id)
  end,
  
  ["Token-Integration"] = function(msg)
    local action = msg.Data.action or ""
    local data = msg.Data.data or {}
    return token_integration.integrate_with_primal_token(action, data)
  end,
  
  ["Token-Balance-Check"] = function(msg)
    local address = msg.Data.address or ""
    return token_integration.check_token_balance(address)
  end,
  
  ["Token-Transfer"] = function(msg)
    local transfer_data = msg.Data or {}
    return token_integration.transfer_tokens(transfer_data)
  end,
  
  ["Token-Authorization"] = function(msg)
    local payment_data = msg.Data or {}
    return token_integration.authorize_token_payment(payment_data)
  end,
  
  ["Audit-Report"] = function(msg)
    return audit_trail.generate_financial_reconciliation_report()
  end,
  
  ["Balance-Verification"] = function(msg)
    return audit_trail.verify_balance_integrity()
  end,
  
  ["Analytics-Report"] = function(msg)
    return audit_trail.generate_transaction_analytics_report()
  end,
  
  ["Health-Check"] = function(msg)
    return {
      success = true,
      status = "healthy",
      timestamp = os.time(),
      active_requests = table.maxn(MarketplaceCore.active_requests or {}),
      transaction_count = table.maxn(MarketplaceCore.transaction_history or {}),
      marketplace_treasury = MarketplaceCore.marketplace_treasury,
      token_integration_status = token_integration.get_integration_status()
    }
  end
}

-- Main message processing function
function handle_message(msg)
  local action = msg.Action
  
  -- Log incoming message
  print("PAYMENT_HANDLER: Received message - Action: " .. (action or "unknown"))
  
  -- Route to appropriate handler
  local handler = Handlers[action]
  if handler then
    local success, result = pcall(handler, msg)
    if success then
      print("PAYMENT_HANDLER: Message processed successfully - Action: " .. action)
      return result
    else
      print("PAYMENT_HANDLER: Error processing message - Action: " .. action .. ", Error: " .. tostring(result))
      return {
        success = false,
        error_message = "Payment handler error: " .. tostring(result),
        action = action
      }
    end
  else
    print("PAYMENT_HANDLER: Unknown action - " .. (action or "nil"))
    return {
      success = false,
      error_message = "Unknown action: " .. (action or "nil"),
      supported_actions = {
        "Credit-Notice",
        "Debit-Notice", 
        "Credit-Notice-Response",
        "Debit-Notice-Confirmation",
        "Refund-Request",
        "Payment-Validation",
        "Refund-Timeout",
        "Payment-Report",
        "Marketplace-Fee-Collection",
        "Health-Check"
      }
    }
  end
end

-- Initialize payment handler
function initialize_payment_handler()
  print("PAYMENT_HANDLER: Initializing payment handler process")
  
  -- Initialize state if needed
  if not MarketplaceCore.active_requests then
    MarketplaceCore.active_requests = {}
  end
  
  if not MarketplaceCore.transaction_history then
    MarketplaceCore.transaction_history = {}
  end
  
  if not MarketplaceCore.marketplace_treasury then
    MarketplaceCore.marketplace_treasury = {
      total_fees_collected = "0",
      transaction_count = 0,
      last_updated = os.time()
    }
  end
  
  -- Initialize token integration
  token_integration.initialize_token_integration()
  
  -- Initialize audit trail
  audit_trail.initialize_audit_system()
  
  print("PAYMENT_HANDLER: Payment handler initialized successfully")
  print("PAYMENT_HANDLER: Token integration initialized")
  print("PAYMENT_HANDLER: Audit trail system initialized")
end

-- Auto-initialize on load
initialize_payment_handler()

-- Export for testing
return {
  handle_message = handle_message,
  initialize_payment_handler = initialize_payment_handler,
  Handlers = Handlers
}