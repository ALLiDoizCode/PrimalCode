-- Payment Handler
-- Handles Credit-Notice and Debit-Notice messages for marketplace payments

local types = require('types.marketplace')
local json = require('utils.json')
local state_manager = require('utils.state-manager')

local payment_handler = {}

-- Validate payment message
function payment_handler.validate_payment(msg): boolean, string
    if not msg.Data then
        return false, "Missing message data"
    end
    
    local data = msg.Data
    
    if not data.quantity or type(data.quantity) ~= "string" then
        return false, "Invalid or missing quantity"
    end
    
    -- Validate quantity is a valid number
    local quantity_num = tonumber(data.quantity)
    if not quantity_num or quantity_num <= 0 then
        return false, "Invalid quantity - must be a positive number"
    end
    
    return true, ""
end

-- Extract payment metadata
function payment_handler.extract_payment_metadata(msg): {string: string}
    local metadata: {string: string} = {}
    
    if msg.Tags then
        for key, value in pairs(msg.Tags) do
            if type(key) == "string" and string.sub(key, 1, 2) == "X-" then
                metadata[key] = value
            end
        end
    end
    
    return metadata
end

-- Generate transaction ID
function payment_handler.generate_transaction_id(): string
    return "txn_" .. os.time() .. "_" .. math.random(1000, 9999)
end

-- Handle Credit-Notice (payment received)
function payment_handler.handle_credit_notice(msg): string
    print("💰 Processing credit notice from: " .. msg.From)
    
    -- Validate the message
    local is_valid, error_message = payment_handler.validate_payment(msg)
    if not is_valid then
        print("❌ Invalid credit notice: " .. error_message)
        
        return json.encode({
            success = false,
            error = error_message,
            timestamp = os.time()
        })
    end
    
    local data = msg.Data
    local metadata = payment_handler.extract_payment_metadata(msg)
    
    -- Extract key metadata
    local request_id = metadata["X-Request-ID"]
    local service_type = metadata["X-Service-Type"] or "unknown"
    local provider_id = metadata["X-Provider-ID"]
    
    print("💰 Credit notice details:")
    print("  - Amount: " .. data.quantity)
    print("  - Request ID: " .. (request_id or "N/A"))
    print("  - Service Type: " .. service_type)
    print("  - Provider ID: " .. (provider_id or "N/A"))
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Create transaction record
    local transaction: types.MarketplaceTransaction = {
        transaction_id = payment_handler.generate_transaction_id(),
        request_id = request_id or "unknown",
        from_process = msg.From,
        to_process = "marketplace",
        amount = data.quantity,
        service_type = service_type,
        success = true,
        timestamp = os.time(),
        credit_notice_sent = true,
        debit_notice_sent = false
    }
    
    -- Save transaction
    local success = state_manager.add_transaction(marketplace_state, transaction)
    
    if success then
        print("✅ Credit notice processed: " .. transaction.transaction_id)
        
        -- Update marketplace financial state if needed
        -- This could trigger provider payment distribution
        
        return json.encode({
            success = true,
            transaction_id = transaction.transaction_id,
            amount = data.quantity,
            request_id = request_id,
            timestamp = os.time()
        })
    else
        print("❌ Credit notice processing failed")
        
        return json.encode({
            success = false,
            error = "Failed to process credit notice",
            timestamp = os.time()
        })
    end
end

-- Handle Debit-Notice (payment sent)
function payment_handler.handle_debit_notice(msg): string
    print("💸 Processing debit notice from: " .. msg.From)
    
    -- Validate the message
    local is_valid, error_message = payment_handler.validate_payment(msg)
    if not is_valid then
        print("❌ Invalid debit notice: " .. error_message)
        
        return json.encode({
            success = false,
            error = error_message,
            timestamp = os.time()
        })
    end
    
    local data = msg.Data
    local metadata = payment_handler.extract_payment_metadata(msg)
    
    -- Extract key metadata
    local request_id = metadata["X-Request-ID"]
    local service_type = metadata["X-Service-Type"] or "unknown"
    local provider_id = metadata["X-Provider-ID"]
    
    print("💸 Debit notice details:")
    print("  - Amount: " .. data.quantity)
    print("  - Recipient: " .. (data.recipient or "N/A"))
    print("  - Request ID: " .. (request_id or "N/A"))
    print("  - Service Type: " .. service_type)
    print("  - Provider ID: " .. (provider_id or "N/A"))
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Create transaction record
    local transaction: types.MarketplaceTransaction = {
        transaction_id = payment_handler.generate_transaction_id(),
        request_id = request_id or "unknown",
        from_process = "marketplace",
        to_process = data.recipient or "unknown",
        amount = data.quantity,
        service_type = service_type,
        success = true,
        timestamp = os.time(),
        credit_notice_sent = false,
        debit_notice_sent = true
    }
    
    -- Save transaction
    local success = state_manager.add_transaction(marketplace_state, transaction)
    
    if success then
        print("✅ Debit notice processed: " .. transaction.transaction_id)
        
        -- Update provider reputation/payment tracking if applicable
        if provider_id then
            local provider = state_manager.get_provider(marketplace_state, provider_id)
            if provider then
                -- Update provider's last payment timestamp or other metrics
                provider.metadata.last_seen = os.time()
                state_manager.update_provider(marketplace_state, provider)
            end
        end
        
        return json.encode({
            success = true,
            transaction_id = transaction.transaction_id,
            amount = data.quantity,
            recipient = data.recipient,
            request_id = request_id,
            timestamp = os.time()
        })
    else
        print("❌ Debit notice processing failed")
        
        return json.encode({
            success = false,
            error = "Failed to process debit notice",
            timestamp = os.time()
        })
    end
