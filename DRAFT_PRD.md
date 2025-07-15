# PrimalCode - Product Requirements Document

## Executive Summary

**Project Name:** PrimalCode  
**Platform:** Permaweb (Arweave/AO) + Web Browser  
**Game Engine:** Excalibur.js  
**Genre:** Monster Collection & Autonomous Battle Simulation  
**Target:** MVP demonstrating core autonomous gameplay loop

### Vision Statement
Create the first truly autonomous ecosystem management game where AI-driven creatures live, hunt, battle, and evolve independently on the permaweb, while players architect thriving ecosystems through intelligent environmental design and strategic influence systems.

---

## Core Game Concept

### Autonomous Monster Ecosystem
- **Living World:** Monsters exist as autonomous AO processes that continuously operate
- **AI Decision Making:** Each monster uses Claude/Anthropic API to make intelligent decisions
- **Persistent Behaviors:** Hunting, territorial disputes, resource gathering, reproduction
- **Player Interaction:** Collection, observation, and strategic influence rather than direct control

### Core Game Loop (MVP)
1. **Analyze** autonomous monster behaviors and ecosystem dynamics
2. **Design** environmental modifications to influence creature patterns
3. **Implement** structures, resources, and environmental changes strategically
4. **Adapt** strategies as monsters counter-adapt to player influences
5. **Master** advanced ecosystem management and unlock new influence tools

---

## Technical Architecture

### Permaweb Infrastructure
- **AO Processes:** Each monster is an individual AO process running on the AO network
- **State Management:** Monster stats, location, behavior patterns stored as variables within each AO process (NOT as direct Arweave transactions). AO runtime handles automatic persistence to Arweave.
- **Inter-Process Communication:** Monsters communicate with each other via AO message passing between processes
- **Persistence:** Game state lives in AO process memory with automatic Arweave backup, accessible across sessions without manual blockchain writes

### Game Client (Excalibur.js)
- **Real-time Visualization:** Render monster positions and actions
- **Player Interface:** Inventory, collection, monster details
- **AO Integration:** Read monster states, send player commands
- **Route System:** Display different areas/biomes where monsters exist

### AI Integration
- **Decision Engine:** Each monster process calls Claude API for behavioral decisions
- **Context Awareness:** Monsters understand their environment, health, hunger, threats
- **Learning System:** Monster personalities develop over time based on experiences
- **Reasoning Patterns:** Hunt, flee, explore, rest, territorial behavior

---

## MVP Feature Set

### Phase 1: Core Autonomous System

#### Monster Basics
- **3-5 Monster Types** with distinct AI personalities
- **Basic Stats:** Health, Hunger, Energy, Aggression, Intelligence
- **Simple Behaviors:** Hunt weaker monsters, flee stronger ones, rest when tired
- **Location System:** 2-3 routes/areas where monsters spawn and roam

#### Autonomy Features
- **Independent Decision Making:** Monsters act every 30-60 seconds without player input
- **Environmental Awareness:** Detect other monsters, food sources, safe zones
- **Basic Combat:** Autonomous battle resolution between monsters
- **Resource Management:** Hunger drives hunting behavior

#### Player Mechanics
- **Environmental Design:** Place structures that influence monster behavior patterns
- **Resource Management:** Control food/water sources to guide territorial dynamics
- **Weather Manipulation:** Trigger environmental events forcing monster adaptation
- **Strategic Planning:** Design multi-step influence chains for complex outcomes
- **Monster Observation:** Watch autonomous behaviors and adaptation responses
- **Basic Collection:** Capture monsters through strategic environmental setup
- **Route Navigation:** Move between different monster habitats and manage multiple ecosystems

### Phase 2: Advanced Ecosystem Management

#### Enhanced Environmental Systems
- **Weather Control:** Rain, heat waves, fog banks with strategic timing
- **Complex Structures:** Multi-component environmental modifications
- **Scent Trail Networks:** Advanced creature guidance and communication
- **Resource Economics:** Scarcity and abundance cycles affecting behavior

#### Monster Counter-Adaptation
- **Behavioral Learning:** Monsters develop resistance to overused strategies
- **Pack Coordination:** Creatures share knowledge about player influences
- **Territory Evolution:** Areas develop unique characteristics based on management
- **Emergent Behaviors:** Unexpected interactions from complex environmental design

#### Player Mastery Systems
- **Ecosystem Specialization:** Advanced tools for different habitat types
- **Influence Point Economy:** Resource management for environmental changes
- **Progression Unlocks:** New structures and abilities through demonstrated expertise
- **Strategic Depth:** Multi-layered environmental puzzles requiring planning

---

## Technical Specifications

### Enhanced AO Process Architecture

