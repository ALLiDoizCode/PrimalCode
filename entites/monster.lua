local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- 🧬 MONSTER PROCESS (Turn-Based Battle Ready)

State = State or {}

-- 🔹 Init Handler
Handlers.add("Init", Handlers.utils.hasTag("Action", "Init"), function(msg)
  if msg.From ~= ao.Owner then return end -- Only creator can init
  local data = json.decode(msg.Data or "{}")
  State.name = data.name
  State.desciption = data.desciption
  State.trainer = data.trainer or nil
  local baseStats = data.stats or { hp = 20, attack = 5, defense = 3, speed = 5, crit = 0.05 }
  State.stats = baseStats
  State.hp = baseStats.hp
  State.attack = baseStats.attack
  State.defense = baseStats.defense
  State.speed = baseStats.speed
  State.crit = baseStats.crit
  State.status = nil
  State.moves = data.moves or { "Tackle", "Growl" }
  State.opponent = nil
  State.turn = false
  State.inBattle = false
  State.fainted = false
  State.pendingChallenges = {}
  -- Format: { ["<token_process_id>"] = multiplier }
  State.primalModifiers = data.primalModifiers or {}
  -- Format: { ["<token_process_id>"] = minimum_amount }
  State.minimumCatchAmounts = data.minimumCatchAmounts or {}
  Handlers.remove("Init")
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

-- 🔹 Use Move (fetches defender stats before move)
Handlers.add("UseMove", Handlers.utils.hasTag("Action", "UseMove"), function(msg)
  if not State.inBattle or not State.turn or State.fainted then return end
  if msg.From ~= State.trainer then return end
  if State.pendingMove ~= nil then return end
  local payload = json.decode(msg.Data or "{}")
  local move = payload.move
  local moveProcess = payload.moveProcess
  if not move or not moveProcess then return end

  local allowed = false
  for _, m in ipairs(State.moves) do
    if m == move then
      allowed = true
      break
    end
  end
  if not allowed then return end

  -- Request opponent's stats before executing move
  State.pendingMove = { move = move, moveProcess = moveProcess }
  ao.send({
    Target = State.opponent,
    Tags = { Action = "RequestStats" },
  })
end)

-- 🔹 Respond to stats request
Handlers.add("RequestStats", Handlers.utils.hasTag("Action", "RequestStats"), function(msg)
  if msg.From ~= State.opponent then return end
  ao.send({
    Target = msg.From,
    Tags = { Action = "DefenderStats" },
    Data = json.encode({
      hp = State.stats.hp,
      defense = State.stats.defense,
      speed = State.stats.speed,
      crit = State.stats.crit
    })
  })
end)

-- 🔹 Handle defender stats and execute move
Handlers.add("DefenderStats", Handlers.utils.hasTag("Action", "DefenderStats"), function(msg)
  if msg.From ~= State.opponent then return end
  if not State.pendingMove then return end
  local stats = json.decode(msg.Data or "{}")
  ao.send({
    Target = State.pendingMove.moveProcess,
    Tags = {
      Action = "Execute",
      Attacker = ao.id,
      Defender = State.opponent,
      ReplyTo = State.opponent
    },
    Data = json.encode({
      attackerStats = State.stats,
      defenderStats = stats
    })
  })
  State.pendingMove = nil
  State.turn = false
end)

-- 🔹 Receive Result from Opponent's Move
Handlers.add("ReceiveMove", Handlers.utils.hasTag("Action", "MoveResult"), function(msg)
  if not State.inBattle or State.fainted then return end
  local data = json.decode(msg.Data or "{}")
  if data.statChanges then
    for stat, newVal in pairs(data.statChanges) do
      if State[stat] then
        State[stat] = newVal
      end
    end
  end
  if State.stats.hp == 0 then
    State.fainted = true
    State.inBattle = false
    ao.send({
      Target = State.opponent,
      Tags = {
        Action = "VictoryNotice",
      }
    })
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
  ao.send({
    Target = State.opponent,
    Tags = {
      Action = "VictoryNotice",
    }
  })
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
    Tags = { Action = "PendingChallenges" },
    Data = json.encode({
      page = page,
      pageSize = pageSize,
      total = #State.pendingChallenges,
      results = paged
    })
  })
end)

-- 🔹 Credit Notice (Capture Flow)
Handlers.add("Credit-Notice", Handlers.utils.hasTag("Credit-Notice", "true"), function(msg)
  if State.trainer ~= nil then return end -- Already caught
  local amount = tonumber(msg.Quantity or "0")
  local trainer = msg.Sender
  local sourceProcess = msg.From
  local modifier = State.primalModifiers[sourceProcess]

  -- Reject if not a recognized token process
  if not modifier then
    ao.send({
      Target = sourceProcess,
      Tags = {
        Action = "Transfer",
        Recipient = trainer,
        Quantity = tostring(amount)
      }
    })
    return
  end

  -- Minimum required amount per token process
  local minAmount = State.minimumCatchAmounts[sourceProcess] or 100
  if amount < minAmount then
    ao.send({
      Target = sourceProcess,
      Tags = {
        Action = "Transfer",
        Recipient = trainer,
        Quantity = tostring(amount)
      }
    })
    return
  end

  -- Catch chance scales with missing HP and primal bonus
  local hpFraction = State.stats.hp / State.hp
  local baseChance = 1 - hpFraction
  local scaledChance = math.min(1, baseChance * modifier * (amount / 1000))

  if math.random() <= scaledChance then
    State.trainer = trainer
    ao.send({ Target = trainer, Tags = { Action = "CatchResult" }, Data = json.encode({ success = true, id = ao.id }) })
  else
    ao.send({ Target = trainer, Tags = { Action = "CatchResult" }, Data = json.encode({ success = false, id = ao.id }) })
  end
end)

-- 🔹 Debit Notice (Optional cleanup if needed)
Handlers.add("Debit-Notice", Handlers.utils.hasTag("Debit-Notice", "true"), function(msg)
  -- Currently unused in catch logic, can track spends or refunds here
end)

-- 🔹 Report State
Handlers.add("GetState", Handlers.utils.hasTag("Action", "GetState"), function(msg)
  ao.send({
    Target = msg.From,
    Tags = { Action = "State" },
    Data = json.encode({
      hp = State.stats.hp,
      attack = State.stats.attack,
      defense = State.stats.defense,
      speed = State.stats.speed,
      crit = State.stats.crit,
      status = State.status,
      moves = State.moves,
      inBattle = State.inBattle,
      turn = State.turn,
      fainted = State.fainted
    })
  })
end)

-- Handler: Receive notification when this monster wins a battle
Handlers.add("VictoryNotice", Handlers.utils.hasTag("Action", "VictoryNotice"), function(msg)
  -- Only allow known opponent to confirm this victory
  if msg.From ~= State.currentOpponent then return end

  State.victories = (State.victories or 0) + 1

  -- Reset battle-related state
  State.currentOpponent = nil
  State.pendingMove = nil
end)
