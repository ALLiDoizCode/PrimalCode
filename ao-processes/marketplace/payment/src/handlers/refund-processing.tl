-- Refund processing handler for failed services
local json = require("../utils/json")
local token_utils = require("../utils/token-utils")

local refund_processing = {}

-- Refund processing constants
local REFUND_TIMEOUT_SECONDS = 300 -- 5 minutes
local AUTO_REFUND_ENABLED = true

-- Process refund request
function refund_processing.process_refund_request(refund_data: {string: any}): {string: any}
  local refund_result = {
    success = false,
    refund_transaction_id = "",
    refund_amount = "",
    error_message = ""
  }
  
  -- Validate refund request
  local validation_result = refund_processing.validate_refund_request(refund_data)
  if not validation_result.valid then
    refund_result.error_message = validation_result.error_message
    return refund_result
  end
  
  -- Find original transaction
  local original_transaction = refund_processing.find_original_transaction(refund_data.original_transaction_id)
  if not original_transaction then
    refund_result.error_message = "Original transaction not found: " .. refund_data.original_transaction_id
    return refund_result
  end
  
  -- Check if refund is already processed
  local existing_refund = refund_processing.check_existing_refund(refund_data.original_transaction_id)
  if existing_refund then
    refund_result.error_message = "Refund already processed for transaction: " .. refund_data.original_transaction_id
    return refund_result
  end
  
  -- Process the refund
  local process_result = refund_processing.execute_refund(original_transaction, refund_data)
  if not process_result.success then
    refund_result.error_message = process_result.error_message
    return refund_result
  end
  
  refund_result.success = true
  refund_result.refund_transaction_id = process_result.refund_transaction_id
  refund_result.refund_amount = process_result.refund_amount
  
  return refund_result
end

-- Validate refund request
function refund_processing.validate_refund_request(refund_data: {string: any}): {string: any}
  local result = {
    valid = false,
    error_message = ""
  }
  
  -- Check required fields
  if not refund_data.original_transaction_id or refund_data.original_transaction_id == "" then
    result.error_message = "Original transaction ID is required"
    return result
  end
  
  if not refund_data.refund_amount or refund_data.refund_amount == "" then
    result.error_message = "Refund amount is required"
    return result
  end
  
  if not refund_data.reason or refund_data.reason == "" then
    result.error_message = "Refund reason is required"
    return result
  end
  
  -- Validate refund amount
  local amount_valid, amount_error = token_utils.validate_amount(refund_data.refund_amount)
  if not amount_valid then
    result.error_message = "Invalid refund amount: " .. amount_error
    return result
  end
  
  result.valid = true
  return result
end

-- Find original transaction
function refund_processing.find_original_transaction(transaction_id: string): {string: any}
  if not MarketplaceCore.transaction_history then
    return nil
  end
  
  for _, tx in ipairs(MarketplaceCore.transaction_history) do
    if tx.transaction_id == transaction_id and tx.success then
      return tx
    end
  end
  
  return nil
end

-- Check if refund already exists
function refund_processing.check_existing_refund(original_transaction_id: string): boolean
  if not MarketplaceCore.transaction_history then
    return false
  end
  
  for _, tx in ipairs(MarketplaceCore.transaction_history) do
    if tx.service_type == "refund" and 
       tx.x_metadata and 
       tx.x_metadata["X-Original-Transaction-ID"] == original_transaction_id then
      return true
    end
  end
  
  return false
end

-- Execute refund transaction
function refund_processing.execute_refund(original_transaction: {string: any}, refund_data: {string: any}): {string: any}
  local result = {
    success = false,
    refund_transaction_id = "",
    refund_amount = "",
    error_message = ""
  }
  
  -- Validate refund amount against original
  local original_amount = tonumber(original_transaction.amount) or 0
  local refund_amount = tonumber(refund_data.refund_amount) or 0
  
  if refund_amount > original_amount then
    result.error_message = "Refund amount exceeds original payment amount"
    return result
  end
  
  -- Generate refund transaction ID
  local refund_transaction_id = token_utils.generate_transaction_id()
  
  -- Create refund metadata
  local refund_metadata = {
    ["X-Original-Transaction-ID"] = original_transaction.transaction_id,
    ["X-Refund-Reason"] = refund_data.reason,
    ["X-Service-Type"] = "refund",
    ["X-Request-ID"] = original_transaction.request_id
  }
  
  -- Create refund transaction
  local refund_transaction = token_utils.create_payment_transaction(
    refund_transaction_id,
    original_transaction.request_id,
    "marketplace_core", -- Marketplace process as sender
    original_transaction.from_process, -- Refund back to original sender
    refund_data.refund_amount,
    "refund",
    refund_metadata
  )
  
  -- Mark refund as successful
  refund_transaction.success = true
  refund_transaction.timestamp = os.time()
  
  -- Store refund transaction
  if not MarketplaceCore.transaction_history then
    MarketplaceCore.transaction_history = {}
  end
  table.insert(MarketplaceCore.transaction_history, refund_transaction)
  
  -- Update original transaction with refund reference
  original_transaction.refund_processed = true
  original_transaction.refund_transaction_id = refund_transaction_id
  
  -- Log refund transaction
  token_utils.log_payment_transaction(refund_transaction, "REFUND_PROCESSED")
  
  result.success = true
  result.refund_transaction_id = refund_transaction_id
  result.refund_amount = refund_data.refund_amount
  
  return result
