-- Payment validation and fraud prevention handler
local json = require("../utils/json")
local token_utils = require("../utils/token-utils")

local payment_validation = {}

-- Payment validation constants
local MAX_PAYMENT_AMOUNT = 10000
local MAX_PAYMENTS_PER_MINUTE = 5
local MIN_PAYMENT_AMOUNT = 1
local FRAUD_DETECTION_WINDOW = 300 -- 5 minutes in seconds

-- Validate payment request
function payment_validation.validate_payment_request(payment_data: {string: any}): {string: any}
  local validation_result = {
    valid = false,
    error_message = "",
    fraud_detected = false,
    refund_required = false
  }
  
  -- Basic data validation
  local basic_validation = payment_validation.validate_basic_data(payment_data)
  if not basic_validation.valid then
    validation_result.error_message = basic_validation.error_message
    return validation_result
  end
  
  -- Amount validation
  local amount_validation = payment_validation.validate_payment_amount(payment_data.amount)
  if not amount_validation.valid then
    validation_result.error_message = amount_validation.error_message
    return validation_result
  end
  
  -- Fraud detection
  local fraud_check = payment_validation.detect_fraud_patterns(payment_data)
  if fraud_check.fraud_detected then
    validation_result.fraud_detected = true
    validation_result.error_message = fraud_check.error_message
    return validation_result
  end
  
  -- Service validation
  local service_validation = payment_validation.validate_service_request(payment_data)
  if not service_validation.valid then
    validation_result.error_message = service_validation.error_message
    return validation_result
  end
  
  validation_result.valid = true
  return validation_result
end

-- Validate basic payment data
function payment_validation.validate_basic_data(payment_data: {string: any}): {string: any}
  local result = {
    valid = false,
    error_message = ""
  }
  
  -- Check required fields
  if not payment_data.sender or payment_data.sender == "" then
    result.error_message = "Sender address is required"
    return result
  end
  
  if not payment_data.recipient or payment_data.recipient == "" then
    result.error_message = "Recipient address is required"
    return result
  end
  
  if not payment_data.amount or payment_data.amount == "" then
    result.error_message = "Payment amount is required"
    return result
  end
  
  if not payment_data.request_id or payment_data.request_id == "" then
    result.error_message = "Request ID is required"
    return result
  end
  
  -- Validate address formats
  local sender_valid, sender_error = token_utils.validate_process_address(payment_data.sender)
  if not sender_valid then
    result.error_message = "Invalid sender address: " .. sender_error
    return result
  end
  
  local recipient_valid, recipient_error = token_utils.validate_process_address(payment_data.recipient)
  if not recipient_valid then
    result.error_message = "Invalid recipient address: " .. recipient_error
    return result
  end
  
  result.valid = true
  return result
end

-- Validate payment amount
function payment_validation.validate_payment_amount(amount: string): {string: any}
  local result = {
    valid = false,
    error_message = ""
  }
  
  local amount_valid, amount_error = token_utils.validate_amount(amount)
  if not amount_valid then
    result.error_message = amount_error
    return result
  end
  
  local num_amount = tonumber(amount) or 0
  
  -- Check minimum amount
  if num_amount < MIN_PAYMENT_AMOUNT then
    result.error_message = "Payment amount too small. Minimum: " .. MIN_PAYMENT_AMOUNT
    return result
  end
  
  -- Check maximum amount
  if num_amount > MAX_PAYMENT_AMOUNT then
    result.error_message = "Payment amount too large. Maximum: " .. MAX_PAYMENT_AMOUNT
    return result
  end
  
  result.valid = true
  return result
end

-- Detect fraud patterns
function payment_validation.detect_fraud_patterns(payment_data: {string: any}): {string: any}
  local fraud_result = {
    fraud_detected = false,
    error_message = ""
  }
  
  -- Check for rapid payments from same sender
  local rapid_payments = payment_validation.check_rapid_payments(payment_data.sender)
  if rapid_payments.fraud_detected then
    fraud_result.fraud_detected = true
    fraud_result.error_message = "Too many rapid payments detected: " .. rapid_payments.reason
    return fraud_result
  end
  
  -- Check for unusual amount patterns
  local amount_patterns = payment_validation.check_amount_patterns(payment_data)
  if amount_patterns.fraud_detected then
    fraud_result.fraud_detected = true
    fraud_result.error_message = "Unusual amount pattern detected: " .. amount_patterns.reason
    return fraud_result
  end
  
  -- Check for duplicate transactions
  local duplicate_check = payment_validation.check_duplicate_transactions(payment_data)
  if duplicate_check.fraud_detected then
    fraud_result.fraud_detected = true
    fraud_result.error_message = "Duplicate transaction detected: " .. duplicate_check.reason
    return fraud_result
  end
  
  return fraud_result
end

-- Check for rapid payments from same sender
function payment_validation.check_rapid_payments(sender: string): {string: any}
  local result = {
    fraud_detected = false,
    reason = ""
  }
  
  if not MarketplaceCore.transaction_history then
    return result
  end
  
  local current_time = os.time()
  local recent_payments = 0
  
  -- Count payments in the last minute
  for _, tx in ipairs(MarketplaceCore.transaction_history) do
    if tx.from_process == sender and (current_time - tx.timestamp) < 60 then
      recent_payments = recent_payments + 1
    end
  end
  
  if recent_payments >= MAX_PAYMENTS_PER_MINUTE then
    result.fraud_detected = true
    result.reason = "More than " .. MAX_PAYMENTS_PER_MINUTE .. " payments in last minute"
  end
  
  return result
