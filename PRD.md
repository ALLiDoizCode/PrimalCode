# PrimalCode - Product Requirements Document

## Executive Summary

**Project Name:** PrimalCode  
**Platform:** Permaweb (Arweave/AO) + Web Browser  
**Game Engine:** Excalibur.js  
**Genre:** Monster Collection & Autonomous Battle Simulation  
**Target:** MVP demonstrating core autonomous gameplay loop

### Vision Statement
Create the first truly autonomous monster collection game where AI-driven creatures live, hunt, battle, and evolve independently on the permaweb without human intervention, while players can observe, collect, and occasionally influence this persistent digital ecosystem.

---

## Core Game Concept

### Autonomous Monster Ecosystem
- **Living World:** Monsters exist as autonomous AO processes that continuously operate
- **AI Decision Making:** Each monster uses Claude/Anthropic API to make intelligent decisions
- **Persistent Behaviors:** Hunting, territorial disputes, resource gathering, reproduction
- **Player Interaction:** Collection, observation, and strategic influence rather than direct control

### Core Game Loop (MVP)
1. **Observe** autonomous monsters in their natural routes/habitats
2. **Collect** monsters through capture mechanics
3. **Influence** monster behavior through environmental changes
4. **Battle** by directing owned monsters against wild or other player monsters
5. **Evolve** monsters through AI learning and resource accumulation

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
- **Monster Observation:** Watch autonomous behaviors in real-time
- **Basic Collection:** Capture weakened monsters
- **Monster Management:** View owned monsters, basic stats
- **Route Navigation:** Move between different monster habitats

### Phase 2: Enhanced Interactions

#### Advanced AI Behaviors
- **Pack Hunting:** Monsters coordinate attacks
- **Territorial Control:** Stronger monsters claim areas
- **Adaptation:** Monsters learn from repeated encounters
- **Communication:** Monsters share information about threats/food

#### Player Strategy Layer
- **Environmental Influence:** Place food/obstacles to guide monster behavior
- **Monster Training:** Indirect influence through rewards/environmental design
- **Battle Orchestration:** Set up favorable conditions for desired outcomes
- **Collection Goals:** Rare monster variants with unique AI personalities

---

## Technical Specifications

### AO Process Architecture

#### Monster Process Structure
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
    state = "hunting" -- current behavioral state
}

-- Message Handlers for state updates
Handlers.add("move", "Move", function(msg)
    Monster.stats.position.x = msg.Data.x
    Monster.stats.position.y = msg.Data.y
    Monster.stats.energy = Monster.stats.energy - 1
end)

Handlers.add("ai_decision", "MakeDecision", function(msg)
    -- Call Claude API for AI decision making
    -- Update Monster state based on AI response
end)
```

#### Core Process Functions
- **Decision Cycle:** Scheduled cron jobs trigger AI decision-making via Claude API calls
- **State Updates:** In-process variable modifications (position, stats, status) with automatic AO persistence
- **Combat Resolution:** Message-based battle mechanics between monster processes
- **Communication:** Send/receive AO messages to/from other monster processes
- **Environmental Interaction:** Respond to world state changes via message handlers

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

### Core Player Journey
1. **Discovery:** Enter game to find monsters already active and behaving
2. **Observation:** Watch autonomous interactions and behaviors
3. **Strategy:** Identify capture opportunities and environmental leverage points
4. **Collection:** Capture monsters through skill-based mechanics
5. **Influence:** Shape the ecosystem through environmental changes
6. **Progression:** Unlock new routes and rarer monster variants

### Interface Design Principles
- **Minimal Intervention:** Most gameplay happens autonomously
- **Information Rich:** Clear visibility into monster states and motivations
- **Strategic Depth:** Meaningful choices in environmental influence
- **Collection Satisfaction:** Clear progress and rarity indicators

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

### Engagement Metrics
- **Session Duration:** Average 15+ minutes observing autonomous behaviors
- **Return Rate:** 60%+ of players return within 48 hours
- **Collection Progress:** Players capture at least 3 different monster types
- **Viral Moments:** Players share interesting autonomous behaviors they witnessed

### Gameplay Validation
- **Emergent Behaviors:** Unexpected but logical monster interactions occur
- **Strategic Depth:** Players develop meaningful strategies for collection/influence
- **Ecosystem Balance:** No single strategy dominates monster behaviors
- **Progression Satisfaction:** Clear sense of advancement and achievement

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