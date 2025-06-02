local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")

-- 🐾 GROWL MOVE PROCESS

-- Growl lowers the target's attack stat by 10% (minimum 1)

Handlers.add("Execute", Handlers.utils.hasTag("Action", "Execute"), function(msg)
    local data = json.decode(msg.Data or "{}")
    if msg.From ~= data.attacker then return end

    local attacker = data.attacker
    local defender = data.defender
    local defenderStats = data.defenderStats or {}

    -- Reduce attack by 10%, minimum 1
    local newAttack = math.max(1, math.floor(defenderStats.attack * 0.9))

    -- Send effect result to defender (with updated stat intent)
    -- The monster receiving this should apply all statChanges keys to its State
    ao.send({
        Target = defender,
        Tags = { Action = "ReceiveMove" },
        Data = json.encode({
            attacker = attacker,
            move = "Growl",
            type = "Normal",
            effect = "StatDown",
            statChanges = {
                attack = newAttack
            },
            target = defender
        })
    })
end)
