import { MockMonsterGenerator, MockMonsterRepository } from '../../../src/ecosystem/monster-state';
import { MonsterSpecies, MonsterState } from '../../../src/types/monster-types';

describe('MockMonsterGenerator', () => {
  let generator: MockMonsterGenerator;

  beforeEach(() => {
    generator = new MockMonsterGenerator();
  });

  describe('generateMonster', () => {
    it('should generate Aggressive Hunter personality with correct characteristics', () => {
      const monster = generator.generateMonster('aggressive_hunter');
      
      expect(monster.species).toBe('aggressive_hunter');
      expect(monster.ai_personality.aggression).toBeGreaterThan(0.7);
      expect(monster.ai_personality.intelligence).toBeGreaterThan(0.5);
      expect(monster.ai_personality.pack_tendency).toBeLessThan(0.4);
      expect(monster.stats.health).toBeGreaterThan(75);
      expect(monster.environmental_awareness.detected_structures).toContain('hunting_ground');
    });

    it('should generate Cautious Forager personality with correct characteristics', () => {
      const monster = generator.generateMonster('cautious_forager');
      
      expect(monster.species).toBe('cautious_forager');
      expect(monster.ai_personality.aggression).toBeLessThan(0.3);
      expect(monster.ai_personality.intelligence).toBeGreaterThan(0.7);
      expect(monster.ai_personality.pack_tendency).toBeLessThan(0.5);
      expect(monster.stats.health).toBeGreaterThan(65);
      expect(monster.environmental_awareness.detected_structures).toContain('water_source');
      expect(monster.environmental_awareness.weather_adaptation).toBeGreaterThan(0.7);
    });

    it('should generate Pack Leader personality with correct characteristics', () => {
      const monster = generator.generateMonster('pack_leader');
      
      expect(monster.species).toBe('pack_leader');
      expect(monster.ai_personality.aggression).toBeGreaterThan(0.5);
      expect(monster.ai_personality.intelligence).toBeGreaterThan(0.8);
      expect(monster.ai_personality.pack_tendency).toBeGreaterThan(0.8);
      expect(monster.stats.health).toBeGreaterThan(80);
      expect(monster.environmental_awareness.detected_structures).toContain('den');
    });

    it('should generate monsters with valid stats ranges', () => {
      const species: MonsterSpecies[] = ['aggressive_hunter', 'cautious_forager', 'pack_leader'];
      
      species.forEach(speciesType => {
        const monster = generator.generateMonster(speciesType);
        
        expect(monster.stats.health).toBeGreaterThanOrEqual(0);
        expect(monster.stats.health).toBeLessThanOrEqual(100);
        expect(monster.stats.hunger).toBeGreaterThanOrEqual(0);
        expect(monster.stats.hunger).toBeLessThanOrEqual(100);
        expect(monster.stats.energy).toBeGreaterThanOrEqual(0);
        expect(monster.stats.energy).toBeLessThanOrEqual(100);
      });
    });

    it('should generate monsters with unique IDs', () => {
      const monster1 = generator.generateMonster('aggressive_hunter');
      const monster2 = generator.generateMonster('aggressive_hunter');
      
      expect(monster1.id).not.toBe(monster2.id);
    });

    it('should generate monsters with valid positions', () => {
      const monster = generator.generateMonster('aggressive_hunter', 'test_route');
      
      expect(monster.stats.position.x).toBeGreaterThanOrEqual(0);
      expect(monster.stats.position.x).toBeLessThanOrEqual(1000);
      expect(monster.stats.position.y).toBeGreaterThanOrEqual(0);
      expect(monster.stats.position.y).toBeLessThanOrEqual(1000);
      expect(monster.stats.position.route).toBe('test_route');
    });

    it('should generate monsters with resource memory', () => {
      const monster = generator.generateMonster('cautious_forager');
      
      expect(monster.environmental_awareness.resource_memory).toHaveLength(3);
      expect(monster.environmental_awareness.resource_memory[0]).toHaveProperty('resource_type');
      expect(monster.environmental_awareness.resource_memory[0]).toHaveProperty('location');
      expect(monster.environmental_awareness.resource_memory[0]).toHaveProperty('quality');
      expect(monster.environmental_awareness.resource_memory[0]).toHaveProperty('last_visited');
    });

    it('should generate monsters with influence resistance data', () => {
      const monster = generator.generateMonster('pack_leader');
      
      expect(monster.influence_resistance.learned_patterns).toHaveProperty('food_lure');
      expect(monster.influence_resistance.learned_patterns).toHaveProperty('territory_threat');
      expect(monster.influence_resistance.learned_patterns).toHaveProperty('pack_call');
      expect(monster.influence_resistance.adaptation_history).toHaveLength(2);
    });
  });

  describe('generateMultipleMonsters', () => {
    it('should generate multiple monsters with different species', () => {
      const monsters = generator.generateMultipleMonsters(6);
      
      expect(monsters).toHaveLength(6);
      expect(monsters[0].species).toBe('aggressive_hunter');
      expect(monsters[1].species).toBe('cautious_forager');
      expect(monsters[2].species).toBe('pack_leader');
      expect(monsters[3].species).toBe('aggressive_hunter');
    });

    it('should generate multiple monsters of the same species when specified', () => {
      const monsters = generator.generateMultipleMonsters(3, 'pack_leader');
      
      expect(monsters).toHaveLength(3);
      monsters.forEach(monster => {
        expect(monster.species).toBe('pack_leader');
      });
    });
  });
});

