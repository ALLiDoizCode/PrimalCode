-- Audit trail and transaction logging handler
local json = require("../utils/json")
local token_utils = require("../utils/token-utils")

local audit_trail = {}

-- Initialize audit trail storage
function audit_trail.initialize_audit_system()
  if not MarketplaceCore.audit_trail then
    MarketplaceCore.audit_trail = {
      transaction_logs = {},
      audit_entries = {},
      financial_reconciliation = {
        total_payments_received = "0",
        total_payments_distributed = "0",
        total_marketplace_fees = "0",
        total_refunds_processed = "0",
        last_reconciliation = os.time()
      },
      analytics = {
        daily_transaction_count = 0,
        weekly_transaction_count = 0,
        monthly_transaction_count = 0,
        last_analytics_update = os.time()
      }
    }
  end
end

-- Log comprehensive transaction with metadata preservation
function audit_trail.log_transaction_comprehensive(transaction: {string: any}, action: string, metadata: {string: any})
  audit_trail.initialize_audit_system()
  
  local comprehensive_log = {
    log_id = token_utils.generate_transaction_id(),
    timestamp = os.time(),
    action = action,
    transaction_id = transaction.transaction_id,
    request_id = transaction.request_id,
    from_process = transaction.from_process,
    to_process = transaction.to_process,
    amount = transaction.amount,
    service_type = transaction.service_type,
    success = transaction.success,
    credit_notice_sent = transaction.credit_notice_sent,
    debit_notice_sent = transaction.debit_notice_sent,
    x_metadata = transaction.x_metadata or {},
    additional_metadata = metadata or {},
    system_state = {
      active_requests_count = table.maxn(MarketplaceCore.active_requests or {}),
      transaction_history_count = table.maxn(MarketplaceCore.transaction_history or {}),
      marketplace_treasury_balance = MarketplaceCore.marketplace_treasury and MarketplaceCore.marketplace_treasury.total_fees_collected or "0"
    }
  }
  
  -- Store in audit trail
  table.insert(MarketplaceCore.audit_trail.transaction_logs, comprehensive_log)
  
  -- Update analytics
  audit_trail.update_transaction_analytics(comprehensive_log)
  
  -- Log to console for immediate visibility
  print("AUDIT_TRAIL: " .. json.encode(comprehensive_log))
  
  return comprehensive_log
end

-- Create audit entry for Credit-Notice and Debit-Notice processing
function audit_trail.create_audit_entry(entry_type: string, data: {string: any}): {string: any}
  audit_trail.initialize_audit_system()
  
  local audit_entry = {
    audit_id = token_utils.generate_transaction_id(),
    timestamp = os.time(),
    entry_type = entry_type,
    data = data,
    system_snapshot = {
      active_requests = table.maxn(MarketplaceCore.active_requests or {}),
      transaction_count = table.maxn(MarketplaceCore.transaction_history or {}),
      marketplace_balance = MarketplaceCore.marketplace_treasury and MarketplaceCore.marketplace_treasury.total_fees_collected or "0"
    }
  }
  
  table.insert(MarketplaceCore.audit_trail.audit_entries, audit_entry)
  
  -- Log specific audit events
  if entry_type == "CREDIT_NOTICE_PROCESSED" then
    audit_trail.log_credit_notice_audit(data)
  elseif entry_type == "DEBIT_NOTICE_PROCESSED" then
    audit_trail.log_debit_notice_audit(data)
  elseif entry_type == "PAYMENT_VALIDATION_FAILED" then
    audit_trail.log_validation_failure_audit(data)
  elseif entry_type == "REFUND_PROCESSED" then
    audit_trail.log_refund_audit(data)
  elseif entry_type == "FRAUD_DETECTED" then
    audit_trail.log_fraud_detection_audit(data)
  end
  
  return audit_entry
end

