-- Credit-Notice message handler for incoming AI service payments
local json = require("../utils/json")
local token_utils = require("../utils/token-utils")

local credit_notice_handler = {}

-- Default marketplace fee percentage (2%)
local MARKETPLACE_FEE_PERCENTAGE = 2
local PAYMENT_TIMEOUT_SECONDS = 30

-- Process Credit-Notice message
function credit_notice_handler.process_credit_notice(msg: {string: any}): {string: any}
  local response = {
    success = false,
    transaction_id = "",
    amount = "",
    error_message = "",
    refund_processed = false
  }
  
  -- Parse message data
  local data = msg.Data or {}
  local tags = msg.Tags or {}
  
  -- Extract payment details
  local sender = data.sender or ""
  local quantity = data.quantity or ""
  local message = data.message or ""
  
  -- Parse X-prefix metadata
  local x_metadata = token_utils.parse_x_metadata(tags)
  local service_type = x_metadata["X-Service-Type"] or "unknown"
  local request_id = x_metadata["X-Request-ID"] or ""
  local provider_id = x_metadata["X-Provider-ID"] or ""
  
  -- Validate payment amount
  local amount_valid, amount_error = token_utils.validate_amount(quantity)
  if not amount_valid then
    response.error_message = token_utils.format_error_message("INVALID_AMOUNT", amount_error)
    return response
  end
  
  -- Validate sender address
  local sender_valid, sender_error = token_utils.validate_process_address(sender)
  if not sender_valid then
    response.error_message = token_utils.format_error_message("INVALID_SENDER", sender_error)
    return response
  end
  
  -- Validate provider address
  local provider_valid, provider_error = token_utils.validate_process_address(provider_id)
  if not provider_valid then
    response.error_message = token_utils.format_error_message("INVALID_RECIPIENT", provider_error)
    return response
  end
  
  -- Generate transaction ID
  local transaction_id = token_utils.generate_transaction_id()
  
  -- Create payment transaction record
  local transaction = token_utils.create_payment_transaction(
    transaction_id,
    request_id,
    sender,
    provider_id,
    quantity,
    service_type,
    x_metadata
  )
  
  -- Check if request exists in active requests
  if not MarketplaceCore.active_requests then
    MarketplaceCore.active_requests = {}
  end
  
  local active_request = MarketplaceCore.active_requests[request_id]
  if not active_request then
    response.error_message = token_utils.format_error_message("VALIDATION_FAILED", "Request not found: " .. request_id)
    return response
  end
  
  -- Check if request has expired
  if token_utils.is_request_expired(active_request.created_at, PAYMENT_TIMEOUT_SECONDS) then
    response.error_message = token_utils.format_error_message("TIMEOUT_ERROR", "Request expired: " .. request_id)
    -- Process automatic refund
    credit_notice_handler.process_automatic_refund(transaction, "Request timeout")
    response.refund_processed = true
    return response
  end
  
  -- Validate payment amount matches expected amount
  if quantity ~= active_request.payment_amount then
    response.error_message = token_utils.format_error_message("INVALID_AMOUNT", 
      "Amount mismatch. Expected: " .. active_request.payment_amount .. ", Received: " .. quantity)
    return response
  end
  
  -- Validate service type matches
  if service_type ~= "ai-inference" then
    response.error_message = token_utils.format_error_message("VALIDATION_FAILED", 
      "Invalid service type: " .. service_type)
    return response
  end
  
  -- Process payment authorization
  local auth_result = credit_notice_handler.authorize_payment(transaction, active_request)
  if not auth_result.success then
    response.error_message = auth_result.error_message
    return response
  end
  
  -- Update transaction with successful payment
  transaction.success = true
  transaction.credit_notice_sent = true
  transaction.timestamp = os.time()
  
  -- Store transaction in history
  if not MarketplaceCore.transaction_history then
    MarketplaceCore.transaction_history = {}
  end
  table.insert(MarketplaceCore.transaction_history, transaction)
  
  -- Update active request status
  active_request.status = "payment_received"
  active_request.transaction_id = transaction_id
  
  -- Log payment transaction
  token_utils.log_payment_transaction(transaction, "CREDIT_NOTICE_PROCESSED")
  
  -- Prepare success response
  response.success = true
  response.transaction_id = transaction_id
  response.amount = quantity
  
  return response
