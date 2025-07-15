import winston from 'winston';
import { MockEnvironmentState } from '../../../src/ecosystem/mock-environment-state';
import {
  WeatherCondition,
  ResourceType,
  StructureType,
  Environment
} from '../../../src/types/environment-types';

const createMockLogger = (): jest.Mocked<winston.Logger> => {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;
};

describe('MockEnvironmentState', () => {
  let mockEnvironment: MockEnvironmentState;
  let mockLogger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockEnvironment = new MockEnvironmentState(mockLogger);
  });

  describe('Environment Generation', () => {
    it('should generate complete environment with all components', () => {
      const environment = mockEnvironment.generateEnvironment('route_1', 'Test Forest');

      expect(environment.route_id).toBe('route_1');
      expect(environment.name).toBe('Test Forest');
      expect(environment.structures.length).toBeGreaterThan(4);
      expect(environment.resources.length).toBeGreaterThan(7);
      expect(environment.weather_state).toBeDefined();
      expect(environment.ecosystem_balance).toBeDefined();
      expect(environment.route_info).toBeDefined();
      expect(environment.last_modified).toBeDefined();
    });

    it('should generate structures with proper types and positions', () => {
      const environment = mockEnvironment.generateEnvironment('route_1', 'Test Area');

      environment.structures.forEach(structure => {
        expect(Object.values(StructureType)).toContain(structure.type);
        expect(structure.position.x).toBeGreaterThanOrEqual(0);
        expect(structure.position.y).toBeGreaterThanOrEqual(0);
        expect(structure.capacity).toBeGreaterThan(0);
        expect(structure.stability).toBeGreaterThan(0.6);
      });
    });

    it('should generate resources with proper types and attributes', () => {
      const environment = mockEnvironment.generateEnvironment('route_1', 'Resource Zone');

      environment.resources.forEach(resource => {
        expect(Object.values(ResourceType)).toContain(resource.type);
        expect(resource.quality).toBeGreaterThan(0.2);
        expect(resource.quantity).toBeGreaterThan(19);
        expect(resource.regeneration_rate).toBeGreaterThan(0);
        expect(resource.position.x).toBeGreaterThanOrEqual(0);
        expect(resource.position.y).toBeGreaterThanOrEqual(0);
      });
    });

    it('should generate weather state with valid conditions', () => {
      const environment = mockEnvironment.generateEnvironment('route_1', 'Weather Test');

      expect(Object.values(WeatherCondition)).toContain(environment.weather_state.condition);
      expect(environment.weather_state.temperature).toBeGreaterThan(-11);
      expect(environment.weather_state.humidity).toBeGreaterThan(0.2);
      expect(environment.weather_state.wind_speed).toBeGreaterThanOrEqual(0);
      expect(environment.weather_state.visibility).toBeGreaterThan(0.1);
      expect(environment.weather_state.forecast.length).toBeGreaterThan(2);
    });

    it('should generate ecosystem balance with realistic values', () => {
      const environment = mockEnvironment.generateEnvironment('route_1', 'Balance Test');

      expect(environment.ecosystem_balance.predator_count).toBeGreaterThan(0);
      expect(environment.ecosystem_balance.prey_count).toBeGreaterThan(4);
      expect(environment.ecosystem_balance.resource_abundance).toBeGreaterThan(0.3);
      expect(environment.ecosystem_balance.territory_pressure).toBeGreaterThanOrEqual(0);
      expect(environment.ecosystem_balance.seasonal_factor).toBeGreaterThan(0.4);
    });

    it('should generate route info with connected routes', () => {
      const environment = mockEnvironment.generateEnvironment('route_2', 'Connected Route');

      expect(environment.route_info.route_id).toBe('route_2');
      expect(environment.route_info.name).toBe('Connected Route');
      expect(environment.route_info.difficulty).toBeGreaterThanOrEqual(0);
      expect(environment.route_info.safety_level).toBeGreaterThanOrEqual(0);
      expect(environment.route_info.connected_routes.length).toBeGreaterThan(1);
      expect(environment.route_info.landmarks.length).toBeGreaterThan(1);
    });
  });

  describe('Weather Updates', () => {
    let environment: Environment;

    beforeEach(() => {
      environment = mockEnvironment.generateEnvironment('route_1', 'Weather Test');
    });

    it('should update weather conditions following valid transitions', () => {
      const originalCondition = environment.weather_state.condition;
      
      const newWeather = mockEnvironment.updateWeather('route_1');
      
      expect(newWeather.condition).toBeDefined();
      expect(Object.values(WeatherCondition)).toContain(newWeather.condition);
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      expect(updatedEnvironment?.weather_state.condition).toBe(newWeather.condition);
    });

    it('should generate new weather forecast on update', () => {
      const newWeather = mockEnvironment.updateWeather('route_1');
      
      expect(newWeather.forecast.length).toBeGreaterThan(2);
      expect(newWeather.forecast[0]).toBe(newWeather.condition);
    });

    it('should update last_modified timestamp on weather change', (done) => {
      const originalTime = environment.last_modified;
      
      setTimeout(() => {
        mockEnvironment.updateWeather('route_1');
        const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
        expect(updatedEnvironment?.last_modified).toBeGreaterThan(originalTime);
        done();
      }, 10);
    });

    it('should throw error for non-existent route', () => {
      expect(() => mockEnvironment.updateWeather('non_existent_route')).toThrow();
    });
  });

  describe('Resource Management', () => {
    let environment: Environment;

    beforeEach(() => {
      environment = mockEnvironment.generateEnvironment('route_1', 'Resource Test');
    });

    it('should regenerate resources over time', () => {
      const originalQuantities = environment.resources.map(r => r.quantity);
      
      environment.resources.forEach(resource => {
        resource.quantity = 50;
        resource.last_accessed = Date.now() - 3600000;
      });
      
      mockEnvironment.regenerateResources('route_1');
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      const regeneratedResources = updatedEnvironment?.resources.filter(r => r.quantity > 50);
      
      expect(regeneratedResources?.length).toBeGreaterThan(0);
    });

    it('should successfully access available resources', () => {
      const resource = environment.resources[0];
      const originalQuantity = resource.quantity;
      const accessAmount = 10;
      
      const success = mockEnvironment.accessResource('route_1', resource.id, accessAmount);
      
      expect(success).toBe(true);
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      const updatedResource = updatedEnvironment?.resources.find(r => r.id === resource.id);
      
      expect(updatedResource?.quantity).toBe(originalQuantity - accessAmount);
    });

    it('should fail to access insufficient resources', () => {
      const resource = environment.resources[0];
      const excessiveAmount = resource.quantity + 50;
      
      const success = mockEnvironment.accessResource('route_1', resource.id, excessiveAmount);
      
      expect(success).toBe(false);
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      const updatedResource = updatedEnvironment?.resources.find(r => r.id === resource.id);
      
      expect(updatedResource?.quantity).toBe(resource.quantity);
    });

    it('should update last_accessed timestamp on resource access', (done) => {
      const resource = environment.resources[0];
      const originalTime = resource.last_accessed;
      
      setTimeout(() => {
        mockEnvironment.accessResource('route_1', resource.id, 5);
        
        const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
        const updatedResource = updatedEnvironment?.resources.find(r => r.id === resource.id);
        
        expect(updatedResource?.last_accessed).toBeGreaterThan(originalTime);
        done();
      }, 10);
    });

    it('should throw error for non-existent resource', () => {
      expect(() => 
        mockEnvironment.accessResource('route_1', 'non_existent_resource', 10)
      ).toThrow();
    });
  });

  describe('Ecosystem Balance Management', () => {
    let environment: Environment;

    beforeEach(() => {
      environment = mockEnvironment.generateEnvironment('route_1', 'Balance Test');
    });

    it('should update predator and prey counts', () => {
      const originalPredators = environment.ecosystem_balance.predator_count;
      const originalPrey = environment.ecosystem_balance.prey_count;
      
      mockEnvironment.updateEcosystemBalance('route_1', 1, -2);
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      const balance = updatedEnvironment?.ecosystem_balance;
      
      expect(balance?.predator_count).toBe(originalPredators + 1);
      expect(balance?.prey_count).toBe(originalPrey - 2);
    });

    it('should prevent negative creature counts', () => {
      mockEnvironment.updateEcosystemBalance('route_1', -100, -100);
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      const balance = updatedEnvironment?.ecosystem_balance;
      
      expect(balance?.predator_count).toBe(0);
      expect(balance?.prey_count).toBe(0);
    });

    it('should update territory pressure based on predator ratio', () => {
      mockEnvironment.updateEcosystemBalance('route_1', 5, 5);
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      const balance = updatedEnvironment?.ecosystem_balance;
      
      expect(balance?.territory_pressure).toBeGreaterThanOrEqual(0);
      expect(balance?.territory_pressure).toBeLessThanOrEqual(1);
    });
  });

  describe('Environment Changes', () => {
    let environment: Environment;

    beforeEach(() => {
      environment = mockEnvironment.generateEnvironment('route_1', 'Change Test');
    });

    it('should create resource depletion changes', () => {
      const change = mockEnvironment.createEnvironmentChange(
        'route_1',
        'resource_depletion',
        'Drought affects water sources',
        0.5,
        { x: 50, y: 50 },
        20,
        3600000
      );
      
      expect(change.type).toBe('resource_depletion');
      expect(change.impact_level).toBe(0.5);
      expect(change.affected_area.radius).toBe(20);
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      const affectedResources = updatedEnvironment?.resources.filter(r => {
        const distance = Math.sqrt(
          Math.pow(r.position.x - 50, 2) + Math.pow(r.position.y - 50, 2)
        );
        return distance <= 20;
      });
      
      expect(affectedResources?.some(r => r.quantity < 120)).toBe(true);
    });

    it('should create structure damage changes', () => {
      const change = mockEnvironment.createEnvironmentChange(
        'route_1',
        'structure_damage',
        'Earthquake damages structures',
        0.3,
        { x: 50, y: 50 },
        50,
        1800000
      );
      
      expect(change.type).toBe('structure_damage');
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      const affectedStructures = updatedEnvironment?.structures.filter(s => {
        const distance = Math.sqrt(
          Math.pow(s.position.x - 50, 2) + Math.pow(s.position.y - 50, 2)
        );
        return distance <= 50;
      });
      
      expect(affectedStructures?.length).toBeGreaterThan(0);
      expect(affectedStructures?.some(s => s.stability < 1)).toBe(true);
    });

    it('should create weather change effects', () => {
      const originalCondition = environment.weather_state.condition;
      
      mockEnvironment.createEnvironmentChange(
        'route_1',
        'weather_change',
        'Sudden storm system',
        0.8,
        { x: 0, y: 0 },
        100,
        7200000
      );
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      
      expect(updatedEnvironment?.weather_state.condition).toBeDefined();
      expect(Object.values(WeatherCondition)).toContain(updatedEnvironment?.weather_state.condition);
    });

    it('should create ecosystem shift changes', () => {
      const originalBalance = environment.ecosystem_balance;
      
      mockEnvironment.createEnvironmentChange(
        'route_1',
        'ecosystem_shift',
        'Migration pattern changes',
        0.4,
        { x: 60, y: 60 },
        30,
        14400000
      );
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      const newBalance = updatedEnvironment?.ecosystem_balance;
      
      expect(newBalance?.resource_abundance).toBeLessThanOrEqual(originalBalance.resource_abundance);
      expect(newBalance?.territory_pressure).toBeGreaterThanOrEqual(originalBalance.territory_pressure);
    });
  });

  describe('Environment Retrieval and Filtering', () => {
    let environments: Environment[];

    beforeEach(() => {
      environments = [
        mockEnvironment.generateEnvironment('route_1', 'Forest'),
        mockEnvironment.generateEnvironment('route_2', 'Mountain'),
        mockEnvironment.generateEnvironment('route_3', 'Desert')
      ];
    });

    it('should retrieve specific environment by route ID', () => {
      const environment = mockEnvironment.getEnvironment('route_2');
      
      expect(environment).toBeDefined();
      expect(environment?.route_id).toBe('route_2');
      expect(environment?.name).toBe('Mountain');
    });

    it('should retrieve all environments', () => {
      const allEnvironments = mockEnvironment.getAllEnvironments();
      
      expect(allEnvironments.length).toBe(3);
      expect(allEnvironments.map(e => e.route_id)).toContain('route_1');
      expect(allEnvironments.map(e => e.route_id)).toContain('route_2');
      expect(allEnvironments.map(e => e.route_id)).toContain('route_3');
    });

    it('should filter resources by type', () => {
      const foodResources = mockEnvironment.getResourcesByType('route_1', ResourceType.FOOD);
      const waterResources = mockEnvironment.getResourcesByType('route_1', ResourceType.WATER);
      
      expect(foodResources.every(r => r.type === ResourceType.FOOD)).toBe(true);
      expect(waterResources.every(r => r.type === ResourceType.WATER)).toBe(true);
    });

    it('should filter structures by type', () => {
      const caves = mockEnvironment.getStructuresByType('route_1', StructureType.CAVE);
      const trees = mockEnvironment.getStructuresByType('route_1', StructureType.TREE);
      
      expect(caves.every(s => s.type === StructureType.CAVE)).toBe(true);
      expect(trees.every(s => s.type === StructureType.TREE)).toBe(true);
    });

    it('should get available (unoccupied) structures', () => {
      const availableStructures = mockEnvironment.getAvailableStructures('route_1');
      
      expect(availableStructures.every(s => !s.occupied)).toBe(true);
    });

    it('should return empty arrays for non-existent routes', () => {
      const resources = mockEnvironment.getResourcesByType('non_existent', ResourceType.FOOD);
      const structures = mockEnvironment.getStructuresByType('non_existent', StructureType.CAVE);
      
      expect(resources).toEqual([]);
      expect(structures).toEqual([]);
    });
  });

  describe('Simulation Time Management', () => {
    let environment: Environment;

    beforeEach(() => {
      environment = mockEnvironment.generateEnvironment('route_1', 'Time Test');
    });

    it('should update simulation time', () => {
      const originalTime = environment.simulation_time;
      const timeIncrement = 60000;
      
      mockEnvironment.updateSimulationTime('route_1', timeIncrement);
      
      const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
      expect(updatedEnvironment?.simulation_time).toBe(originalTime + timeIncrement);
    });

    it('should update last_modified on simulation time update', (done) => {
      const originalModified = environment.last_modified;
      
      setTimeout(() => {
        mockEnvironment.updateSimulationTime('route_1', 30000);
        
        const updatedEnvironment = mockEnvironment.getEnvironment('route_1');
        expect(updatedEnvironment?.last_modified).toBeGreaterThan(originalModified);
        done();
      }, 10);
    });

    it('should throw error for non-existent route', () => {
      expect(() => 
        mockEnvironment.updateSimulationTime('non_existent_route', 60000)
      ).toThrow();
    });
  });

  describe('Logging Integration', () => {
    it('should log environment generation events', () => {
      mockEnvironment.generateEnvironment('route_1', 'Test Environment');
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated environment for route route_1'),
        expect.any(Object)
      );
    });

    it('should log environment change events', () => {
      mockEnvironment.generateEnvironment('route_1', 'Test Environment');
      
      mockEnvironment.createEnvironmentChange(
        'route_1',
        'resource_depletion',
        'Test depletion',
        0.5,
        { x: 50, y: 50 },
        20,
        3600000
      );
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Environment change applied to route route_1'),
        expect.any(Object)
      );
    });

    it('should log resource access events', () => {
      const environment = mockEnvironment.generateEnvironment('route_1', 'Test Environment');
      const resource = environment.resources[0];
      
      mockEnvironment.accessResource('route_1', resource.id, 10);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Accessed resource ${resource.id} in route route_1`),
        expect.any(Object)
      );
    });
  });
});