end

-- Check for unusual amount patterns
function payment_validation.check_amount_patterns(payment_data: {string: any}): {string: any}
  local result = {
    fraud_detected = false,
    reason = ""
  }
  
  local amount = tonumber(payment_data.amount) or 0
  
  -- Check for suspiciously round numbers (potential test/fake transactions)
  if amount % 1000 == 0 and amount >= 5000 then
    result.fraud_detected = true
    result.reason = "Suspiciously round amount: " .. payment_data.amount
    return result
  end
  
  -- Check for amounts that are exact multiples of common test values
  local test_amounts = {100, 500, 1000, 2500, 5000}
  for _, test_amount in ipairs(test_amounts) do
    if amount == test_amount then
      result.fraud_detected = true
      result.reason = "Common test amount detected: " .. payment_data.amount
      return result
    end
  end
  
  return result
end

-- Check for duplicate transactions
function payment_validation.check_duplicate_transactions(payment_data: {string: any}): {string: any}
  local result = {
    fraud_detected = false,
    reason = ""
  }
  
  if not MarketplaceCore.transaction_history then
    return result
  end
  
  local current_time = os.time()
  
  -- Check for identical transactions in the last 5 minutes
  for _, tx in ipairs(MarketplaceCore.transaction_history) do
    if tx.from_process == payment_data.sender and 
       tx.to_process == payment_data.recipient and
       tx.amount == payment_data.amount and
       tx.request_id == payment_data.request_id and
       (current_time - tx.timestamp) < FRAUD_DETECTION_WINDOW then
      result.fraud_detected = true
      result.reason = "Duplicate transaction within fraud detection window"
      return result
    end
  end
  
  return result
end

-- Validate service request
function payment_validation.validate_service_request(payment_data: {string: any}): {string: any}
  local result = {
    valid = false,
    error_message = ""
  }
  
  -- Check if request exists in active requests
  if not MarketplaceCore.active_requests then
    result.error_message = "No active requests found"
    return result
  end
  
  local active_request = MarketplaceCore.active_requests[payment_data.request_id]
  if not active_request then
    result.error_message = "Request not found: " .. payment_data.request_id
    return result
  end
  
  -- Check request status
  if active_request.status ~= "processing" then
    result.error_message = "Request not in processing state: " .. active_request.status
    return result
  end
  
  -- Check if request has expired
  if token_utils.is_request_expired(active_request.created_at, 30) then
    result.error_message = "Request has expired: " .. payment_data.request_id
    return result
  end
  
  -- Validate payment amount matches expected amount
  if payment_data.amount ~= active_request.payment_amount then
    result.error_message = "Payment amount mismatch. Expected: " .. 
      active_request.payment_amount .. ", Received: " .. payment_data.amount
    return result
  end
  
  -- Validate recipient matches provider
  if payment_data.recipient ~= active_request.provider_id then
    result.error_message = "Recipient mismatch. Expected: " .. 
      active_request.provider_id .. ", Received: " .. payment_data.recipient
    return result
  end
  
  result.valid = true
  return result
end

-- Process automatic refund for failed validation
function payment_validation.process_validation_refund(payment_data: {string: any}, reason: string): {string: any}
  local refund_result = {
    success = false,
    refund_amount = "",
    error_message = ""
  }
  
  -- Create refund transaction
  local refund_transaction = token_utils.create_payment_transaction(
    token_utils.generate_transaction_id(),
    payment_data.request_id,
    "marketplace_core", -- Marketplace process
    payment_data.sender, -- Refund back to sender
    payment_data.amount,
    "validation_refund",
    payment_data.x_metadata or {}
  )
  
  refund_transaction.success = true
  refund_transaction.timestamp = os.time()
  
  -- Store refund transaction
  if not MarketplaceCore.transaction_history then
    MarketplaceCore.transaction_history = {}
  end
  table.insert(MarketplaceCore.transaction_history, refund_transaction)
  
  -- Log validation refund
  token_utils.log_payment_transaction(refund_transaction, "VALIDATION_REFUND_PROCESSED")
  
  refund_result.success = true
  refund_result.refund_amount = payment_data.amount
  
  return refund_result
end

-- Check payment authorization
function payment_validation.check_payment_authorization(payment_data: {string: any}): {string: any}
  local auth_result = {
    authorized = false,
    error_message = ""
  }
  
  -- Validate payment data
  local validation_result = payment_validation.validate_payment_request(payment_data)
  if not validation_result.valid then
    auth_result.error_message = validation_result.error_message
    return auth_result
  end
  
  -- Check for fraud
  if validation_result.fraud_detected then
    auth_result.error_message = "Payment authorization failed due to fraud detection"
    return auth_result
  end
  
  -- In a real implementation, this would check:
  -- - Token balance
  -- - Account status
  -- - Rate limits
  -- - Blacklist status
  
  auth_result.authorized = true
  return auth_result
end

return payment_validation