#### Environmental Manager Process
```lua
-- New: Route-level Environmental Management
EnvironmentProcess = {
    route_id = "forest_path",
    structures = {}, -- Active environmental modifications
    resources = {}, -- Food, water, scent markers
    weather_state = "clear",
    influence_points = {}, -- Player intervention tracking
    ecosystem_balance = 0.5 -- 0=artificial, 1=natural
}
```

#### Enhanced Monster Process Structure
```lua
-- AO Process State Variables (stored in process memory)
Monster = {
    id = "unique_monster_id",
    species = "hunter_wolf",
    stats = {
        health = 100,
        hunger = 50,
        energy = 80,
        position = {x = 100, y = 200, route = "forest_path"}
    },
    ai_personality = {
        aggression = 0.7,
        intelligence = 0.6,
        pack_tendency = 0.8
    },
    memory = {
        recent_events = {},
        learned_behaviors = {},
        territory_claims = {}
    },
    environmental_awareness = {
        detected_structures = {},
        resource_memory = {},
        scent_trail_following = nil,
        weather_adaptation = 0.3
    },
    influence_resistance = {
        structure_immunity = {},  -- Learned to ignore certain structures
        scent_tolerance = {},     -- Reduced response to overused scents
        pattern_recognition = {}  -- Detected player manipulation patterns
    },
    state = "hunting" -- current behavioral state
}

-- Message Handlers for state updates
-- Enhanced Message Handlers
Handlers.add("move", "Move", function(msg)
    Monster.stats.position.x = msg.Data.x
    Monster.stats.position.y = msg.Data.y
    Monster.stats.energy = Monster.stats.energy - 1
    
    -- Check for environmental interactions
    detect_nearby_structures()
    evaluate_scent_trails()
end)

Handlers.add("ai_decision", "MakeDecision", function(msg)
    local context = {
        monster_state = Monster,
        environment = get_environment_data(),
        nearby_monsters = scan_for_monsters(),
        player_influences = detect_artificial_changes()
    }
    
    -- Call Decentralized AI with enhanced context
    local decision = make_ai_decision_with_fallback(context)
    execute_monster_action(decision)
end)

Handlers.add("environment_change", "EnvironmentChange", function(msg)
    -- React to player environmental modifications
    local change = json.decode(msg.Data)
    adapt_to_environmental_change(change)
end)
```

#### Enhanced Process Functions
- **Decision Cycle:** Staggered AI decision-making via decentralized AI with Claude fallback
- **Environmental Processing:** Route-level managers handle weather, structures, resources
- **Player Action Validation:** Influence point economy and cooldown management
- **State Updates:** Delta synchronization system for efficient client updates
- **Combat Resolution:** Message-based battle mechanics between monster processes
- **Communication:** Enhanced inter-process messaging for environmental awareness
- **Adaptation Learning:** Monsters develop resistance to repeated player strategies

#### AO Process Architecture Details
- **State Persistence:** All monster data lives in AO process variables, automatically persisted by AO runtime
- **Message-Driven Updates:** State changes happen through AO message handlers, not direct Arweave transactions
- **Process Isolation:** Each monster runs independently with its own state and message queue
- **Cross-Process Communication:** Monsters interact via AO's built-in message passing system
- **Cost Efficiency:** No gas fees for state updates, only compute credits for message processing

### Game Client Integration

#### Real-time Updates
- **AO Process Queries:** Client polls monster process states via AO read operations (no blockchain writes)
- **Event Streaming:** Subscribe to AO message notifications for real-time monster action updates
- **State Synchronization:** Keep client view consistent with AO process internal state
- **Offline Persistence:** Monster processes continue autonomous operation when players offline (AO handles persistence)

#### Visual Representation
- **Sprite-based Monsters:** Simple animated creatures
- **Route Visualization:** 2D map view of monster habitats
- **Action Indicators:** Visual cues for monster behaviors (hunting, resting, etc.)
- **UI Overlays:** Monster stats, player inventory, action logs

---

## User Experience

### Enhanced Player Journey
1. **Discovery:** Enter active ecosystem with autonomous creatures already interacting
2. **Guided Learning:** Tutorial system teaches environmental influence through immediate feedback
3. **Strategic Experimentation:** Test different environmental modifications and observe results
4. **Ecosystem Mastery:** Develop expertise in managing complex creature interactions
5. **Advanced Influence:** Unlock sophisticated environmental tools and weather control
6. **Community Engagement:** Share successful ecosystem designs and learn from others
7. **Specialization:** Focus on specific habitat types or creature management strategies

