-- Primal token integration handler for seamless payment flow
local json = require("../utils/json")
local token_utils = require("../utils/token-utils")

local token_integration = {}

-- Primal token process configuration
local PRIMAL_TOKEN_PROCESS_ID = "primal_token_process_001"
local TOKEN_BALANCE_TIMEOUT = 10 -- seconds
local TOKEN_TRANSFER_TIMEOUT = 30 -- seconds

-- Initialize token integration system
function token_integration.initialize_token_integration()
  if not MarketplaceCore.token_integration then
    MarketplaceCore.token_integration = {
      primal_token_process_id = PRIMAL_TOKEN_PROCESS_ID,
      token_balance_cache = {},
      pending_transfers = {},
      last_sync_timestamp = os.time(),
      sync_status = "initialized"
    }
  end
end

-- Create seamless integration with Primal token processes
function token_integration.integrate_with_primal_token(action: string, data: {string: any}): {string: any}
  token_integration.initialize_token_integration()
  
  local integration_result = {
    success = false,
    result = {},
    error_message = ""
  }
  
  if action == "balance_check" then
    integration_result = token_integration.check_token_balance(data.address)
  elseif action == "transfer_tokens" then
    integration_result = token_integration.transfer_tokens(data)
  elseif action == "validate_transfer" then
    integration_result = token_integration.validate_token_transfer(data)
  elseif action == "sync_balance" then
    integration_result = token_integration.sync_token_balance(data.address)
  elseif action == "authorize_payment" then
    integration_result = token_integration.authorize_token_payment(data)
  else
    integration_result.error_message = "Unknown token integration action: " .. action
  end
  
  return integration_result
end

-- Check token balance with caching
function token_integration.check_token_balance(address: string): {string: any}
  local balance_result = {
    success = false,
    balance = "0",
    cached = false,
    error_message = ""
  }
  
  -- Validate address
  local address_valid, address_error = token_utils.validate_process_address(address)
  if not address_valid then
    balance_result.error_message = "Invalid address: " .. address_error
    return balance_result
  end
  
  -- Check cache first
  local cache = MarketplaceCore.token_integration.token_balance_cache
  local cached_balance = cache[address]
  
  if cached_balance and (os.time() - cached_balance.timestamp) < TOKEN_BALANCE_TIMEOUT then
    balance_result.success = true
    balance_result.balance = cached_balance.balance
    balance_result.cached = true
    return balance_result
  end
  
  -- Query Primal token process
  local balance_query_result = token_integration.query_primal_token_balance(address)
  if balance_query_result.success then
    -- Update cache
    cache[address] = {
      balance = balance_query_result.balance,
      timestamp = os.time()
    }
    
    balance_result.success = true
    balance_result.balance = balance_query_result.balance
    balance_result.cached = false
  else
    balance_result.error_message = balance_query_result.error_message
  end
  
  return balance_result
end

-- Query Primal token process for balance
function token_integration.query_primal_token_balance(address: string): {string: any}
  local query_result = {
    success = false,
    balance = "0",
    error_message = ""
  }
  
  -- In a real implementation, this would send a message to the Primal token process
  -- For now, we simulate the balance query
  
  -- Simulate token balance query
  local simulated_balance = "1000000" -- 1 million tokens
  
  -- Log the balance query
  local balance_query_log = {
    action = "BALANCE_QUERY",
    address = address,
    primal_token_process_id = PRIMAL_TOKEN_PROCESS_ID,
    timestamp = os.time(),
    result = simulated_balance
  }
  
  print("TOKEN_BALANCE_QUERY: " .. json.encode(balance_query_log))
  
  query_result.success = true
  query_result.balance = simulated_balance
  
  return query_result
end

