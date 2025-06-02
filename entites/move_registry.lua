local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- 🧾 MOVE REGISTRY PROCESS

-- Holds a mapping of move name -> process ID
State.moves = State.moves or {
  Tackle = "<process-id-tackle>",
  Growl = "<process-id-growl>"
}

-- 🔹 Init Move Registry
Handlers.add("Init", Handlers.utils.hasTag("Action", "Init"), function(msg)
  if msg.From ~= ao.owner then return end
  local data = json.decode(msg.Data or "{}")
  State.moves = data.moves or {}
end)

-- 🔹 Init or Update Moves
Handlers.add("RegisterMoves", Handlers.utils.hasTag("Action", "RegisterMoves"), function(msg)
  if msg.From ~= ao.owner then return end -- Only owner can update registry
  local data = json.decode(msg.Data or "{}")
  for move, process in pairs(data or {}) do
    State.moves[move] = process
  end
end)

-- 🔹 Get Process for One or All Moves
Handlers.add("GetMoveProcess", Handlers.utils.hasTag("Action", "GetMoveProcess"), function(msg)
  local data = json.decode(msg.Data or "{}")
  local move = data.move
  local result = {}
  if move then
    result[move] = State.moves[move]
  else
    result = State.moves
  end
  ao.send({
    Target = msg.From,
    Tags = { Component = "MoveLookup" },
    Data = json.encode(result)
  })
end)

-- 🔹 Check if a move process is valid
Handlers.add("IsValidMoveProcess", Handlers.utils.hasTag("Action", "IsValidMoveProcess"), function(msg)
  local data = json.decode(msg.Data or "{}")
  local move = data.move
  local process = data.process
  local isValid = (State.moves[move] == process)

  ao.send({
    Target = msg.From,
    Tags = { Component = "MoveValidation" },
    Data = json.encode({ move = move, process = process, valid = isValid })
  })
end)

-- 🔹 Remove a move
Handlers.add("RemoveMove", Handlers.utils.hasTag("Action", "RemoveMove"), function(msg)
  if msg.From ~= ao.owner then return end
  local data = json.decode(msg.Data or "{}")
  local move = data.move
  if move then State.moves[move] = nil end
end)
