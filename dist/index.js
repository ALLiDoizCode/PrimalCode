#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const health_check_1 = require("./tools/health-check");
const ecosystem_observer_1 = require("./tools/ecosystem-observer");
const monster_analyzer_1 = require("./tools/monster-analyzer");
const environment_checker_1 = require("./tools/environment-checker");
const mock_monster_system_1 = require("./ecosystem/mock-monster-system");
const mock_environment_state_1 = require("./ecosystem/mock-environment-state");
const logger_1 = __importDefault(require("./utils/logger"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class PrimalCodeMCPServer {
    server;
    healthCheckTool;
    ecosystemObserverTool;
    monsterAnalyzerTool;
    environmentCheckerTool;
    monsterSystem;
    environmentState;
    constructor() {
        const serverName = process.env.SERVER_NAME || 'PrimalCode';
        const serverVersion = process.env.SERVER_VERSION || '1.0.0';
        this.server = new index_js_1.Server({
            name: 'primalcode-mcp',
            version: serverVersion,
        }, {
            capabilities: {
                tools: {},
            },
        });
        // Initialize mock systems
        this.monsterSystem = new mock_monster_system_1.MockMonsterSystem(logger_1.default);
        this.environmentState = new mock_environment_state_1.MockEnvironmentState(logger_1.default);
        // Initialize tools
        this.healthCheckTool = new health_check_1.HealthCheckTool(serverName, serverVersion);
        this.ecosystemObserverTool = new ecosystem_observer_1.EcosystemObserverTool(this.monsterSystem, this.environmentState);
        this.monsterAnalyzerTool = new monster_analyzer_1.MonsterAnalyzerTool(this.monsterSystem);
        this.environmentCheckerTool = new environment_checker_1.EnvironmentCheckerTool(this.environmentState, this.monsterSystem);
        this.setupHandlers();
        this.registerTools();
    }
    setupHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            logger_1.default.info('Received ListTools request');
            return {
                tools: [
                    this.healthCheckTool.getToolDefinition(),
                    this.ecosystemObserverTool.getToolDefinition(),
                    this.monsterAnalyzerTool.getToolDefinition(),
                    this.environmentCheckerTool.getToolDefinition(),
                ],
            };
        });
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            logger_1.default.info(`Received CallTool request: ${request.params.name}`);
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'health_check': {
                        const result = await this.healthCheckTool.execute(args || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: result,
                                },
                            ],
                        };
                    }
                    case 'observe_ecosystem': {
                        const result = await this.ecosystemObserverTool.execute(args || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: result,
                                },
                            ],
                        };
                    }
                    case 'analyze_monster': {
                        const result = await this.monsterAnalyzerTool.execute(args || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: result,
                                },
                            ],
                        };
                    }
                    case 'check_environment': {
                        const result = await this.environmentCheckerTool.execute(args || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: result,
                                },
                            ],
                        };
                    }
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                logger_1.default.error(`Error executing tool ${name}:`, error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    registerTools() {
        this.healthCheckTool.registerTool('health_check');
        this.healthCheckTool.registerTool('observe_ecosystem');
        this.healthCheckTool.registerTool('analyze_monster');
        this.healthCheckTool.registerTool('check_environment');
        logger_1.default.info('All tools registered successfully');
    }
    async start() {
        try {
            const transport = new stdio_js_1.StdioServerTransport();
            await this.server.connect(transport);
            logger_1.default.info('PrimalCode MCP Server started successfully');
        }
        catch (error) {
            logger_1.default.error('Failed to start PrimalCode MCP Server:', error);
            process.exit(1);
        }
    }
}
async function main() {
    const server = new PrimalCodeMCPServer();
    await server.start();
}
if (require.main === module) {
    main().catch((error) => {
        logger_1.default.error('Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map