-- Log Credit-Notice processing audit
function audit_trail.log_credit_notice_audit(data: {string: any})
  local credit_audit = {
    sender = data.sender,
    recipient = data.recipient,
    amount = data.amount,
    request_id = data.request_id,
    transaction_id = data.transaction_id,
    x_metadata = data.x_metadata,
    validation_result = data.validation_result,
    processing_time = data.processing_time,
    success = data.success
  }
  
  print("CREDIT_NOTICE_AUDIT: " .. json.encode(credit_audit))
end

-- Log Debit-Notice processing audit
function audit_trail.log_debit_notice_audit(data: {string: any})
  local debit_audit = {
    provider_id = data.provider_id,
    provider_amount = data.provider_amount,
    marketplace_fee = data.marketplace_fee,
    total_amount = data.total_amount,
    request_id = data.request_id,
    transaction_id = data.transaction_id,
    fee_collection_success = data.fee_collection_success,
    provider_payment_success = data.provider_payment_success
  }
  
  print("DEBIT_NOTICE_AUDIT: " .. json.encode(debit_audit))
end

-- Log validation failure audit
function audit_trail.log_validation_failure_audit(data: {string: any})
  local validation_audit = {
    failure_reason = data.failure_reason,
    sender = data.sender,
    amount = data.amount,
    request_id = data.request_id,
    fraud_detected = data.fraud_detected,
    refund_required = data.refund_required,
    automatic_refund_processed = data.automatic_refund_processed
  }
  
  print("VALIDATION_FAILURE_AUDIT: " .. json.encode(validation_audit))
end

-- Log refund processing audit
function audit_trail.log_refund_audit(data: {string: any})
  local refund_audit = {
    original_transaction_id = data.original_transaction_id,
    refund_transaction_id = data.refund_transaction_id,
    refund_amount = data.refund_amount,
    refund_reason = data.refund_reason,
    automatic_refund = data.automatic_refund,
    refund_success = data.refund_success
  }
  
  print("REFUND_AUDIT: " .. json.encode(refund_audit))
end

-- Log fraud detection audit
function audit_trail.log_fraud_detection_audit(data: {string: any})
  local fraud_audit = {
    fraud_type = data.fraud_type,
    sender = data.sender,
    amount = data.amount,
    detection_reason = data.detection_reason,
    action_taken = data.action_taken,
    risk_score = data.risk_score
  }
  
  print("FRAUD_DETECTION_AUDIT: " .. json.encode(fraud_audit))
end

-- Track transaction history with success/failure status
function audit_trail.track_transaction_history(transaction: {string: any}, status: string)
  audit_trail.initialize_audit_system()
  
  local history_entry = {
    timestamp = os.time(),
    transaction_id = transaction.transaction_id,
    request_id = transaction.request_id,
    amount = transaction.amount,
    status = status,
    from_process = transaction.from_process,
    to_process = transaction.to_process,
    service_type = transaction.service_type,
    x_metadata = transaction.x_metadata or {}
  }
  
  -- Store in dedicated history tracking
  if not MarketplaceCore.audit_trail.transaction_status_history then
    MarketplaceCore.audit_trail.transaction_status_history = {}
  end
  
  table.insert(MarketplaceCore.audit_trail.transaction_status_history, history_entry)
  
  -- Update financial reconciliation
  audit_trail.update_financial_reconciliation(transaction, status)
  
  return history_entry
end

