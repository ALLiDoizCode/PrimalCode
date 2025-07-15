"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockMonsterSystem = void 0;
const monster_types_1 = require("../types/monster-types");
const PERSONALITY_TEMPLATES = {
    [monster_types_1.MonsterPersonalityType.AGGRESSIVE_HUNTER]: {
        type: monster_types_1.MonsterPersonalityType.AGGRESSIVE_HUNTER,
        aggression: 0.8,
        intelligence: 0.6,
        pack_tendency: 0.3,
        caution: 0.2,
        exploration: 0.7
    },
    [monster_types_1.MonsterPersonalityType.CAUTIOUS_FORAGER]: {
        type: monster_types_1.MonsterPersonalityType.CAUTIOUS_FORAGER,
        aggression: 0.2,
        intelligence: 0.8,
        pack_tendency: 0.1,
        caution: 0.9,
        exploration: 0.4
    },
    [monster_types_1.MonsterPersonalityType.PACK_LEADER]: {
        type: monster_types_1.MonsterPersonalityType.PACK_LEADER,
        aggression: 0.6,
        intelligence: 0.9,
        pack_tendency: 0.9,
        caution: 0.5,
        exploration: 0.6
    }
};
const BEHAVIOR_PATTERNS = {
    [monster_types_1.MonsterPersonalityType.AGGRESSIVE_HUNTER]: {
        personality_type: monster_types_1.MonsterPersonalityType.AGGRESSIVE_HUNTER,
        preferred_actions: ['hunt', 'patrol', 'attack', 'pursue'],
        decision_weights: {
            hunt: 0.4,
            patrol: 0.3,
            rest: 0.1,
            explore: 0.2
        },
        response_patterns: {
            threat: "The hunter's eyes flash with predatory intent, muscles tensing for immediate action.",
            opportunity: "Swift and decisive, the hunter strikes without hesitation at the first sign of prey.",
            rest: "Even in rest, the hunter remains coiled like a spring, ready to unleash violence."
        }
    },
    [monster_types_1.MonsterPersonalityType.CAUTIOUS_FORAGER]: {
        personality_type: monster_types_1.MonsterPersonalityType.CAUTIOUS_FORAGER,
        preferred_actions: ['forage', 'observe', 'hide', 'retreat'],
        decision_weights: {
            forage: 0.4,
            observe: 0.3,
            hide: 0.2,
            explore: 0.1
        },
        response_patterns: {
            threat: "The forager freezes momentarily, then melts silently into the shadows.",
            opportunity: "Careful observation precedes any movement, ensuring the path is truly safe.",
            rest: "Finding the most concealed spot, the forager settles with all senses alert."
        }
    },
    [monster_types_1.MonsterPersonalityType.PACK_LEADER]: {
        personality_type: monster_types_1.MonsterPersonalityType.PACK_LEADER,
        preferred_actions: ['coordinate', 'protect', 'patrol', 'communicate'],
        decision_weights: {
            coordinate: 0.3,
            protect: 0.3,
            patrol: 0.2,
            communicate: 0.2
        },
        response_patterns: {
            threat: "The leader assesses the situation with tactical precision, positioning for group advantage.",
            opportunity: "Strategic calculation guides every move, weighing benefit against risk to the pack.",
            rest: "Never truly at rest, the leader maintains vigilant watch over the territory."
        }
    }
};
// Configuration constants for better maintainability
const DEFAULT_PERSONALITY_VARIATION = 0.1;
const DEFAULT_WORLD_SIZE = 100;
const DEFAULT_RESOURCE_MEMORY_ROUTE = 'route_1';
const HOUR_IN_MILLISECONDS = 3600000;
class MockMonsterSystem {
    monsters = new Map();
    logger;
    monsterIdCounter = 1;
    constructor(logger) {
        this.logger = logger;
    }
    generateMonster(species, personalityType, route, position) {
        const id = `monster_${this.monsterIdCounter++}`;
        const currentTime = Date.now();
        const basePosition = {
            x: position?.x ?? Math.random() * DEFAULT_WORLD_SIZE,
            y: position?.y ?? Math.random() * DEFAULT_WORLD_SIZE,
            route
        };
        const baseStats = this.generateStatsForSpecies(species);
        const personality = this.generatePersonalityVariation(personalityType);
        const awareness = this.generateEnvironmentalAwareness();
        const monster = {
            id,
            species,
            stats: {
                ...baseStats,
                position: basePosition
            },
            ai_personality: personality,
            environmental_awareness: awareness,
            state: monster_types_1.MonsterState.IDLE,
            created_at: currentTime,
            last_updated: currentTime
        };
        this.monsters.set(id, monster);
        this.logger.info(`Generated ${personalityType} ${species} monster`, { monsterId: id });
        return monster;
    }
    generateStatsForSpecies(species) {
        const speciesStats = {
            [monster_types_1.MonsterSpecies.SHADOW_WOLF]: {
                maxHealth: 80,
                maxHunger: 60,
                maxEnergy: 90
            },
            [monster_types_1.MonsterSpecies.FROST_BEAR]: {
                maxHealth: 120,
                maxHunger: 80,
                maxEnergy: 70
            },
            [monster_types_1.MonsterSpecies.EMBER_HAWK]: {
                maxHealth: 50,
                maxHunger: 40,
                maxEnergy: 100
            },
            [monster_types_1.MonsterSpecies.STONE_SERPENT]: {
                maxHealth: 90,
                maxHunger: 50,
                maxEnergy: 60
            },
            [monster_types_1.MonsterSpecies.WIND_STAG]: {
                maxHealth: 70,
                maxHunger: 70,
                maxEnergy: 95
            }
        };
        const baseStats = speciesStats[species];
        return {
            health: baseStats.maxHealth * (0.8 + Math.random() * 0.2),
            maxHealth: baseStats.maxHealth,
            hunger: baseStats.maxHunger * (0.3 + Math.random() * 0.4),
            maxHunger: baseStats.maxHunger,
            energy: baseStats.maxEnergy * (0.6 + Math.random() * 0.4),
            maxEnergy: baseStats.maxEnergy,
            position: { x: 0, y: 0, route: '' }
        };
    }
    generatePersonalityVariation(type) {
        const template = PERSONALITY_TEMPLATES[type];
        const variation = DEFAULT_PERSONALITY_VARIATION;
        return {
            type,
            aggression: Math.max(0, Math.min(1, template.aggression + (Math.random() - 0.5) * variation)),
            intelligence: Math.max(0, Math.min(1, template.intelligence + (Math.random() - 0.5) * variation)),
            pack_tendency: Math.max(0, Math.min(1, template.pack_tendency + (Math.random() - 0.5) * variation)),
            caution: Math.max(0, Math.min(1, template.caution + (Math.random() - 0.5) * variation)),
            exploration: Math.max(0, Math.min(1, template.exploration + (Math.random() - 0.5) * variation))
        };
    }
    generateEnvironmentalAwareness() {
        const structures = ['cave', 'tree', 'rock', 'water_source'];
        const detectedCount = Math.floor(Math.random() * 3) + 1;
        return {
            detected_structures: structures.slice(0, detectedCount),
            resource_memory: this.generateResourceMemory(),
            weather_adaptation: Math.random(),
            threat_awareness: Math.random()
        };
    }
    generateResourceMemory() {
        const resourceTypes = ['food', 'water', 'shelter'];
        const memoryCount = Math.floor(Math.random() * 3) + 1;
        return Array.from({ length: memoryCount }, (_, i) => ({
            type: resourceTypes[i % resourceTypes.length],
            location: {
                x: Math.random() * DEFAULT_WORLD_SIZE,
                y: Math.random() * DEFAULT_WORLD_SIZE,
                route: DEFAULT_RESOURCE_MEMORY_ROUTE
            },
            quality: Math.random(),
            last_visited: Date.now() - Math.random() * HOUR_IN_MILLISECONDS
        }));
    }
    makeDecision(monsterId) {
        const monster = this.monsters.get(monsterId);
        if (!monster) {
            throw new Error(`Monster ${monsterId} not found`);
        }
        const pattern = BEHAVIOR_PATTERNS[monster.ai_personality.type];
        const action = this.selectAction(monster, pattern);
        const reasoning = this.generateReasoning(monster, action);
        const narrative = this.generateNarrative(monster, action, pattern);
        const decision = {
            action,
            reasoning,
            target_position: this.calculateTargetPosition(monster, action),
            duration: this.calculateActionDuration(action, monster),
            narrative
        };
        this.logger.debug(`Monster ${monsterId} decision`, { decision });
        return decision;
    }
    selectAction(monster, pattern) {
        const weights = pattern.decision_weights;
        const contextualWeights = this.applyContextualModifiers(weights, monster);
        const actions = Object.keys(contextualWeights);
        const totalWeight = Object.values(contextualWeights).reduce((sum, weight) => sum + weight, 0);
        let randomValue = Math.random() * totalWeight;
        for (const action of actions) {
            randomValue -= contextualWeights[action];
            if (randomValue <= 0) {
                return action;
            }
        }
        return actions[0];
    }
    applyContextualModifiers(weights, monster) {
        const modified = { ...weights };
        if (monster.stats.hunger > monster.stats.maxHunger * 0.7) {
            modified.hunt = (modified.hunt || 0) * 1.5;
            modified.forage = (modified.forage || 0) * 1.5;
        }
        if (monster.stats.energy < monster.stats.maxEnergy * 0.3) {
            modified.rest = (modified.rest || 0) * 2;
        }
        if (monster.stats.health < monster.stats.maxHealth * 0.5) {
            modified.hide = (modified.hide || 0) * 1.5;
            modified.retreat = (modified.retreat || 0) * 1.5;
        }
        return modified;
    }
    generateReasoning(monster, action) {
        const personality = monster.ai_personality;
        const stats = monster.stats;
        const reasoningTemplates = {
            hunt: `With ${personality.aggression > 0.6 ? 'aggressive' : 'calculated'} intent, hunting becomes necessary as hunger reaches ${Math.round(stats.hunger / stats.maxHunger * 100)}%`,
            forage: `Cautious foraging is chosen, driven by ${personality.caution > 0.6 ? 'extreme caution' : 'practical needs'} and current hunger level`,
            rest: `Energy levels at ${Math.round(stats.energy / stats.maxEnergy * 100)}% necessitate rest, with ${personality.intelligence > 0.6 ? 'strategic' : 'instinctive'} positioning`,
            patrol: `Territorial instincts drive patrol behavior, reflecting ${personality.pack_tendency > 0.6 ? 'pack leadership' : 'individual survival'} priorities`,
            hide: `Self-preservation instincts activate, utilizing ${personality.caution} caution factor and environmental awareness`,
            explore: `Exploration urges emerge from ${personality.exploration > 0.6 ? 'strong curiosity' : 'territorial expansion'} needs`
        };
        return reasoningTemplates[action] || `Standard ${action} behavior initiated based on current state assessment`;
    }
    generateNarrative(monster, action, pattern) {
        const responseType = this.determineResponseType(monster, action);
        const baseNarrative = pattern.response_patterns[responseType] || pattern.response_patterns.rest;
        const speciesTraits = {
            [monster_types_1.MonsterSpecies.SHADOW_WOLF]: 'moves with fluid grace through dappled shadows',
            [monster_types_1.MonsterSpecies.FROST_BEAR]: 'lumber forward with icy determination',
            [monster_types_1.MonsterSpecies.EMBER_HAWK]: 'circles overhead with fiery intensity',
            [monster_types_1.MonsterSpecies.STONE_SERPENT]: 'coils with earth-shaking patience',
            [monster_types_1.MonsterSpecies.WIND_STAG]: 'bounds with ethereal swiftness'
        };
        return `${baseNarrative} The ${monster.species} ${speciesTraits[monster.species]} as it prepares to ${action}.`;
    }
    determineResponseType(monster, action) {
        const threatActions = ['hunt', 'attack', 'pursue', 'patrol'];
        const opportunityActions = ['forage', 'explore', 'coordinate'];
        if (threatActions.includes(action))
            return 'threat';
        if (opportunityActions.includes(action))
            return 'opportunity';
        return 'rest';
    }
    calculateTargetPosition(monster, action) {
        const currentPos = monster.stats.position;
        const moveDistance = 5 + Math.random() * 10;
        const movementActions = ['hunt', 'forage', 'explore', 'patrol'];
        if (!movementActions.includes(action))
            return undefined;
        const angle = Math.random() * Math.PI * 2;
        return {
            x: currentPos.x + Math.cos(angle) * moveDistance,
            y: currentPos.y + Math.sin(angle) * moveDistance,
            route: currentPos.route
        };
    }
    calculateActionDuration(action, monster) {
        const baseDurations = {
            hunt: 300,
            forage: 180,
            rest: 600,
            patrol: 240,
            hide: 120,
            explore: 360
        };
        const base = baseDurations[action] || 200;
        const personalityModifier = 0.8 + (monster.ai_personality.intelligence * 0.4);
        return Math.round(base * personalityModifier);
    }
    updateMonsterState(monsterId, newState) {
        const monster = this.monsters.get(monsterId);
        if (!monster) {
            throw new Error(`Monster ${monsterId} not found`);
        }
        monster.state = newState;
        monster.last_updated = Date.now();
        this.logger.debug(`Monster ${monsterId} state updated to ${newState}`);
    }
    getMonster(monsterId) {
        return this.monsters.get(monsterId);
    }
    getAllMonsters() {
        return Array.from(this.monsters.values());
    }
    removeMonster(monsterId) {
        const removed = this.monsters.delete(monsterId);
        if (removed) {
            this.logger.info(`Monster ${monsterId} removed from system`);
        }
        return removed;
    }
    getMonstersByPersonality(personalityType) {
        return Array.from(this.monsters.values())
            .filter(monster => monster.ai_personality.type === personalityType);
    }
    getMonstersByRoute(route) {
        return Array.from(this.monsters.values())
            .filter(monster => monster.stats.position.route === route);
    }
    notifyEnvironmentalChange(routeId, changeType, location) {
        const monstersInRoute = this.getMonstersByRoute(routeId);
        monstersInRoute.forEach(monster => {
            const distance = Math.sqrt(Math.pow(monster.stats.position.x - location.x, 2) +
                Math.pow(monster.stats.position.y - location.y, 2));
            if (distance <= 25) {
                monster.environmental_awareness.threat_awareness = Math.min(1, monster.environmental_awareness.threat_awareness + 0.1);
                if (changeType === 'food_placed') {
                    monster.environmental_awareness.resource_memory.push({
                        type: 'food',
                        location: {
                            x: location.x,
                            y: location.y,
                            route: routeId
                        },
                        quality: 0.8,
                        last_visited: Date.now()
                    });
                }
                else if (changeType === 'shelter_built') {
                    monster.environmental_awareness.detected_structures.push('shelter');
                }
                monster.last_updated = Date.now();
            }
        });
        this.logger.info(`Notified ${monstersInRoute.length} monsters of environmental change`, {
            routeId,
            changeType,
            location
        });
    }
}
exports.MockMonsterSystem = MockMonsterSystem;
//# sourceMappingURL=mock-monster-system.js.map