### Interface Design Principles
- **Strategic Control:** Players actively shape ecosystem through environmental design
- **Information Rich:** Clear visibility into monster states, environmental effects, and adaptation patterns
- **Immediate Feedback:** Environmental changes show rapid, visible impact on creature behavior
- **Strategic Depth:** Layered influence systems requiring planning and adaptation
- **Mastery Progression:** Clear advancement through environmental expertise and tool unlocks
- **Community Integration:** Share and discover ecosystem management strategies

---

## Environmental Influence Systems

### Active Environmental Design

Players shape monster ecosystems through strategic environmental modifications that create immediate and long-term behavioral changes.

#### Structure Types & Strategic Applications

**Shelter Nodes**
- **Function:** Create safe zones attracting tired/injured monsters
- **Strategic Use:** Control monster recovery patterns, establish defensive positions
- **Monster Response:** Prioritize rest over hunting, changing territorial dynamics
- **Limitations:** Medium resource cost, limited placement per area

**Observation Towers**
- **Function:** Enhanced monster detection radius with visibility effects
- **Strategic Use:** Force monsters into predictable paths, early warning systems
- **Monster Response:** Increased caution, altered patrol routes
- **Adaptation:** Intelligent monsters eventually ignore familiar towers

**Barrier Walls**
- **Function:** Physical obstacles redirecting movement patterns
- **Strategic Use:** Create strategic choke points, protect valuable resources
- **Monster Response:** Forced route changes, concentrated interaction zones
- **Counter-Adaptation:** Monsters learn navigation workarounds over time

#### Resource Economy Management

**Food Source Control**
- **Meat Caches:** Attract carnivorous monsters, reduce hunting pressure on smaller creatures
- **Fruit Groves:** Support herbivore populations, create peaceful gathering zones
- **Rare Nutrients:** Temporary stat enhancement, highly contested strategic resources

**Water Source Manipulation**
- **Clean Springs:** Essential for all monsters, creates neutral meeting zones
- **Healing Pools:** Health restoration points becoming strategic territorial assets
- **Resource Scarcity:** Controlled depletion creates competition and migration patterns

#### Weather Control Systems

**Environmental Events**
- **Rainstorms:** Force shelter-seeking, reduce visibility, create capture opportunities
- **Heat Waves:** Increase water source value, reduce monster activity levels
- **Fog Banks:** Reduce detection range, enable stealth opportunities for weaker monsters

**Strategic Implementation**
- **Timing Control:** Players choose optimal moments for maximum ecosystem impact
- **Area Effects:** Localized weather affects specific territories, enabling targeted influence
- **Duration Management:** Variable length events with escalating resource costs

#### Scent Trail Networks

**Chemical Communication**
- **Attraction Pheromones:** Draw specific monster types to desired locations
- **Repellent Compounds:** Create avoidance zones and protective barriers
- **Information Trails:** Guide monster movement and facilitate pack formation

**Advanced Applications**
- **Behavioral Conditioning:** Repeated scent associations create learned responses
- **Territory Management:** Reinforce or disrupt existing territorial claims
- **Social Engineering:** Influence pack formation and cooperative behaviors

### Player Progression Through Environmental Mastery

#### Influence Point Economy
- **Earning:** Successful ecosystem management and creature adaptation
- **Spending:** Environmental modifications with varying resource costs
- **Investment Strategy:** Balance immediate effects vs. long-term ecosystem development

#### Expertise Unlocks
- **Basic Tools** (Early): Simple food placement, basic shelter construction
- **Advanced Engineering** (Mid): Weather control, complex barrier systems
- **Ecosystem Mastery** (Late): Multi-route influence, rare resource manipulation

#### Specialization Paths
- **Habitat Expertise:** Master specific route types (forest, desert, arctic)
- **Creature Focus:** Specialize in particular monster species management
- **Strategic Roles:** Become ecosystem balancer, predator controller, or community architect

---

## AI Behavior Design

### Decision-Making Framework
Each monster's AI considers:
- **Immediate Needs:** Hunger, fatigue, injury status
- **Environmental Threats:** Nearby predators or aggressive monsters
- **Opportunities:** Available prey, safe resting spots, territory claims
- **Social Dynamics:** Pack behavior, territorial disputes, mating opportunities
- **Player Influence:** Environmental changes, food placement, obstacles

### Personality Archetypes (MVP)
1. **Aggressive Hunter:** Actively seeks combat, territorial
2. **Cautious Forager:** Avoids conflict, focuses on survival
3. **Pack Leader:** Coordinates with others, strategic thinking
4. **Opportunistic Scavenger:** Exploits situations, adaptive behavior
5. **Territorial Guardian:** Defensive, protective of claimed areas

### Behavioral Patterns
- **Daily Cycles:** Rest periods, active hunting times
- **Adaptation:** Learn from successful/failed strategies
- **Social Learning:** Observe and copy successful behaviors from other monsters
- **Environmental Response:** React to player-introduced changes

