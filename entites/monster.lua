local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- 🧬 MONSTER PROCESS (Turn-Based Battle Ready)

State.hp = State.hp or 20
State.status = State.status or nil
State.moves = State.moves or { "Tackle", "Growl" }
State.trainer = State.trainer or nil
State.opponent = State.opponent or nil
State.turn = State.turn or false
State.inBattle = State.inBattle or false
State.fainted = State.fainted or false

-- 🔹 Initialize Battle
Handlers.add("StartBattle", Handlers.utils.hasTag("Action", "StartBattle"), function(msg)
  if State.fainted then return end -- Cannot start a battle if fainted
  local data = json.decode(msg.Data or "{}")
  if msg.From ~= State.trainer then return end -- Only trainer can initiate
  State.opponent = data.opponent
  State.turn = data.firstTurn
  State.inBattle = true
  State.fainted = false
end)

-- 🔹 Use Move (sends move execution to opponent)
Handlers.add("UseMove", Handlers.utils.hasTag("Action", "UseMove"), function(msg)
  if not State.inBattle or not State.turn or State.fainted then return end
  if msg.From ~= State.trainer then return end

  local payload = json.decode(msg.Data or "{}")
  local move = payload.move
  if not move then return end

  local allowed = false
  for _, m in ipairs(State.moves) do if m == move then allowed = true break end end
  if not allowed then return end

  -- send Execute to Move process
  ao.send({
    Target = payload.moveProcess,
    Tags = {
      Action = "Execute",
      Attacker = ao.id,
      Defender = State.opponent,
      ReplyTo = State.opponent
    },
    Data = json.encode({
      attackerStats = { attack = payload.attack or 5, hp = State.hp },
      defenderStats = payload.defenderStats or {}
    })
  })

  State.turn = false
end)

-- 🔹 Receive Result from Opponent's Move
Handlers.add("ReceiveMove", Handlers.utils.hasTag("Component", "MoveResult"), function(msg)
  if not State.inBattle or State.fainted then return end
  local result = json.decode(msg.Data or "{}")
  if result.damage then
    State.hp = math.max(0, State.hp - result.damage)
    if State.hp == 0 then
      State.fainted = true
      State.inBattle = false
      -- Optional: notify trainer or opponent
    end
  end
  if result.status then
    State.status = result.status
  end
  if not State.fainted then
    State.turn = true -- Now it's this monster's turn
  end
end)

-- 🔹 Forfeit Battle
Handlers.add("Forfeit", Handlers.utils.hasTag("Action", "Forfeit"), function(msg)
  if msg.From ~= State.trainer or not State.inBattle then return end
  State.fainted = true
  State.inBattle = false
  -- Optional: notify opponent
end)

-- 🔹 Report State
Handlers.add("GetState", Handlers.utils.hasTag("Action", "GetState"), function(msg)
  ao.send({
    Target = msg.From,
    Tags = { Component = "State" },
    Data = json.encode({
      hp = State.hp,
      status = State.status,
      moves = State.moves,
      inBattle = State.inBattle,
      turn = State.turn,
      fainted = State.fainted
    })
  })
end)