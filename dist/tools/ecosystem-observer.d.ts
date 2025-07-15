import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { MockMonsterSystem } from '../ecosystem/mock-monster-system';
import { MockEnvironmentState } from '../ecosystem/mock-environment-state';
import { MCPToolBase } from '../types/mcp-tool-types';
export declare class EcosystemObserverTool implements MCPToolBase {
    private monsterSystem;
    private environmentState;
    constructor(monsterSystem: MockMonsterSystem, environmentState: MockEnvironmentState);
    getToolDefinition(): Tool;
    execute(args: Record<string, unknown>): Promise<string>;
    private observeEcosystem;
    private generateCurrentStateDescription;
    private generateWeatherDescription;
    private generateResourceDescription;
    private generateEcosystemBalanceDescription;
    private generateMonsterPresenceDescription;
    private getMonsterActivityDescription;
    private generateInteractionDescription;
    private getWeatherImpactOnBehavior;
    private generateMonsterBehaviorDescriptions;
    private generateSuggestedActions;
    private formatObservationResponse;
}
//# sourceMappingURL=ecosystem-observer.d.ts.map