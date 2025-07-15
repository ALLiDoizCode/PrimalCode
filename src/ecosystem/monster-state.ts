import { 
  Monster, 
  MonsterSpecies, 
  MonsterState, 
  MonsterPersonality,
  MonsterStats,
  MonsterAiPersonality,
  MonsterEnvironmentalAwareness,
  MonsterInfluenceResistance,
  MonsterPosition,
  ResourceMemory,
  AdaptationEvent,
  AdaptationType
} from '../types/monster-types';

export class MockMonsterGenerator {
  private static readonly PERSONALITY_TEMPLATES: Record<MonsterSpecies, MonsterPersonality> = {
    aggressive_hunter: {
      aggression: 0.8,
      intelligence: 0.6,
      pack_tendency: 0.3
    },
    cautious_forager: {
      aggression: 0.2,
      intelligence: 0.8,
      pack_tendency: 0.4
    },
    pack_leader: {
      aggression: 0.6,
      intelligence: 0.9,
      pack_tendency: 0.9
    }
  };

  private static readonly SPECIES_STATES: Record<MonsterSpecies, MonsterState[]> = {
    aggressive_hunter: ['hunting', 'moving', 'resting', 'territorial'],
    cautious_forager: ['foraging', 'moving', 'resting', 'fleeing'],
    pack_leader: ['socializing', 'moving', 'resting', 'territorial', 'hunting']
  };

  private idCounter = 1;

  generateMonster(species: MonsterSpecies, routeId: string = 'route_001'): Monster {
    const id = `monster_${this.idCounter++}`;
    const personality = this.generatePersonality(species);
    const stats = this.generateStats(species);
    const position = this.generatePosition(routeId);
    
    return {
      id,
      species,
      stats: {
        ...stats,
        position
      },
      ai_personality: personality,
      environmental_awareness: this.generateEnvironmentalAwareness(species),
      influence_resistance: this.generateInfluenceResistance(),
      state: this.getInitialState(species),
      last_decision: new Date()
    };
  }

  generateMultipleMonsters(count: number, species?: MonsterSpecies): Monster[] {
    const monsters: Monster[] = [];
    const speciesTypes: MonsterSpecies[] = ['aggressive_hunter', 'cautious_forager', 'pack_leader'];
    
    for (let i = 0; i < count; i++) {
      const selectedSpecies = species || speciesTypes[i % speciesTypes.length];
      monsters.push(this.generateMonster(selectedSpecies));
    }
    
    return monsters;
  }

  private generatePersonality(species: MonsterSpecies): MonsterAiPersonality {
    const template = MockMonsterGenerator.PERSONALITY_TEMPLATES[species];
    
    return {
      aggression: this.addVariation(template.aggression, 0.1),
      intelligence: this.addVariation(template.intelligence, 0.1),
      pack_tendency: this.addVariation(template.pack_tendency, 0.1)
    };
  }

  private generateStats(species: MonsterSpecies): Omit<MonsterStats, 'position'> {
    const baseHealth = species === 'aggressive_hunter' ? 85 : 
                      species === 'pack_leader' ? 90 : 75;
    const baseHunger = species === 'cautious_forager' ? 30 : 50;
    const baseEnergy = species === 'pack_leader' ? 80 : 70;

    return {
      health: Math.min(100, Math.max(0, baseHealth + this.randomVariation(10))),
      hunger: Math.min(100, Math.max(0, baseHunger + this.randomVariation(20))),
      energy: Math.min(100, Math.max(0, baseEnergy + this.randomVariation(15)))
    };
  }

  private generatePosition(routeId: string): MonsterPosition {
    return {
      x: Math.floor(Math.random() * 1000),
      y: Math.floor(Math.random() * 1000),
      route: routeId
    };
  }

  private generateEnvironmentalAwareness(species: MonsterSpecies): MonsterEnvironmentalAwareness {
    const baseStructures = species === 'cautious_forager' ? 
      ['water_source', 'shelter', 'food_cache'] : 
      species === 'pack_leader' ? 
      ['den', 'territory_marker', 'meeting_point'] :
      ['hunting_ground', 'prey_trail', 'ambush_point'];

    const resourceMemory: ResourceMemory[] = [];
    for (let i = 0; i < 3; i++) {
      resourceMemory.push({
        resource_type: ['food', 'water', 'shelter'][i % 3],
        location: {
          x: Math.floor(Math.random() * 1000),
          y: Math.floor(Math.random() * 1000),
          route: 'route_001'
        },
        quality: Math.random(),
        last_visited: new Date(Date.now() - Math.random() * 86400000) // Random time in last 24h
      });
    }

    return {
      detected_structures: baseStructures,
      resource_memory: resourceMemory,
      weather_adaptation: species === 'cautious_forager' ? 0.8 : 0.6
    };
  }

  private generateInfluenceResistance(): MonsterInfluenceResistance {
    const patterns: Record<string, number> = {
      'food_lure': Math.random(),
      'territory_threat': Math.random(),
      'pack_call': Math.random()
    };

    const adaptationHistory: AdaptationEvent[] = [];
    for (let i = 0; i < 2; i++) {
      adaptationHistory.push({
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7), // Random time in last week
        adaptation_type: (['behavioral', 'environmental', 'social'] as AdaptationType[])[i % 3],
        effectiveness: Math.random(),
        context: `Adaptation event ${i + 1}`
      });
    }

    return {
      learned_patterns: patterns,
      adaptation_history: adaptationHistory
    };
  }

  private getInitialState(species: MonsterSpecies): MonsterState {
    const possibleStates = MockMonsterGenerator.SPECIES_STATES[species];
    return possibleStates[Math.floor(Math.random() * possibleStates.length)];
  }

  private addVariation(base: number, variation: number): number {
    const change = (Math.random() - 0.5) * 2 * variation;
    return Math.min(1, Math.max(0, base + change));
  }

  private randomVariation(range: number): number {
    return (Math.random() - 0.5) * 2 * range;
  }
}

export class MockMonsterRepository {
  private monsters: Map<string, Monster> = new Map();
  private generator = new MockMonsterGenerator();

  addMonster(monster: Monster): void {
    this.monsters.set(monster.id, monster);
  }

  getMonster(id: string): Monster | undefined {
    return this.monsters.get(id);
  }

  getAllMonsters(): Monster[] {
    return Array.from(this.monsters.values());
  }

  getMonstersBySpecies(species: MonsterSpecies): Monster[] {
    return Array.from(this.monsters.values()).filter(m => m.species === species);
  }

  getMonstersByRoute(routeId: string): Monster[] {
    return Array.from(this.monsters.values()).filter(m => m.stats.position.route === routeId);
  }

  updateMonster(id: string, updates: Partial<Monster>): boolean {
    const monster = this.monsters.get(id);
    if (!monster) return false;

    this.monsters.set(id, { ...monster, ...updates });
    return true;
  }

  removeMonster(id: string): boolean {
    return this.monsters.delete(id);
  }

  generateAndAddMonster(species: MonsterSpecies, routeId?: string): Monster {
    const monster = this.generator.generateMonster(species, routeId);
    this.addMonster(monster);
    return monster;
  }

  generateAndAddMultiple(count: number, species?: MonsterSpecies): Monster[] {
    const monsters = this.generator.generateMultipleMonsters(count, species);
    monsters.forEach(monster => this.addMonster(monster));
    return monsters;
  }

  clear(): void {
    this.monsters.clear();
  }

  getMonsterCount(): number {
    return this.monsters.size;
  }
}