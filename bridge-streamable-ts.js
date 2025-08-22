"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var json_schema_to_zod_1 = require("@dmitryrechkin/json-schema-to-zod");
var index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
var cors_1 = require("cors");
var express_1 = require("express");
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var yargs_1 = require("yargs");
var helpers_1 = require("yargs/helpers");
// 默认配置
var DEFAULT_CONFIG = {
    pathPrefix: "/mcp",
    hotReload: false,
    version: false,
    apiKey: "",
    port: 3000,
    host: "localhost",
    corsAllowOrigins: ["*"],
    mcpServers: {
        memory: {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-memory"],
        },
        time: {
            command: "uvx",
            args: ["mcp-server-time", "--local-timezone=America/New_York"],
        },
    },
};
// 全局变量
var config = __assign({}, DEFAULT_CONFIG);
var servers = new Map();
var configFilePath = "settings.json";
var configWatcher = null;
// 解析命令行参数
function parseCommandLineArgs() {
    var argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .option("hot-reload", {
        type: "boolean",
        description: "Enable hot reload for configuration changes",
    })
        .option("version", {
        type: "boolean",
        description: "Show version information",
    })
        .option("config", {
        type: "string",
        description: "Path to configuration file",
    })
        .option("api-key", {
        type: "string",
        description: "API key for authentication",
    })
        .option("port", {
        type: "number",
        description: "Port to listen on",
    })
        .option("host", {
        type: "string",
        description: "Host to bind to",
    })
        .option("cors-allow-origins", {
        type: "array",
        description: "CORS allowed origins",
    })
        .option("path-prefix", {
        type: "string",
        description: "URL path prefix for MCP endpoints",
    })
        .help()
        .alias("help", "h")
        .parseSync();
    return {
        hotReload: argv.hotReload,
        version: argv.version,
        apiKey: argv.apiKey,
        port: argv.port,
        host: argv.host,
        corsAllowOrigins: argv.corsAllowOrigins,
        pathPrefix: argv.pathPrefix,
    };
}
// 加载配置文件
function loadConfigFile(filePath) {
    try {
        var fileContent = (0, node_fs_1.readFileSync)(filePath, "utf-8");
        var fileConfig = JSON.parse(fileContent);
        return __assign(__assign({}, DEFAULT_CONFIG), fileConfig);
    }
    catch (error) {
        console.warn("Failed to load config file ".concat(filePath, ":"), error);
        return DEFAULT_CONFIG;
    }
}
// 合并配置
function mergeConfigs(cliConfig, fileConfig, envConfig) {
    return __assign(__assign(__assign(__assign({}, DEFAULT_CONFIG), fileConfig), cliConfig), envConfig);
}
// 从环境变量加载配置
function loadEnvConfig() {
    return {
        apiKey: process.env.BRIDGE_API_TOKEN,
        port: process.env.BRIDGE_API_PORT
            ? parseInt(process.env.BRIDGE_API_PORT)
            : undefined,
        pathPrefix: process.env.BRIDGE_STREAMABLE_HTTP_PATH,
    };
}
// 获取服务器能力
function getServerCapabilities(client) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, client.getServerCapabilities()];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_1 = _a.sent();
                    console.error("Error getting server capabilities:", error_1);
                    return [2 /*return*/, {
                            tools: {},
                            resources: {},
                            prompts: {},
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// 创建MCP服务器实例
function createMcpServer(serverName, serverConfig) {
    return __awaiter(this, void 0, void 0, function () {
        var stdioTransport, client, capabilities, listOutputs, tools, error_2, prompts, error_3, Resources, ResourcesTemplates, error_4, server, tools, error_5;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stdioTransport = new stdio_js_1.StdioClientTransport({
                        command: serverConfig.command,
                        args: serverConfig.args,
                        cwd: process.env.BRIDGE_API_PWD || process.cwd(),
                        env: process.env,
                    });
                    client = new index_js_1.Client({ name: "bridge-client-".concat(serverName), version: "1.0.0" }, {
                        capabilities: {
                            tools: {},
                            resources: {},
                            prompts: {},
                        },
                    });
                    return [4 /*yield*/, client.connect(stdioTransport)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, getServerCapabilities(client)];
                case 2:
                    capabilities = _a.sent();
                    console.log("[".concat(serverName, "] capabilities:"), capabilities);
                    listOutputs = {
                        tools: null,
                        prompts: null,
                        resources: null,
                        resourceTemplates: null,
                    };
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, client.listTools()];
                case 4:
                    tools = _a.sent();
                    console.log("[".concat(serverName, "] Registering tools:"), JSON.stringify(tools, null, 4));
                    listOutputs.tools = tools;
                    return [3 /*break*/, 6];
                case 5:
                    error_2 = _a.sent();
                    console.error("[".concat(serverName, "] Error listing tools:"), error_2);
                    capabilities.tools = undefined;
                    return [3 /*break*/, 6];
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, client.listPrompts()];
                case 7:
                    prompts = _a.sent();
                    console.log("[".concat(serverName, "] Registering prompts:"), JSON.stringify(prompts, null, 4));
                    listOutputs.prompts = prompts;
                    return [3 /*break*/, 9];
                case 8:
                    error_3 = _a.sent();
                    console.error("[".concat(serverName, "] Error listing prompts:"), error_3);
                    capabilities.prompts = undefined;
                    return [3 /*break*/, 9];
                case 9:
                    _a.trys.push([9, 12, , 13]);
                    return [4 /*yield*/, client.listResources()];
                case 10:
                    Resources = _a.sent();
                    console.log("[".concat(serverName, "] Registering Resources:"), JSON.stringify(Resources, null, 4));
                    listOutputs.resources = Resources;
                    return [4 /*yield*/, client.listResourceTemplates()];
                case 11:
                    ResourcesTemplates = _a.sent();
                    console.log("[".concat(serverName, "] Registering ResourcesTemplates:"), JSON.stringify(ResourcesTemplates, null, 4));
                    listOutputs.resourceTemplates = ResourcesTemplates;
                    return [3 /*break*/, 13];
                case 12:
                    error_4 = _a.sent();
                    console.error("[".concat(serverName, "] Error listing Resources:"), error_4);
                    capabilities.resources = undefined;
                    return [3 /*break*/, 13];
                case 13:
                    server = new mcp_js_1.McpServer({
                        name: "bridge-service-".concat(serverName),
                        version: "1.0.0",
                    }, {
                        capabilities: capabilities,
                    });
                    _a.label = 14;
                case 14:
                    _a.trys.push([14, 17, , 18]);
                    if (!(capabilities.tools && listOutputs.tools)) return [3 /*break*/, 16];
                    tools = listOutputs.tools;
                    return [4 /*yield*/, Promise.all(tools.tools.map(function (tool) { return __awaiter(_this, void 0, void 0, function () {
                            var inputSchema, outputSchema;
                            var _this = this;
                            return __generator(this, function (_a) {
                                console.log("[".concat(serverName, "] Registering tool: "), JSON.stringify({
                                    name: tool.name,
                                    description: tool.description,
                                    annotations: tool.annotations,
                                }, null, 4));
                                inputSchema = json_schema_to_zod_1.JSONSchemaToZod.convert(tool.inputSchema).shape;
                                outputSchema = tool.outputSchema
                                    ? json_schema_to_zod_1.JSONSchemaToZod.convert(tool.outputSchema).shape
                                    : tool.outputSchema;
                                server.registerTool(tool.name, __assign(__assign({ description: tool.description, annotations: tool.annotations }, tool), { inputSchema: inputSchema, outputSchema: outputSchema }), function (params) { return __awaiter(_this, void 0, void 0, function () {
                                    var result;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                console.log("[".concat(serverName, "] Calling tool"), JSON.stringify({ name: tool.name, params: params }, null, 4));
                                                return [4 /*yield*/, client.callTool({
                                                        name: tool.name,
                                                        arguments: params,
                                                    })];
                                            case 1:
                                                result = _a.sent();
                                                return [2 /*return*/, result];
                                        }
                                    });
                                }); });
                                return [2 /*return*/];
                            });
                        }); }))];
                case 15:
                    _a.sent();
                    _a.label = 16;
                case 16: return [3 /*break*/, 18];
                case 17:
                    error_5 = _a.sent();
                    console.error("[".concat(serverName, "] Error Registering tools:"), error_5);
                    return [3 /*break*/, 18];
                case 18:
                    // 注册提示
                    try {
                        if (capabilities.prompts && listOutputs.prompts) {
                            server.server.setRequestHandler(types_js_1.ListPromptsRequestSchema, function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    console.log("[".concat(serverName, "] Listing prompts..."));
                                    return [2 /*return*/, listOutputs.prompts];
                                });
                            }); });
                            server.server.setRequestHandler(types_js_1.GetPromptRequestSchema, function (request) { return __awaiter(_this, void 0, void 0, function () {
                                var result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            console.log("[".concat(serverName, "] Getting prompt..."), JSON.stringify(request.params, null, 4));
                                            return [4 /*yield*/, client.getPrompt(request.params)];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result];
                                    }
                                });
                            }); });
                        }
                    }
                    catch (error) {
                        console.error("[".concat(serverName, "] Error Registering prompts:"), error);
                    }
                    // 注册资源
                    try {
                        if (capabilities.resources && listOutputs.resources) {
                            server.server.setRequestHandler(types_js_1.ReadResourceRequestSchema, function (request) { return __awaiter(_this, void 0, void 0, function () {
                                var result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            console.log("[".concat(serverName, "] Reading resource..."), JSON.stringify(request.params, null, 4));
                                            return [4 /*yield*/, client.readResource(request.params)];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result];
                                    }
                                });
                            }); });
                            server.server.setRequestHandler(types_js_1.ListResourcesRequestSchema, function (request) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    console.log("[".concat(serverName, "] Listing resources..."), JSON.stringify(request.params, null, 4));
                                    return [2 /*return*/, listOutputs.resources];
                                });
                            }); });
                            server.server.setRequestHandler(types_js_1.ListResourceTemplatesRequestSchema, function (request) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    console.log("[".concat(serverName, "] Listing resourceTemplates..."), JSON.stringify(request.params, null, 4));
                                    return [2 /*return*/, listOutputs.resourceTemplates];
                                });
                            }); });
                        }
                    }
                    catch (error) {
                        console.error("[".concat(serverName, "] Error Registering Resources:"), error);
                    }
                    return [2 /*return*/, {
                            server: server,
                            client: client,
                            transport: stdioTransport,
                            httpTransport: null,
                        }];
            }
        });
    });
}
// 初始化所有MCP服务器
function initializeServers() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, servers_1, _a, serverName, instance, _b, _c, _d, serverName, serverConfig, instance, error_6;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!config.mcpServers)
                        return [2 /*return*/];
                    // 清理现有服务器
                    for (_i = 0, servers_1 = servers; _i < servers_1.length; _i++) {
                        _a = servers_1[_i], serverName = _a[0], instance = _a[1];
                        try {
                            instance.server.close();
                            instance.client.close();
                            instance.transport.close();
                            if (instance.httpTransport) {
                                instance.httpTransport.close();
                            }
                        }
                        catch (error) {
                            console.error("Error closing server ".concat(serverName, ":"), error);
                        }
                    }
                    servers.clear();
                    _b = 0, _c = Object.entries(config.mcpServers);
                    _e.label = 1;
                case 1:
                    if (!(_b < _c.length)) return [3 /*break*/, 6];
                    _d = _c[_b], serverName = _d[0], serverConfig = _d[1];
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, createMcpServer(serverName, serverConfig)];
                case 3:
                    instance = _e.sent();
                    servers.set(serverName, instance);
                    console.log("\u2705 Server '".concat(serverName, "' initialized successfully"));
                    return [3 /*break*/, 5];
                case 4:
                    error_6 = _e.sent();
                    console.error("\u274C Failed to initialize server '".concat(serverName, "':"), error_6);
                    return [3 /*break*/, 5];
                case 5:
                    _b++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// 设置配置文件监听
