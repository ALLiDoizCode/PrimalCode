local json = require('json');
local bint = require('.bint')(256)
local utils = require(".utils")


-- 🛡️ RAISE DEFENSE MOVE PROCESS

-- This move raises the attacker's defense stat by 10%

Handlers.add("Execute", Handlers.utils.hasTag("Action", "Execute"), function(msg)
    local data = json.decode(msg.Data or "{}")
    if msg.From ~= data.attacker then return end

    local attacker = data.attacker
    local attackerStats = data.attackerStats or {}

    -- Increase defense by 10%
    local newDefense = math.floor(attackerStats.defense * 1.1)

    ao.send({
        Target = attacker,
        Tags = { Action = "ReceiveMove" },
        Data = json.encode({
            attacker = attacker,
            move = "RaiseDefense",
            type = "Normal",
            effect = "StatUp",
            statChanges = {
                defense = newDefense
            },
            target = attacker
        })
    })
end)
