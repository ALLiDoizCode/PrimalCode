local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- 🧬 MONSTER PROCESS (Turn-Based Battle Ready)

State = State or {}

-- 🔹 Init Handler
Handlers.add("Init", Handlers.utils.hasTag("Action", "Init"), function(msg)
  if msg.From ~= ao.owner then return end -- Only creator can init
  local data = json.decode(msg.Data or "{}")
  if not data.name then return end
  State.name = data.name
  State.trainer = data.trainer or nil
  State.hp = data.hp or 20
  State.status = nil
  State.moves = data.moves or { "Tackle", "Growl" }
  State.opponent = nil
  State.turn = false
  State.inBattle = false
  State.fainted = false
  State.pendingChallenges = {}
  Handlers.remove("Init")-- Init only once
end)

-- 🔹 Initialize Battle Request (Challenge Step)
Handlers.add("ChallengeBattle", Handlers.utils.hasTag("Action", "ChallengeBattle"), function(msg)
  if State.fainted or State.inBattle then return end
  if msg.From ~= State.trainer then return end
  local data = json.decode(msg.Data or "{}")
  if not data.opponent or not data.challengeHash then return end

  State.pendingChallenge = {
    opponent = data.opponent,
    challengeHash = data.challengeHash,
    firstTurn = data.firstTurn
  }

  -- Notify opponent for verification
  ao.send({
    Target = data.opponent,
    Tags = { Action = "VerifyChallenge" },
    Data = json.encode({
      challenger = ao.id,
      challengeHash = data.challengeHash
    })
  })
end)

-- 🔹 Opponent Verifies Challenge
Handlers.add("VerifyChallenge", Handlers.utils.hasTag("Action", "VerifyChallenge"), function(msg)
  if State.fainted or State.inBattle then return end
  local data = json.decode(msg.Data or "{}")
  if not data.challenger or not data.challengeHash then return end

  table.insert(State.pendingChallenges, {
    challenger = data.challenger,
    challengeHash = data.challengeHash
  })
end)

-- 🔹 Opponent Accepts Challenge
Handlers.add("AcceptChallenge", Handlers.utils.hasTag("Action", "AcceptChallenge"), function(msg)
  if State.fainted or State.inBattle then return end
  local data = json.decode(msg.Data or "{}")
  if not data.challengeHash or not data.challenger then return end

  for i, challenge in ipairs(State.pendingChallenges) do
    if challenge.challengeHash == data.challengeHash and challenge.challenger == data.challenger then
      ao.send({
        Target = data.challenger,
        Tags = { Action = "StartBattle" },
        Data = json.encode({
          opponent = ao.id,
          challengeHash = data.challengeHash,
          firstTurn = false
        })
      })
      table.remove(State.pendingChallenges, i)
      break
    end
  end
end)

-- 🔹 Final Battle Init (only if verified)
Handlers.add("StartBattle", Handlers.utils.hasTag("Action", "StartBattle"), function(msg)
  if State.fainted or State.inBattle then return end
  if msg.From ~= State.trainer then return end

  local data = json.decode(msg.Data or "{}")
  if not data.opponent or not data.challengeHash then return end
  local found = false
  for _, challenge in ipairs(State.pendingChallenges) do
    if challenge.challengeHash == data.challengeHash then
      found = true
      break
    end
  end
  if not found then return end

  State.opponent = data.opponent
  State.turn = State.pendingChallenge.firstTurn
  State.inBattle = true
  State.fainted = false
  State.pendingChallenges = {}
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

-- 🔹 Reject Challenge
Handlers.add("RejectChallenge", Handlers.utils.hasTag("Action", "RejectChallenge"), function(msg)
  local data = json.decode(msg.Data or "{}")
  if not data.challengeHash or not data.challenger then return end
  for i, challenge in ipairs(State.pendingChallenges) do
    if challenge.challengeHash == data.challengeHash and challenge.challenger == data.challenger then
      table.remove(State.pendingChallenges, i)
      break
    end
  end
end)

-- 🔹 List Pending Challenges
Handlers.add("GetChallenges", Handlers.utils.hasTag("Action", "GetChallenges"), function(msg)
  local data = json.decode(msg.Data or "{}")
  local page = tonumber(data.page or 1)
  local pageSize = tonumber(data.pageSize or 10)
  local offset = (page - 1) * pageSize

  local paged = {}
  for i = offset + 1, math.min(offset + pageSize, #State.pendingChallenges) do
    table.insert(paged, State.pendingChallenges[i])
  end

  ao.send({
    Target = msg.From,
    Tags = { Component = "PendingChallenges" },
    Data = json.encode({
      page = page,
      pageSize = pageSize,
      total = #State.pendingChallenges,
      results = paged
    })
  })
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