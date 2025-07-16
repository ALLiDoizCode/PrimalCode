-- Token utility functions for payment processing
local json = require("./json")

local token_utils = {}

-- Generate unique transaction ID
function token_utils.generate_transaction_id(): string
  local timestamp = os.time()
  local random_suffix = math.random(10000, 99999)
  return "txn_" .. timestamp .. "_" .. random_suffix
end

-- Parse X-prefix metadata from message tags
function token_utils.parse_x_metadata(tags: {string: string}): {string: string}
  local x_metadata = {}
  
  for key, value in pairs(tags) do
    if key:sub(1, 2) == "X-" then
      x_metadata[key] = value
    end
  end
  
  return x_metadata
end

-- Validate payment amount format
function token_utils.validate_amount(amount: string): boolean, string
  if not amount or amount == "" then
    return false, "Amount cannot be empty"
  end
  
  local num_amount = tonumber(amount)
  if not num_amount then
    return false, "Amount must be a valid number"
  end
  
  if num_amount <= 0 then
    return false, "Amount must be positive"
  end
  
  return true, ""
end

-- Calculate marketplace fee
function token_utils.calculate_marketplace_fee(amount: string, fee_percentage: number): string, string
  local num_amount = tonumber(amount) or 0
  local fee_amount = math.floor(num_amount * fee_percentage / 100)
  local provider_amount = num_amount - fee_amount
  
  return tostring(fee_amount), tostring(provider_amount)
end

-- Validate AO process address format
function token_utils.validate_process_address(address: string): boolean, string
  if not address or address == "" then
    return false, "Process address cannot be empty"
  end
  
  -- Basic AO process ID validation (43 character base64-like string)
  if #address ~= 43 then
    return false, "Process address must be 43 characters long"
  end
  
  -- Check for valid base64-like characters
  if not address:match("^[A-Za-z0-9_-]+$") then
    return false, "Process address contains invalid characters"
  end
  
  return true, ""
end

-- Create payment transaction record
function token_utils.create_payment_transaction(
  transaction_id: string,
  request_id: string,
  from_process: string,
  to_process: string,
  amount: string,
  service_type: string,
  x_metadata: {string: string}
): {string: any}
  return {
    transaction_id = transaction_id,
    request_id = request_id,
    from_process = from_process,
    to_process = to_process,
    amount = amount,
    service_type = service_type,
    success = false,
    timestamp = os.time(),
    credit_notice_sent = false,
    debit_notice_sent = false,
    x_metadata = x_metadata
  }
end

-- Format payment error message
function token_utils.format_error_message(error_code: string, details: string): string
  if error_code == "INVALID_AMOUNT" then
    return "Invalid payment amount: " .. details
  elseif error_code == "INVALID_SENDER" then
    return "Invalid sender address: " .. details
  elseif error_code == "INVALID_RECIPIENT" then
    return "Invalid recipient address: " .. details
  elseif error_code == "INSUFFICIENT_BALANCE" then
    return "Insufficient balance: " .. details
  elseif error_code == "FRAUD_DETECTED" then
    return "Fraud detected: " .. details
  elseif error_code == "VALIDATION_FAILED" then
    return "Payment validation failed: " .. details
  elseif error_code == "TIMEOUT_ERROR" then
    return "Payment timeout: " .. details
  elseif error_code == "REFUND_FAILED" then
    return "Refund processing failed: " .. details
  else
    return "Unknown error: " .. details
  end
end

-- Log payment transaction
function token_utils.log_payment_transaction(transaction: {string: any}, action: string)
  local log_entry = {
    timestamp = os.time(),
    action = action,
    transaction_id = transaction.transaction_id,
    request_id = transaction.request_id,
    amount = transaction.amount,
    success = transaction.success,
    details = transaction
  }
  
  -- In a real implementation, this would write to a proper logging system
  print("PAYMENT_LOG: " .. json.encode(log_entry))
end

-- Validate request timeout
function token_utils.is_request_expired(created_at: number, timeout_seconds: number): boolean
  local current_time = os.time()
  return (current_time - created_at) > timeout_seconds
end

return token_utils