end

-- Authorize payment and perform balance checks
function credit_notice_handler.authorize_payment(transaction: {string: any}, request: {string: any}): {string: any}
  local auth_result = {
    success = false,
    error_message = ""
  }
  
  -- Validate request is in correct state
  if request.status ~= "processing" then
    auth_result.error_message = token_utils.format_error_message("VALIDATION_FAILED", 
      "Invalid request status: " .. request.status)
    return auth_result
  end
  
  -- Check for fraud patterns (basic implementation)
  local fraud_check = credit_notice_handler.check_fraud_patterns(transaction)
  if fraud_check.fraud_detected then
    auth_result.error_message = token_utils.format_error_message("FRAUD_DETECTED", fraud_check.reason)
    return auth_result
  end
  
  -- In a real implementation, this would check token balance
  -- For now, we assume the payment is valid if it reaches this point
  
  auth_result.success = true
  return auth_result
end

-- Basic fraud detection patterns
function credit_notice_handler.check_fraud_patterns(transaction: {string: any}): {string: any}
  local fraud_result = {
    fraud_detected = false,
    reason = ""
  }
  
  -- Check for unusually large amounts (simple threshold)
  local amount = tonumber(transaction.amount) or 0
  if amount > 10000 then
    fraud_result.fraud_detected = true
    fraud_result.reason = "Amount exceeds normal threshold"
    return fraud_result
  end
  
  -- Check for rapid repeated payments from same sender
  local recent_payments = 0
  local current_time = os.time()
  local sender = transaction.from_process
  
  if MarketplaceCore.transaction_history then
    for _, tx in ipairs(MarketplaceCore.transaction_history) do
      if tx.from_process == sender and (current_time - tx.timestamp) < 60 then
        recent_payments = recent_payments + 1
      end
    end
  end
  
  if recent_payments > 5 then
    fraud_result.fraud_detected = true
    fraud_result.reason = "Too many recent payments from same sender"
    return fraud_result
  end
  
  return fraud_result
end

-- Process automatic refund for failed services
function credit_notice_handler.process_automatic_refund(transaction: {string: any}, reason: string)
  local refund_request = {
    original_transaction_id = transaction.transaction_id,
    refund_amount = transaction.amount,
    reason = reason,
    request_id = transaction.request_id,
    timestamp = os.time()
  }
  
  -- Create refund transaction
  local refund_transaction = token_utils.create_payment_transaction(
    token_utils.generate_transaction_id(),
    transaction.request_id,
    transaction.to_process, -- Marketplace process
    transaction.from_process, -- Refund back to original sender
    transaction.amount,
    "refund",
    transaction.x_metadata
  )
  
  refund_transaction.success = true
  refund_transaction.timestamp = os.time()
  
  -- Store refund transaction
  if not MarketplaceCore.transaction_history then
    MarketplaceCore.transaction_history = {}
  end
  table.insert(MarketplaceCore.transaction_history, refund_transaction)
  
  -- Log refund processing
  token_utils.log_payment_transaction(refund_transaction, "AUTOMATIC_REFUND_PROCESSED")
  
  -- In a real implementation, this would send a Debit-Notice to process the refund
  print("REFUND_PROCESSED: " .. json.encode(refund_request))
end

-- Handle Credit-Notice response confirmation
function credit_notice_handler.handle_credit_notice_response(msg: {string: any}): {string: any}
  local response = {
    success = false,
    message = "Credit-Notice response processed"
  }
  
  local data = msg.Data or {}
  local transaction_id = data.transaction_id or ""
  
  -- Find transaction in history
  if MarketplaceCore.transaction_history then
    for _, tx in ipairs(MarketplaceCore.transaction_history) do
      if tx.transaction_id == transaction_id then
        tx.credit_notice_sent = true
        token_utils.log_payment_transaction(tx, "CREDIT_NOTICE_RESPONSE_CONFIRMED")
        response.success = true
        break
      end
    end
  end
  
  return response
end

return credit_notice_handler