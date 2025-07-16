-- Payment type definitions for Credit-Notice and Debit-Notice processing
local record payment

  -- Credit-Notice message structure
  record CreditNoticeMessage
    Action: string
    Data: CreditNoticeData
    Tags: CreditNoticeTags
  end

  record CreditNoticeData
    sender: string
    quantity: string
    message: string
  end

  record CreditNoticeTags
    ["X-Service-Type"]: string
    ["X-Request-ID"]: string
    ["X-Provider-ID"]: string
    [string]: string
  end

  -- Debit-Notice message structure
  record DebitNoticeMessage
    Action: string
    Data: DebitNoticeData
    Tags: DebitNoticeTags
  end

  record DebitNoticeData
    recipient: string
    quantity: string
    message: string
  end

  record DebitNoticeTags
    ["X-Service-Type"]: string
    ["X-Request-ID"]: string
    ["X-Provider-ID"]: string
    [string]: string
  end

  -- Payment transaction structure
  record PaymentTransaction
    transaction_id: string
    request_id: string
    from_process: string
    to_process: string
    amount: string
    service_type: string
    success: boolean
    timestamp: number
    credit_notice_sent: boolean
    debit_notice_sent: boolean
    x_metadata: {string: string}
  end

  -- Payment validation result
  record PaymentValidationResult
    valid: boolean
    error_message: string
    fraud_detected: boolean
    refund_required: boolean
  end

  -- Payment processing result
  record PaymentProcessingResult
    success: boolean
    transaction_id: string
    amount: string
    error_message: string
    refund_processed: boolean
  end

  -- Refund processing structure
  record RefundRequest
    original_transaction_id: string
    refund_amount: string
    reason: string
    request_id: string
    timestamp: number
  end

  -- Marketplace fee structure
  record MarketplaceFee
    fee_percentage: number
    fee_amount: string
    provider_amount: string
    marketplace_amount: string
  end

end

return payment