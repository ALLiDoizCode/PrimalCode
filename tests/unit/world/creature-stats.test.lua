-- Unit Tests for Creature Stats and Progression System (Story 4.4)
-- Tests core stat calculation, progression tracking, and utility functions

local luaunit = require('luaunit')

-- Mock the required modules for testing
package.path = package.path .. ';ao-processes/world/src/?.lua'
package.path = package.path .. ';shared/?.lua'

-- Create mock modules
local MockSeededRNG = {
    new = function(seed)
        return {
            next = function(self, min, max)
                max = max or min
                min = min or 0
                return min + (math.abs(seed or 0) % (max - min + 1))
            end
        }
    end
}

local MockProcessBase = {
    create_error_response = function(target, error_code, message)
        return {
            target = target,
            action = "Error-Response",
            data = {
                error_code = error_code,
                message = message
            }
        }
    end,
    create_adp_response = function(target, action, data)
        return {
            target = target,
            action = action,
            data = data
        }
    end
}

-- Override require to return our mocks
local original_require = require
function require(module)
    if module == 'shared.utils.seeded-rng' then
        return MockSeededRNG
    elseif module == 'shared.utils.process-base' then
        return MockProcessBase
    elseif module == 'shared.utils.handler-metadata' then
        return {
            create_handler = function(name, metadata, handler_func)
                return handler_func
            end
        }
    elseif module == 'shared.utils.message-logger' then
        return {
            info = function(...) end
        }
    else
        return original_require(module)
    end
end

-- Now load the module to test
local StatCalculator = require('ao-processes.world.src.utils.stat-calculator')

-- Test Suite for StatCalculator
TestStatCalculator = {}

function TestStatCalculator:setUp()
    -- Set up test data
    self.testCreature = {
        level = 15,
        hp_max = 75,
        attack = 45,
        defense = 40,
        speed = 55
    }
    
    self.testIVs = {
        hp = 25,
        attack = 31,
        defense = 15,
        speed = 20
    }
    
    self.testBaseStats = {
        hp = 35,
        attack = 30,
        defense = 25,
        speed = 40
    }
end

function TestStatCalculator:test_calculate_hp()
    local hp = StatCalculator.calculate_hp(35, 15, 25, 0, 1.0)
    
    -- HP should be calculated using: ((2 * base + IV + EV/4) * level / 100) + level + 10
    -- Expected: ((2 * 35 + 25 + 0) * 15 / 100) + 15 + 10
    local expected = math.floor(((2 * 35 + 25 + 0) * 15 / 100) + 15 + 10)
    
    luaunit.assertEquals(hp, expected)
    luaunit.assertTrue(hp > 0, "HP should be positive")
end

function TestStatCalculator:test_calculate_stat()
    local attack = StatCalculator.calculate_stat(30, 15, 31, 0, 1.0)
    
    -- Stat should be calculated using: ((2 * base + IV + EV/4) * level / 100) + 5
    local expected = math.floor(((2 * 30 + 31 + 0) * 15 / 100) + 5)
    
    luaunit.assertEquals(attack, expected)
    luaunit.assertTrue(attack > 0, "Attack should be positive")
end

function TestStatCalculator:test_generate_ivs()
    local ivs = StatCalculator.generate_ivs(12345, "normal")
    
    -- Should generate IVs for all required stats
    luaunit.assertNotNil(ivs.hp)
    luaunit.assertNotNil(ivs.attack)
    luaunit.assertNotNil(ivs.defense)
    luaunit.assertNotNil(ivs.speed)
    
    -- All IVs should be within valid range
    for _, iv in pairs(ivs) do
        luaunit.assertTrue(iv >= StatCalculator.CONSTANTS.IV_MIN)
        luaunit.assertTrue(iv <= StatCalculator.CONSTANTS.IV_MAX)
    end
end

function TestStatCalculator:test_generate_ivs_quality_tiers()
    local perfectIVs = StatCalculator.generate_ivs(12345, "perfect")
    local highIVs = StatCalculator.generate_ivs(12345, "high")
    local lowIVs = StatCalculator.generate_ivs(12345, "below_average")
    
    -- Perfect IVs should all be maximum
    for _, iv in pairs(perfectIVs) do
        luaunit.assertEquals(iv, StatCalculator.CONSTANTS.IV_MAX)
    end
    
    -- High IVs should be in upper range
    for _, iv in pairs(highIVs) do
        luaunit.assertTrue(iv >= 25)
    end
    
    -- Below average IVs should be in lower range
    for _, iv in pairs(lowIVs) do
        luaunit.assertTrue(iv <= 15)
    end
