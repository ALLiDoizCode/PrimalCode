# Core Workflows

The following sequence diagrams illustrate key system workflows that clarify component interactions and complex processes:

## Agent World Exploration and Tuxemon Encounter

```mermaid
sequenceDiagram
    participant A as External Agent
    participant WP as World Process
    participant AR as Agent Registry
    
    A->>WP: moveAgent("north", 3)
    WP->>WP: validate movement & check collision
    WP->>WP: update agent position
    WP-->>A: movement confirmed + new position
    
    A->>WP: queryWorldState()
    WP->>WP: check encounter zones at position
    WP-->>A: world state + encounter opportunity
    
    A->>WP: encounterTuxemon("grassland_zone_1")
    WP->>WP: roll encounter based on zone config
    WP->>WP: generate wild Tuxemon with seeded RNG
    WP-->>A: encounter details + capture opportunity
    
    A->>WP: attemptCapture(item_id: "pokeball")
    WP->>WP: calculate capture success with deterministic RNG
    WP->>WP: add Tuxemon to agent inventory if successful
    WP->>AR: updateAgentStatus("tuxemon_captured")
    WP-->>A: capture result + updated team
```

## Cross-World Battle Initiation and Resolution

```mermaid
sequenceDiagram
    participant A1 as Agent 1
    participant WP1 as World Process 1
    participant AR as Agent Registry
    participant BP as Battle Process
    participant WP2 as World Process 2
    participant A2 as Agent 2
    
    A1->>WP1: initiateBattle("find_opponent")
    WP1->>AR: requestBattleOpponent(agent_1_id, preferences)
    AR->>AR: find suitable opponent from battle queue
    AR-->>WP1: opponent found (agent_2_id)
    
    WP1->>BP: createBattle(agent_1_id, agent_2_id)
    BP->>WP2: requestBattleParticipation(agent_2_id)
    WP2->>A2: battleInvitation(agent_1_id, battle_id)
    
    A2->>WP2: acceptBattle(battle_id, selected_team)
    WP2->>BP: joinBattle(agent_2_id, tuxemon_team)
    A1->>WP1: confirmBattle(battle_id, selected_team)
    WP1->>BP: joinBattle(agent_1_id, tuxemon_team)
    
    BP->>BP: calculate turn order based on Tuxemon speed
    BP->>A1: battleStart(turn_order, current_state)
    BP->>A2: battleStart(turn_order, current_state)
    
    loop Battle Turns
        A1->>BP: submitBattleAction("attack", move_id, target_id)
        A2->>BP: submitBattleAction("attack", move_id, target_id)
        BP->>BP: resolve turn with deterministic calculations
        BP->>A1: turnResult(battle_state, damage_dealt)
        BP->>A2: turnResult(battle_state, damage_dealt)
    end
    
    BP->>BP: determine battle winner
    BP->>WP1: battleComplete(winner, experience_gained)
    BP->>WP2: battleComplete(winner, experience_gained)
    BP->>AR: updateAgentBattleHistory(participants, result)
```
