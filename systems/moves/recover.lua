local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- MOVE: RECOVER (Heals the user)
Handlers.add("Execute", Handlers.utils.hasTag("Action", "Execute"), function(msg)
  local attacker = msg.Tags["Attacker"]
  local replyTo = msg.Tags["ReplyTo"]
  if not attacker or not replyTo then return end

  ao.send({
    Target = attacker,
    Tags = { Action = "GetComponent", Component = "Moves", ReplyTo = ao.id },
    Data = json.encode({
      moveName = "Recover",
      attacker = attacker,
      replyTo = replyTo,
      stats = msg.Data and json.decode(msg.Data) or {}
    })
  })
end)

Handlers.add("ComponentResponse", Handlers.utils.hasTag("Component", "Moves"), function(msg)
  local payload = json.decode(msg.Data or "{}")
  local moveName = payload.moveName or ""
  if moveName ~= "Recover" then return end

  local stats = payload.stats or {}
  local attacker = payload.attacker
  local replyTo = payload.replyTo

  local allowed = false
  local moves = msg.Data and json.decode(msg.Data or "{}") or {}
  for _, mv in ipairs(moves or {}) do if mv == moveName then allowed = true break end end
  if not allowed then return end

  local heal = math.floor((stats.attackerStats and stats.attackerStats.hp or 20) * 0.5)

  ao.send({
    Target = replyTo,
    Tags = { Component = "MoveResult", Move = "Recover" },
    Data = json.encode({ heal = heal, message = "Recovered some health!" })
  })
end)
