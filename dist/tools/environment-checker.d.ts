import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MockEnvironmentState } from '../ecosystem/mock-environment-state';
import { MockMonsterSystem } from '../ecosystem/mock-monster-system';
import { MCPToolBase } from '../types/mcp-tool-types';
export declare class EnvironmentCheckerTool implements MCPToolBase {
    private environmentState;
    private monsterSystem;
    constructor(environmentState: MockEnvironmentState, monsterSystem: MockMonsterSystem);
    getToolDefinition(): Tool;
    execute(args: Record<string, unknown>): Promise<string>;
    private checkEnvironment;
    private generateEnvironmentalDetails;
    private getDifficultyDescription;
    private getSafetyDescription;
    private getTerritorialPressureDescription;
    private getSeasonalDescription;
    private generateWeatherConditions;
    private getWeatherDescription;
    private getWeatherEmoji;
    private getTemperatureDescription;
    private getHumidityDescription;
    private getWindDescription;
    private getVisibilityDescription;
    private getWeatherImpactDescription;
    private generateResourceAvailability;
    private formatResourceType;
    private getQualityDescription;
    private getRegenerationDescription;
    private getAbundanceDescription;
    private getResourcePressureDescription;
    private generateRecommendations;
    private formatEnvironmentResponse;
}
//# sourceMappingURL=environment-checker.d.ts.map