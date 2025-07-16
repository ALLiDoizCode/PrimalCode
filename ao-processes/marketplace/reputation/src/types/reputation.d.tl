local record ReputationTypes
  record ProviderMetrics
    provider_id: string
    response_times: {number}
    quality_scores: {number}
    completion_history: CompletionHistory
    reputation_trend: {ReputationTrend}
    last_updated: number
  end

  record CompletionHistory
    total_requests: number
    successful_requests: number
    failed_requests: number
    timeout_requests: number
  end

  record ReputationTrend
    date: number
    score: number
  end

  record RankingEntry
    provider_id: string
    score: number
    last_updated: number
  end

  record ReputationState
    provider_metrics: {string: ProviderMetrics}
    ranking_cache: {string: {RankingEntry}}
    last_cleanup: number
  end

  record ServiceOutcome
    provider_id: string
    request_id: string
    service_type: string
    response_time: number
    quality_score: number
    success: boolean
    timestamp: number
  end

  record ReputationScore
    overall_score: number
    response_time_score: number
    quality_score: number
    reliability_score: number
    trend_score: number
    computed_at: number
  end

  record QualityMetrics
    avg_response_time: number
    avg_quality_score: number
    completion_rate: number
    reliability_score: number
    trend_direction: string
    data_points: number
  end
end

return ReputationTypes