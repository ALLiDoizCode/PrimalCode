local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- 🔥 EMBER MOVE PROCESS

-- Ember deals fire-type damage and has a chance to lower the target's attack

Handlers.add("Execute", Handlers.utils.hasTag("Action", "Execute"), function(msg)
  local data = json.decode(msg.Data or "{}")
  if msg.From ~= data.attacker then return end

  local attacker = data.attacker
  local defender = data.defender
  local attackerStats = data.attackerStats or {}
  local defenderStats = data.defenderStats or {}

  -- Damage formula
  local damage = math.max(1, math.floor(attackerStats.attack - (defenderStats.defense / 2)))
  local newHp = math.max(0, defenderStats.hp - damage)

  -- 30% chance to apply attack debuff
  local applyDebuff = math.random() < 0.3
  local statChanges = {
    hp = newHp
  }
  if applyDebuff then
    statChanges.attack = math.max(1, math.floor(defenderStats.attack * 0.9))
  end

  ao.send({
    Target = defender,
    Tags = { Action = "ReceiveMove" },
    Data = json.encode({
      attacker = attacker,
      move = "Ember",
      type = "Fire",
      effect = applyDebuff and "DamageAndDebuff" or "Damage",
      statChanges = statChanges,
      target = defender
    })
  })
end)