function setupConfigWatcher() {
    if (configWatcher) {
        (0, node_fs_1.unwatchFile)(configFilePath);
    }
    if (config.hotReload) {
        configWatcher = (0, node_fs_1.watchFile)(configFilePath, { interval: 1000 }, function () {
            console.log("🔄 Configuration file changed, reloading...");
            reloadConfiguration();
        });
        console.log("\uD83D\uDC40 Watching for configuration changes in: ".concat(configFilePath));
    }
}
// 重新加载配置
function reloadConfiguration() {
    return __awaiter(this, void 0, void 0, function () {
        var cliConfig, fileConfig, envConfig;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cliConfig = parseCommandLineArgs();
                    fileConfig = loadConfigFile(configFilePath);
                    envConfig = loadEnvConfig();
                    config = mergeConfigs(cliConfig, fileConfig, envConfig);
                    console.log("📋 Configuration reloaded:", JSON.stringify(config, null, 2));
                    // 重新设置配置监听
                    setupConfigWatcher();
                    // 重新初始化服务器
                    return [4 /*yield*/, initializeServers()];
                case 1:
                    // 重新初始化服务器
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// 认证中间件
function authenticateToken(req, res, next) {
    var authHeader = req.headers["authorization"];
    var token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    var expectedToken = config.apiKey;
    // 如果配置了API密钥，则进行验证
    if (expectedToken) {
        if (!token || !(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
            return res.status(401).json({
                jsonrpc: "2.0",
                error: {
                    code: -32001,
                    message: "Access token required",
                },
                id: null,
            });
        }
        if (token !== expectedToken) {
            return res.status(403).json({
                jsonrpc: "2.0",
                error: {
                    code: -32002,
                    message: "Invalid access token",
                },
                id: null,
            });
        }
    }
    next();
}
// 主函数
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var cliConfig, fileConfig, envConfig, app, transports, pathPrefix, port, host;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cliConfig = parseCommandLineArgs();
                    // 显示版本信息
                    if (cliConfig.version) {
                        console.log("MCP Streamable HTTP Bridge v1.0.0");
                        process.exit(0);
                    }
                    // 确定配置文件路径
                    if (cliConfig.config) {
                        configFilePath = cliConfig.config;
                    }
                    fileConfig = loadConfigFile(configFilePath);
                    envConfig = loadEnvConfig();
                    config = mergeConfigs(cliConfig, fileConfig, envConfig);
                    console.log("📋 Configuration:", JSON.stringify(config, null, 2));
                    // 设置配置文件监听
                    setupConfigWatcher();
                    // 初始化服务器
                    return [4 /*yield*/, initializeServers()];
                case 1:
                    // 初始化服务器
                    _a.sent();
                    app = (0, express_1.default)();
                    // CORS配置
                    app.use((0, cors_1.default)({
                        origin: config.corsAllowOrigins,
                        exposedHeaders: ["Mcp-Session-Id"],
                        allowedHeaders: ["Content-Type", "mcp-session-id", "Authorization"],
                    }));
                    app.use(express_1.default.json());
                    app.use(authenticateToken);
                    transports = new Map();
                    pathPrefix = config.pathPrefix || "/mcp";
                    // 处理MCP请求
                    app.all(pathPrefix, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var sessionId, transport, serverInstance;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    sessionId = req.headers["mcp-session-id"];
                                    if (!(sessionId && transports.has(sessionId))) return [3 /*break*/, 1];
                                    transport = transports.get(sessionId);
                                    return [3 /*break*/, 4];
                                case 1:
                                    if (!(!sessionId && (0, types_js_1.isInitializeRequest)(req.body))) return [3 /*break*/, 3];
                                    // 新的初始化请求
                                    transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                                        sessionIdGenerator: function () { return (0, node_crypto_1.randomUUID)(); },
                                        onsessioninitialized: function (sessionId) {
                                            transports.set(transport.sessionId, transport);
                                            console.log("New session initialized: ".concat(sessionId));
                                        },
                                    });
                                    serverInstance = Array.from(servers.values())[0];
                                    if (!serverInstance) {
                                        return [2 /*return*/, res.status(500).json({
                                                jsonrpc: "2.0",
                                                error: {
                                                    code: -32003,
                                                    message: "No MCP servers available",
                                                },
                                                id: null,
                                            })];
                                    }
                                    serverInstance.httpTransport = transport;
                                    // 清理传输
                                    transport.onclose = function () {
                                        if (transport.sessionId) {
                                            console.log("Session closed: ".concat(transport.sessionId));
                                            transports.delete(transport.sessionId);
                                        }
                                    };
                                    transport.onerror = function (error) {
                                        if (transport.sessionId) {
                                            console.log("Session errored: ".concat(transport.sessionId));
                                            transports.delete(transport.sessionId);
                                        }
                                        console.error("Transport errored", error);
                                    };
                                    // 连接到MCP服务器
                                    return [4 /*yield*/, serverInstance.server.connect(transport)];
                                case 2:
                                    // 连接到MCP服务器
                                    _a.sent();
                                    return [3 /*break*/, 4];
                                case 3: 
                                // 无效请求
                                return [2 /*return*/, res.status(400).json({
                                        jsonrpc: "2.0",
                                        error: {
                                            code: -32000,
                                            message: "Bad Request: No valid session ID provided",
                                        },
                                        id: null,
                                    })];
                                case 4: return [4 /*yield*/, transport.handleRequest(req, res, req.body)];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    port = config.port || 3000;
                    host = config.host || "localhost";
                    app.listen(port, host, function () {
                        console.log("\uD83D\uDE80 MCP Bridge (stdio \u2194 Streamable HTTP) listening on http://".concat(host, ":").concat(port).concat(pathPrefix));
                        if (config.apiKey) {
                            console.log("\uD83D\uDD12 API Key authentication enabled");
                        }
                        if (config.hotReload) {
                            console.log("\uD83D\uDD04 Hot reload enabled");
                        }
                        console.log("\uD83D\uDCE6 Configured MCP servers: ".concat(Object.keys(config.mcpServers || {}).join(", ")));
                    });
                    return [2 /*return*/];
            }
        });
    });
}
// 启动应用
main().catch(function (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
});
