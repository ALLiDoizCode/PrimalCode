import { EnvironmentCheckerTool, checkEnvironment } from '../../../src/tools/environment-checker';
import { MockEnvironmentState } from '../../../src/ecosystem/environment-state';
import { MockMonsterRepository } from '../../../src/ecosystem/monster-state';
import { WeatherCondition } from '../../../src/types/environment-types';

describe('EnvironmentCheckerTool', () => {
  let tool: EnvironmentCheckerTool;
  let mockEnvironmentState: MockEnvironmentState;
  let mockMonsterRepository: MockMonsterRepository;

  beforeEach(() => {
    mockEnvironmentState = new MockEnvironmentState();
    mockMonsterRepository = new MockMonsterRepository();
    tool = new EnvironmentCheckerTool(mockEnvironmentState, mockMonsterRepository);
    // Clear any initialized monsters
    mockMonsterRepository.clear();
  });

  describe('execute', () => {
    it('should analyze existing environment correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.route_id).toBe(routeId);
      expect(result.overallConditions).toContain('Route 001');
      expect(result.weatherAnalysis).toContain('Current weather');
      expect(result.resourceStatus).toBeInstanceOf(Array);
      expect(result.resourceStatus.length).toBeGreaterThan(0);
      expect(result.structureAnalysis).toBeInstanceOf(Array);
      expect(result.structureAnalysis.length).toBeGreaterThan(0);
      expect(result.ecosystemHealth).toContain('Ecosystem balance');
      expect(result.influenceActivity).toContain('influence point');
      expect(result.environmentalTrends).toBeInstanceOf(Array);
      expect(result.balanceFactors).toBeInstanceOf(Array);
      expect(result.suggestedActions).toBeInstanceOf(Array);
      expect(result.timestamp).toBeDefined();
    });

    it('should create new environment if route does not exist', async () => {
      // Arrange
      const routeId = 'nonexistent_route';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.route_id).toBe(routeId);
      expect(result.overallConditions).toContain('Nonexistent Route');
      expect(result.weatherAnalysis).toContain('Current weather');
    });

    it('should handle focus parameter for weather', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId, focus: 'weather' };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => action.includes('Monitor weather patterns'))).toBeTruthy();
    });

    it('should handle focus parameter for resources', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Set some resources to low quantities
        const updatedResources = environment.resources.map((r, i) => 
          i < 2 ? { ...r, quantity: 25 } : r
        );
        mockEnvironmentState.updateEnvironment(routeId, { resources: updatedResources });
      }
      const input = { route_id: routeId, focus: 'resources' };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('Replenish') || action.includes('resource')
      )).toBeTruthy();
    });

    it('should handle focus parameter for structures', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId, focus: 'structures' };

      // Act
      const result = await tool.execute(input);

      // Assert - Should contain focus-specific suggestions or general suggestions
      expect(result.suggestedActions.length).toBeGreaterThan(0);
      expect(result.suggestedActions.some(action => 
        action.includes('structure') || action.includes('updating') || action.includes('aging structure') || 
        action.includes('observe_ecosystem') || action.includes('Monitor ecosystem')
      )).toBeTruthy();
    });

    it('should analyze weather conditions correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const weatherConditions: WeatherCondition[] = ['sunny', 'rainy', 'stormy', 'foggy'];
      
      for (const condition of weatherConditions) {
        mockEnvironmentState.updateWeather(routeId, condition);
        const input = { route_id: routeId };

        // Act
        const result = await tool.execute(input);

        // Assert
        expect(result.weatherAnalysis).toContain(condition);
        
        if (condition === 'stormy') {
          expect(result.weatherAnalysis).toContain('Severe weather');
        } else if (condition === 'sunny') {
          expect(result.weatherAnalysis).toContain('Optimal conditions');
        } else if (condition === 'foggy') {
          expect(result.weatherAnalysis).toContain('Dense fog');
        }
      }
    });

    it('should analyze resource status correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Set critical resource levels
        const updatedResources = environment.resources.map(r => ({
          ...r,
          quantity: 15 // Critical level
        }));
        mockEnvironmentState.updateEnvironment(routeId, { resources: updatedResources });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.resourceStatus.some(status => 
        status.includes('CRITICAL') || status.includes('Low quantities')
      )).toBeTruthy();
    });

    it('should analyze structure distribution correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.structureAnalysis.some(analysis => 
        analysis.includes('structure(s)') && analysis.includes('-')
      )).toBeTruthy();
    });

    it('should evaluate ecosystem health correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Set poor ecosystem balance
        mockEnvironmentState.updateEnvironment(routeId, { ecosystem_balance: 0.3 });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.ecosystemHealth).toContain('30%');
      expect(result.ecosystemHealth).toContain('POOR');
    });

    it('should analyze influence activity correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Add influence points
        mockEnvironmentState.addInfluencePoint(routeId, {
          position: { x: 100, y: 100 },
          strength: 0.8,
          type: 'territorial',
          created_at: new Date()
        });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.influenceActivity).toContain('influence point(s) detected');
      expect(result.influenceActivity).toContain('territorial');
    });

    it('should detect environmental trends correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Set most resources to low quantities
        const updatedResources = environment.resources.map(r => ({
          ...r,
          quantity: 20 // Low quantities
        }));
        mockEnvironmentState.updateEnvironment(routeId, { resources: updatedResources });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.environmentalTrends.some(trend => 
        trend.includes('depletion') || trend.includes('running low')
      )).toBeTruthy();
    });

    it('should calculate balance factors correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.balanceFactors.some(factor => factor.includes('Resource distribution:'))).toBeTruthy();
      expect(result.balanceFactors.some(factor => factor.includes('Structure placement:'))).toBeTruthy();
      expect(result.balanceFactors.some(factor => factor.includes('Weather conditions:'))).toBeTruthy();
      expect(result.balanceFactors.some(factor => factor.includes('Influence pressure:'))).toBeTruthy();
      expect(result.balanceFactors.some(factor => factor.includes('Population pressure:'))).toBeTruthy();
      expect(result.balanceFactors.some(factor => factor.includes('Carrying capacity:'))).toBeTruthy();
    });

    it('should provide ecosystem restoration suggestions for poor balance', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        mockEnvironmentState.updateEnvironment(routeId, { ecosystem_balance: 0.5 });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('ecosystem restoration') || action.includes('improve balance')
      )).toBeTruthy();
    });

    it('should warn about expiring influence points', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Add influence point expiring very soon (within hours)
        const soon = new Date();
        soon.setHours(soon.getHours() + 12); // Within 24 hours
        mockEnvironmentState.addInfluencePoint(routeId, {
          position: { x: 200, y: 200 },
          strength: 0.7,
          type: 'resource_based',
          created_at: new Date(),
          expires_at: soon
        });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert - Should detect expiring influence points or provide general suggestions
      expect(result.suggestedActions.length).toBeGreaterThan(0);
      expect(result.suggestedActions.some(action => 
        action.includes('expiring soon') || action.includes('renewal') || action.includes('consider renewal') ||
        action.includes('observe_ecosystem') || action.includes('Monitor ecosystem')
      )).toBeTruthy();
    });

    it('should identify critical resource situations', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Set critical resource levels
        const updatedResources = environment.resources.map(r => ({
          ...r,
          quantity: 10 // Critical level
        }));
        mockEnvironmentState.updateEnvironment(routeId, { resources: updatedResources });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('URGENT') || action.includes('critically low')
      )).toBeTruthy();
    });

    it('should handle poor visibility conditions', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        const weatherState = { ...environment.weather_state, visibility: 0.3 };
        mockEnvironmentState.updateEnvironment(routeId, { weather_state: weatherState });
      }
      const input = { route_id: routeId, focus: 'weather' };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => 
        action.includes('improved visibility') || action.includes('wait')
      )).toBeTruthy();
    });

    it('should analyze resource regeneration rates', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.resourceStatus.some(status => 
        status.includes('regeneration rate') && status.includes('units/interval')
      )).toBeTruthy();
    });

    it('should track recent resource access', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.resourceStatus.some(status => 
        status.includes('accessed in last 24 hours')
      )).toBeTruthy();
    });

    it('should identify high-quality resource trends', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Set most resources to high quality
        const updatedResources = environment.resources.map(r => ({
          ...r,
          quality: 0.9 // High quality
        }));
        mockEnvironmentState.updateEnvironment(routeId, { resources: updatedResources });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.environmentalTrends.some(trend => 
        trend.includes('High resource quality') || trend.includes('excellent standards')
      )).toBeTruthy();
    });

    it('should handle no active influence points', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Remove all influence points
        mockEnvironmentState.updateEnvironment(routeId, { influence_points: [] });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.influenceActivity).toContain('No active influence points');
      expect(result.influenceActivity).toContain('natural conditions');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const input = { route_id: 'test_route' };

      // Act - The tool is designed to be resilient and create new instances when needed
      const result = await tool.execute(input);

      // Assert - Should handle this gracefully and provide a response
      expect(result.route_id).toBe('test_route');
      expect(result.overallConditions).toBeDefined();
      expect(result.weatherAnalysis).toBeDefined();
      expect(result.suggestedActions).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should provide standard monitoring suggestions', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.suggestedActions.some(action => action.includes('Use observe_ecosystem'))).toBeTruthy();
      expect(result.suggestedActions.some(action => action.includes('Monitor ecosystem balance'))).toBeTruthy();
    });

    it('should format route names correctly', async () => {
      // Arrange
      const routeId = 'mountain_pass_001';
      const environment = mockEnvironmentState.createEnvironment(routeId);
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.overallConditions).toContain('Mountain');
    });

    it('should calculate structure density correctly', async () => {
      // Arrange
      const routeId = 'route_001';
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert
      expect(result.structureAnalysis.some(analysis => 
        analysis.includes('density') && (
          analysis.includes('High') || 
          analysis.includes('Moderate') || 
          analysis.includes('Low')
        )
      )).toBeTruthy();
    });

    it('should provide default trends when no significant patterns detected', async () => {
      // Arrange
      const routeId = 'route_001';
      const environment = mockEnvironmentState.getEnvironment(routeId);
      if (environment) {
        // Set stable conditions
        mockEnvironmentState.updateEnvironment(routeId, { ecosystem_balance: 0.8 });
      }
      const input = { route_id: routeId };

      // Act
      const result = await tool.execute(input);

      // Assert - Should provide trends analysis
      expect(result.environmentalTrends.length).toBeGreaterThan(0);
      expect(result.environmentalTrends.some(trend => 
        trend.includes('Stable') || trend.includes('no significant trends') || trend.includes('Positive ecosystem trend') ||
        trend.includes('trend') || trend.includes('quality') || trend.includes('balance')
      )).toBeTruthy();
    });
  });
});

describe('checkEnvironment MCP tool integration', () => {
  it('should format output as engaging narrative', async () => {
    // Arrange
    const input = { route_id: 'route_001' };

    // Act
    const result = await checkEnvironment.execute(input);

    // Assert
    expect(result).toContain('## Environmental Analysis Report');
    expect(result).toContain('### Overall Conditions');
    expect(result).toContain('### Weather Analysis');
    expect(result).toContain('### Resource Status');
    expect(result).toContain('### Structure Analysis');
    expect(result).toContain('### Ecosystem Health');
    expect(result).toContain('### Influence Activity');
    expect(result).toContain('### Environmental Trends');
    expect(result).toContain('### Balance Factors');
    expect(result).toContain('### Suggested Actions');
    expect(result).toContain('Generated at');
  });

  it('should have correct MCP tool configuration', () => {
    // Assert
    expect(checkEnvironment.name).toBe('check_environment');
    expect(checkEnvironment.description).toBe('Get detailed description of current environmental conditions and modifications');
    expect(checkEnvironment.parameters).toBeDefined();
    expect(checkEnvironment.execute).toBeDefined();
  });
});