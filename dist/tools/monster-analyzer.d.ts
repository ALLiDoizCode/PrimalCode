import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MockMonsterSystem } from '../ecosystem/mock-monster-system';
import { MCPToolBase } from '../types/mcp-tool-types';
export declare class MonsterAnalyzerTool implements MCPToolBase {
    private monsterSystem;
    constructor(monsterSystem: MockMonsterSystem);
    getToolDefinition(): Tool;
    execute(args: Record<string, unknown>): Promise<string>;
    private analyzeMonster;
    private generateBehavioralInsights;
    private getSpeciesBaseInsights;
    private getPersonalityDescription;
    private generateDetailedBehavioralAnalysis;
    private generatePersonalityTraits;
    private formatPersonalityType;
    private getBasicTraitDescription;
    private formatTraitLevel;
    private generateTraitInteractionAnalysis;
    private generateCurrentStateAnalysis;
    private formatState;
    private assessPhysicalCondition;
    private formatDuration;
    private generateDetailedStateAnalysis;
    private generateBehaviorPredictions;
    private formatAnalysisResponse;
}
//# sourceMappingURL=monster-analyzer.d.ts.map