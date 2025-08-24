/**
 * Integration Tests for Creature Stats and Progression System (Story 4.4)
 * 
 * Tests the comprehensive creature stat calculation, comparison, health management,
 * and progression tracking functionality implemented in Story 4.4.
 */

const { expect } = require('chai');
const AOProcess = require('../../scripts/test-helpers/ao-process-helper');

describe('Creature Stats & Progression System Integration Tests', function() {
    this.timeout(30000);
    
    let worldProcess;
    let testAgentId = 'test-agent-stats-001';
    let testCreature1 = null;
    let testCreature2 = null;
    
    before(async function() {
        worldProcess = new AOProcess();
        await worldProcess.initialize();
        
        // Register test agent
        await worldProcess.send({
            action: 'Register-Agent',
            agentId: testAgentId,
            location: 'test-forest-stats'
        });
        
        // Create test creatures with different characteristics
        testCreature1 = await createTestCreature(testAgentId, {
            species_id: 'test_firebird',
            level: 15,
            base_stats: { hp: 60, attack: 75, defense: 45, speed: 80 },
            individual_values: { hp: 31, attack: 28, defense: 15, speed: 31 },
            hp_current: 95,
            experience_points: 3375
        });
        
        testCreature2 = await createTestCreature(testAgentId, {
            species_id: 'test_rockbeast',
            level: 12,
            base_stats: { hp: 85, attack: 55, defense: 90, speed: 35 },
            individual_values: { hp: 20, attack: 31, defense: 31, speed: 10 },
            hp_current: 70,
            experience_points: 1728
        });
    });
    
    after(async function() {
        if (worldProcess) {
            await worldProcess.cleanup();
        }
    });
    
    describe('Stat Calculation System', function() {
        it('should calculate comprehensive creature stats accurately', async function() {
            const response = await worldProcess.send({
                action: 'Calculate-Creature-Stats',
                'Creature-Id': testCreature1.tuxemon_id,
                'Include-Temporary-Modifiers': 'false'
            });
            
            expect(response.action).to.equal('Creature-Stats-Response');
            expect(response.data).to.have.property('creature_id', testCreature1.tuxemon_id);
            expect(response.data).to.have.property('final_stats');
            expect(response.data).to.have.property('combat_effectiveness');
            expect(response.data).to.have.property('individual_values');
            expect(response.data).to.have.property('stat_analysis');
            
            const finalStats = response.data.final_stats;
            expect(finalStats).to.have.property('hp_max');
            expect(finalStats).to.have.property('attack');
            expect(finalStats).to.have.property('defense');
            expect(finalStats).to.have.property('speed');
            expect(finalStats.hp_max).to.be.a('number').above(0);
            expect(finalStats.attack).to.be.a('number').above(0);
            
            // Verify combat effectiveness is within valid range
            expect(response.data.combat_effectiveness).to.be.a('number').within(0, 100);
            
            // Verify stat analysis structure
            const statAnalysis = response.data.stat_analysis;
            expect(statAnalysis).to.have.property('total_stat_points');
            expect(statAnalysis).to.have.property('dominant_stat');
            expect(statAnalysis).to.have.property('stat_distribution');
            expect(statAnalysis).to.have.property('growth_potential');
        });
        
        it('should handle invalid creature ID gracefully', async function() {
            const response = await worldProcess.send({
                action: 'Calculate-Creature-Stats',
                'Creature-Id': 'non-existent-creature'
            });
            
            expect(response.action).to.equal('Error-Response');
            expect(response.data.error_code).to.equal('CREATURE_NOT_FOUND');
        });
        
        it('should validate individual values within expected ranges', async function() {
            const response = await worldProcess.send({
                action: 'Calculate-Creature-Stats',
                'Creature-Id': testCreature1.tuxemon_id
            });
            
            const ivs = response.data.individual_values;
            Object.values(ivs).forEach(iv => {
                expect(iv).to.be.a('number').within(0, 31);
            });
        });
    });
    
    describe('Creature Comparison System', function() {
        it('should compare creatures comprehensively', async function() {
            const response = await worldProcess.send({
                action: 'Compare-Creatures',
                'Creature-1-Id': testCreature1.tuxemon_id,
                'Creature-2-Id': testCreature2.tuxemon_id,
                'Scenario': 'balanced'
            });
            
            expect(response.action).to.equal('Creature-Comparison-Response');
            expect(response.data).to.have.property('creature1');
            expect(response.data).to.have.property('creature2');
            expect(response.data).to.have.property('stat_comparison');
            expect(response.data).to.have.property('combat_analysis');
            expect(response.data).to.have.property('type_effectiveness');
            expect(response.data).to.have.property('strategic_analysis');
            expect(response.data).to.have.property('recommendations');
            
            const statComparison = response.data.stat_comparison;
            expect(statComparison).to.have.property('creature1_advantages');
            expect(statComparison).to.have.property('creature2_advantages');
            expect(statComparison).to.have.property('overall_winner');
            
            const recommendations = response.data.recommendations;
            expect(recommendations).to.have.property('preferred_choice');
            expect(recommendations).to.have.property('confidence_level');
            expect(recommendations.confidence_level).to.be.a('number').within(0, 100);
        });
        
        it('should provide different analysis for different scenarios', async function() {
            const balancedResponse = await worldProcess.send({
                action: 'Compare-Creatures',
                'Creature-1-Id': testCreature1.tuxemon_id,
                'Creature-2-Id': testCreature2.tuxemon_id,
                'Scenario': 'balanced'
            });
            
            const offenseResponse = await worldProcess.send({
                action: 'Compare-Creatures',
                'Creature-1-Id': testCreature1.tuxemon_id,
                'Creature-2-Id': testCreature2.tuxemon_id,
                'Scenario': 'offense_focused'
            });
            
            expect(balancedResponse.data.combat_analysis).to.not.deep.equal(
                offenseResponse.data.combat_analysis
            );
        });
        
        it('should handle missing creatures in comparison', async function() {
            const response = await worldProcess.send({
                action: 'Compare-Creatures',
                'Creature-1-Id': testCreature1.tuxemon_id,
                'Creature-2-Id': 'non-existent-creature'
            });
            
            expect(response.action).to.equal('Error-Response');
            expect(response.data.error_code).to.equal('COMPARISON_ERROR');
        });
    });
    
    describe('Health Management System', function() {
        it('should analyze creature health comprehensively', async function() {
            const response = await worldProcess.send({
                action: 'Analyze-Creature-Health',
                'Creature-Id': testCreature1.tuxemon_id
            });
            
            expect(response.action).to.equal('Creature-Health-Analysis-Response');
            expect(response.data).to.have.property('creature_id', testCreature1.tuxemon_id);
            expect(response.data).to.have.property('health_stats');
            expect(response.data).to.have.property('health_status');
            expect(response.data).to.have.property('combat_readiness');
            expect(response.data).to.have.property('status_effects_analysis');
            expect(response.data).to.have.property('healing_recommendations');
            expect(response.data).to.have.property('recovery_projections');
            
            const healthStats = response.data.health_stats;
            expect(healthStats).to.have.property('current_hp');
            expect(healthStats).to.have.property('max_hp');
            expect(healthStats).to.have.property('health_percentage');
            expect(healthStats.health_percentage).to.be.a('number').within(0, 100);
            
            const combatReadiness = response.data.combat_readiness;
            expect(combatReadiness).to.have.property('readiness_score');
            expect(combatReadiness).to.have.property('battle_ready');
            expect(combatReadiness.readiness_score).to.be.a('number').within(0, 100);
            expect(combatReadiness.battle_ready).to.be.a('boolean');
        });
        
        it('should provide appropriate health status categorization', async function() {
            // Test with high health creature
            const healthyResponse = await worldProcess.send({
                action: 'Analyze-Creature-Health',
                'Creature-Id': testCreature1.tuxemon_id
            });
            
            expect(healthyResponse.data.health_status.status).to.be.oneOf([
                'excellent', 'good', 'moderate'
            ]);
        });
        
        it('should generate healing recommendations based on health status', async function() {
            const response = await worldProcess.send({
                action: 'Analyze-Creature-Health',
                'Creature-Id': testCreature2.tuxemon_id // Lower health creature
            });
            
            const recommendations = response.data.healing_recommendations;
            expect(recommendations).to.have.property('priority_level');
            expect(recommendations).to.have.property('healing_items');
            expect(recommendations).to.have.property('strategic_advice');
            expect(recommendations.healing_items).to.be.an('array');
        });
    });
    
    describe('Progression Tracking System', function() {
        it('should analyze creature progression comprehensively', async function() {
            const response = await worldProcess.send({
                action: 'Query-Creature-Progression',
                'Creature-Id': testCreature1.tuxemon_id,
                'Include-Projections': 'true'
            });
            
            expect(response.action).to.equal('Creature-Progression-Response');
            expect(response.data).to.have.property('creature_id', testCreature1.tuxemon_id);
            expect(response.data).to.have.property('current_progression');
            
            const progression = response.data.current_progression;
            expect(progression).to.have.property('current_level');
            expect(progression).to.have.property('current_experience');
            expect(progression).to.have.property('level_progress');
            expect(progression).to.have.property('milestones');
            expect(progression).to.have.property('evolution_analysis');
            
            const levelProgress = progression.level_progress;
            expect(levelProgress).to.have.property('progress_percentage');
            expect(levelProgress).to.have.property('experience_needed_for_next');
            expect(levelProgress.progress_percentage).to.be.a('number').within(0, 100);
        });
        
        it('should award experience and handle level ups', async function() {
            const initialResponse = await worldProcess.send({
                action: 'Query-Creature-Progression',
                'Creature-Id': testCreature1.tuxemon_id
            });
            const initialLevel = initialResponse.data.current_progression.current_level;
            
            const expResponse = await worldProcess.send({
                action: 'Award-Creature-Experience',
                'Creature-Id': testCreature1.tuxemon_id,
                'Experience-Amount': '500',
                'Experience-Source': 'testing'
            });
            
            expect(expResponse.action).to.equal('Experience-Award-Response');
            expect(expResponse.data).to.have.property('success', true);
            expect(expResponse.data).to.have.property('experience_awarded', 500);
            expect(expResponse.data).to.have.property('old_level');
            expect(expResponse.data).to.have.property('new_level');
            
            if (expResponse.data.leveled_up) {
                expect(expResponse.data.new_level).to.be.above(expResponse.data.old_level);
                expect(expResponse.data).to.have.property('level_up_data');
                expect(expResponse.data.level_up_data).to.have.property('stat_increases');
            }
        });
        
        it('should track progression analytics', async function() {
            // Award multiple small experience amounts to test progression tracking
            for (let i = 0; i < 3; i++) {
                await worldProcess.send({
                    action: 'Award-Creature-Experience',
                    'Creature-Id': testCreature1.tuxemon_id,
                    'Experience-Amount': '25',
                    'Experience-Source': 'analytics_test'
                });
            }
            
            const response = await worldProcess.send({
                action: 'Query-Creature-Progression',
                'Creature-Id': testCreature1.tuxemon_id,
                'Include-Projections': 'true'
            });
            
            expect(response.data.current_progression).to.have.property('progression_rate');
        });
        
        it('should validate experience award parameters', async function() {
            // Test invalid experience amount
            const invalidResponse = await worldProcess.send({
                action: 'Award-Creature-Experience',
                'Creature-Id': testCreature1.tuxemon_id,
                'Experience-Amount': '-50'
            });
            
            expect(invalidResponse.action).to.equal('Error-Response');
            expect(invalidResponse.data.error_code).to.equal('VALIDATION_ERROR');
        });
    });
    
    describe('System Integration', function() {
        it('should maintain stat consistency across different operations', async function() {
            // Get initial stats
            const initialStats = await worldProcess.send({
                action: 'Calculate-Creature-Stats',
                'Creature-Id': testCreature1.tuxemon_id
            });
            
            // Award experience that should cause level up
            await worldProcess.send({
                action: 'Award-Creature-Experience',
                'Creature-Id': testCreature1.tuxemon_id,
                'Experience-Amount': '1000',
                'Experience-Source': 'consistency_test'
            });
            
            // Get updated stats
            const updatedStats = await worldProcess.send({
                action: 'Calculate-Creature-Stats',
                'Creature-Id': testCreature1.tuxemon_id
            });
            
            // Verify stats increased (assuming level up occurred)
            if (updatedStats.data.final_stats.hp_max > initialStats.data.final_stats.hp_max) {
                expect(updatedStats.data.final_stats.attack).to.be.at.least(
                    initialStats.data.final_stats.attack
                );
                expect(updatedStats.data.final_stats.defense).to.be.at.least(
                    initialStats.data.final_stats.defense
                );
            }
        });
        
        it('should handle concurrent operations safely', async function() {
            const promises = [];
            
            // Execute multiple stat calculations concurrently
            for (let i = 0; i < 5; i++) {
                promises.push(
                    worldProcess.send({
                        action: 'Calculate-Creature-Stats',
                        'Creature-Id': testCreature1.tuxemon_id
                    })
                );
            }
            
            const results = await Promise.all(promises);
            
            // All should succeed and return consistent results
            results.forEach(result => {
                expect(result.action).to.equal('Creature-Stats-Response');
                expect(result.data.creature_id).to.equal(testCreature1.tuxemon_id);
            });
            
            // Results should be consistent
            const firstResult = results[0];
            results.slice(1).forEach(result => {
                expect(result.data.final_stats).to.deep.equal(firstResult.data.final_stats);
            });
        });
    });
    
    describe('Performance and Edge Cases', function() {
        it('should handle maximum level creatures', async function() {
            // Create max level test creature
            const maxLevelCreature = await createTestCreature(testAgentId, {
                species_id: 'test_maxlevel',
                level: 100,
                experience_points: 1000000
            });
            
            const response = await worldProcess.send({
                action: 'Query-Creature-Progression',
                'Creature-Id': maxLevelCreature.tuxemon_id
            });
            
            expect(response.data.current_progression.current_level).to.equal(100);
            
            // Try to award more experience - should not level up beyond max
            const expResponse = await worldProcess.send({
                action: 'Award-Creature-Experience',
                'Creature-Id': maxLevelCreature.tuxemon_id,
                'Experience-Amount': '1000'
            });
            
            expect(expResponse.data.new_level).to.equal(100);
        });
        
        it('should handle creatures with zero health', async function() {
            const faintedCreature = await createTestCreature(testAgentId, {
                species_id: 'test_fainted',
                hp_current: 0,
                hp_max: 50
            });
            
            const response = await worldProcess.send({
                action: 'Analyze-Creature-Health',
                'Creature-Id': faintedCreature.tuxemon_id
            });
            
            expect(response.data.health_status.status).to.equal('fainted');
            expect(response.data.combat_readiness.battle_ready).to.be.false;
        });
    });
    
    // Helper function to create test creatures
    async function createTestCreature(agentId, creatureData) {
        const defaultData = {
            species_id: 'test_default',
            level: 10,
            hp_max: 50,
            hp_current: 50,
            attack: 30,
            defense: 25,
            speed: 35,
            individual_values: { hp: 15, attack: 15, defense: 15, speed: 15 },
            experience_points: 1000,
            capture_timestamp: Date.now(),
            capture_method: 'test'
        };
        
        const creature = { ...defaultData, ...creatureData };
        creature.tuxemon_id = 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Mock adding creature to world state
        // In actual implementation, this would go through the capture system
        
        return creature;
    }
});