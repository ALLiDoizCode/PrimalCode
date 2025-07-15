import winston from 'winston';
import { MockMonsterSystem } from '../../../src/ecosystem/mock-monster-system';
import {
  MonsterSpecies,
  MonsterPersonalityType,
  MonsterState,
  Monster
} from '../../../src/types/monster-types';

const createMockLogger = (): jest.Mocked<winston.Logger> => {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;
};

describe('MockMonsterSystem', () => {
  let mockSystem: MockMonsterSystem;
  let mockLogger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockSystem = new MockMonsterSystem(mockLogger);
  });

  describe('Monster Generation', () => {
    it('should generate Aggressive Hunter personality with expected traits', () => {
      const monster = mockSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'test_route'
      );

      expect(monster.ai_personality.type).toBe(MonsterPersonalityType.AGGRESSIVE_HUNTER);
      expect(monster.ai_personality.aggression).toBeGreaterThan(0.7);
      expect(monster.ai_personality.caution).toBeLessThan(0.3);
      expect(monster.species).toBe(MonsterSpecies.SHADOW_WOLF);
      expect(monster.stats.position.route).toBe('test_route');
      expect(monster.state).toBe(MonsterState.IDLE);
    });

    it('should generate Cautious Forager personality with expected traits', () => {
      const monster = mockSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route'
      );

      expect(monster.ai_personality.type).toBe(MonsterPersonalityType.CAUTIOUS_FORAGER);
      expect(monster.ai_personality.caution).toBeGreaterThan(0.8);
      expect(monster.ai_personality.aggression).toBeLessThan(0.3);
      expect(monster.ai_personality.intelligence).toBeGreaterThan(0.7);
      expect(monster.species).toBe(MonsterSpecies.FROST_BEAR);
    });

    it('should generate Pack Leader personality with expected traits', () => {
      const monster = mockSystem.generateMonster(
        MonsterSpecies.EMBER_HAWK,
        MonsterPersonalityType.PACK_LEADER,
        'test_route'
      );

      expect(monster.ai_personality.type).toBe(MonsterPersonalityType.PACK_LEADER);
      expect(monster.ai_personality.pack_tendency).toBeGreaterThan(0.8);
      expect(monster.ai_personality.intelligence).toBeGreaterThan(0.8);
      expect(monster.ai_personality.aggression).toBeGreaterThan(0.5);
      expect(monster.species).toBe(MonsterSpecies.EMBER_HAWK);
    });

    it('should generate different stats for different species', () => {
      const wolf = mockSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'test_route'
      );
      
      const bear = mockSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route'
      );

      expect(wolf.stats.maxHealth).toBe(80);
      expect(bear.stats.maxHealth).toBe(120);
      expect(wolf.stats.maxEnergy).toBe(90);
      expect(bear.stats.maxEnergy).toBe(70);
    });

    it('should generate unique monster IDs', () => {
      const monster1 = mockSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'test_route'
      );
      
      const monster2 = mockSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route'
      );

      expect(monster1.id).not.toBe(monster2.id);
      expect(monster1.id).toMatch(/^monster_\d+$/);
      expect(monster2.id).toMatch(/^monster_\d+$/);
    });

    it('should generate environmental awareness data', () => {
      const monster = mockSystem.generateMonster(
        MonsterSpecies.WIND_STAG,
        MonsterPersonalityType.PACK_LEADER,
        'test_route'
      );

      expect(monster.environmental_awareness.detected_structures).toBeInstanceOf(Array);
      expect(monster.environmental_awareness.detected_structures.length).toBeGreaterThan(0);
      expect(monster.environmental_awareness.resource_memory).toBeInstanceOf(Array);
      expect(monster.environmental_awareness.weather_adaptation).toBeGreaterThanOrEqual(0);
      expect(monster.environmental_awareness.threat_awareness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Monster Decision Making', () => {
    let monster: Monster;

    beforeEach(() => {
      monster = mockSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'test_route'
      );
    });

    it('should generate consistent decisions for Aggressive Hunter', () => {
      const decisions = Array.from({ length: 10 }, () => 
        mockSystem.makeDecision(monster.id)
      );

      const aggressiveActions = ['hunt', 'patrol', 'attack', 'pursue'];
      const aggressiveDecisions = decisions.filter(d => 
        aggressiveActions.includes(d.action)
      );

      expect(aggressiveDecisions.length).toBeGreaterThanOrEqual(decisions.length * 0.5);
      
      decisions.forEach(decision => {
        expect(decision.action).toBeDefined();
        expect(decision.reasoning).toBeDefined();
        expect(decision.narrative).toBeDefined();
        expect(decision.duration).toBeGreaterThan(0);
      });
    });

    it('should generate contextual decisions based on monster state', () => {
      monster.stats.hunger = monster.stats.maxHunger * 0.8;
      
      const hungryDecisions = Array.from({ length: 5 }, () => 
        mockSystem.makeDecision(monster.id)
      );
      
      const feedingActions = hungryDecisions.filter(d => 
        ['hunt', 'forage'].includes(d.action)
      );
      
      expect(feedingActions.length).toBeGreaterThan(0);
    });

    it('should generate narrative descriptions for decisions', () => {
      const decision = mockSystem.makeDecision(monster.id);
      
      expect(decision.narrative).toContain('shadow_wolf');
      expect(decision.narrative.length).toBeGreaterThan(20);
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(10);
    });

    it('should calculate appropriate action durations', () => {
      const decision = mockSystem.makeDecision(monster.id);
      
      expect(decision.duration).toBeGreaterThan(100);
      expect(decision.duration).toBeLessThan(800);
    });

    it('should throw error for non-existent monster', () => {
      expect(() => mockSystem.makeDecision('non_existent_id')).toThrow();
    });
  });

  describe('Monster State Management', () => {
    let monster: Monster;

    beforeEach(() => {
      monster = mockSystem.generateMonster(
        MonsterSpecies.STONE_SERPENT,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route'
      );
    });

    it('should update monster state successfully', () => {
      mockSystem.updateMonsterState(monster.id, MonsterState.HUNTING);
      
      const updatedMonster = mockSystem.getMonster(monster.id);
      expect(updatedMonster?.state).toBe(MonsterState.HUNTING);
    });

    it('should update last_updated timestamp on state change', (done) => {
      const originalTime = monster.last_updated;
      
      setTimeout(() => {
        mockSystem.updateMonsterState(monster.id, MonsterState.RESTING);
        const updatedMonster = mockSystem.getMonster(monster.id);
        expect(updatedMonster?.last_updated).toBeGreaterThan(originalTime);
        done();
      }, 10);
    });

    it('should throw error when updating non-existent monster', () => {
      expect(() => 
        mockSystem.updateMonsterState('non_existent_id', MonsterState.HUNTING)
      ).toThrow();
    });
  });

  describe('Monster Retrieval and Filtering', () => {
    let monsters: Monster[];

    beforeEach(() => {
      monsters = [
        mockSystem.generateMonster(
          MonsterSpecies.SHADOW_WOLF,
          MonsterPersonalityType.AGGRESSIVE_HUNTER,
          'route_1'
        ),
        mockSystem.generateMonster(
          MonsterSpecies.FROST_BEAR,
          MonsterPersonalityType.CAUTIOUS_FORAGER,
          'route_1'
        ),
        mockSystem.generateMonster(
          MonsterSpecies.EMBER_HAWK,
          MonsterPersonalityType.PACK_LEADER,
          'route_2'
        )
      ];
    });

    it('should retrieve all monsters', () => {
      const allMonsters = mockSystem.getAllMonsters();
      expect(allMonsters.length).toBe(3);
      expect(allMonsters.map(m => m.id)).toContain(monsters[0].id);
    });

    it('should filter monsters by personality type', () => {
      const hunters = mockSystem.getMonstersByPersonality(
        MonsterPersonalityType.AGGRESSIVE_HUNTER
      );
      
      expect(hunters.length).toBe(1);
      expect(hunters[0].ai_personality.type).toBe(MonsterPersonalityType.AGGRESSIVE_HUNTER);
    });

    it('should filter monsters by route', () => {
      const route1Monsters = mockSystem.getMonstersByRoute('route_1');
      expect(route1Monsters.length).toBe(2);
      
      const route2Monsters = mockSystem.getMonstersByRoute('route_2');
      expect(route2Monsters.length).toBe(1);
    });

    it('should remove monsters successfully', () => {
      const removed = mockSystem.removeMonster(monsters[0].id);
      expect(removed).toBe(true);
      
      const remainingMonsters = mockSystem.getAllMonsters();
      expect(remainingMonsters.length).toBe(2);
      expect(remainingMonsters.map(m => m.id)).not.toContain(monsters[0].id);
    });

    it('should return false when removing non-existent monster', () => {
      const removed = mockSystem.removeMonster('non_existent_id');
      expect(removed).toBe(false);
    });
  });

  describe('Performance Testing', () => {
    it('should handle 5+ simultaneous monsters without performance degradation', () => {
      const monsterCount = 6;
      const monsters: Monster[] = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < monsterCount; i++) {
        const species = Object.values(MonsterSpecies)[i % Object.values(MonsterSpecies).length];
        const personality = Object.values(MonsterPersonalityType)[i % Object.values(MonsterPersonalityType).length];
        
        monsters.push(
          mockSystem.generateMonster(species, personality, `route_${i}`)
        );
      }
      
      const generationTime = Date.now() - startTime;
      expect(generationTime).toBeLessThan(100);
      
      const decisionStartTime = Date.now();
      const decisions = monsters.map(monster => 
        mockSystem.makeDecision(monster.id)
      );
      const decisionTime = Date.now() - decisionStartTime;
      
      expect(decisionTime).toBeLessThan(200);
      expect(decisions.length).toBe(monsterCount);
      
      decisions.forEach(decision => {
        expect(decision.action).toBeDefined();
        expect(decision.reasoning).toBeDefined();
        expect(decision.narrative).toBeDefined();
      });
    });

    it('should maintain consistent behavior patterns under load', () => {
      const hunter = mockSystem.generateMonster(
        MonsterSpecies.SHADOW_WOLF,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'test_route'
      );
      
      const decisionCount = 20;
      const decisions = Array.from({ length: decisionCount }, () => 
        mockSystem.makeDecision(hunter.id)
      );
      
      const aggressiveActions = decisions.filter(d => 
        ['hunt', 'patrol', 'attack', 'pursue'].includes(d.action)
      );
      
      expect(aggressiveActions.length).toBeGreaterThanOrEqual(decisionCount * 0.5);
      
      decisions.forEach(decision => {
        expect(decision.narrative).toContain('shadow_wolf');
        expect(decision.reasoning).toBeDefined();
        expect(decision.reasoning.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Logging Integration', () => {
    it('should log monster generation events', () => {
      mockSystem.generateMonster(
        MonsterSpecies.WIND_STAG,
        MonsterPersonalityType.PACK_LEADER,
        'test_route'
      );
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated pack_leader wind_stag monster'),
        expect.any(Object)
      );
    });

    it('should log decision making events', () => {
      const monster = mockSystem.generateMonster(
        MonsterSpecies.EMBER_HAWK,
        MonsterPersonalityType.AGGRESSIVE_HUNTER,
        'test_route'
      );
      
      mockSystem.makeDecision(monster.id);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Monster'),
        expect.objectContaining({
          decision: expect.any(Object)
        })
      );
    });

    it('should log monster removal events', () => {
      const monster = mockSystem.generateMonster(
        MonsterSpecies.FROST_BEAR,
        MonsterPersonalityType.CAUTIOUS_FORAGER,
        'test_route'
      );
      
      mockSystem.removeMonster(monster.id);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Monster ${monster.id} removed from system`)
      );
    });
  });
});