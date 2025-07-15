"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonsterPersonalityType = exports.MonsterState = exports.MonsterSpecies = void 0;
var MonsterSpecies;
(function (MonsterSpecies) {
    MonsterSpecies["SHADOW_WOLF"] = "shadow_wolf";
    MonsterSpecies["FROST_BEAR"] = "frost_bear";
    MonsterSpecies["EMBER_HAWK"] = "ember_hawk";
    MonsterSpecies["STONE_SERPENT"] = "stone_serpent";
    MonsterSpecies["WIND_STAG"] = "wind_stag";
})(MonsterSpecies || (exports.MonsterSpecies = MonsterSpecies = {}));
var MonsterState;
(function (MonsterState) {
    MonsterState["IDLE"] = "idle";
    MonsterState["HUNTING"] = "hunting";
    MonsterState["RESTING"] = "resting";
    MonsterState["FEEDING"] = "feeding";
    MonsterState["MOVING"] = "moving";
    MonsterState["ALERTING"] = "alerting";
    MonsterState["FLEEING"] = "fleeing";
})(MonsterState || (exports.MonsterState = MonsterState = {}));
var MonsterPersonalityType;
(function (MonsterPersonalityType) {
    MonsterPersonalityType["AGGRESSIVE_HUNTER"] = "aggressive_hunter";
    MonsterPersonalityType["CAUTIOUS_FORAGER"] = "cautious_forager";
    MonsterPersonalityType["PACK_LEADER"] = "pack_leader";
})(MonsterPersonalityType || (exports.MonsterPersonalityType = MonsterPersonalityType = {}));
//# sourceMappingURL=monster-types.js.map