-- Debit-Notice message handler for provider payment distribution
local json = require("../utils/json")
local token_utils = require("../utils/token-utils")

local debit_notice_handler = {}

-- Default marketplace fee percentage (2%)
local MARKETPLACE_FEE_PERCENTAGE = 2

-- Process Debit-Notice for provider payment distribution
function debit_notice_handler.process_debit_notice(msg: {string: any}): {string: any}
  local response = {
    success = false,
    transaction_id = "",
    provider_amount = "",
    marketplace_fee = "",
    error_message = ""
  }
  
  -- Parse message data
  local data = msg.Data or {}
  local tags = msg.Tags or {}
  
  -- Extract payment details
  local recipient = data.recipient or ""
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
  
  -- Validate recipient address
  local recipient_valid, recipient_error = token_utils.validate_process_address(recipient)
  if not recipient_valid then
    response.error_message = token_utils.format_error_message("INVALID_RECIPIENT", recipient_error)
    return response
  end
  
  -- Find corresponding Credit-Notice transaction
  local credit_transaction = debit_notice_handler.find_credit_transaction(request_id)
  if not credit_transaction then
    response.error_message = token_utils.format_error_message("VALIDATION_FAILED", 
      "No corresponding Credit-Notice found for request: " .. request_id)
    return response
  end
  
  -- Validate recipient matches provider from Credit-Notice
  if recipient ~= credit_transaction.to_process then
    response.error_message = token_utils.format_error_message("VALIDATION_FAILED", 
      "Recipient mismatch. Expected: " .. credit_transaction.to_process .. ", Received: " .. recipient)
    return response
  end
  
  -- Calculate marketplace fee and provider amount
  local marketplace_fee, provider_amount = token_utils.calculate_marketplace_fee(quantity, MARKETPLACE_FEE_PERCENTAGE)
  
  -- Validate payment authorization
  local auth_result = debit_notice_handler.authorize_provider_payment(credit_transaction, provider_amount)
  if not auth_result.success then
    response.error_message = auth_result.error_message
    return response
  end
  
  -- Generate transaction ID for Debit-Notice
  local transaction_id = token_utils.generate_transaction_id()
  
  -- Create provider payment transaction
  local provider_transaction = token_utils.create_payment_transaction(
    transaction_id,
    request_id,
    "marketplace_core", -- Marketplace process as sender
    recipient,
    provider_amount,
    service_type,
    x_metadata
  )
  
  -- Create marketplace fee transaction
  local fee_transaction = token_utils.create_payment_transaction(
    token_utils.generate_transaction_id(),
    request_id,
    "marketplace_core",
    "marketplace_treasury", -- Marketplace treasury
    marketplace_fee,
    "marketplace_fee",
    x_metadata
  )
  
  -- Process provider payment
  local payment_result = debit_notice_handler.process_provider_payment(provider_transaction, fee_transaction)
  if not payment_result.success then
    response.error_message = payment_result.error_message
    return response
  end
  
  -- Update transactions with successful payment
  provider_transaction.success = true
  provider_transaction.debit_notice_sent = true
  provider_transaction.timestamp = os.time()
  
  fee_transaction.success = true
  fee_transaction.debit_notice_sent = true
  fee_transaction.timestamp = os.time()
  
  -- Store transactions in history
  if not MarketplaceCore.transaction_history then
    MarketplaceCore.transaction_history = {}
  end
  table.insert(MarketplaceCore.transaction_history, provider_transaction)
  table.insert(MarketplaceCore.transaction_history, fee_transaction)
  
  -- Update original Credit-Notice transaction
  credit_transaction.debit_notice_sent = true
  
  -- Update active request status
  if MarketplaceCore.active_requests and MarketplaceCore.active_requests[request_id] then
    MarketplaceCore.active_requests[request_id].status = "payment_distributed"
  end
  
  -- Log payment distribution
  token_utils.log_payment_transaction(provider_transaction, "PROVIDER_PAYMENT_DISTRIBUTED")
  token_utils.log_payment_transaction(fee_transaction, "MARKETPLACE_FEE_COLLECTED")
  
  -- Prepare success response
  response.success = true
  response.transaction_id = transaction_id
  response.provider_amount = provider_amount
  response.marketplace_fee = marketplace_fee
  
  return response
end

-- Find corresponding Credit-Notice transaction
function debit_notice_handler.find_credit_transaction(request_id: string): {string: any}
  if not MarketplaceCore.transaction_history then
    return nil
  end
  
  for _, tx in ipairs(MarketplaceCore.transaction_history) do
    if tx.request_id == request_id and tx.credit_notice_sent and tx.success then
      return tx
    end
  end
  
  return nil
