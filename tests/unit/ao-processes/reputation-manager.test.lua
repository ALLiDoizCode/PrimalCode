local busted = require('busted')
local json = require('json')

-- Mock global variables that would be available in AO environment
ReputationManager = {}
Handlers = {
  add = function(name, pattern, handler)
    -- Mock handler registration
  end,
  utils = {
    hasMatchingTag = function(tag, value)
      return function(msg)
        return msg.Tags and msg.Tags[tag] == value
      end
    end
  }
}

-- Mock message structure
local function createMockMessage(action, data, tags, timestamp)
  return {
    Action = action,
    Data = data or "",
    Tags = tags or {},
    Timestamp = timestamp or os.time() * 1000,
    reply = function(response)
      -- Mock reply function
      return response
    end
  }
end

-- Load the reputation manager components
local MetricsUtils = require('ao-processes/marketplace/reputation/src/utils/metrics-utils')
local QualityTracking = require('ao-processes/marketplace/reputation/src/handlers/quality-tracking')
local ReputationScoring = require('ao-processes/marketplace/reputation/src/handlers/reputation-scoring')
local HistoryManagement = require('ao-processes/marketplace/reputation/src/handlers/history-management')

describe("Reputation Manager AO Process", function()
  
  before_each(function()
    -- Reset global state before each test
    ReputationManager = {
      provider_metrics = {},
      ranking_cache = {},
      last_cleanup = 0
    }
  end)

  describe("MetricsUtils", function()
    
    it("should calculate average of numeric array", function()
      local values = {1, 2, 3, 4, 5}
      local result = MetricsUtils.calculate_average(values)
      assert.are.equal(3, result)
    end)

    it("should return 0 for empty array", function()
      local result = MetricsUtils.calculate_average({})
      assert.are.equal(0, result)
    end)

    it("should calculate standard deviation", function()
      local values = {1, 2, 3, 4, 5}
      local result = MetricsUtils.calculate_std_dev(values)
      assert.is_true(result > 0)
    end)

    it("should calculate trend direction", function()
      local trend_data = {
        {score = 0.5}, {score = 0.6}, {score = 0.7}, {score = 0.8}
      }
      local result = MetricsUtils.calculate_trend(trend_data)
      assert.are.equal("improving", result)
    end)

    it("should calculate quality metrics", function()
      local metrics = {
        response_times = {1.0, 2.0, 3.0},
        quality_scores = {0.8, 0.9, 0.7},
        completion_history = {
          total_requests = 10,
          successful_requests = 8,
          failed_requests = 2,
          timeout_requests = 1
        },
        reputation_trend = {
          {date = 1000, score = 0.7},
          {date = 2000, score = 0.8}
        }
      }
      
      local result = MetricsUtils.calculate_quality_metrics(metrics)
      
      assert.are.equal(2.0, result.avg_response_time)
      assert.are.equal(0.8, result.avg_quality_score)
      assert.are.equal(0.8, result.completion_rate)
      assert.are.equal("improving", result.trend_direction)
      assert.are.equal(10, result.data_points)
    end)

    it("should normalize score correctly", function()
      local result = MetricsUtils.normalize_score(5, 0, 10)
      assert.are.equal(0.5, result)
    end)

    it("should calculate response time score", function()
      local result = MetricsUtils.calculate_response_time_score(1.0, 3.0)
      assert.are.equal(1.0, result)
      
      local result2 = MetricsUtils.calculate_response_time_score(6.0, 3.0)
      assert.is_true(result2 < 1.0)
    end)

    it("should calculate composite score", function()
      local scores = {
        response_time = 0.9,
        quality = 0.8,
        reliability = 0.7
      }
      local result = MetricsUtils.calculate_composite_score(scores)
      assert.is_true(result > 0 and result <= 1)
    end)

  end)

  describe("QualityTracking", function()
    
    it("should track service outcome", function()
      local outcome = {
        provider_id = "test-provider",
        response_time = 2.5,
        quality_score = 0.8,
        success = true,
        timestamp = os.time() * 1000
      }
      
      local result = QualityTracking.track_service_outcome(outcome)
      assert.is_true(result)
      
      local metrics = ReputationManager.provider_metrics["test-provider"]
      assert.is_not_nil(metrics)
      assert.are.equal(1, #metrics.response_times)
      assert.are.equal(2.5, metrics.response_times[1])
      assert.are.equal(1, #metrics.quality_scores)
      assert.are.equal(0.8, metrics.quality_scores[1])
    end)

    it("should update completion history", function()
      local outcome = {
        provider_id = "test-provider",
        response_time = 2.5,
        quality_score = 0.8,
        success = true,
        timestamp = os.time() * 1000
      }
      
      QualityTracking.track_service_outcome(outcome)
      
      local metrics = ReputationManager.provider_metrics["test-provider"]
      assert.are.equal(1, metrics.completion_history.total_requests)
      assert.are.equal(1, metrics.completion_history.successful_requests)
      assert.are.equal(0, metrics.completion_history.failed_requests)
    end)

    it("should handle failed requests", function()
      local outcome = {
        provider_id = "test-provider",
        response_time = 35.0, -- Timeout
        quality_score = 0.0,
        success = false,
        timestamp = os.time() * 1000
      }
      
      QualityTracking.track_service_outcome(outcome)
      
      local metrics = ReputationManager.provider_metrics["test-provider"]
      assert.are.equal(1, metrics.completion_history.total_requests)
      assert.are.equal(0, metrics.completion_history.successful_requests)
      assert.are.equal(1, metrics.completion_history.failed_requests)
      assert.are.equal(1, metrics.completion_history.timeout_requests)
    end)

    it("should get quality metrics", function()
      -- Set up test data
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {1.0, 2.0, 3.0},
        quality_scores = {0.8, 0.9, 0.7},
        completion_history = {
          total_requests = 10,
          successful_requests = 8,
          failed_requests = 2,
          timeout_requests = 1
        },
        reputation_trend = {}
      }
      
      local result = QualityTracking.get_quality_metrics("test-provider")
      
      assert.is_not_nil(result)
      assert.are.equal(2.0, result.avg_response_time)
      assert.are.equal(0.8, result.completion_rate)
    end)

    it("should get response time statistics", function()
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {1.0, 2.0, 3.0, 4.0, 5.0}
      }
      
      local result = QualityTracking.get_response_time_stats("test-provider")
      
      assert.are.equal(3.0, result.avg)
      assert.are.equal(1.0, result.min)
      assert.are.equal(5.0, result.max)
      assert.are.equal(5, result.count)
    end)

    it("should check performance alerts", function()
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {10.0, 11.0, 12.0},
        quality_scores = {0.5, 0.4, 0.6},
        completion_history = {
          total_requests = 10,
          successful_requests = 5,
          failed_requests = 5,
          timeout_requests = 3
        },
        reputation_trend = {}
      }
      
      local alerts = QualityTracking.check_performance_alerts("test-provider")
      
      assert.is_true(#alerts > 0)
      assert.is_true(alerts[1].type == "response_time" or alerts[1].type == "quality_score" or alerts[1].type == "completion_rate")
    end)

  end)

  describe("ReputationScoring", function()
    
    it("should calculate reputation score", function()
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {2.0, 2.5, 3.0},
        quality_scores = {0.8, 0.9, 0.7},
        completion_history = {
          total_requests = 10,
          successful_requests = 9,
          failed_requests = 1,
          timeout_requests = 0
        },
        reputation_trend = {}
      }
      
      local score = ReputationScoring.calculate_reputation_score("test-provider")
      
      assert.is_true(score >= 0 and score <= 1)
      assert.is_true(score > 0.5) -- Should be above neutral for good metrics
    end)

    it("should return default score for unknown provider", function()
      local score = ReputationScoring.calculate_reputation_score("unknown-provider")
      assert.are.equal(0.5, score)
    end)

    it("should calculate response time score", function()
      local score1 = ReputationScoring.calculate_response_time_score(1.0)
      local score2 = ReputationScoring.calculate_response_time_score(5.0)
      
      assert.are.equal(1.0, score1)
      assert.is_true(score2 < 1.0)
    end)

    it("should calculate trend score", function()
      assert.are.equal(1.0, ReputationScoring.calculate_trend_score("improving"))
      assert.are.equal(0.7, ReputationScoring.calculate_trend_score("stable"))
      assert.are.equal(0.3, ReputationScoring.calculate_trend_score("declining"))
      assert.are.equal(0.5, ReputationScoring.calculate_trend_score("neutral"))
    end)

    it("should calculate confidence factor", function()
      assert.are.equal(0, ReputationScoring.calculate_confidence_factor(0))
      assert.are.equal(0.5, ReputationScoring.calculate_confidence_factor(5))
      assert.are.equal(1.0, ReputationScoring.calculate_confidence_factor(10))
      assert.are.equal(1.0, ReputationScoring.calculate_confidence_factor(100))
    end)

    it("should update reputation score and trend", function()
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {2.0},
        quality_scores = {0.8},
        completion_history = {
          total_requests = 1,
          successful_requests = 1,
          failed_requests = 0,
          timeout_requests = 0
        },
        reputation_trend = {}
      }
      
      local score = ReputationScoring.update_reputation_score("test-provider")
      
      assert.is_true(score > 0)
      assert.are.equal(1, #ReputationManager.provider_metrics["test-provider"].reputation_trend)
    end)

    it("should generate provider ranking", function()
      ReputationManager.provider_metrics["provider-1"] = {
        response_times = {1.0},
        quality_scores = {0.9},
        completion_history = {
          total_requests = 10,
          successful_requests = 10,
          failed_requests = 0,
          timeout_requests = 0
        },
        reputation_trend = {},
        last_updated = os.time() * 1000
      }
      
      ReputationManager.provider_metrics["provider-2"] = {
        response_times = {3.0},
        quality_scores = {0.7},
        completion_history = {
          total_requests = 10,
          successful_requests = 8,
          failed_requests = 2,
          timeout_requests = 1
        },
        reputation_trend = {},
        last_updated = os.time() * 1000
      }
      
      local ranking = ReputationScoring.generate_provider_ranking("test-service")
      
      assert.are.equal(2, #ranking)
      assert.is_true(ranking[1].score > ranking[2].score)
      assert.are.equal("provider-1", ranking[1].provider_id)
      assert.are.equal("provider-2", ranking[2].provider_id)
    end)

    it("should calculate selection bias", function()
      local bias1 = ReputationScoring.calculate_selection_bias("high-rep-provider")
      local bias2 = ReputationScoring.calculate_selection_bias("low-rep-provider")
      
      -- Both should be at least 0.1 (minimum bias)
      assert.is_true(bias1 >= 0.1)
      assert.is_true(bias2 >= 0.1)
    end)

    it("should get reputation breakdown", function()
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {2.0, 2.5, 3.0},
        quality_scores = {0.8, 0.9, 0.7},
        completion_history = {
          total_requests = 10,
          successful_requests = 9,
          failed_requests = 1,
          timeout_requests = 0
        },
        reputation_trend = {}
      }
      
      local breakdown = ReputationScoring.get_reputation_breakdown("test-provider")
      
      assert.is_not_nil(breakdown)
      assert.is_not_nil(breakdown.overall_score)
      assert.is_not_nil(breakdown.response_time_score)
      assert.is_not_nil(breakdown.quality_score)
      assert.is_not_nil(breakdown.reliability_score)
      assert.is_not_nil(breakdown.computed_at)
    end)

    it("should compare providers", function()
      ReputationManager.provider_metrics["provider-1"] = {
        response_times = {1.0},
        quality_scores = {0.9},
        completion_history = {
          total_requests = 10,
          successful_requests = 10,
          failed_requests = 0,
          timeout_requests = 0
        },
        reputation_trend = {}
      }
      
      ReputationManager.provider_metrics["provider-2"] = {
        response_times = {3.0},
        quality_scores = {0.7},
        completion_history = {
          total_requests = 10,
          successful_requests = 8,
          failed_requests = 2,
          timeout_requests = 1
        },
        reputation_trend = {}
      }
      
      local comparison = ReputationScoring.compare_providers("provider-1", "provider-2")
      
      assert.is_not_nil(comparison)
      assert.are.equal("provider-1", comparison.winner)
      assert.is_true(comparison.score_difference > 0)
    end)

  end)

  describe("HistoryManagement", function()
    
    it("should add service record", function()
      local outcome = {
        provider_id = "test-provider",
        timestamp = os.time() * 1000
      }
      
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {},
        quality_scores = {},
        completion_history = {
          total_requests = 0,
          successful_requests = 0,
          failed_requests = 0,
          timeout_requests = 0
        },
        reputation_trend = {},
        last_updated = 0
      }
      
      local result = HistoryManagement.add_service_record(outcome)
      
      assert.is_true(result)
      assert.are.equal(outcome.timestamp, ReputationManager.provider_metrics["test-provider"].last_updated)
    end)

    it("should update reputation trend", function()
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {2.0},
        quality_scores = {0.8},
        completion_history = {
          total_requests = 1,
          successful_requests = 1,
          failed_requests = 0,
          timeout_requests = 0
        },
        reputation_trend = {}
      }
      
      local result = HistoryManagement.update_reputation_trend("test-provider", os.time() * 1000)
      
      assert.is_true(result)
      assert.is_true(#ReputationManager.provider_metrics["test-provider"].reputation_trend > 0)
    end)

    it("should get reputation history", function()
      ReputationManager.provider_metrics["test-provider"] = {
        reputation_trend = {
          {date = os.time() * 1000 - 86400000, score = 0.7},
          {date = os.time() * 1000 - 43200000, score = 0.8},
          {date = os.time() * 1000, score = 0.9}
        }
      }
      
      local history = HistoryManagement.get_reputation_history("test-provider")
      
      assert.is_not_nil(history)
      assert.are.equal("test-provider", history.provider_id)
      assert.are.equal(3, #history.history)
      assert.are.equal("improving", history.summary.trend_direction)
    end)

    it("should get performance comparison", function()
      ReputationManager.provider_metrics["test-provider"] = {
        reputation_trend = {
          {date = os.time() * 1000 - 86400000 * 10, score = 0.6},
          {date = os.time() * 1000 - 86400000 * 5, score = 0.7},
          {date = os.time() * 1000, score = 0.8}
        }
      }
      
      local comparison = HistoryManagement.get_performance_comparison("test-provider", 7)
      
      assert.is_not_nil(comparison)
      assert.are.equal("test-provider", comparison.provider_id)
      assert.is_not_nil(comparison.recent_period)
      assert.is_not_nil(comparison.comparison_period)
      assert.is_number(comparison.improvement)
    end)

    it("should cleanup old data", function()
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {},
        quality_scores = {},
        reputation_trend = {
          {date = os.time() * 1000 - 86400000 * 31, score = 0.7}, -- Old data
          {date = os.time() * 1000, score = 0.8}  -- Recent data
        }
      }
      
      -- Add many response times to trigger cleanup
      for i = 1, 60 do
        table.insert(ReputationManager.provider_metrics["test-provider"].response_times, i)
      end
      
      local cleaned = HistoryManagement.cleanup_old_data(os.time() * 1000)
      
      assert.is_true(#cleaned > 0)
      assert.is_true(#ReputationManager.provider_metrics["test-provider"].response_times <= 30)
    end)

    it("should get activity timeline", function()
      ReputationManager.provider_metrics["test-provider"] = {
        reputation_trend = {
          {date = os.time() * 1000 - 7200000, score = 0.7},
          {date = os.time() * 1000 - 3600000, score = 0.8},
          {date = os.time() * 1000, score = 0.9}
        }
      }
      
      local timeline = HistoryManagement.get_activity_timeline("test-provider", "hourly")
      
      assert.is_not_nil(timeline)
      assert.are.equal("test-provider", timeline.provider_id)
      assert.are.equal("hourly", timeline.granularity)
      assert.is_true(#timeline.timeline > 0)
    end)

    it("should export history data", function()
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {2.0},
        quality_scores = {0.8},
        completion_history = {
          total_requests = 1,
          successful_requests = 1,
          failed_requests = 0,
          timeout_requests = 0
        },
        reputation_trend = {
          {date = os.time() * 1000, score = 0.8}
        }
      }
      
      local exported = HistoryManagement.export_history_data({"test-provider"})
      
      assert.is_not_nil(exported)
      assert.are.equal("json", exported.format)
      assert.is_not_nil(exported.providers["test-provider"])
    end)

    it("should archive provider data", function()
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {2.0},
        quality_scores = {0.8},
        completion_history = {
          total_requests = 1,
          successful_requests = 1,
          failed_requests = 0,
          timeout_requests = 0
        },
        reputation_trend = {}
      }
      
      local result = HistoryManagement.archive_provider_data("test-provider")
      
      assert.is_true(result)
      assert.is_nil(ReputationManager.provider_metrics["test-provider"])
      assert.is_not_nil(ReputationManager.archived_providers["test-provider"])
    end)

    it("should restore archived provider data", function()
      -- First archive data
      ReputationManager.provider_metrics["test-provider"] = {
        response_times = {2.0},
        quality_scores = {0.8},
        completion_history = {
          total_requests = 1,
          successful_requests = 1,
          failed_requests = 0,
          timeout_requests = 0
        },
        reputation_trend = {}
      }
      
      HistoryManagement.archive_provider_data("test-provider")
      
      -- Then restore
      local result = HistoryManagement.restore_provider_data("test-provider")
      
      assert.is_true(result)
      assert.is_not_nil(ReputationManager.provider_metrics["test-provider"])
      assert.is_nil(ReputationManager.archived_providers["test-provider"])
    end)

  end)

end)