import { MonsterAnalyzerTool } from '../../../src/tools/monster-analyzer';
import { MockMonsterSystem } from '../../../src/ecosystem/mock-monster-system';
import { MonsterSpecies, MonsterPersonalityType, MonsterState } from '../../../src/types/monster-types';
import { AnalysisDepth } from '../../../src/types/mcp-tool-types';
import logger from '../../../src/utils/logger';

jest.mock('../../../src/utils/logger');

describe('MonsterAnalyzerTool', () => {
  let tool: MonsterAnalyzerTool;
  let mockMonsterSystem: MockMonsterSystem;
  let testMonsterId: string;

  beforeEach(() => {
    mockMonsterSystem = new MockMonsterSystem(logger);
    tool = new MonsterAnalyzerTool(mockMonsterSystem);
    
    // Create test monster
    const monster = mockMonsterSystem.generateMonster(
      MonsterSpecies.SHADOW_WOLF,
      MonsterPersonalityType.AGGRESSIVE_HUNTER,
      'test_route'
    );
    testMonsterId = monster.id;
  });

  describe('getToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = tool.getToolDefinition();
      
      expect(definition.name).toBe('analyze_monster');
      expect(definition.description).toContain('behavioral analysis');
      expect(definition.inputSchema.required).toContain('monster_id');
      expect((definition.inputSchema.properties as any)?.analysis_depth?.enum).toEqual(['basic', 'standard', 'detailed']);
    });
  });

  describe('execute', () => {
    it('should generate comprehensive analysis for valid monster', async () => {
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toContain('🔍 **Monster Behavioral Analysis**');
      expect(result).toContain('**Behavioral Insights:**');
      expect(result).toContain('**Personality Profile:**');
      expect(result).toContain('**Current Assessment:**');
      expect(result).toContain('**Behavioral Predictions:**');
      expect(result).toContain('shadow_wolf');
      expect(result).toContain('Aggressive Hunter');
    });

    it('should handle different analysis depths', async () => {
      const basicResult = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'basic' 
      });
      
      const detailedResult = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'detailed' 
      });
      
      // Detailed analysis should be longer and more comprehensive
      expect(detailedResult.length).toBeGreaterThan(basicResult.length);
      expect(detailedResult).toContain('**Trait Interaction Analysis**');
    });

    it('should include personality metrics in standard analysis', async () => {
      const result = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'standard' 
      });
      
      expect(result).toContain('**Behavioral Metrics**:');
      expect(result).toContain('Aggression:');
      expect(result).toContain('Intelligence:');
      expect(result).toContain('Pack Tendency:');
      expect(result).toContain('Caution:');
      expect(result).toContain('Exploration:');
      expect(result).toMatch(/\d+%/); // Should contain percentage values
    });

    it('should provide behavioral predictions', async () => {
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toContain('**Behavioral Predictions:**');
      expect(result).toMatch(/\d+\./); // Should contain numbered predictions
      expect(result).toMatch(/(likely|expected|probability|may|will)/i);
    });

    it('should include timestamp in analysis', async () => {
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toMatch(/Analysis completed at \d{1,2}:\d{2}:\d{2}/);
    });

    it('should return error for invalid monster_id', async () => {
      const result = await tool.execute({ monster_id: 'nonexistent_monster' });
      
      expect(result).toContain('❌ **Monster Analysis Failed**');
      expect(result).toContain('Monster not found');
    });

    it('should return error for missing monster_id', async () => {
      const result = await tool.execute({});
      
      expect(result).toContain('❌ **Monster Analysis Failed**');
      expect(result).toContain('monster_id is required');
    });

    it('should handle different personality types correctly', async () => {
      const cautiousMonster = mockMonsterSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route'
      );
      
      const packLeaderMonster = mockMonsterSystem.generateMonster(
        MonsterSpecies.EMBER_HAWK,
        MonsterPersonalityType.PACK_LEADER,
        'test_route'
      );
      
      const cautiousResult = await tool.execute({ monster_id: cautiousMonster.id });
      const packLeaderResult = await tool.execute({ monster_id: packLeaderMonster.id });
      
      expect(cautiousResult).toContain('Cautious Forager');
      expect(packLeaderResult).toContain('Pack Leader');
      
      // Different personality types should generate different insights
      expect(cautiousResult).not.toEqual(packLeaderResult);
    });

    it('should analyze current state correctly', async () => {
      const monster = mockMonsterSystem.getMonster(testMonsterId);
      if (monster) {
        mockMonsterSystem.updateMonsterState(testMonsterId, MonsterState.HUNTING);
      }
      
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toContain('**Current State**: Actively pursuing prey');
      expect(result).toContain('**Physical Condition**:');
    });

    it('should provide contextual insights based on stats', async () => {
      const monster = mockMonsterSystem.getMonster(testMonsterId);
      if (monster) {
        // Modify stats to test contextual analysis
        monster.stats.hunger = monster.stats.maxHunger * 0.8; // High hunger
        monster.stats.energy = monster.stats.maxEnergy * 0.2; // Low energy
      }
      
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toMatch(/(hunger|energy)/i);
      expect(result).toMatch(/\d+%/); // Should contain percentage indicators
    });
  });

  describe('personality analysis', () => {
    it('should format personality traits correctly', async () => {
      const result = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'standard' 
      });
      
      expect(result).toContain('**Primary Archetype**: Aggressive Hunter - Dominant Predator');
      expect(result).toMatch(/(Very High|High|Moderate|Low|Very Low)/);
    });

    it('should provide trait level descriptions', async () => {
      const result = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'standard' 
      });
      
      // Should contain trait level descriptions
      expect(result).toMatch(/(Very High|High|Moderate|Low|Very Low) \(\d+%\)/);
    });

    it('should analyze trait interactions in detailed mode', async () => {
      const result = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'detailed' 
      });
      
      expect(result).toContain('**Trait Interaction Analysis**:');
      expect(result).toMatch(/(correlation|combination|balance|dominance)/i);
    });
  });

  describe('behavioral insights', () => {
    it('should provide species-specific insights', async () => {
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toContain('shadow_wolf');
      expect(result).toMatch(/(cunning|pack|predator|stealth|territorial)/i);
    });

    it('should include decision-making analysis', async () => {
      const result = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'standard' 
      });
      
      expect(result).toContain('decision-making');
      expect(result).toMatch(/(reasoning|driven by)/i);
    });

    it('should provide detailed environmental analysis in detailed mode', async () => {
      const result = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'detailed' 
      });
      
      expect(result).toMatch(/(environmental|awareness|territory|resource)/i);
    });
  });

  describe('prediction generation', () => {
    it('should generate appropriate number of predictions by depth', async () => {
      const basicResult = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'basic' 
      });
      
      const detailedResult = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'detailed' 
      });
      
      // Count predictions (numbered list items)
      const basicPredictions = (basicResult.match(/\d+\. /g) || []).length;
      const detailedPredictions = (detailedResult.match(/\d+\. /g) || []).length;
      
      expect(basicPredictions).toBeLessThanOrEqual(2);
      expect(detailedPredictions).toBeGreaterThan(basicPredictions);
    });

    it('should generate contextual predictions based on monster state', async () => {
      const monster = mockMonsterSystem.getMonster(testMonsterId);
      if (monster) {
        monster.stats.hunger = monster.stats.maxHunger * 0.9; // Very high hunger
      }
      
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toMatch(/(food-seeking|hunting|prioritize)/i);
    });

    it('should include personality-based predictions', async () => {
      const result = await tool.execute({ monster_id: testMonsterId });
      
      // Aggressive hunter should have hunting-related predictions
      expect(result).toMatch(/(hunting|aggressive|predatory)/i);
    });
  });

  describe('error handling', () => {
    it('should handle invalid analysis depth gracefully', async () => {
      const result = await tool.execute({ 
        monster_id: testMonsterId, 
        analysis_depth: 'invalid_depth' as AnalysisDepth 
      });
      
      // Should still work with invalid depth (fallback to default)
      expect(result).toContain('🔍 **Monster Behavioral Analysis**');
    });

    it('should validate input parameters', async () => {
      const invalidInputs = [
        { monster_id: null },
        { monster_id: 123 },
        { monster_id: '' }
      ];
      
      for (const input of invalidInputs) {
        const result = await tool.execute(input);
        expect(result).toContain('❌ **Monster Analysis Failed**');
      }
    });

    it('should handle mock system errors gracefully', async () => {
      jest.spyOn(mockMonsterSystem, 'getMonster').mockImplementation(() => {
        throw new Error('System error');
      });
      
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toContain('❌ **Monster Analysis Failed**');
    });
  });

  describe('response formatting', () => {
    it('should use consistent markdown formatting', async () => {
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toMatch(/^🔍 \*\*Monster Behavioral Analysis\*\*/);
      expect(result).toMatch(/\*\*Behavioral Insights:\*\*/);
      expect(result).toMatch(/\*\*Personality Profile:\*\*/);
      expect(result).toMatch(/\*Analysis completed at/);
    });

    it('should include all required sections', async () => {
      const result = await tool.execute({ monster_id: testMonsterId });
      
      const requiredSections = [
        '**Behavioral Insights:**',
        '**Personality Profile:**',
        '**Current Assessment:**',
        '**Behavioral Predictions:**'
      ];
      
      requiredSections.forEach(section => {
        expect(result).toContain(section);
      });
    });
  });

  describe('integration with monster system', () => {
    it('should integrate properly with monster decision system', async () => {
      // Spy on makeDecision to ensure it's called
      const makeDecisionSpy = jest.spyOn(mockMonsterSystem, 'makeDecision');
      
      await tool.execute({ monster_id: testMonsterId });
      
      expect(makeDecisionSpy).toHaveBeenCalledWith(testMonsterId);
    });

    it('should handle monster state updates correctly', async () => {
      mockMonsterSystem.updateMonsterState(testMonsterId, MonsterState.RESTING);
      
      const result = await tool.execute({ monster_id: testMonsterId });
      
      expect(result).toContain('Conserving energy in a safe location');
    });
  });
});