end

-- Authorize provider payment
function debit_notice_handler.authorize_provider_payment(credit_transaction: {string: any}, provider_amount: string): {string: any}
  local auth_result = {
    success = false,
    error_message = ""
  }
  
  -- Validate credit transaction is complete
  if not credit_transaction.success then
    auth_result.error_message = token_utils.format_error_message("VALIDATION_FAILED", 
      "Credit transaction not successful")
    return auth_result
  end
  
  -- Validate provider amount is reasonable
  local original_amount = tonumber(credit_transaction.amount) or 0
  local provider_amt = tonumber(provider_amount) or 0
  
  if provider_amt > original_amount then
    auth_result.error_message = token_utils.format_error_message("INVALID_AMOUNT", 
      "Provider amount exceeds original payment")
    return auth_result
  end
  
  -- Check if payment has already been distributed
  if credit_transaction.debit_notice_sent then
    auth_result.error_message = token_utils.format_error_message("VALIDATION_FAILED", 
      "Payment already distributed for this request")
    return auth_result
  end
  
  auth_result.success = true
  return auth_result
end

-- Process provider payment and marketplace fee collection
function debit_notice_handler.process_provider_payment(provider_transaction: {string: any}, fee_transaction: {string: any}): {string: any}
  local payment_result = {
    success = false,
    error_message = ""
  }
  
  -- Validate provider transaction
  local provider_valid, provider_error = token_utils.validate_process_address(provider_transaction.to_process)
  if not provider_valid then
    payment_result.error_message = token_utils.format_error_message("INVALID_RECIPIENT", provider_error)
    return payment_result
  end
  
  -- Validate fee transaction
  local fee_valid, fee_error = token_utils.validate_process_address(fee_transaction.to_process)
  if not fee_valid then
    payment_result.error_message = token_utils.format_error_message("INVALID_RECIPIENT", fee_error)
    return payment_result
  end
  
  -- In a real implementation, this would:
  -- 1. Send Debit-Notice to provider with provider_amount
  -- 2. Send Debit-Notice to marketplace treasury with marketplace_fee
  -- 3. Wait for confirmations
  
  -- For now, we simulate successful payment processing
  payment_result.success = true
  
  return payment_result
end

-- Handle Debit-Notice confirmation
function debit_notice_handler.handle_debit_notice_confirmation(msg: {string: any}): {string: any}
  local response = {
    success = false,
    message = "Debit-Notice confirmation processed"
  }
  
  local data = msg.Data or {}
  local transaction_id = data.transaction_id or ""
  
  -- Find transaction in history
  if MarketplaceCore.transaction_history then
    for _, tx in ipairs(MarketplaceCore.transaction_history) do
      if tx.transaction_id == transaction_id then
        tx.debit_notice_sent = true
        token_utils.log_payment_transaction(tx, "DEBIT_NOTICE_CONFIRMED")
        response.success = true
        break
      end
    end
  end
  
  return response
end

-- Process marketplace fee collection
function debit_notice_handler.collect_marketplace_fee(fee_amount: string, request_id: string): {string: any}
  local fee_result = {
    success = false,
    fee_collected = "",
    error_message = ""
  }
  
  -- Validate fee amount
  local fee_valid, fee_error = token_utils.validate_amount(fee_amount)
  if not fee_valid then
    fee_result.error_message = token_utils.format_error_message("INVALID_AMOUNT", fee_error)
    return fee_result
  end
  
  -- Initialize marketplace treasury tracking
  if not MarketplaceCore.marketplace_treasury then
    MarketplaceCore.marketplace_treasury = {
      total_fees_collected = "0",
      transaction_count = 0,
      last_updated = os.time()
    }
  end
  
  -- Update treasury balance
  local current_balance = tonumber(MarketplaceCore.marketplace_treasury.total_fees_collected) or 0
  local fee_amount_num = tonumber(fee_amount) or 0
  local new_balance = current_balance + fee_amount_num
  
  MarketplaceCore.marketplace_treasury.total_fees_collected = tostring(new_balance)
  MarketplaceCore.marketplace_treasury.transaction_count = MarketplaceCore.marketplace_treasury.transaction_count + 1
  MarketplaceCore.marketplace_treasury.last_updated = os.time()
  
  -- Log fee collection
  local fee_log = {
    request_id = request_id,
    fee_amount = fee_amount,
    total_balance = tostring(new_balance),
    timestamp = os.time()
  }
  
  print("MARKETPLACE_FEE_COLLECTED: " .. json.encode(fee_log))
  
  fee_result.success = true
  fee_result.fee_collected = fee_amount
  
  return fee_result
end

return debit_notice_handler