---

## Technical Implementation Plan

### Development Phases

#### Phase 1: Core Infrastructure (Weeks 1-4)
- Set up basic AO process template for monsters
- Implement Claude API integration for decision-making
- Create simple Excalibur.js client with basic rendering
- Establish AO-to-client communication patterns

#### Phase 2: Autonomous Behaviors (Weeks 5-8)
- Implement core AI decision loops
- Add basic combat and interaction systems
- Create monster spawning and persistence
- Add environmental awareness and pathfinding

#### Phase 3: Player Integration (Weeks 9-12)
- Implement capture mechanics
- Add player inventory and monster management
- Create route/area navigation system
- Polish UI and visual feedback

### Key Technical Challenges

#### AI Decision Latency
- **Challenge:** Claude API calls may introduce delays
- **Solution:** Implement decision caching and prediction systems
- **Fallback:** Simple rule-based decisions when API unavailable

#### State Synchronization
- **Challenge:** Keeping client synchronized with autonomous AO processes
- **Solution:** Event-driven updates with periodic full state refreshes
- **Optimization:** Delta updates for efficiency

#### Scalability
- **Challenge:** Multiple monsters making frequent AI decisions
- **Solution:** Staggered decision cycles, batched API calls
- **Cost Management:** Optimize prompt efficiency, implement decision cooldowns

---

## Success Metrics (MVP)

### Technical Metrics
- **Autonomy Uptime:** Monsters operate 95%+ of time without human intervention
- **Decision Quality:** AI decisions appear logical and entertaining to observers
- **Performance:** <3 second lag between monster decisions and visual updates
- **Persistence:** Game state maintains consistency across player sessions

### Enhanced Engagement Metrics
- **Active Influence Time:** 25+ minutes ecosystem management per session
- **Decision Complexity:** 5+ environmental changes per session
- **Strategic Planning:** 3+ multi-step influence chains executed
- **Return Rate:** 70%+ of players return within 48 hours for continued ecosystem management
- **Mastery Progression:** 80% players unlock 2+ advanced environmental structures
- **Community Engagement:** 30% players share ecosystem designs or strategies
- **Viral Discovery Moments:** Players share unexpected creature adaptations they created

### Enhanced Gameplay Validation
- **Emergent Behaviors:** 8+ distinct monster interaction patterns emerge from environmental design
- **Counter-Adaptation:** 60% of monsters develop resistance strategies within 48 hours
- **Strategic Depth:** Players develop meaningful multi-session ecosystem management strategies
- **Environmental Impact:** 90% of player actions create measurable, lasting ecosystem changes
- **Ecosystem Balance:** No single environmental strategy dominates >40% of outcomes
- **Behavioral Diversity:** Advanced players create unique creature adaptation patterns
- **Progression Satisfaction:** Clear mastery advancement through environmental expertise

---

## Risk Mitigation

### Technical Risks
- **AI API Costs:** Implement decision rate limiting and prompt optimization
- **AO Process Limits:** Design efficient process architecture within platform constraints
- **Client Performance:** Optimize rendering for multiple active monsters
- **Network Reliability:** Graceful degradation when connectivity issues occur

### Design Risks
- **Player Engagement:** Ensure sufficient agency despite autonomous focus
- **Behavioral Predictability:** Maintain AI decision variety and surprise
- **Progression Pacing:** Balance collection difficulty with player satisfaction
- **Technical Complexity:** Scope control to ensure MVP delivery timeline

---

## Future Expansion Opportunities

### Post-MVP Features
- **Monster Evolution:** AI personalities develop and change over time
- **Player vs Player:** Strategic battles using collected monsters
- **Breeding System:** Combine monster traits to create unique offspring
- **Ecosystem Tools:** Advanced environmental manipulation capabilities
- **Social Features:** Guild territories, collaborative ecosystem management

### Monetization Potential
- **Premium Routes:** Access to exclusive monster habitats
- **AI Enhancement:** Advanced personality traits and behaviors
- **Cosmetic Customization:** Unique monster appearances and environments
- **Accelerated Progression:** Tools for more efficient collection and influence

---

## Conclusion

This MVP focuses on demonstrating the core innovation: truly autonomous AI-driven monsters that create emergent gameplay through their independent behaviors. Success will be measured by player fascination with watching and influencing these digital creatures, establishing the foundation for a new genre of autonomous ecosystem games on the permaweb.

The technical architecture leverages the unique strengths of AO for persistence and autonomy, Excalibur.js for accessible web gaming, and Claude AI for sophisticated decision-making, creating a novel gaming experience that couldn't exist on traditional platforms.