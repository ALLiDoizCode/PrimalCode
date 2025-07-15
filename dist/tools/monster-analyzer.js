"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonsterAnalyzerTool = void 0;
const mcp_tool_types_1 = require("../types/mcp-tool-types");
const monster_types_1 = require("../types/monster-types");
const logger_1 = __importDefault(require("../utils/logger"));
class MonsterAnalyzerTool {
    monsterSystem;
    constructor(monsterSystem) {
        this.monsterSystem = monsterSystem;
    }
    getToolDefinition() {
        return {
            name: 'analyze_monster',
            description: 'Provides detailed behavioral analysis for individual creatures, including personality traits, current state assessment, and predictive insights about future behavior patterns.',
            inputSchema: {
                type: 'object',
                properties: {
                    monster_id: {
                        type: 'string',
                        description: 'Unique identifier of the monster to analyze'
                    },
                    analysis_depth: {
                        type: 'string',
                        description: 'Depth of analysis to perform: "basic", "standard", or "detailed"',
                        enum: ['basic', 'standard', 'detailed'],
                        default: 'standard'
                    }
                },
                required: ['monster_id'],
                additionalProperties: false
            }
        };
    }
    async execute(args) {
        try {
            logger_1.default.info('Executing monster analysis', { args });
            const { monster_id, analysis_depth = mcp_tool_types_1.DEFAULT_ANALYSIS_DEPTH } = args;
            if (!monster_id || typeof monster_id !== 'string') {
                throw new Error('monster_id is required and must be a string');
            }
            const analysis = await this.analyzeMonster(monster_id, analysis_depth);
            return this.formatAnalysisResponse(analysis);
        }
        catch (error) {
            logger_1.default.error('Error executing monster analysis', { error, args });
            const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
            return `❌ **Monster Analysis Failed**\n\nUnable to analyze the creature: ${errorMsg}\n\nPlease verify the monster_id is valid and try again.`;
        }
    }
    async analyzeMonster(monsterId, depth) {
        const monster = this.monsterSystem.getMonster(monsterId);
        if (!monster) {
            throw new Error(`Monster not found: ${monsterId}`);
        }
        const behavioralInsights = this.generateBehavioralInsights(monster, depth);
        const personalityTraits = this.generatePersonalityTraits(monster, depth);
        const currentState = this.generateCurrentStateAnalysis(monster, depth);
        const predictions = this.generateBehaviorPredictions(monster, depth);
        return {
            behavioralInsights,
            personalityTraits,
            currentState,
            predictions,
            timestamp: Date.now()
        };
    }
    generateBehavioralInsights(monster, depth) {
        const personality = monster.ai_personality;
        const stats = monster.stats;
        const decision = this.monsterSystem.makeDecision(monster.id);
        let insights = this.getSpeciesBaseInsights(monster);
        // Basic insights always included
        insights += ` This ${monster.species} exhibits ${this.getPersonalityDescription(personality.type)} tendencies.`;
        if (depth === mcp_tool_types_1.AnalysisDepth.BASIC) {
            return insights;
        }
        // Standard and detailed insights
        insights += ` Current decision-making is driven by ${decision.reasoning}`;
        // Contextual behavioral analysis
        if (stats.hunger > stats.maxHunger * 0.7) {
            insights += ` Elevated hunger levels (${Math.round(stats.hunger / stats.maxHunger * 100)}%) are significantly influencing behavior, increasing food-seeking activities and potential aggression.`;
        }
        if (stats.energy < stats.maxEnergy * 0.3) {
            insights += ` Low energy reserves (${Math.round(stats.energy / stats.maxEnergy * 100)}%) are limiting active behaviors and forcing conservation strategies.`;
        }
        if (stats.health < stats.maxHealth * 0.5) {
            insights += ` Reduced health (${Math.round(stats.health / stats.maxHealth * 100)}%) is triggering defensive behaviors and risk-averse decision making.`;
        }
        if (depth === mcp_tool_types_1.AnalysisDepth.DETAILED) {
            insights += this.generateDetailedBehavioralAnalysis(monster);
        }
        return insights;
    }
    getSpeciesBaseInsights(monster) {
        const speciesInsights = {
            shadow_wolf: 'A cunning pack predator with exceptional stealth capabilities and territorial instincts.',
            frost_bear: 'A solitary but powerful creature with remarkable endurance and protective instincts.',
            ember_hawk: 'An aerial hunter with keen intelligence and rapid decision-making abilities.',
            stone_serpent: 'A patient ambush predator with extraordinary environmental awareness.',
            wind_stag: 'A graceful herbivore with heightened senses and swift escape reflexes.'
        };
        return speciesInsights[monster.species] || 'A unique creature with distinctive behavioral patterns.';
    }
    getPersonalityDescription(type) {
        const descriptions = {
            [monster_types_1.MonsterPersonalityType.AGGRESSIVE_HUNTER]: 'dominant and confrontational',
            [monster_types_1.MonsterPersonalityType.CAUTIOUS_FORAGER]: 'careful and methodical',
            [monster_types_1.MonsterPersonalityType.PACK_LEADER]: 'strategic and protective'
        };
        return descriptions[type];
    }
    generateDetailedBehavioralAnalysis(monster) {
        const personality = monster.ai_personality;
        const awareness = monster.environmental_awareness;
        let detailed = ` Advanced behavioral analysis reveals:`;
        // Environmental interaction patterns
        if (awareness.detected_structures.length > 0) {
            detailed += ` This creature demonstrates high environmental awareness, having identified ${awareness.detected_structures.length} key structures in its territory.`;
        }
        // Resource memory analysis
        if (awareness.resource_memory.length > 0) {
            const recentMemories = awareness.resource_memory.filter(r => Date.now() - r.last_visited < 3600000).length;
            if (recentMemories > 0) {
                detailed += ` Recent resource utilization patterns indicate active territorial management with ${recentMemories} recently accessed resource locations.`;
            }
        }
        // Personality trait correlation analysis
        if (personality.intelligence > 0.7 && personality.caution > 0.7) {
            detailed += ` The combination of high intelligence and caution suggests complex problem-solving capabilities with risk assessment priorities.`;
        }
        if (personality.aggression > 0.7 && personality.pack_tendency < 0.3) {
            detailed += ` High aggression paired with low pack tendency indicates a dangerous solitary predator with territorial behaviors.`;
        }
        return detailed;
    }
    generatePersonalityTraits(monster, depth) {
        const personality = monster.ai_personality;
        let traits = `**Primary Archetype**: ${this.formatPersonalityType(personality.type)}\n`;
        if (depth === mcp_tool_types_1.AnalysisDepth.BASIC) {
            return traits + this.getBasicTraitDescription(personality.type);
        }
        // Standard and detailed trait analysis
        traits += `**Behavioral Metrics**:\n`;
        traits += `• Aggression: ${this.formatTraitLevel(personality.aggression)} (${(personality.aggression * 100).toFixed(0)}%)\n`;
        traits += `• Intelligence: ${this.formatTraitLevel(personality.intelligence)} (${(personality.intelligence * 100).toFixed(0)}%)\n`;
        traits += `• Pack Tendency: ${this.formatTraitLevel(personality.pack_tendency)} (${(personality.pack_tendency * 100).toFixed(0)}%)\n`;
        traits += `• Caution: ${this.formatTraitLevel(personality.caution)} (${(personality.caution * 100).toFixed(0)}%)\n`;
        traits += `• Exploration: ${this.formatTraitLevel(personality.exploration)} (${(personality.exploration * 100).toFixed(0)}%)\n`;
        if (depth === mcp_tool_types_1.AnalysisDepth.DETAILED) {
            traits += this.generateTraitInteractionAnalysis(personality);
        }
        return traits;
    }
    formatPersonalityType(type) {
        const formatted = {
            [monster_types_1.MonsterPersonalityType.AGGRESSIVE_HUNTER]: 'Aggressive Hunter - Dominant Predator',
            [monster_types_1.MonsterPersonalityType.CAUTIOUS_FORAGER]: 'Cautious Forager - Survival Specialist',
            [monster_types_1.MonsterPersonalityType.PACK_LEADER]: 'Pack Leader - Tactical Coordinator'
        };
        return formatted[type];
    }
    getBasicTraitDescription(type) {
        const descriptions = {
            [monster_types_1.MonsterPersonalityType.AGGRESSIVE_HUNTER]: 'Characterized by high aggression and predatory instincts, prioritizing confrontation and dominance.',
            [monster_types_1.MonsterPersonalityType.CAUTIOUS_FORAGER]: 'Exhibits high caution and intelligence, prioritizing safety and careful resource gathering.',
            [monster_types_1.MonsterPersonalityType.PACK_LEADER]: 'Shows strong leadership qualities with balanced traits and protective group-focused behaviors.'
        };
        return descriptions[type];
    }
    formatTraitLevel(value) {
        if (value >= 0.8)
            return 'Very High';
        if (value >= 0.6)
            return 'High';
        if (value >= 0.4)
            return 'Moderate';
        if (value >= 0.2)
            return 'Low';
        return 'Very Low';
    }
    generateTraitInteractionAnalysis(personality) {
        let analysis = `\n**Trait Interaction Analysis**:\n`;
        // Intelligence-Caution correlation
        if (personality.intelligence > 0.6 && personality.caution > 0.6) {
            analysis += `• High intelligence and caution create strategic decision-making patterns\n`;
        }
        // Aggression-Pack correlation
        if (personality.aggression > 0.6 && personality.pack_tendency > 0.6) {
            analysis += `• Aggressive pack leader combination indicates alpha dominance behaviors\n`;
        }
        else if (personality.aggression > 0.6 && personality.pack_tendency < 0.4) {
            analysis += `• High aggression with low pack tendency suggests lone predator characteristics\n`;
        }
        // Exploration-Caution balance
        if (Math.abs(personality.exploration - personality.caution) < 0.2) {
            analysis += `• Balanced exploration and caution indicate adaptive territorial behavior\n`;
        }
        else if (personality.exploration > personality.caution + 0.3) {
            analysis += `• Exploration dominance over caution suggests risk-taking behaviors\n`;
        }
        return analysis;
    }
    generateCurrentStateAnalysis(monster, depth) {
        const state = monster.state;
        const stats = monster.stats;
        const lastUpdated = Date.now() - monster.last_updated;
        let analysis = `**Current State**: ${this.formatState(state)}\n`;
        analysis += `**Physical Condition**: ${this.assessPhysicalCondition(stats)}\n`;
        if (depth === mcp_tool_types_1.AnalysisDepth.BASIC) {
            return analysis;
        }
        analysis += `**State Duration**: ${this.formatDuration(lastUpdated)}\n`;
        analysis += `**Territorial Position**: ${stats.position.route} (${stats.position.x.toFixed(1)}, ${stats.position.y.toFixed(1)})\n`;
        if (depth === mcp_tool_types_1.AnalysisDepth.DETAILED) {
            analysis += this.generateDetailedStateAnalysis(monster);
        }
        return analysis;
    }
    formatState(state) {
        const stateDescriptions = {
            [monster_types_1.MonsterState.IDLE]: 'Alert and observant, maintaining environmental awareness',
            [monster_types_1.MonsterState.HUNTING]: 'Actively pursuing prey with focused predatory behavior',
            [monster_types_1.MonsterState.RESTING]: 'Conserving energy in a safe location',
            [monster_types_1.MonsterState.FEEDING]: 'Consuming resources to restore vital statistics',
            [monster_types_1.MonsterState.MOVING]: 'Traveling through territory with purposeful movement',
            [monster_types_1.MonsterState.ALERTING]: 'Heightened awareness state, responding to potential threats',
            [monster_types_1.MonsterState.FLEEING]: 'Escape behavior activated due to immediate danger'
        };
        return stateDescriptions[state];
    }
    assessPhysicalCondition(stats) {
        const healthPercent = stats.health / stats.maxHealth;
        const energyPercent = stats.energy / stats.maxEnergy;
        const hungerPercent = stats.hunger / stats.maxHunger;
        if (healthPercent > 0.8 && energyPercent > 0.6 && hungerPercent < 0.4) {
            return 'Excellent - Peak physical condition';
        }
        else if (healthPercent > 0.6 && energyPercent > 0.4 && hungerPercent < 0.6) {
            return 'Good - Stable and functional condition';
        }
        else if (healthPercent > 0.4 || energyPercent > 0.3) {
            return 'Fair - Some stress indicators present';
        }
        else {
            return 'Poor - Multiple critical needs requiring attention';
        }
    }
    formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 1)
            return 'Less than a minute';
        if (minutes < 60)
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        const hours = Math.floor(minutes / 60);
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
    }
    generateDetailedStateAnalysis(monster) {
        const awareness = monster.environmental_awareness;
        let detailed = `**Environmental Awareness**: `;
        if (awareness.threat_awareness > 0.7) {
            detailed += `High threat sensitivity (${(awareness.threat_awareness * 100).toFixed(0)}%) - actively monitoring for dangers. `;
        }
        else if (awareness.threat_awareness > 0.4) {
            detailed += `Moderate threat awareness - balanced vigilance and activity. `;
        }
        else {
            detailed += `Low threat perception - focused on other priorities. `;
        }
        detailed += `Weather adaptation at ${(awareness.weather_adaptation * 100).toFixed(0)}% efficiency.\n`;
        if (awareness.detected_structures.length > 0) {
            detailed += `**Structural Awareness**: Familiar with ${awareness.detected_structures.join(', ')} in immediate area.\n`;
        }
        return detailed;
    }
    generateBehaviorPredictions(monster, depth) {
        const predictions = [];
        const personality = monster.ai_personality;
        const stats = monster.stats;
        const state = monster.state;
        // Basic predictions
        if (stats.hunger > stats.maxHunger * 0.6) {
            predictions.push('Likely to prioritize food-seeking behavior within the next few hours');
        }
        if (stats.energy < stats.maxEnergy * 0.4) {
            predictions.push('Expected to seek rest in secure location to restore energy reserves');
        }
        if (depth === mcp_tool_types_1.AnalysisDepth.BASIC) {
            return predictions.slice(0, 2);
        }
        // Standard predictions
        if (personality.type === monster_types_1.MonsterPersonalityType.AGGRESSIVE_HUNTER && state !== monster_types_1.MonsterState.HUNTING) {
            predictions.push('High probability of initiating hunting behavior given aggressive predatory nature');
        }
        if (personality.type === monster_types_1.MonsterPersonalityType.CAUTIOUS_FORAGER) {
            predictions.push('Will likely maintain cautious movement patterns and avoid risky areas');
        }
        if (personality.type === monster_types_1.MonsterPersonalityType.PACK_LEADER) {
            predictions.push('May exhibit territorial patrol behavior to maintain group coordination');
        }
        if (depth === mcp_tool_types_1.AnalysisDepth.DETAILED) {
            // Detailed predictions based on environmental factors
            const awareness = monster.environmental_awareness;
            if (awareness.threat_awareness > 0.7) {
                predictions.push('Heightened threat awareness suggests defensive positioning and escape route planning');
            }
            if (awareness.resource_memory.length > 2) {
                predictions.push('Strong resource memory indicates efficient foraging patterns and territory optimization');
            }
            // Weather adaptation predictions
            if (awareness.weather_adaptation < 0.5) {
                predictions.push('Low weather adaptation may lead to shelter-seeking during adverse conditions');
            }
        }
        return predictions.slice(0, 5); // Limit to 5 most relevant predictions
    }
    formatAnalysisResponse(analysis) {
        let response = `🔍 **Monster Behavioral Analysis**\n\n`;
        response += `**Behavioral Insights:**\n${analysis.behavioralInsights}\n\n`;
        response += `**Personality Profile:**\n${analysis.personalityTraits}\n\n`;
        response += `**Current Assessment:**\n${analysis.currentState}\n\n`;
        if (analysis.predictions.length > 0) {
            response += `**Behavioral Predictions:**\n`;
            analysis.predictions.forEach((prediction, index) => {
                response += `${index + 1}. ${prediction}\n`;
            });
        }
        response += `\n*Analysis completed at ${new Date(analysis.timestamp).toLocaleTimeString()}*`;
        return response;
    }
}
exports.MonsterAnalyzerTool = MonsterAnalyzerTool;
//# sourceMappingURL=monster-analyzer.js.map