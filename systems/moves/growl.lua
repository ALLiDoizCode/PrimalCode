local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- MOVE: GROWL (Lowers Opponent's Attack)
Handlers.add("Execute", Handlers.utils.hasTag("Action", "Execute"), function(msg)
  local attacker = msg.Tags["Attacker"]
  local defender = msg.Tags["Defender"]
  local replyTo = msg.Tags["ReplyTo"]
  if not attacker or not defender or not replyTo then return end

  ao.send({
    Target = attacker,
    Tags = { Action = "GetComponent", Component = "Moves", ReplyTo = ao.id },
    Data = json.encode({
      moveName = "Growl",
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
  if moveName ~= "Growl" then return end

  local stats = payload.stats or {}
  local attacker = payload.attacker
  local defender = payload.defender
  local replyTo = payload.replyTo

  local allowed = false
  local moves = msg.Data and json.decode(msg.Data or "{}") or {}
  for _, mv in ipairs(moves or {}) do if mv == moveName then allowed = true break end end
  if not allowed then return end

  local currentAtk = stats.defenderStats and stats.defenderStats.attack or 5
  local newAtk = math.max(1, currentAtk - 1)

  ao.send({
    Target = replyTo,
    Tags = { Component = "MoveResult", Move = "Growl" },
    Data = json.encode({ damage = 0, statMod = { stat = "attack", newValue = newAtk }, message = "The opponent's attack fell!" })
  })
end)