-- Transfer tokens with validation and authorization
function token_integration.transfer_tokens(transfer_data: {string: any}): {string: any}
  local transfer_result = {
    success = false,
    transfer_id = "",
    error_message = ""
  }
  
  -- Validate transfer data
  local validation_result = token_integration.validate_token_transfer(transfer_data)
  if not validation_result.valid then
    transfer_result.error_message = validation_result.error_message
    return transfer_result
  end
  
  -- Check sender balance
  local balance_check = token_integration.check_token_balance(transfer_data.from_address)
  if not balance_check.success then
    transfer_result.error_message = "Failed to check sender balance: " .. balance_check.error_message
    return transfer_result
  end
  
  local sender_balance = tonumber(balance_check.balance) or 0
  local transfer_amount = tonumber(transfer_data.amount) or 0
  
  if sender_balance < transfer_amount then
    transfer_result.error_message = "Insufficient balance. Required: " .. transfer_data.amount .. ", Available: " .. balance_check.balance
    return transfer_result
  end
  
  -- Generate transfer ID
  local transfer_id = token_utils.generate_transaction_id()
  
  -- Execute token transfer
  local execute_result = token_integration.execute_token_transfer(transfer_data, transfer_id)
  if not execute_result.success then
    transfer_result.error_message = execute_result.error_message
    return transfer_result
  end
  
  transfer_result.success = true
  transfer_result.transfer_id = transfer_id
  
  return transfer_result
end

-- Validate token transfer parameters
function token_integration.validate_token_transfer(transfer_data: {string: any}): {string: any}
  local validation_result = {
    valid = false,
    error_message = ""
  }
  
  -- Check required fields
  if not transfer_data.from_address or transfer_data.from_address == "" then
    validation_result.error_message = "From address is required"
    return validation_result
  end
  
  if not transfer_data.to_address or transfer_data.to_address == "" then
    validation_result.error_message = "To address is required"
    return validation_result
  end
  
  if not transfer_data.amount or transfer_data.amount == "" then
    validation_result.error_message = "Transfer amount is required"
    return validation_result
  end
  
  -- Validate addresses
  local from_valid, from_error = token_utils.validate_process_address(transfer_data.from_address)
  if not from_valid then
    validation_result.error_message = "Invalid from address: " .. from_error
    return validation_result
  end
  
  local to_valid, to_error = token_utils.validate_process_address(transfer_data.to_address)
  if not to_valid then
    validation_result.error_message = "Invalid to address: " .. to_error
    return validation_result
  end
  
  -- Validate amount
  local amount_valid, amount_error = token_utils.validate_amount(transfer_data.amount)
  if not amount_valid then
    validation_result.error_message = "Invalid amount: " .. amount_error
    return validation_result
  end
  
  validation_result.valid = true
  return validation_result
end

-- Execute token transfer via Primal token process
function token_integration.execute_token_transfer(transfer_data: {string: any}, transfer_id: string): {string: any}
  local execute_result = {
    success = false,
    error_message = ""
  }
  
  -- Create transfer record
  local transfer_record = {
    transfer_id = transfer_id,
    from_address = transfer_data.from_address,
    to_address = transfer_data.to_address,
    amount = transfer_data.amount,
    purpose = transfer_data.purpose or "marketplace_payment",
    timestamp = os.time(),
    status = "pending",
    primal_token_process_id = PRIMAL_TOKEN_PROCESS_ID
  }
  
  -- Store in pending transfers
  if not MarketplaceCore.token_integration.pending_transfers then
    MarketplaceCore.token_integration.pending_transfers = {}
  end
  
  MarketplaceCore.token_integration.pending_transfers[transfer_id] = transfer_record
  
  -- In a real implementation, this would send Transfer message to Primal token process
  -- For now, we simulate successful transfer
  
  -- Simulate transfer execution
  transfer_record.status = "completed"
  transfer_record.completed_at = os.time()
  
  -- Log transfer execution
  local transfer_log = {
    action = "TOKEN_TRANSFER",
    transfer_id = transfer_id,
    from_address = transfer_data.from_address,
    to_address = transfer_data.to_address,
    amount = transfer_data.amount,
    primal_token_process_id = PRIMAL_TOKEN_PROCESS_ID,
    timestamp = os.time(),
    status = "completed"
  }
  
  print("TOKEN_TRANSFER_EXECUTED: " .. json.encode(transfer_log))
  
  -- Update balance cache
  token_integration.invalidate_balance_cache(transfer_data.from_address)
  token_integration.invalidate_balance_cache(transfer_data.to_address)
  
  execute_result.success = true
  return execute_result
end