end

function TestStatCalculator:test_rate_iv_quality()
    local perfectIVs = {hp = 31, attack = 31, defense = 31, speed = 31}
    local averageIVs = {hp = 15, attack = 15, defense = 15, speed = 15}
    local poorIVs = {hp = 0, attack = 0, defense = 0, speed = 0}
    
    local perfectRating = StatCalculator.rate_iv_quality(perfectIVs)
    local averageRating = StatCalculator.rate_iv_quality(averageIVs)
    local poorRating = StatCalculator.rate_iv_quality(poorIVs)
    
    luaunit.assertEquals(perfectRating, 100)
    luaunit.assertTrue(averageRating < perfectRating and averageRating > poorRating)
    luaunit.assertEquals(poorRating, 0)
end

function TestStatCalculator:test_calculate_combat_effectiveness()
    local stats = {
        attack = 45,
        defense = 40,
        speed = 55,
        hp_max = 75,
        hp_current = 75
    }
    
    local effectiveness = StatCalculator.calculate_combat_effectiveness(stats, 15, nil, nil)
    
    luaunit.assertNotNil(effectiveness.total_effectiveness)
    luaunit.assertTrue(effectiveness.total_effectiveness >= 0)
    luaunit.assertTrue(effectiveness.total_effectiveness <= StatCalculator.CONSTANTS.COMBAT_EFFECTIVENESS_MAX)
    
    luaunit.assertNotNil(effectiveness.offensive_rating)
    luaunit.assertNotNil(effectiveness.defensive_rating)
    luaunit.assertNotNil(effectiveness.survivability_rating)
end

function TestStatCalculator:test_compare_stats()
    local creature1Stats = {hp_max = 75, attack = 45, defense = 40, speed = 55}
    local creature2Stats = {hp_max = 60, attack = 50, defense = 45, speed = 35}
    
    local comparison = StatCalculator.compare_stats(creature1Stats, creature2Stats)
    
    luaunit.assertNotNil(comparison.creature1_advantages)
    luaunit.assertNotNil(comparison.creature2_advantages)
    luaunit.assertNotNil(comparison.overall_winner)
    luaunit.assertNotNil(comparison.comparison_score)
    
    -- Should identify HP and speed advantages for creature1
    luaunit.assertTrue(table_contains(comparison.creature1_advantages, "hp_max"))
    luaunit.assertTrue(table_contains(comparison.creature1_advantages, "speed"))
    
    -- Should identify attack and defense advantages for creature2
    luaunit.assertTrue(table_contains(comparison.creature2_advantages, "attack"))
    luaunit.assertTrue(table_contains(comparison.creature2_advantages, "defense"))
end

function TestStatCalculator:test_calculate_growth_potential()
    local currentStats = {hp_max = 75, attack = 45, defense = 40, speed = 55}
    local baseStats = {hp = 35, attack = 30, defense = 25, speed = 40}
    local level = 15
    local ivs = self.testIVs
    
    local growth = StatCalculator.calculate_growth_potential(currentStats, baseStats, level, ivs, 100)
    
    luaunit.assertNotNil(growth.max_potential_stats)
    luaunit.assertNotNil(growth.stat_gains)
    luaunit.assertNotNil(growth.growth_rating)
    
    luaunit.assertTrue(growth.growth_remaining > 0)
    luaunit.assertTrue(growth.max_potential_total > growth.current_stat_total)
end

function TestStatCalculator:test_calculate_stat_efficiency()
    local stats = {hp_max = 75, attack = 45, defense = 40, speed = 55}
    local level = 15
    
    local efficiency = StatCalculator.calculate_stat_efficiency(stats, level)
    
    luaunit.assertNotNil(efficiency.total_stats)
    luaunit.assertNotNil(efficiency.average_stat)
    luaunit.assertNotNil(efficiency.efficiency_rating)
    luaunit.assertNotNil(efficiency.efficiency_tier)
    
    luaunit.assertTrue(efficiency.efficiency_rating >= 0)
    luaunit.assertTrue(efficiency.efficiency_rating <= 100)
    luaunit.assertTrue(efficiency.stat_per_level > 0)
end

