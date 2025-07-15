import { Tool } from '@modelcontextprotocol/sdk/types.js';
export interface EcosystemObservation {
    currentState: string;
    monsterBehaviors: string[];
    suggestedActions: string[];
    route: string;
    timestamp: number;
}
export interface MonsterAnalysis {
    behavioralInsights: string;
    personalityTraits: string;
    currentState: string;
    predictions: string[];
    timestamp: number;
}
export interface EnvironmentCheck {
    environmentalDetails: string;
    weatherConditions: string;
    resourceAvailability: string;
    recommendations: string[];
    route: string;
    timestamp: number;
}
export interface MCPToolBase {
    getToolDefinition(): Tool;
    execute(args: Record<string, unknown>): Promise<string>;
}
export interface EcosystemObserverArgs {
    route_id?: string;
    focus?: string;
}
export interface MonsterAnalyzerArgs {
    monster_id?: string;
    analysis_depth?: string;
}
export interface EnvironmentCheckerArgs {
    route_id?: string;
}
export interface PlaceFoodArgs {
    route_id: string;
    location: {
        x: number;
        y: number;
    };
    food_type: string;
}
export interface ModifyWeatherArgs {
    route_id: string;
    weather_type: string;
    intensity: number;
}
export interface BuildShelterArgs {
    route_id: string;
    location: {
        x: number;
        y: number;
    };
    shelter_type: string;
}
export interface EnvironmentalModificationResult {
    placementConfirmation: string;
    behavioralPredictions: string;
    ecosystemImpact: string;
    timestamp: number;
}
export declare const DEFAULT_ANALYSIS_DEPTH = "standard";
export declare const DEFAULT_FOCUS_AREA = "all";
export declare enum AnalysisDepth {
    BASIC = "basic",
    STANDARD = "standard",
    DETAILED = "detailed"
}
export declare enum FocusArea {
    ALL = "all",
    MONSTERS = "monsters",
    ENVIRONMENT = "environment",
    INTERACTIONS = "interactions"
}
//# sourceMappingURL=mcp-tool-types.d.ts.map