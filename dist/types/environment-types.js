"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructureType = exports.ResourceType = exports.WeatherCondition = void 0;
var WeatherCondition;
(function (WeatherCondition) {
    WeatherCondition["CLEAR"] = "clear";
    WeatherCondition["CLOUDY"] = "cloudy";
    WeatherCondition["RAIN"] = "rain";
    WeatherCondition["STORM"] = "storm";
    WeatherCondition["FOG"] = "fog";
    WeatherCondition["SNOW"] = "snow";
})(WeatherCondition || (exports.WeatherCondition = WeatherCondition = {}));
var ResourceType;
(function (ResourceType) {
    ResourceType["FOOD"] = "food";
    ResourceType["WATER"] = "water";
    ResourceType["SHELTER"] = "shelter";
    ResourceType["HUNTING_GROUND"] = "hunting_ground";
    ResourceType["TERRITORY"] = "territory";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var StructureType;
(function (StructureType) {
    StructureType["CAVE"] = "cave";
    StructureType["TREE"] = "tree";
    StructureType["ROCK"] = "rock";
    StructureType["WATER_SOURCE"] = "water_source";
    StructureType["CLEARING"] = "clearing";
    StructureType["BURROW"] = "burrow";
})(StructureType || (exports.StructureType = StructureType = {}));
//# sourceMappingURL=environment-types.js.map