function TestStatCalculator:test_predict_stats_at_level()
    local baseStats = self.testBaseStats
    local currentLevel = 15
    local targetLevel = 25
    local ivs = self.testIVs
    
    local predictedStats = StatCalculator.predict_stats_at_level(
        baseStats, currentLevel, targetLevel, ivs, {}, {}
    )
    
    luaunit.assertNotNil(predictedStats)
    luaunit.assertNotNil(predictedStats.hp)
    luaunit.assertNotNil(predictedStats.attack)
    luaunit.assertNotNil(predictedStats.defense)
    luaunit.assertNotNil(predictedStats.speed)
    
    -- Predicted stats should be higher than current level stats
    local currentHP = StatCalculator.calculate_hp(baseStats.hp, currentLevel, ivs.hp)
    luaunit.assertTrue(predictedStats.hp > currentHP)
end

function TestStatCalculator:test_analyze_team_stat_coverage()
    local team = {
        {
            final_stats = {hp_max = 75, attack = 45, defense = 40, speed = 55}
        },
        {
            final_stats = {hp_max = 60, attack = 60, defense = 55, speed = 40}
        },
        {
            final_stats = {hp_max = 90, attack = 35, defense = 70, speed = 30}
        }
    }
    
    local coverage = StatCalculator.analyze_team_stat_coverage(team)
    
    luaunit.assertEquals(coverage.team_size, 3)
    luaunit.assertNotNil(coverage.total_stats)
    luaunit.assertNotNil(coverage.average_stats)
    luaunit.assertNotNil(coverage.balance_score)
    luaunit.assertNotNil(coverage.strengths)
    luaunit.assertNotNil(coverage.weaknesses)
    
    luaunit.assertTrue(coverage.balance_score >= 0)
    luaunit.assertTrue(coverage.balance_score <= 100)
end

function TestStatCalculator:test_constants_validity()
    -- Test that all constants are within expected ranges
    luaunit.assertEquals(StatCalculator.CONSTANTS.IV_MIN, 0)
    luaunit.assertEquals(StatCalculator.CONSTANTS.IV_MAX, 31)
    luaunit.assertEquals(StatCalculator.CONSTANTS.LEVEL_MIN, 1)
    luaunit.assertEquals(StatCalculator.CONSTANTS.LEVEL_MAX, 100)
    luaunit.assertTrue(StatCalculator.CONSTANTS.COMBAT_EFFECTIVENESS_MAX > 0)
end

function TestStatCalculator:test_edge_cases()
    -- Test with minimum values
    local minHP = StatCalculator.calculate_hp(1, 1, 0, 0, 1.0)
    luaunit.assertTrue(minHP >= 1, "HP should never be less than 1")
    
    local minStat = StatCalculator.calculate_stat(1, 1, 0, 0, 1.0)
    luaunit.assertTrue(minStat >= 1, "Stats should never be less than 1")
    
    -- Test with maximum values
    local maxHP = StatCalculator.calculate_hp(255, 100, 31, 252, 1.1)
    luaunit.assertTrue(maxHP > 100, "Max level creature should have substantial HP")
    
    -- Test with empty team
    local emptyTeamCoverage = StatCalculator.analyze_team_stat_coverage({})
    luaunit.assertEquals(emptyTeamCoverage.team_size, 0)
end

-- Test Suite for CreatureProgression (selected functions)
TestCreatureProgression = {}

function TestCreatureProgression:setUp()
    -- Mock captured creature manager
    self.mockCreatureManager = {
        get_creature_by_id = function(self, agent_id, creature_id)
            if creature_id == "test_creature_001" then
                return {
                    tuxemon_id = "test_creature_001",
                    species_id = "test_species",
                    level = 15,
                    experience_points = 3375,
                    hp_max = 75,
                    attack = 45,
                    defense = 40,
                    speed = 55
                }
            else
                return nil, "Creature not found"
            end
        end,
        update_creature_stats = function(self, agent_id, creature_id, updates)
            return true, "Stats updated"
        end
    }
end

-- Helper function to check if table contains value
local function table_contains(table, value)
    for _, v in pairs(table) do
        if v == value then
            return true
        end
    end
    return false
end

-- Run the tests
if arg and arg[1] == "run_tests" then
    luaunit.LuaUnit.run()
end

return {
    TestStatCalculator = TestStatCalculator,
    TestCreatureProgression = TestCreatureProgression
}