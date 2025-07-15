"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FocusArea = exports.AnalysisDepth = exports.DEFAULT_FOCUS_AREA = exports.DEFAULT_ANALYSIS_DEPTH = void 0;
exports.DEFAULT_ANALYSIS_DEPTH = 'standard';
exports.DEFAULT_FOCUS_AREA = 'all';
var AnalysisDepth;
(function (AnalysisDepth) {
    AnalysisDepth["BASIC"] = "basic";
    AnalysisDepth["STANDARD"] = "standard";
    AnalysisDepth["DETAILED"] = "detailed";
})(AnalysisDepth || (exports.AnalysisDepth = AnalysisDepth = {}));
var FocusArea;
(function (FocusArea) {
    FocusArea["ALL"] = "all";
    FocusArea["MONSTERS"] = "monsters";
    FocusArea["ENVIRONMENT"] = "environment";
    FocusArea["INTERACTIONS"] = "interactions";
})(FocusArea || (exports.FocusArea = FocusArea = {}));
//# sourceMappingURL=mcp-tool-types.js.map