-- Update financial reconciliation
function audit_trail.update_financial_reconciliation(transaction: {string: any}, status: string)
  if not MarketplaceCore.audit_trail.financial_reconciliation then
    MarketplaceCore.audit_trail.financial_reconciliation = {
      total_payments_received = "0",
      total_payments_distributed = "0",
      total_marketplace_fees = "0",
      total_refunds_processed = "0",
      last_reconciliation = os.time()
    }
  end
  
  local reconciliation = MarketplaceCore.audit_trail.financial_reconciliation
  local amount = tonumber(transaction.amount) or 0
  
  if status == "PAYMENT_RECEIVED" then
    local current_received = tonumber(reconciliation.total_payments_received) or 0
    reconciliation.total_payments_received = tostring(current_received + amount)
  elseif status == "PAYMENT_DISTRIBUTED" then
    local current_distributed = tonumber(reconciliation.total_payments_distributed) or 0
    reconciliation.total_payments_distributed = tostring(current_distributed + amount)
  elseif status == "MARKETPLACE_FEE_COLLECTED" then
    local current_fees = tonumber(reconciliation.total_marketplace_fees) or 0
    reconciliation.total_marketplace_fees = tostring(current_fees + amount)
  elseif status == "REFUND_PROCESSED" then
    local current_refunds = tonumber(reconciliation.total_refunds_processed) or 0
    reconciliation.total_refunds_processed = tostring(current_refunds + amount)
  end
  
  reconciliation.last_reconciliation = os.time()
end

-- Generate financial reconciliation report
function audit_trail.generate_financial_reconciliation_report(): {string: any}
  audit_trail.initialize_audit_system()
  
  local reconciliation = MarketplaceCore.audit_trail.financial_reconciliation
  
  local report = {
    report_timestamp = os.time(),
    total_payments_received = reconciliation.total_payments_received,
    total_payments_distributed = reconciliation.total_payments_distributed,
    total_marketplace_fees = reconciliation.total_marketplace_fees,
    total_refunds_processed = reconciliation.total_refunds_processed,
    last_reconciliation = reconciliation.last_reconciliation
  }
  
  -- Calculate balances
  local received = tonumber(reconciliation.total_payments_received) or 0
  local distributed = tonumber(reconciliation.total_payments_distributed) or 0
  local fees = tonumber(reconciliation.total_marketplace_fees) or 0
  local refunds = tonumber(reconciliation.total_refunds_processed) or 0
  
  report.balance_check = {
    expected_balance = tostring(received - distributed - refunds),
    marketplace_treasury_balance = MarketplaceCore.marketplace_treasury and MarketplaceCore.marketplace_treasury.total_fees_collected or "0",
    balance_matches = (received - distributed - refunds) == fees
  }
  
  return report
end

-- Update transaction analytics
function audit_trail.update_transaction_analytics(transaction_log: {string: any})
  if not MarketplaceCore.audit_trail.analytics then
    MarketplaceCore.audit_trail.analytics = {
      daily_transaction_count = 0,
      weekly_transaction_count = 0,
      monthly_transaction_count = 0,
      last_analytics_update = os.time()
    }
  end
  
  local analytics = MarketplaceCore.audit_trail.analytics
  local current_time = os.time()
  
  -- Reset counters if time periods have passed
  local last_update = analytics.last_analytics_update
  local day_seconds = 24 * 60 * 60
  local week_seconds = 7 * day_seconds
  local month_seconds = 30 * day_seconds
  
  if current_time - last_update > day_seconds then
    analytics.daily_transaction_count = 0
  end
  
  if current_time - last_update > week_seconds then
    analytics.weekly_transaction_count = 0
  end
  
  if current_time - last_update > month_seconds then
    analytics.monthly_transaction_count = 0
  end
  
  -- Increment counters
  analytics.daily_transaction_count = analytics.daily_transaction_count + 1
  analytics.weekly_transaction_count = analytics.weekly_transaction_count + 1
  analytics.monthly_transaction_count = analytics.monthly_transaction_count + 1
  analytics.last_analytics_update = current_time
end

