local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- MOVE: TACKLE (Physical Damage)
Handlers.add("Execute", Handlers.utils.hasTag("Action", "Execute"), function(msg)
  local attacker = msg.Tags["Attacker"]
  local defender = msg.Tags["Defender"]
  local replyTo = msg.Tags["ReplyTo"]
  if not attacker or not defender or not replyTo then return end

  ao.send({
    Target = attacker,
    Tags = { Action = "GetComponent", Component = "Moves", ReplyTo = ao.id },
    Data = json.encode({
      moveName = "Tackle",
      attacker = attacker,
      defender = defender,
      replyTo = replyTo,
      stats = msg.Data and json.decode(msg.Data) or {}
    })
  })
end)

Handlers.add("ComponentResponse", Handlers.utils.hasTag("Component", "Moves"), function(msg)
  local payload = json.decode(msg.Data or "{}")
  local moveName = payload.moveName or ""
  if moveName ~= "Tackle" then return end

  local stats = payload.stats or {}
  local attacker = payload.attacker
  local defender = payload.defender
  local replyTo = payload.replyTo

  local allowed = false
  local moves = msg.Data and json.decode(msg.Data or "{}") or {}
  for _, mv in ipairs(moves or {}) do if mv == moveName then allowed = true break end end
  if not allowed then return end

  local atk = stats.attackerStats and stats.attackerStats.attack or 5
  local def = stats.defenderStats and stats.defenderStats.defense or 5
  local dmg = math.max(1, atk - def)

  ao.send({
    Target = replyTo,
    Tags = { Component = "MoveResult", Move = "Tackle" },
    Data = json.encode({ damage = dmg, status = nil, message = "A solid hit!" })
  })
end)