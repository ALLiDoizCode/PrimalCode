import { z } from 'zod';
import { MockMonsterRepository } from '../ecosystem/monster-state';
import { MockEnvironmentState } from '../ecosystem/environment-state';
import { Monster, MonsterState, MonsterSpecies, AdaptationEvent } from '../types/monster-types';
import { Environment } from '../types/environment-types';
import { aoClientManager } from '../ao-integration';


// Monster analyzer input schema
const MonsterAnalyzerInput = z.object({
  monster_id: z.string().describe('Unique identifier for the monster'),
  route_id: z.string().describe('Route where the monster is located')
});

// Monster analyzer output interface
interface MonsterAnalyzerOutput {
  monster_id: string;
  species: string;
  personalityProfile: string;
  currentBehavior: string;
  environmentalInteractions: string[];
  behavioralPredictions: string[];
  interactionInsights: string[];
  suggestedActions: string[];
  timestamp: string;
}

/**
 * Monster Analyzer MCP tool for PrimalCode individual creature analysis
 * Provides detailed behavioral analysis for individual creatures
 */
export class MonsterAnalyzerTool {
  private monsterRepository: MockMonsterRepository;
  private environmentState: MockEnvironmentState;
  private useAOIntegration: boolean;

  constructor(
    monsterRepository?: MockMonsterRepository, 
    environmentState?: MockEnvironmentState,
    useAOIntegration: boolean = true
  ) {
    this.monsterRepository = monsterRepository || new MockMonsterRepository();
    this.environmentState = environmentState || new MockEnvironmentState();
    this.useAOIntegration = useAOIntegration;
    
    // Initialize with some monsters for demonstration when using mock data
    if (!useAOIntegration && this.monsterRepository.getMonsterCount() === 0) {
      this.monsterRepository.generateAndAddMultiple(5);
    }
  }