end

-- Process automatic refund for failed services
function refund_processing.process_automatic_refund(failed_request: {string: any}, failure_reason: string): {string: any}
  local auto_refund_result = {
    success = false,
    refund_transaction_id = "",
    error_message = ""
  }
  
  if not AUTO_REFUND_ENABLED then
    auto_refund_result.error_message = "Automatic refunds are disabled"
    return auto_refund_result
  end
  
  -- Find payment transaction for this request
  local payment_transaction = refund_processing.find_payment_transaction(failed_request.request_id)
  if not payment_transaction then
    auto_refund_result.error_message = "No payment transaction found for request: " .. failed_request.request_id
    return auto_refund_result
  end
  
  -- Create automatic refund data
  local refund_data = {
    original_transaction_id = payment_transaction.transaction_id,
    refund_amount = payment_transaction.amount,
    reason = "Automatic refund: " .. failure_reason,
    request_id = failed_request.request_id,
    timestamp = os.time()
  }
  
  -- Process the refund
  local refund_result = refund_processing.process_refund_request(refund_data)
  if not refund_result.success then
    auto_refund_result.error_message = refund_result.error_message
    return auto_refund_result
  end
  
  -- Update failed request status
  if MarketplaceCore.active_requests and MarketplaceCore.active_requests[failed_request.request_id] then
    MarketplaceCore.active_requests[failed_request.request_id].status = "refunded"
    MarketplaceCore.active_requests[failed_request.request_id].refund_transaction_id = refund_result.refund_transaction_id
  end
  
  auto_refund_result.success = true
  auto_refund_result.refund_transaction_id = refund_result.refund_transaction_id
  
  return auto_refund_result
end

-- Find payment transaction by request ID
function refund_processing.find_payment_transaction(request_id: string): {string: any}
  if not MarketplaceCore.transaction_history then
    return nil
  end
  
  for _, tx in ipairs(MarketplaceCore.transaction_history) do
    if tx.request_id == request_id and tx.success and tx.credit_notice_sent then
      return tx
    end
  end
  
  return nil
end

-- Handle refund timeout processing
function refund_processing.handle_refund_timeout(request_id: string): {string: any}
  local timeout_result = {
    success = false,
    refund_processed = false,
    error_message = ""
  }
  
  -- Find active request
  if not MarketplaceCore.active_requests then
    timeout_result.error_message = "No active requests found"
    return timeout_result
  end
  
  local active_request = MarketplaceCore.active_requests[request_id]
  if not active_request then
    timeout_result.error_message = "Request not found: " .. request_id
    return timeout_result
  end
  
  -- Check if request has timed out
  if not token_utils.is_request_expired(active_request.created_at, REFUND_TIMEOUT_SECONDS) then
    timeout_result.error_message = "Request has not timed out yet"
    return timeout_result
  end
  
  -- Process automatic refund for timeout
  local auto_refund = refund_processing.process_automatic_refund(active_request, "Request timeout")
  if auto_refund.success then
    timeout_result.refund_processed = true
  end
  
  -- Update request status
  active_request.status = "timeout"
  active_request.timeout_at = os.time()
  
  timeout_result.success = true
  return timeout_result
end

-- Generate refund report
function refund_processing.generate_refund_report(time_range: {string: any}): {string: any}
  local report = {
    total_refunds = 0,
    total_refund_amount = "0",
    refund_reasons = {},
    refund_transactions = {}
  }
  
  if not MarketplaceCore.transaction_history then
    return report
  end
  
  local start_time = time_range.start_time or 0
  local end_time = time_range.end_time or os.time()
  local total_amount = 0
  
  for _, tx in ipairs(MarketplaceCore.transaction_history) do
    if tx.service_type == "refund" and 
       tx.timestamp >= start_time and 
       tx.timestamp <= end_time then
      
      report.total_refunds = report.total_refunds + 1
      total_amount = total_amount + (tonumber(tx.amount) or 0)
      
      -- Track refund reasons
      local reason = tx.x_metadata and tx.x_metadata["X-Refund-Reason"] or "Unknown"
      report.refund_reasons[reason] = (report.refund_reasons[reason] or 0) + 1
      
      -- Add transaction to report
      table.insert(report.refund_transactions, {
        transaction_id = tx.transaction_id,
        amount = tx.amount,
        reason = reason,
        timestamp = tx.timestamp,
        original_transaction_id = tx.x_metadata and tx.x_metadata["X-Original-Transaction-ID"] or ""
      })
    end
  end
  
  report.total_refund_amount = tostring(total_amount)
  
  return report
end

return refund_processing