describe('MockMonsterRepository', () => {
  let repository: MockMonsterRepository;

  beforeEach(() => {
    repository = new MockMonsterRepository();
  });

  describe('monster management', () => {
    it('should add and retrieve monsters', () => {
      const monster = repository.generateAndAddMonster('aggressive_hunter');
      
      expect(repository.getMonster(monster.id)).toBe(monster);
      expect(repository.getMonsterCount()).toBe(1);
    });

    it('should get all monsters', () => {
      const monsters = repository.generateAndAddMultiple(3);
      
      expect(repository.getAllMonsters()).toHaveLength(3);
      expect(repository.getAllMonsters()).toEqual(expect.arrayContaining(monsters));
    });

    it('should filter monsters by species', () => {
      repository.generateAndAddMonster('aggressive_hunter');
      repository.generateAndAddMonster('cautious_forager');
      repository.generateAndAddMonster('aggressive_hunter');
      
      const hunters = repository.getMonstersBySpecies('aggressive_hunter');
      expect(hunters).toHaveLength(2);
      hunters.forEach(monster => {
        expect(monster.species).toBe('aggressive_hunter');
      });
    });

    it('should filter monsters by route', () => {
      repository.generateAndAddMonster('aggressive_hunter', 'route_001');
      repository.generateAndAddMonster('cautious_forager', 'route_002');
      repository.generateAndAddMonster('pack_leader', 'route_001');
      
      const route001Monsters = repository.getMonstersByRoute('route_001');
      expect(route001Monsters).toHaveLength(2);
      route001Monsters.forEach(monster => {
        expect(monster.stats.position.route).toBe('route_001');
      });
    });

    it('should update monsters', () => {
      const monster = repository.generateAndAddMonster('aggressive_hunter');
      const originalHealth = monster.stats.health;
      
      const success = repository.updateMonster(monster.id, {
        stats: { ...monster.stats, health: 50 }
      });
      
      expect(success).toBe(true);
      const updatedMonster = repository.getMonster(monster.id);
      expect(updatedMonster?.stats.health).toBe(50);
      expect(updatedMonster?.stats.health).not.toBe(originalHealth);
    });

    it('should remove monsters', () => {
      const monster = repository.generateAndAddMonster('aggressive_hunter');
      
      expect(repository.removeMonster(monster.id)).toBe(true);
      expect(repository.getMonster(monster.id)).toBeUndefined();
      expect(repository.getMonsterCount()).toBe(0);
    });

    it('should clear all monsters', () => {
      repository.generateAndAddMultiple(5);
      expect(repository.getMonsterCount()).toBe(5);
      
      repository.clear();
      expect(repository.getMonsterCount()).toBe(0);
      expect(repository.getAllMonsters()).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should return false when updating non-existent monster', () => {
      const success = repository.updateMonster('non_existent_id', { state: 'resting' });
      expect(success).toBe(false);
    });

    it('should return false when removing non-existent monster', () => {
      const success = repository.removeMonster('non_existent_id');
      expect(success).toBe(false);
    });

    it('should return undefined when getting non-existent monster', () => {
      const monster = repository.getMonster('non_existent_id');
      expect(monster).toBeUndefined();
    });
  });
});