  async execute(input: z.infer<typeof MonsterAnalyzerInput>): Promise<MonsterAnalyzerOutput> {
    try {
      // Try AO integration first if enabled
      if (this.useAOIntegration) {
        const aoResult = await this.analyzeWithAOIntegration(input);
        if (aoResult) {
          return aoResult;
        }
        // Fall back to mock data if AO integration fails
      }

      // Use mock data (existing implementation)
      const monster = this.monsterRepository.getMonster(input.monster_id);
      const environment = this.environmentState.getEnvironment(input.route_id);

      if (!monster) {
        return this.generateNotFoundResponse(input.monster_id);
      }

      if (!environment) {
        return this.generateEnvironmentMissingResponse(input.monster_id, input.route_id);
      }

      // Verify monster is in the specified route
      if (monster.stats.position.route !== input.route_id) {
        return this.generateWrongRouteResponse(input.monster_id, input.route_id, monster.stats.position.route);
      }

      return this.generateAnalysis(monster, environment);

    } catch (error) {
      return {
        monster_id: input.monster_id,
        species: 'Unknown',
        personalityProfile: 'Unable to analyze personality due to technical difficulties',
        currentBehavior: 'Behavioral analysis offline',
        environmentalInteractions: ['Technical issues detected in analysis systems'],
        behavioralPredictions: ['Unable to predict behavior at this time'],
        interactionInsights: ['Analysis systems require maintenance'],
        suggestedActions: ['Please try again later or contact system administrator'],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyze monster using real AO process integration
   */
  private async analyzeWithAOIntegration(input: z.infer<typeof MonsterAnalyzerInput>): Promise<MonsterAnalyzerOutput | null> {
    try {
      // Get AO client for this monster
      const client = aoClientManager.getClient(input.monster_id);
      if (!client) {
        // Try to create client if process ID is available (in production, this would come from configuration)
        return null;
      }

      // Get comprehensive monster state from AO process
      const monsterState = await client.getMonsterState();
      if (!monsterState) {
        return null;
      }

      // Perform health check to get additional monitoring data
      const healthData = await client.healthCheck();
      
      return this.generateAOAnalysis(monsterState, healthData);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate analysis from AO process data
   */
  private generateAOAnalysis(
    monsterState: any, 
    healthData: any
  ): MonsterAnalyzerOutput {
    // Convert AO monster state to analysis format
    const personalityProfile = this.generateAOPersonalityProfile(monsterState);
    const currentBehavior = this.generateAOCurrentBehaviorAnalysis(monsterState, healthData);
    const environmentalInteractions = this.generateAOEnvironmentalInteractions(monsterState);
    const behavioralPredictions = this.generateAOBehavioralPredictions(monsterState);
    const interactionInsights = this.generateAOInteractionInsights(monsterState);
    const suggestedActions = this.generateAOSuggestedActions(monsterState, healthData);

    return {
      monster_id: monsterState.monster_id,
      species: this.formatSpeciesName(monsterState.species),
      personalityProfile,
      currentBehavior,
      environmentalInteractions,
      behavioralPredictions,
      interactionInsights,
      suggestedActions,
      timestamp: new Date().toISOString()
    };
  }

  private generateAOPersonalityProfile(monsterState: any): string {
    const { aggression, intelligence, pack_tendency, adaptation_rate } = monsterState.personality;
    
    let profile = `This ${monsterState.species.replace('_', ' ')} displays `;
    
    // Aggression analysis
    if (aggression > 0.8) {
      profile += 'extremely aggressive tendencies, often initiating conflicts and defending territory fiercely. ';
    } else if (aggression > 0.6) {
      profile += 'moderate aggression, willing to fight when necessary but not overly confrontational. ';
    } else if (aggression > 0.3) {
      profile += 'mild aggression, preferring to avoid conflicts but capable of defending itself. ';
    } else {
      profile += 'very passive behavior, rarely engaging in confrontations and often fleeing from threats. ';
    }

    // Intelligence analysis
    if (intelligence > 0.8) {
      profile += 'Exceptional intelligence allows it to quickly learn from experiences and adapt to new situations. ';
    } else if (intelligence > 0.6) {
      profile += 'Good problem-solving abilities enable it to navigate complex environmental challenges. ';
    } else if (intelligence > 0.3) {
      profile += 'Average intelligence with basic pattern recognition and simple decision-making. ';
    } else {
      profile += 'Limited intelligence, relying primarily on instinct and basic responses. ';
    }

    // Pack tendency analysis
    if (pack_tendency > 0.8) {
      profile += 'Strong pack instincts drive it to seek group formations and cooperative behaviors. ';
    } else if (pack_tendency > 0.6) {
      profile += 'Moderate social tendencies, comfortable in groups but also capable of independent action. ';
    } else if (pack_tendency > 0.3) {
      profile += 'Mild social preferences, occasionally interacting with others but generally solitary. ';
    } else {
      profile += 'Highly solitary nature, actively avoiding other creatures and preferring isolation. ';
    }

    // Adaptation rate analysis
    if (adaptation_rate > 0.8) {
      profile += 'Rapid adaptation allows it to quickly adjust to new situations and environments.';
    } else if (adaptation_rate > 0.6) {
      profile += 'Good adaptation helps it cope with environmental changes over time.';
    } else {
      profile += 'Slow adaptation makes it prefer familiar situations and resist change.';
    }

    return profile;
  }

  private generateAOCurrentBehaviorAnalysis(monsterState: any, healthData: any): string {
    const state = monsterState.current_state;
    const timeSinceLastDecision = Date.now() - monsterState.last_decision * 1000;
    const minutesAgo = Math.floor(timeSinceLastDecision / 60000);
    const nextDecisionIn = Math.max(0, monsterState.next_decision_at * 1000 - Date.now()) / 1000;

    let behavior = `Currently ${this.getStateDescription(state as MonsterState)} (last decision made ${minutesAgo} minutes ago, next decision in ${Math.round(nextDecisionIn)} seconds). `;

    // Add health monitoring data if available
    if (healthData && healthData.health_status) {
      const healthStatus = healthData.health_status;
      behavior += `Process has been running for ${healthStatus.uptime_hours} hours with ${healthStatus.error_count} errors. `;
    }

    // State-specific analysis based on AO data
    behavior += this.generateStateSpecificAnalysis(state, monsterState.stats, monsterState.personality);

    return behavior;
  }

  private generateStateSpecificAnalysis(state: string, stats: any, personality: any): string {
    const { health, hunger, energy } = stats;
    
    switch (state) {
      case 'hunt':
      case 'hunting':
        return `With ${Math.round(energy)}% energy and ${Math.round(hunger)}% hunger, this creature is actively pursuing prey. ${
          personality.aggression > 0.7 ? 'Its aggressive nature makes it a formidable hunter.' : ''
        }`;
      
      case 'rest':
      case 'resting':
        return `Recovering with ${Math.round(health)}% health and ${Math.round(energy)}% energy. ${
          health < 50 ? 'The extended rest suggests it may be injured or stressed.' : ''
        }`;
      
      case 'explore':
      case 'exploring':
        return `Exploring the area with ${Math.round(energy)}% energy, driven by ${Math.round(personality.intelligence * 100)}% intelligence.`;
      
      case 'patrol_territory':
        return `Defending territory with ${Math.round(personality.aggression * 100)}% aggression levels.`;
      
      default:
        return `Engaged in ${state} behavior with current stats: ${Math.round(health)}% health, ${Math.round(energy)}% energy, ${Math.round(hunger)}% hunger.`;
    }
  }

  private generateAOEnvironmentalInteractions(monsterState: any): string[] {
    const interactions: string[] = [];

    // Use environmental awareness from AO process
    if (monsterState.environmental_awareness) {
      const { detected_structures, weather_adaptation } = monsterState.environmental_awareness;
      
      detected_structures.forEach((structure: string) => {
        interactions.push(`Aware of ${structure} in the environment - ${this.getStructureInteractionDescription(structure)}`);
      });

      interactions.push(`Weather adaptation level: ${Math.round(weather_adaptation * 100)}% - ${this.getAdaptationDescription(weather_adaptation)}`);
    }

    return interactions.length > 0 ? interactions : ['Limited environmental interaction data available from AO process'];
  }

  private generateAOBehavioralPredictions(monsterState: any): string[] {
    const predictions: string[] = [];
    const { health, energy } = monsterState.stats;
    const { aggression, intelligence } = monsterState.personality;

    // Health-based predictions
    if (health < 30) {
      predictions.push('Likely to seek shelter and rest until health improves');
    } else if (health > 80 && energy > 70) {
      predictions.push('High probability of engaging in active behaviors like hunting or exploration');
    }

    // Autonomous decision cycle predictions
    const nextDecisionIn = Math.max(0, monsterState.next_decision_at * 1000 - Date.now()) / 1000;
    predictions.push(`Next autonomous decision in ${Math.round(nextDecisionIn)} seconds`);

    // Personality-based predictions
    if (aggression > 0.7 && health > 60) {
      predictions.push('May initiate territorial disputes or aggressive encounters');
    }

    if (intelligence > 0.7) {
      predictions.push('Will adapt quickly to environmental changes based on high intelligence');
    }

    return predictions;
  }

  private generateAOInteractionInsights(monsterState: any): string[] {
    const insights: string[] = [];

    insights.push('Real-time autonomous behavior tracking via AO process integration');
    
    if (monsterState.health_status && monsterState.health_status.is_healthy) {
      insights.push('AO process is healthy and making autonomous decisions');
    } else {
      insights.push('⚠️ AO process health issues detected - behavior may be compromised');
    }

    // Add learning insights if available
    if (monsterState.environmental_awareness?.detected_structures?.length > 0) {
      insights.push(`Actively tracking ${monsterState.environmental_awareness.detected_structures.length} environmental features`);
    }

    return insights;
  }

  private generateAOSuggestedActions(monsterState: any, healthData: any): string[] {
    const suggestions: string[] = [];

    // AO-specific suggestions
    suggestions.push('Monitor AO process health using health_check tool');
    
    if (healthData && healthData.health_status && !healthData.health_status.is_healthy) {
      suggestions.push('⚠️ AO process requires attention - check error logs');
    }

    // Behavioral suggestions based on real state
    if (monsterState.stats.health < 50) {
      suggestions.push('Consider environmental modifications to support creature recovery');
    }

    if (monsterState.current_state === 'hunt' && monsterState.personality.aggression > 0.7) {
      suggestions.push('Exercise caution - creature is in aggressive hunting state (confirmed by AO process)');
    }

    suggestions.push('Use environment modification tools to test real autonomous reactions');
    suggestions.push('Continue monitoring via AO process for genuine behavioral changes');

    return suggestions;
  }

  private getAdaptationDescription(adaptation: number): string {
    if (adaptation > 0.8) return 'excellent adaptation';
    if (adaptation > 0.6) return 'good adaptation';
    if (adaptation > 0.4) return 'moderate adaptation';
    return 'poor adaptation';
  }

  private generateAnalysis(monster: Monster, environment: Environment): MonsterAnalyzerOutput {
    const personalityProfile = this.generatePersonalityProfile(monster);
    const currentBehavior = this.generateCurrentBehaviorAnalysis(monster, environment);
    const environmentalInteractions = this.generateEnvironmentalInteractions(monster, environment);
    const behavioralPredictions = this.generateBehavioralPredictions(monster, environment);
    const interactionInsights = this.generateInteractionInsights(monster, environment);
    const suggestedActions = this.generateSuggestedActions(monster);

    return {
      monster_id: monster.id,
      species: this.formatSpeciesName(monster.species),
      personalityProfile,
      currentBehavior,
      environmentalInteractions,
      behavioralPredictions,
      interactionInsights,
      suggestedActions,
      timestamp: new Date().toISOString()
    };
  }

  private generatePersonalityProfile(monster: Monster): string {
    const { aggression, intelligence, pack_tendency } = monster.ai_personality;
    const { weather_adaptation } = monster.environmental_awareness;
    
    let profile = `This ${monster.species.replace('_', ' ')} displays `;
    
    // Aggression analysis
    if (aggression > 0.8) {
      profile += 'extremely aggressive tendencies, often initiating conflicts and defending territory fiercely. ';
    } else if (aggression > 0.6) {
      profile += 'moderate aggression, willing to fight when necessary but not overly confrontational. ';
    } else if (aggression > 0.3) {
      profile += 'mild aggression, preferring to avoid conflicts but capable of defending itself. ';
    } else {
      profile += 'very passive behavior, rarely engaging in confrontations and often fleeing from threats. ';
    }

    // Intelligence analysis
    if (intelligence > 0.8) {
      profile += 'Exceptional intelligence allows it to quickly learn from experiences and adapt to new situations. ';
    } else if (intelligence > 0.6) {
      profile += 'Good problem-solving abilities enable it to navigate complex environmental challenges. ';
    } else if (intelligence > 0.3) {
      profile += 'Average intelligence with basic pattern recognition and simple decision-making. ';
    } else {
      profile += 'Limited intelligence, relying primarily on instinct and basic responses. ';
    }

    // Pack tendency analysis
    if (pack_tendency > 0.8) {
      profile += 'Strong pack instincts drive it to seek group formations and cooperative behaviors. ';
    } else if (pack_tendency > 0.6) {
      profile += 'Moderate social tendencies, comfortable in groups but also capable of independent action. ';
    } else if (pack_tendency > 0.3) {
      profile += 'Mild social preferences, occasionally interacting with others but generally solitary. ';
    } else {
      profile += 'Highly solitary nature, actively avoiding other creatures and preferring isolation. ';
    }

    // Environmental adaptation
    if (weather_adaptation > 0.8) {
      profile += 'Exceptional environmental adaptation allows it to thrive in various weather conditions.';
    } else if (weather_adaptation > 0.6) {
      profile += 'Good environmental resilience helps it cope with most weather changes.';
    } else {
      profile += 'Limited weather adaptation makes it vulnerable to environmental changes.';
    }

    return profile;
  }

  private generateCurrentBehaviorAnalysis(monster: Monster, environment: Environment): string {
    const state = monster.state;
    const health = monster.stats.health;
    const energy = monster.stats.energy;
    const hunger = monster.stats.hunger;
    const weather = environment.weather_state.current_condition;
    const timeSinceLastDecision = Date.now() - monster.last_decision.getTime();
    const minutesAgo = Math.floor(timeSinceLastDecision / 60000);

    let behavior = `Currently ${this.getStateDescription(state)} (last decision made ${minutesAgo} minutes ago). `;

    // Context-specific behavior analysis
    switch (state) {
      case 'hunting':
        behavior += `With ${Math.round(energy)}% energy and ${Math.round(hunger)}% hunger, this creature is actively pursuing prey. `;
        if (monster.ai_personality.aggression > 0.7) {
          behavior += 'Its aggressive nature makes it a formidable hunter, likely to pursue targets relentlessly. ';
        }
        if (environment.weather_state.visibility < 0.5) {
          behavior += 'Poor visibility conditions are affecting its hunting efficiency. ';
        }
        break;

      case 'foraging':
        behavior += `Searching for resources with ${Math.round(hunger)}% hunger levels. `;
        if (monster.ai_personality.intelligence > 0.7) {
          behavior += 'Its high intelligence helps it remember and locate the best resource locations. ';
        }
        behavior += `It has ${monster.environmental_awareness.resource_memory.length} known resource locations in memory. `;
        break;

      case 'resting':
        behavior += `Recovering with ${Math.round(health)}% health and ${Math.round(energy)}% energy. `;
        if (health < 50) {
          behavior += 'The extended rest period suggests it may be injured or stressed. ';
        }
        if (weather === 'stormy' || weather === 'snowy') {
          behavior += 'Weather conditions are likely contributing to its decision to rest. ';
        }
        break;

      case 'socializing':
        behavior += `Engaging with other creatures, driven by ${Math.round(monster.ai_personality.pack_tendency * 100)}% pack tendency. `;
        if (monster.ai_personality.pack_tendency > 0.8) {
          behavior += 'Its strong social instincts suggest it may be forming or maintaining pack bonds. ';
        }
        break;

      case 'fleeing':
        behavior += `Retreating from perceived threats with ${Math.round(health)}% health. `;
        if (monster.ai_personality.aggression < 0.3) {
          behavior += 'Its passive nature makes flight a natural response to danger. ';
        } else {
          behavior += 'Even with its aggressive tendencies, something significant has triggered this retreat. ';
        }
        break;

      case 'territorial': {
        behavior += `Defending its territory with ${Math.round(monster.ai_personality.aggression * 100)}% aggression levels. `;
        const nearbyInfluence = environment.influence_points.filter(ip => 
          Math.abs(ip.position.x - monster.stats.position.x) < 100 &&
          Math.abs(ip.position.y - monster.stats.position.y) < 100
        );
        if (nearbyInfluence.length > 0) {
          behavior += `${nearbyInfluence.length} Primal token(s) in its territory may be triggering this behavior. `;
        }
        break;
      }

      case 'moving':
        behavior += `Traveling through the area with ${Math.round(energy)}% energy. `;
        if (monster.environmental_awareness.resource_memory.length > 0) {
          behavior += 'Its movement patterns suggest it may be following remembered resource locations. ';
        }
        break;
    }

    return behavior;
  }

  private generateEnvironmentalInteractions(monster: Monster, environment: Environment): string[] {
    const interactions: string[] = [];

    // Structure interactions
    monster.environmental_awareness.detected_structures.forEach(structure => {
      const envStructure = environment.structures.find(s => s.type === structure);
      if (envStructure) {
        const distance = Math.sqrt(
          Math.pow(monster.stats.position.x - envStructure.position.x, 2) +
          Math.pow(monster.stats.position.y - envStructure.position.y, 2)
        );
        interactions.push(`Aware of ${structure} at distance ${Math.round(distance)} units - ${this.getStructureInteractionDescription(structure)}`);
      }
    });

    // Resource interactions
    monster.environmental_awareness.resource_memory.forEach(resource => {
      const timeSinceVisit = Date.now() - resource.last_visited.getTime();
      const daysSinceVisit = Math.floor(timeSinceVisit / (24 * 60 * 60 * 1000));
      interactions.push(`Remembers ${resource.resource_type} location (quality: ${Math.round(resource.quality * 100)}%) last visited ${daysSinceVisit} days ago`);
    });

    // Weather interactions
    const weatherAdaptation = monster.environmental_awareness.weather_adaptation;
    const currentWeather = environment.weather_state.current_condition;
    interactions.push(`${this.getWeatherInteractionDescription(currentWeather, weatherAdaptation)}`);

    // Primal token interactions
    const nearbyInfluence = environment.influence_points.filter(ip => {
      const distance = Math.sqrt(
        Math.pow(monster.stats.position.x - ip.position.x, 2) +
        Math.pow(monster.stats.position.y - ip.position.y, 2)
      );
      return distance < ip.strength * 200; // Primal token radius based on strength
    });

    if (nearbyInfluence.length > 0) {
      interactions.push(`Currently influenced by ${nearbyInfluence.length} Primal token modification(s) affecting its behavior`);
    }

    return interactions.length > 0 ? interactions : ['No significant environmental interactions detected'];
  }

  private generateBehavioralPredictions(monster: Monster, environment: Environment): string[] {
    const predictions: string[] = [];
    const { health, energy, hunger } = monster.stats;
    const { aggression, intelligence, pack_tendency } = monster.ai_personality;

    // Health-based predictions
    if (health < 30) {
      predictions.push('Likely to seek shelter and rest until health improves');
    } else if (health > 80 && energy > 70) {
      predictions.push('High probability of engaging in active behaviors like hunting or exploration');
    }

    // Hunger-based predictions
    if (hunger > 70) {
      predictions.push('Will prioritize foraging or hunting activities in the near future');
    } else if (hunger < 20) {
      predictions.push('May engage in territorial or social behaviors now that hunger is satisfied');
    }

    // Energy-based predictions
    if (energy < 20) {
      predictions.push('Will likely rest soon to recover energy levels');
    } else if (energy > 80) {
      predictions.push('Has sufficient energy for complex behaviors and long-distance movement');
    }

    // Personality-based predictions
    if (aggression > 0.7 && health > 60) {
      predictions.push('May initiate territorial disputes or aggressive encounters');
    }

    if (intelligence > 0.7) {
      predictions.push('Will likely adapt quickly to environmental changes and remember successful strategies');
    }

    if (pack_tendency > 0.7) {
      predictions.push('Will seek opportunities to interact with other creatures');
    }

    // Environmental predictions
    if (environment.weather_state.visibility < 0.5) {
      predictions.push('May alter movement patterns due to poor visibility conditions');
    }

    if (environment.resources.some(r => r.quantity < 30)) {
      predictions.push('May need to expand search range due to dwindling local resources');
    }

    // Adaptation predictions
    const recentAdaptations = monster.influence_resistance.adaptation_history.filter(
      (event: AdaptationEvent) => Date.now() - event.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last week
    );
    
    if (recentAdaptations.length > 0) {
      predictions.push(`Recent adaptations suggest evolving behavior patterns - effectiveness: ${Math.round(recentAdaptations[0].effectiveness * 100)}%`);
    }

    return predictions.length > 0 ? predictions : ['Behavior patterns appear stable and predictable'];
  }

  private generateInteractionInsights(monster: Monster, environment: Environment): string[] {
    const insights: string[] = [];

    // Interaction potential analysis
    const otherMonsters = this.monsterRepository.getMonstersByRoute(monster.stats.position.route)
      .filter(m => m.id !== monster.id);

    if (otherMonsters.length > 0) {
      const compatibleMonsters = otherMonsters.filter(m => 
        Math.abs(m.ai_personality.aggression - monster.ai_personality.aggression) < 0.3 &&
        Math.abs(m.ai_personality.pack_tendency - monster.ai_personality.pack_tendency) < 0.3
      );

      if (compatibleMonsters.length > 0) {
        insights.push(`Compatible with ${compatibleMonsters.length} other creature(s) in the area - potential for cooperation`);
      }

      const aggressiveMonsters = otherMonsters.filter(m => m.ai_personality.aggression > 0.7);
      if (aggressiveMonsters.length > 0 && monster.ai_personality.aggression > 0.7) {
        insights.push(`${aggressiveMonsters.length} aggressive creature(s) nearby - high potential for territorial conflicts`);
      }
    }

    // Resource competition insights
    const sharedResources = monster.environmental_awareness.resource_memory.filter(memory => {
      return environment.resources.some(r => 
        Math.abs(r.position.x - memory.location.x) < 50 &&
        Math.abs(r.position.y - memory.location.y) < 50
      );
    });

    if (sharedResources.length > 0) {
      insights.push(`Knows about ${sharedResources.length} resource location(s) that overlap with current environment - potential for competition`);
    }

    // Primal token resistance insights
    const learnedPatterns = Object.entries(monster.influence_resistance.learned_patterns);
    const strongResistance = learnedPatterns.filter(([, resistance]: [string, number]) => resistance > 0.7);
    
    if (strongResistance.length > 0) {
      insights.push(`Has developed strong resistance to ${strongResistance.length} Primal token pattern(s) - difficult to manipulate`);
    }

    // Environmental adaptation insights
    const weatherAdaptation = monster.environmental_awareness.weather_adaptation;
    if (weatherAdaptation > 0.8) {
      insights.push('Highly adaptable to environmental changes - resilient to weather-based interventions');
    } else if (weatherAdaptation < 0.4) {
      insights.push('Vulnerable to environmental changes - weather modifications could significantly impact behavior');
    }

    return insights.length > 0 ? insights : ['Standard interaction patterns - no special considerations required'];
  }

  private generateSuggestedActions(monster: Monster): string[] {
    const suggestions: string[] = [];

    // Health-based suggestions
    if (monster.stats.health < 50) {
      suggestions.push('Consider environmental modifications to create safer resting areas');
    }

    // Energy-based suggestions
    if (monster.stats.energy < 30) {
      suggestions.push('Avoid disturbing this creature - it needs rest to recover energy');
    }

    // Behavioral suggestions
    if (monster.state === 'hunting' && monster.ai_personality.aggression > 0.7) {
      suggestions.push('Exercise caution - this creature is in an aggressive hunting state');
    }

    if (monster.state === 'socializing' && monster.ai_personality.pack_tendency > 0.7) {
      suggestions.push('Good opportunity for group behavior observations or pack interaction studies');
    }

    // Environmental suggestions
    if (monster.environmental_awareness.resource_memory.length > 3) {
      suggestions.push('Monitor resource locations this creature frequents for environmental planning');
    }

    // Primal token suggestions
    const resistancePatterns = Object.entries(monster.influence_resistance.learned_patterns);
    const weakResistance = resistancePatterns.filter(([, resistance]: [string, number]) => resistance < 0.3);
    
    if (weakResistance.length > 0) {
      suggestions.push(`Creature shows low resistance to ${weakResistance[0][0]} - potential Primal token opportunity`);
    }

    // Observation suggestions
    suggestions.push('Continue monitoring for behavioral pattern changes');
    suggestions.push('Use observe_ecosystem to understand this creature\'s impact on the broader environment');

    return suggestions;
  }

  // Helper methods
  private formatSpeciesName(species: MonsterSpecies): string {
    return species.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private getStateDescription(state: MonsterState): string {
    const descriptions = {
      hunting: 'actively hunting',
      foraging: 'foraging for resources',
      resting: 'resting and recovering',
      moving: 'moving through territory',
      socializing: 'socializing with others',
      fleeing: 'fleeing from threats',
      territorial: 'defending territory'
    };
    return descriptions[state] || 'in unknown state';
  }

  private getStructureInteractionDescription(structure: string): string {
    const descriptions: Record<string, string> = {
      den: 'potential shelter location',
      water_source: 'essential for survival',
      shelter: 'temporary refuge option',
      hunting_ground: 'prime hunting territory',
      territory_marker: 'territorial boundary indicator'
    };
    return descriptions[structure] || 'environmental feature of interest';
  }

  private getWeatherInteractionDescription(weather: string, adaptation: number): string {
    const adaptationLevel = adaptation > 0.8 ? 'excellently' : adaptation > 0.6 ? 'well' : adaptation > 0.4 ? 'moderately' : 'poorly';
    return `Adapting ${adaptationLevel} to current ${weather} conditions`;
  }

  // Error response methods
  private generateNotFoundResponse(monsterId: string): MonsterAnalyzerOutput {
    return {
      monster_id: monsterId,
      species: 'Unknown',
      personalityProfile: `Monster with ID ${monsterId} not found in the ecosystem`,
      currentBehavior: 'No behavioral data available',
      environmentalInteractions: ['Creature not detected in current monitoring systems'],
      behavioralPredictions: ['Unable to predict behavior for non-existent creature'],
      interactionInsights: ['No interaction data available'],
      suggestedActions: ['Verify monster ID or use observe_ecosystem to find available creatures'],
      timestamp: new Date().toISOString()
    };
  }

  private generateEnvironmentMissingResponse(monsterId: string, routeId: string): MonsterAnalyzerOutput {
    return {
      monster_id: monsterId,
      species: 'Unknown',
      personalityProfile: `Environment data for route ${routeId} not found`,
      currentBehavior: 'Cannot analyze behavior without environmental context',
      environmentalInteractions: ['Environmental sensors offline for this route'],
      behavioralPredictions: ['Unable to predict behavior without environmental data'],
      interactionInsights: ['No environmental interaction data available'],
      suggestedActions: ['Verify route ID or use observe_ecosystem to initialize environment'],
      timestamp: new Date().toISOString()
    };
  }

  private generateWrongRouteResponse(monsterId: string, requestedRoute: string, actualRoute: string): MonsterAnalyzerOutput {
    return {
      monster_id: monsterId,
      species: 'Unknown',
      personalityProfile: `Monster ${monsterId} is not in route ${requestedRoute}`,
      currentBehavior: `Currently located in route ${actualRoute}`,
      environmentalInteractions: [`Use route ${actualRoute} to analyze this creature`],
      behavioralPredictions: ['Unable to predict behavior for creature in different route'],
      interactionInsights: ['Creature location mismatch detected'],
      suggestedActions: [`Use analyze_monster with route_id: ${actualRoute} to analyze this creature`],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Monster Analyzer MCP tool for PrimalCode individual creature analysis
 * Provides detailed behavioral analysis for individual creatures
 */
export const analyzeMonster = {
  name: 'analyze_monster',
  description: 'Get detailed behavioral analysis for individual creatures',
  parameters: MonsterAnalyzerInput,
  execute: async (input: z.infer<typeof MonsterAnalyzerInput>): Promise<string> => {
    const tool = new MonsterAnalyzerTool();
    const result = await tool.execute(input);
    
    // Format as engaging narrative text
    const narrative = [
      `## Monster Analysis Report - ${result.monster_id}`,
      `*${result.species} | Generated at ${new Date().toLocaleString()}*`,
      '',
      `### Personality Profile`,
      result.personalityProfile,
      '',
      `### Current Behavior`,
      result.currentBehavior,
      '',
      `### Environmental Interactions`,
      ...result.environmentalInteractions.map(interaction => `- ${interaction}`),
      '',
      `### Behavioral Predictions`,
      ...result.behavioralPredictions.map(prediction => `- ${prediction}`),
      '',
      `### Interaction Insights`,
      ...result.interactionInsights.map(insight => `- ${insight}`),
      '',
      `### Suggested Actions`,
      ...result.suggestedActions.map(action => `- ${action}`)
    ].join('\n');

    return narrative;
  }
};