end

-- Handle payment escrow (hold payment during processing)
function payment_handler.handle_escrow_payment(request_id: string, amount: string, from_process: string): boolean
    print("🔒 Escrowing payment for request: " .. request_id)
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Create escrow transaction
    local transaction: types.MarketplaceTransaction = {
        transaction_id = payment_handler.generate_transaction_id(),
        request_id = request_id,
        from_process = from_process,
        to_process = "marketplace_escrow",
        amount = amount,
        service_type = "escrow",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = false,
        debit_notice_sent = false
    }
    
    -- Save escrow transaction
    local success = state_manager.add_transaction(marketplace_state, transaction)
    
    if success then
        print("✅ Payment escrowed: " .. transaction.transaction_id)
        return true
    else
        print("❌ Payment escrow failed")
        return false
    end
end

-- Handle payment release from escrow
function payment_handler.handle_release_payment(request_id: string, recipient: string): boolean
    print("🔓 Releasing escrowed payment for request: " .. request_id)
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Find escrow transaction
    local escrow_transaction: types.MarketplaceTransaction | nil = nil
    for _, transaction in pairs(marketplace_state.transactions) do
        if transaction.request_id == request_id and transaction.to_process == "marketplace_escrow" then
            escrow_transaction = transaction
            break
        end
    end
    
    if not escrow_transaction then
        print("❌ No escrow transaction found for request: " .. request_id)
        return false
    end
    
    -- Create release transaction
    local release_transaction: types.MarketplaceTransaction = {
        transaction_id = payment_handler.generate_transaction_id(),
        request_id = request_id,
        from_process = "marketplace_escrow",
        to_process = recipient,
        amount = escrow_transaction.amount,
        service_type = "release",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = false,
        debit_notice_sent = true
    }
    
    -- Save release transaction
    local success = state_manager.add_transaction(marketplace_state, release_transaction)
    
    if success then
        print("✅ Payment released: " .. release_transaction.transaction_id)
        return true
    else
        print("❌ Payment release failed")
        return false
    end
end

-- Handle payment refund
function payment_handler.handle_refund_payment(request_id: string): boolean
    print("🔄 Refunding payment for request: " .. request_id)
    
    -- Load marketplace state
    local marketplace_state = state_manager.load_state()
    
    -- Find original payment transaction
    local original_transaction: types.MarketplaceTransaction | nil = nil
    for _, transaction in pairs(marketplace_state.transactions) do
        if transaction.request_id == request_id and transaction.to_process == "marketplace" then
            original_transaction = transaction
            break
        end
    end
    
    if not original_transaction then
        print("❌ No original transaction found for request: " .. request_id)
        return false
    end
    
    -- Create refund transaction
    local refund_transaction: types.MarketplaceTransaction = {
        transaction_id = payment_handler.generate_transaction_id(),
        request_id = request_id,
        from_process = "marketplace",
        to_process = original_transaction.from_process,
        amount = original_transaction.amount,
        service_type = "refund",
        success = true,
        timestamp = os.time(),
        credit_notice_sent = false,
        debit_notice_sent = true
    }
    
    -- Save refund transaction
    local success = state_manager.add_transaction(marketplace_state, refund_transaction)
    
    if success then
        print("✅ Payment refunded: " .. refund_transaction.transaction_id)
        return true
    else
        print("❌ Payment refund failed")
        return false
    end
end

return payment_handler