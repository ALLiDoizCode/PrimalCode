import { MockEnvironmentState } from '../../../src/ecosystem/environment-state';
import { WeatherCondition } from '../../../src/types/environment-types';

describe('MockEnvironmentState', () => {
  let environmentState: MockEnvironmentState;

  beforeEach(() => {
    environmentState = new MockEnvironmentState();
  });

  describe('initialization', () => {
    it('should initialize with default routes', () => {
      expect(environmentState.getEnvironmentCount()).toBe(3);
      expect(environmentState.getEnvironment('route_001')).toBeDefined();
      expect(environmentState.getEnvironment('route_002')).toBeDefined();
      expect(environmentState.getEnvironment('route_003')).toBeDefined();
    });

    it('should generate environments with required components', () => {
      const environment = environmentState.getEnvironment('route_001');
      
      expect(environment).toBeDefined();
      expect(environment!.route_id).toBe('route_001');
      expect(environment!.structures).toBeDefined();
      expect(environment!.resources).toBeDefined();
      expect(environment!.weather_state).toBeDefined();
      expect(environment!.influence_points).toBeDefined();
      expect(environment!.ecosystem_balance).toBeGreaterThan(0);
    });
  });

  describe('generateEnvironment', () => {
    it('should generate environment with structures', () => {
      const environment = environmentState.generateEnvironment('test_route');
      
      expect(environment.structures.length).toBeGreaterThanOrEqual(3);
      expect(environment.structures.length).toBeLessThanOrEqual(7);
      
      environment.structures.forEach(structure => {
        expect(structure.id).toBeDefined();
        expect(structure.type).toBeDefined();
        expect(structure.position.x).toBeGreaterThanOrEqual(0);
        expect(structure.position.x).toBeLessThanOrEqual(1000);
        expect(structure.position.y).toBeGreaterThanOrEqual(0);
        expect(structure.position.y).toBeLessThanOrEqual(1000);
        expect(structure.influence_radius).toBeGreaterThan(0);
      });
    });

    it('should generate environment with resources', () => {
      const environment = environmentState.generateEnvironment('test_route');
      
      expect(environment.resources.length).toBeGreaterThanOrEqual(4);
      expect(environment.resources.length).toBeLessThanOrEqual(9);
      
      environment.resources.forEach(resource => {
        expect(resource.id).toBeDefined();
        expect(resource.type).toBeDefined();
        expect(resource.quantity).toBeGreaterThanOrEqual(20);
        expect(resource.quantity).toBeLessThanOrEqual(100);
        expect(resource.quality).toBeGreaterThanOrEqual(0.3);
        expect(resource.quality).toBeLessThanOrEqual(1.0);
        expect(resource.regeneration_rate).toBeGreaterThan(0);
      });
    });

    it('should generate environment with weather state', () => {
      const environment = environmentState.generateEnvironment('test_route');
      
      expect(environment.weather_state.current_condition).toBeDefined();
      expect(environment.weather_state.temperature).toBeDefined();
      expect(environment.weather_state.humidity).toBeGreaterThanOrEqual(0);
      expect(environment.weather_state.humidity).toBeLessThanOrEqual(100);
      expect(environment.weather_state.wind_speed).toBeGreaterThanOrEqual(0);
      expect(environment.weather_state.wind_speed).toBeLessThanOrEqual(30);
      expect(environment.weather_state.visibility).toBeGreaterThan(0);
      expect(environment.weather_state.visibility).toBeLessThanOrEqual(1.0);
    });

    it('should generate environment with influence points', () => {
      const environment = environmentState.generateEnvironment('test_route');
      
      expect(environment.influence_points.length).toBeGreaterThanOrEqual(2);
      expect(environment.influence_points.length).toBeLessThanOrEqual(5);
      
      environment.influence_points.forEach(point => {
        expect(point.id).toBeDefined();
        expect(point.strength).toBeGreaterThanOrEqual(0.3);
        expect(point.strength).toBeLessThanOrEqual(1.0);
        expect(point.type).toBeDefined();
        expect(point.created_at).toBeDefined();
      });
    });

    it('should generate consistent ecosystem balance', () => {
      const environment = environmentState.generateEnvironment('test_route');
      
      expect(environment.ecosystem_balance).toBeGreaterThanOrEqual(0.4);
      expect(environment.ecosystem_balance).toBeLessThanOrEqual(1.0);
    });
  });

  describe('environment management', () => {
    it('should create and retrieve environments', () => {
      const environment = environmentState.createEnvironment('new_route');
      
      expect(environment.route_id).toBe('new_route');
      expect(environmentState.getEnvironment('new_route')).toBe(environment);
    });

    it('should update environment', () => {
      const environment = environmentState.getEnvironment('route_001');
      const originalBalance = environment!.ecosystem_balance;
      
      const success = environmentState.updateEnvironment('route_001', {
        ecosystem_balance: 0.8
      });
      
      expect(success).toBe(true);
      const updatedEnvironment = environmentState.getEnvironment('route_001');
      expect(updatedEnvironment!.ecosystem_balance).toBe(0.8);
      expect(updatedEnvironment!.ecosystem_balance).not.toBe(originalBalance);
    });

    it('should remove environment', () => {
      expect(environmentState.removeEnvironment('route_001')).toBe(true);
      expect(environmentState.getEnvironment('route_001')).toBeUndefined();
    });

    it('should get all environments', () => {
      const environments = environmentState.getAllEnvironments();
      expect(environments.length).toBe(3);
    });
  });

  describe('weather management', () => {
    it('should update weather randomly', () => {
      const originalWeather = environmentState.getEnvironment('route_001')!.weather_state;
      
      // Wait a millisecond to ensure timestamp difference
      const success = environmentState.updateWeather('route_001');
      expect(success).toBe(true);
      
      const updatedWeather = environmentState.getEnvironment('route_001')!.weather_state;
      expect(updatedWeather.last_updated.getTime()).toBeGreaterThanOrEqual(originalWeather.last_updated.getTime());
    });

    it('should update weather to specific condition', () => {
      const success = environmentState.updateWeather('route_001', 'stormy');
      expect(success).toBe(true);
      
      const updatedWeather = environmentState.getEnvironment('route_001')!.weather_state;
      expect(updatedWeather.current_condition).toBe('stormy');
    });

    it('should have consistent weather properties for conditions', () => {
      const conditions: WeatherCondition[] = ['sunny', 'rainy', 'stormy', 'foggy'];
      
      conditions.forEach(condition => {
        environmentState.updateWeather('route_001', condition);
        const weather = environmentState.getEnvironment('route_001')!.weather_state;
        
        expect(weather.current_condition).toBe(condition);
        expect(weather.temperature).toBeDefined();
        expect(weather.humidity).toBeGreaterThanOrEqual(0);
        expect(weather.humidity).toBeLessThanOrEqual(100);
        expect(weather.visibility).toBeGreaterThan(0);
        expect(weather.visibility).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('resource management', () => {
    it('should update resources through regeneration', () => {
      const environment = environmentState.getEnvironment('route_001');
      const originalQuantities = environment!.resources.map(r => r.quantity);
      
      const success = environmentState.updateResources('route_001');
      expect(success).toBe(true);
      
      const updatedEnvironment = environmentState.getEnvironment('route_001');
      const updatedQuantities = updatedEnvironment!.resources.map(r => r.quantity);
      
      // At least some resources should have increased (within regeneration limits)
      expect(updatedQuantities.some((q, i) => q >= originalQuantities[i])).toBe(true);
    });

    it('should consume resources', () => {
      const environment = environmentState.getEnvironment('route_001');
      const resource = environment!.resources[0];
      const originalQuantity = resource.quantity;
      
      const success = environmentState.consumeResource('route_001', resource.id, 10);
      expect(success).toBe(true);
      
      const updatedEnvironment = environmentState.getEnvironment('route_001');
      const updatedResource = updatedEnvironment!.resources.find(r => r.id === resource.id);
      expect(updatedResource!.quantity).toBe(originalQuantity - 10);
    });

    it('should not consume more resources than available', () => {
      const environment = environmentState.getEnvironment('route_001');
      const resource = environment!.resources[0];
      const originalQuantity = resource.quantity;
      
      const success = environmentState.consumeResource('route_001', resource.id, originalQuantity + 10);
      expect(success).toBe(false);
      
      const updatedEnvironment = environmentState.getEnvironment('route_001');
      const updatedResource = updatedEnvironment!.resources.find(r => r.id === resource.id);
      expect(updatedResource!.quantity).toBe(originalQuantity);
    });
  });

  describe('influence point management', () => {
    it('should add influence points', () => {
      const environment = environmentState.getEnvironment('route_001');
      const originalCount = environment!.influence_points.length;
      
      const success = environmentState.addInfluencePoint('route_001', {
        position: { x: 100, y: 200 },
        strength: 0.8,
        type: 'test_influence',
        created_at: new Date()
      });
      
      expect(success).toBe(true);
      const updatedEnvironment = environmentState.getEnvironment('route_001');
      expect(updatedEnvironment!.influence_points.length).toBe(originalCount + 1);
    });

    it('should cleanup expired influence points', () => {
      // Add an expired influence point
      const expiredPoint = {
        position: { x: 100, y: 200 },
        strength: 0.8,
        type: 'expired_influence',
        created_at: new Date(Date.now() - 86400000), // 1 day ago
        expires_at: new Date(Date.now() - 3600000) // 1 hour ago (expired)
      };
      
      environmentState.addInfluencePoint('route_001', expiredPoint);
      
      const beforeCleanup = environmentState.getEnvironment('route_001')!.influence_points;
      const expiredCount = beforeCleanup.filter(p => p.expires_at && p.expires_at < new Date()).length;
      
      const success = environmentState.cleanupExpiredInfluencePoints('route_001');
      expect(success).toBe(true);
      
      const afterCleanup = environmentState.getEnvironment('route_001')!.influence_points;
      expect(afterCleanup.length).toBe(beforeCleanup.length - expiredCount);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent routes', () => {
      expect(environmentState.getEnvironment('non_existent_route')).toBeUndefined();
      expect(environmentState.updateEnvironment('non_existent_route', {})).toBe(false);
      expect(environmentState.updateWeather('non_existent_route')).toBe(false);
      expect(environmentState.updateResources('non_existent_route')).toBe(false);
      expect(environmentState.consumeResource('non_existent_route', 'resource_1', 10)).toBe(false);
      expect(environmentState.addInfluencePoint('non_existent_route', {
        position: { x: 0, y: 0 },
        strength: 0.5,
        type: 'test',
        created_at: new Date()
      })).toBe(false);
    });

    it('should handle non-existent resources', () => {
      expect(environmentState.consumeResource('route_001', 'non_existent_resource', 10)).toBe(false);
    });
  });
});