-- Sync token balance with Primal token process
function token_integration.sync_token_balance(address: string): {string: any}
  local sync_result = {
    success = false,
    balance = "0",
    error_message = ""
  }
  
  -- Force fresh balance query
  token_integration.invalidate_balance_cache(address)
  
  -- Query fresh balance
  local balance_result = token_integration.check_token_balance(address)
  if balance_result.success then
    sync_result.success = true
    sync_result.balance = balance_result.balance
    
    -- Update sync status
    MarketplaceCore.token_integration.last_sync_timestamp = os.time()
    MarketplaceCore.token_integration.sync_status = "synchronized"
  else
    sync_result.error_message = balance_result.error_message
    MarketplaceCore.token_integration.sync_status = "sync_failed"
  end
  
  return sync_result
end

-- Authorize token payment
function token_integration.authorize_token_payment(payment_data: {string: any}): {string: any}
  local auth_result = {
    authorized = false,
    error_message = ""
  }
  
  -- Check token balance
  local balance_check = token_integration.check_token_balance(payment_data.from_address)
  if not balance_check.success then
    auth_result.error_message = "Failed to verify token balance: " .. balance_check.error_message
    return auth_result
  end
  
  -- Validate sufficient balance
  local balance = tonumber(balance_check.balance) or 0
  local payment_amount = tonumber(payment_data.amount) or 0
  
  if balance < payment_amount then
    auth_result.error_message = "Insufficient token balance for payment"
    return auth_result
  end
  
  -- Additional authorization checks
  local additional_auth = token_integration.perform_additional_authorization_checks(payment_data)
  if not additional_auth.authorized then
    auth_result.error_message = additional_auth.error_message
    return auth_result
  end
  
  auth_result.authorized = true
  return auth_result
end

-- Perform additional authorization checks
function token_integration.perform_additional_authorization_checks(payment_data: {string: any}): {string: any}
  local auth_result = {
    authorized = false,
    error_message = ""
  }
  
  -- Check for payment limits
  local payment_amount = tonumber(payment_data.amount) or 0
  local max_payment_limit = 50000 -- Maximum payment limit
  
  if payment_amount > max_payment_limit then
    auth_result.error_message = "Payment amount exceeds maximum limit: " .. max_payment_limit
    return auth_result
  end
  
  -- Check for rate limiting
  local rate_limit_check = token_integration.check_payment_rate_limit(payment_data.from_address)
  if not rate_limit_check.within_limit then
    auth_result.error_message = "Payment rate limit exceeded: " .. rate_limit_check.reason
    return auth_result
  end
  
  auth_result.authorized = true
  return auth_result
end

-- Check payment rate limit
function token_integration.check_payment_rate_limit(address: string): {string: any}
  local rate_limit_result = {
    within_limit = true,
    reason = ""
  }
  
  -- Simple rate limiting: max 10 payments per minute
  local max_payments_per_minute = 10
  local current_time = os.time()
  local payments_in_last_minute = 0
  
  -- Count recent payments
  if MarketplaceCore.transaction_history then
    for _, tx in ipairs(MarketplaceCore.transaction_history) do
      if tx.from_process == address and (current_time - tx.timestamp) < 60 then
        payments_in_last_minute = payments_in_last_minute + 1
      end
    end
  end
  
  if payments_in_last_minute >= max_payments_per_minute then
    rate_limit_result.within_limit = false
    rate_limit_result.reason = "Too many payments in last minute: " .. payments_in_last_minute
  end
  
  return rate_limit_result
end

-- Invalidate balance cache for address
function token_integration.invalidate_balance_cache(address: string)
  if MarketplaceCore.token_integration.token_balance_cache then
    MarketplaceCore.token_integration.token_balance_cache[address] = nil
  end
end

-- Get token integration status
function token_integration.get_integration_status(): {string: any}
  token_integration.initialize_token_integration()
  
  local status = {
    primal_token_process_id = MarketplaceCore.token_integration.primal_token_process_id,
    last_sync_timestamp = MarketplaceCore.token_integration.last_sync_timestamp,
    sync_status = MarketplaceCore.token_integration.sync_status,
    cached_balances_count = 0,
    pending_transfers_count = 0
  }
  
  -- Count cached balances
  if MarketplaceCore.token_integration.token_balance_cache then
    for _ in pairs(MarketplaceCore.token_integration.token_balance_cache) do
      status.cached_balances_count = status.cached_balances_count + 1
    end
  end
  
  -- Count pending transfers
  if MarketplaceCore.token_integration.pending_transfers then
    for _ in pairs(MarketplaceCore.token_integration.pending_transfers) do
      status.pending_transfers_count = status.pending_transfers_count + 1
    end
  end
  
  return status
end

return token_integration