-- Create transaction analytics report
function audit_trail.generate_transaction_analytics_report(): {string: any}
  audit_trail.initialize_audit_system()
  
  local analytics = MarketplaceCore.audit_trail.analytics
  
  local report = {
    report_timestamp = os.time(),
    daily_transaction_count = analytics.daily_transaction_count,
    weekly_transaction_count = analytics.weekly_transaction_count,
    monthly_transaction_count = analytics.monthly_transaction_count,
    last_analytics_update = analytics.last_analytics_update
  }
  
  -- Calculate transaction rates
  local current_time = os.time()
  local last_update = analytics.last_analytics_update
  local time_diff = current_time - last_update
  
  if time_diff > 0 then
    report.transaction_rate = {
      transactions_per_second = analytics.daily_transaction_count / time_diff,
      transactions_per_minute = analytics.daily_transaction_count / (time_diff / 60),
      transactions_per_hour = analytics.daily_transaction_count / (time_diff / 3600)
    }
  end
  
  return report
end

-- Balance verification system
function audit_trail.verify_balance_integrity(): {string: any}
  audit_trail.initialize_audit_system()
  
  local verification_result = {
    verification_timestamp = os.time(),
    balance_integrity_valid = false,
    discrepancies = {},
    total_discrepancy_amount = "0"
  }
  
  -- Calculate expected balances from transaction history
  local expected_received = 0
  local expected_distributed = 0
  local expected_fees = 0
  local expected_refunds = 0
  
  if MarketplaceCore.transaction_history then
    for _, tx in ipairs(MarketplaceCore.transaction_history) do
      local amount = tonumber(tx.amount) or 0
      
      if tx.success and tx.credit_notice_sent then
        expected_received = expected_received + amount
      end
      
      if tx.success and tx.debit_notice_sent then
        expected_distributed = expected_distributed + amount
      end
      
      if tx.service_type == "marketplace_fee" and tx.success then
        expected_fees = expected_fees + amount
      end
      
      if tx.service_type == "refund" and tx.success then
        expected_refunds = expected_refunds + amount
      end
    end
  end
  
  -- Compare with recorded balances
  local reconciliation = MarketplaceCore.audit_trail.financial_reconciliation
  local recorded_received = tonumber(reconciliation.total_payments_received) or 0
  local recorded_distributed = tonumber(reconciliation.total_payments_distributed) or 0
  local recorded_fees = tonumber(reconciliation.total_marketplace_fees) or 0
  local recorded_refunds = tonumber(reconciliation.total_refunds_processed) or 0
  
  -- Check for discrepancies
  local total_discrepancy = 0
  
  if expected_received ~= recorded_received then
    table.insert(verification_result.discrepancies, {
      type = "payments_received",
      expected = tostring(expected_received),
      recorded = tostring(recorded_received),
      difference = tostring(expected_received - recorded_received)
    })
    total_discrepancy = total_discrepancy + math.abs(expected_received - recorded_received)
  end
  
  if expected_distributed ~= recorded_distributed then
    table.insert(verification_result.discrepancies, {
      type = "payments_distributed",
      expected = tostring(expected_distributed),
      recorded = tostring(recorded_distributed),
      difference = tostring(expected_distributed - recorded_distributed)
    })
    total_discrepancy = total_discrepancy + math.abs(expected_distributed - recorded_distributed)
  end
  
  if expected_fees ~= recorded_fees then
    table.insert(verification_result.discrepancies, {
      type = "marketplace_fees",
      expected = tostring(expected_fees),
      recorded = tostring(recorded_fees),
      difference = tostring(expected_fees - recorded_fees)
    })
    total_discrepancy = total_discrepancy + math.abs(expected_fees - recorded_fees)
  end
  
  if expected_refunds ~= recorded_refunds then
    table.insert(verification_result.discrepancies, {
      type = "refunds_processed",
      expected = tostring(expected_refunds),
      recorded = tostring(recorded_refunds),
      difference = tostring(expected_refunds - recorded_refunds)
    })
    total_discrepancy = total_discrepancy + math.abs(expected_refunds - recorded_refunds)
  end
  
  verification_result.total_discrepancy_amount = tostring(total_discrepancy)
  verification_result.balance_integrity_valid = total_discrepancy == 0
  
  return verification_result
end

return audit_trail