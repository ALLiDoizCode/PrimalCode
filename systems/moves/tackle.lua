local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- 🥊 TACKLE MOVE PROCESS

-- Tackle deals basic physical damage based on attacker and defender stats

Handlers.add("Execute", Handlers.utils.hasTag("Action", "Execute"), function(msg)
  local data = json.decode(msg.Data or "{}")
  if msg.From ~= data.attacker then return end

  local attacker = data.attacker
  local defender = data.defender
  local attackerStats = data.attackerStats or {}
  local defenderStats = data.defenderStats or {}

  -- Damage formula: attack - (defense / 2), min 1
  local damage = math.max(1, math.floor(attackerStats.attack - (defenderStats.defense / 2)))

  ao.send({
    Target = defender,
    Tags = { Action = "ReceiveMove" },
    Data = json.encode({
      attacker = attacker,
      move = "Tackle",
      type = "Normal",
      effect = "Damage",
      statChanges = {
        hp = math.max(0, defenderStats.hp - damage)
      },
      target = defender
    })
  })
end)
