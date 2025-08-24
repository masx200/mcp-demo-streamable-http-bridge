import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest, } from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import express from "express";
import fs, {} from "fs";
import morgan from "morgan";
import { randomUUID } from "node:crypto";
import { readFileSync, unwatchFile, watchFile } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import authenticateToken from "./authenticateToken.js";
import { createMcpServer } from "./createMcpServer.js";
import { mergeConfigs } from "./mergeConfigs.js";
import { parseCommandLineArgs } from "./parseCommandLineArgs.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServerTransport, } from "./WebSocketServerTransport.js";
import { WebSocketServer } from "ws";
const wsservertransports = new Set();
// 默认配置
export const DEFAULT_CONFIG = {
    sseServer: {
        enabled: true,
        endpoint: "/sse",
        messageEndpoint: "/messages",
    },
    enableHttpServer: true,
    wsServer: {
        enabled: true,
        pathPrefix: "/ws",
    },
    pathPrefix: "/mcp",
    hotReload: false,
    version: false,
    apiKey: "",
    port: 3000,
    host: "0.0.0.0",
    corsAllowOrigins: ["*"],
    mcpServers: {},
};
// 全局变量
export let config = { ...DEFAULT_CONFIG };
let servers = new Map();
let configFilePath = "settings.json";
let configWatcher = null;
// 加载配置文件
function loadConfigFile(filePath) {
    try {
        const fileContent = readFileSync(filePath, "utf-8");
        const fileConfig = JSON.parse(fileContent);
        return { ...DEFAULT_CONFIG, ...fileConfig };
    }
    catch (error) {
        console.warn(`Failed to load config file ${filePath}:`, error);
        process.exit(1);
    }
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
export async function getServerCapabilities(client) {
    try {
        return await client.getServerCapabilities();
    }
    catch (error) {
        console.error("Error getting server capabilities:", error);
        return {
            tools: {},
            resources: {},
            prompts: {},
        };
    }
}
// 初始化所有MCP服务器
async function initializeServers(config) {
    if (!config.mcpServers)
        return;
    cleanup();
    // 清理现有服务器
    for (const [serverName, instance] of servers) {
        try {
            instance?.server?.close();
            instance?.client?.close();
            instance?.transport?.close();
            if (instance.httpTransports) {
                instance.httpTransports.forEach((transport) => transport.close());
            }
            if (instance.sseTransports) {
                instance.sseTransports.forEach((transport) => transport.close());
            }
        }
        catch (error) {
            console.error(`Error closing server ${serverName}:`, error);
        }
    }
    servers.clear();
    // 创建新服务器
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        if (!Object.keys(serverConfig).includes("url") &&
            !Object.keys(serverConfig).includes("command") &&
            !Object.keys(serverConfig).includes("wsUrl") &&
            !Object.keys(serverConfig).includes("httpUrl") &&
            !Object.keys(serverConfig).includes("sseUrl")) {
            throw new Error("url, command, wsUrl, httpUrl, sseUrl are required,configuration  is invalid,    please check the configuration file");
        }
        try {
            // const instance = await createMcpServer(serverName, serverConfig);
            servers.set(serverName, { config: serverConfig });
            console.log(`✅ Server '${serverName}' initialized successfully`);
        }
        catch (error) {
            console.error(`❌ Failed to initialize server '${serverName}':`, error);
            process.exit(1);
        }
    }
}
// 设置配置文件监听
function setupConfigWatcher(configFilePath) {
    if (configWatcher) {
        unwatchFile(configFilePath);
    }
    if (config.hotReload) {
        configWatcher = watchFile(configFilePath, { interval: 1000 }, () => {
            console.log("🔄 Configuration file changed, reloading...");
            reloadConfiguration();
        });
        console.log(`👀 Watching for configuration changes in: ${configFilePath}`);
    }
}
// 重新加载配置
async function reloadConfiguration() {
    const cliConfig = parseCommandLineArgs();
    const fileConfig = loadConfigFile(configFilePath);
    const envConfig = loadEnvConfig();
    // console.log(JSON.stringify(cliConfig, null, 4));
    // console.log(JSON.stringify(fileConfig, null, 4));
    // console.log(JSON.stringify(envConfig, null, 4));
    config = mergeConfigs(cliConfig, fileConfig, envConfig);
    console.log("📋 Configuration reloaded:", JSON.stringify(config, null, 2));
    // 重新设置配置监听
    setupConfigWatcher(configFilePath);
    // 重新初始化服务器
    await initializeServers(config);
    await server.close();
    cleanup();
    server = await main();
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
//@ts-ignore
const packageJson = await fs.promises.readFile(join(__dirname, "./package.json"), {
    encoding: "utf-8",
});
const packageJsonObj = JSON.parse(packageJson);
// 主函数
async function main() {
    // 解析命令行参数
    const cliConfig = parseCommandLineArgs();
    // 显示版本信息
    if (cliConfig.version) {
        console.log("MCP Streamable HTTP Bridge version " + packageJsonObj.version);
        process.exit(0);
    }
    // 确定配置文件路径
    if (cliConfig.config) {
        configFilePath = cliConfig.config;
    }
    // 加载配置
    const fileConfig = loadConfigFile(configFilePath);
    const envConfig = loadEnvConfig();
    // console.log(JSON.stringify(cliConfig, null, 4));
    // console.log(JSON.stringify(fileConfig, null, 4));
    // console.log(JSON.stringify(envConfig, null, 4));
    config = mergeConfigs(cliConfig, fileConfig, envConfig);
    console.log("📋 Configuration:", JSON.stringify(config, null, 2));
    // 设置配置文件监听
    setupConfigWatcher(configFilePath);
    // 初始化服务器
    await initializeServers(config);
    // 创建Express应用
    const app = express();
    // 添加日志中间件
    app.use(morgan("combined"));
    // CORS配置
    app.use(cors({
        origin: config.corsAllowOrigins,
        exposedHeaders: ["Mcp-Session-Id"],
        allowedHeaders: ["Content-Type", "mcp-session-id", "Authorization"],
    }));
    app.use(express.json());
    app.use(authenticateToken(config));
    const transports = new Map();
    const sseTransports = new Map();
    const pathPrefix = config.pathPrefix || "/mcp";
    for (const [key, value] of servers) {
        if (config.enableHttpServer) {
            // 处理MCP请求
            console.log("registering pathPrefix", pathPrefix + "/" + key, pathPrefix + "/" + encodeURIComponent(key));
            app.all(pathPrefix + "/" + encodeURIComponent(key), async (req, res) => {
                const sessionId = req.headers["mcp-session-id"];
                let transport;
                if (sessionId && transports.has(sessionId)) {
                    transport = transports.get(sessionId);
                }
                else if (!sessionId && isInitializeRequest(req.body)) {
                    // 新的初始化请求
                    transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => randomUUID(),
                        onsessioninitialized: (sessionId) => {
                            transports.set(transport.sessionId, transport);
                            console.log(`New mcp session initialized: ${sessionId}`);
                        },
                    });
                    // 选择第一个可用的服务器实例
                    const serverInstance = value;
                    if (!serverInstance) {
                        return res.status(500).json({
                            jsonrpc: "2.0",
                            error: {
                                code: -32003,
                                message: "No MCP servers available",
                            },
                            id: null,
                        });
                    }
                    serverInstance.httpTransports ??= [];
                    serverInstance.httpTransports.push(transport);
                    // 清理传输
                    transport.onclose = () => {
                        if (transport.sessionId) {
                            console.log(`Session closed: ${transport.sessionId}`);
                            transports.delete(transport.sessionId);
                            serverInstance.httpTransports ??= [];
                            serverInstance.httpTransports =
                                serverInstance.httpTransports.filter((t) => t !== transport);
                        }
                    };
                    transport.onerror = (error) => {
                        if (transport.sessionId) {
                            console.log(`Session errored: ${transport.sessionId}`);
                            transports.delete(transport.sessionId);
                        }
                        console.error("Transport errored", error);
                    };
                    const serverName = key;
                    const serverConfig = value.config;
                    // 初始化MCP服务器,懒加载实现
                    if (!serverInstance?.server) {
                        console.log("Initializing MCP server", serverName, serverConfig);
                        const instance = await createMcpServer(serverName, serverConfig);
                        serverInstance.server = instance.server;
                        serverInstance.client = instance.client;
                        serverInstance.transport = instance.transport;
                    }
                    else {
                        console.log("already Initialized  MCP server", serverName, serverConfig);
                    }
                    // 连接到MCP服务器
                    //@ts-ignore
                    await serverInstance.server.connect(transport);
                    console.log("transport", transport);
                }
                else {
                    // 无效请求
                    return res.status(400).json({
                        jsonrpc: "2.0",
                        error: {
                            code: -32000,
                            message: "Bad Request: No valid session ID provided",
                        },
                        id: null,
                    });
                }
                await transport.handleRequest(req, res, req.body);
            });
        }
        // 如果启用了SSE服务器，添加SSE相关路由
        const serverConfig = value.config;
        if (config.sseServer && config.sseServer.enabled) {
            const sseEndpoint = config.sseServer.endpoint || "/sse";
            const messageEndpoint = config.sseServer.messageEndpoint || "/messages";
            // SSE端点
            app.get(`${sseEndpoint}/${encodeURIComponent(key)}`, async (req, res) => {
                try {
                    const serverInstance = value;
                    if (!serverInstance) {
                        return res.status(500).json({
                            jsonrpc: "2.0",
                            error: {
                                code: -32003,
                                message: "No MCP servers available",
                            },
                            id: null,
                        });
                    }
                    const serverName = key;
                    // 初始化MCP服务器（如果尚未初始化）
                    if (!serverInstance?.server) {
                        console.log("Initializing MCP server for SSE", serverName, serverConfig);
                        const instance = await createMcpServer(serverName, serverConfig);
                        serverInstance.server = instance.server;
                        serverInstance.client = instance.client;
                        serverInstance.transport = instance.transport;
                    }
                    // 创建SSE传输
                    const sseTransport = new SSEServerTransport(messageEndpoint + `/${encodeURIComponent(key)}`, res);
                    serverInstance.sseTransports ??= [];
                    serverInstance.sseTransports.push(sseTransport);
                    // 存储SSE传输
                    sseTransports.set(sseTransport.sessionId, sseTransport);
                    console.log(`New SSE session initialized: ${sseTransport.sessionId}`);
                    // 设置响应关闭时的清理逻辑
                    res.on("close", () => {
                        if (serverInstance.sseTransports?.includes(sseTransport)) {
                            serverInstance.sseTransports =
                                serverInstance.sseTransports.filter((t) => t !== sseTransport);
                        }
                        sseTransports.delete(sseTransport.sessionId);
                        console.log(`SSE session closed: ${sseTransport.sessionId}`);
                    });
                    // 连接到MCP服务器
                    //@ts-ignore
                    await serverInstance.server.connect(sseTransport);
                    console.log("sseTransport connected", sseTransport);
                }
                catch (error) {
                    console.error(`Error handling SSE connection:`, error);
                    if (!res.headersSent) {
                        res.status(500).json({ error: "Internal server error" });
                    }
                }
            });
            // SSE消息端点
            app.post(`${messageEndpoint}/${encodeURIComponent(key)}`, async (req, res) => {
                try {
                    const sessionId = req.query.sessionId;
                    const sseTransport = sseTransports.get(sessionId);
                    if (sseTransport) {
                        await sseTransport.handlePostMessage(req, res, req.body);
                    }
                    else {
                        res
                            .status(400)
                            .json({ error: "No SSE transport found for sessionId" });
                    }
                }
                catch (error) {
                    console.error(`Error handling SSE message:`, error);
                    if (!res.headersSent) {
                        res.status(500).json({ error: "Internal server error" });
                    }
                }
            });
        }
    }
    // 启动服务器
    const port = config.port || 3000;
    const host = config.host || "0.0.0.0";
    console.log("📋 Configuration:", JSON.stringify(config, null, 4));
    const server = createServer((request, response) => {
        app(request, response);
    });
    function validateBearerToken(token) {
        // 示例：简单对比
        return token === (config.apiKey ?? process.env.HTTP_API_TOKEN);
    }
    server.on("upgrade", async (request, socket, head) => {
        try {
            console.log("receive upgrade request");
            console.log({
                head: head.toString(),
                url: request.url,
                method: request.method,
                headers: request.headers,
            });
            if (!config.wsServer?.enabled) {
                socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
                socket.destroy();
                return;
            }
            if (config.apiKey ?? process.env.HTTP_API_TOKEN) {
                const authHeader = request.headers["authorization"];
                if (!authHeader || !authHeader.startsWith("Bearer ")) {
                    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                    socket.destroy();
                    return;
                }
                const token = authHeader.slice("Bearer ".length); // 去掉 "Bearer "
                if (!validateBearerToken(token)) {
                    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                    socket.destroy();
                    return;
                }
            }
            //@ts-ignore
            if (!request.url?.startsWith(config.wsServer?.pathPrefix ?? "/ws")) {
                socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
                socket.destroy();
                return;
            }
            const mcpservername = request.url?.substring((config.wsServer?.pathPrefix ?? "/ws").length + 1);
            const mcpserverconfig = config.mcpServers?.[decodeURIComponent(mcpservername)];
            if (!mcpserverconfig) {
                socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
                socket.destroy();
                return;
            }
            const value = servers.get(mcpservername);
            if (!value) {
                socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
                socket.destroy();
                return;
            }
            const serverConfig = value.config;
            // 初始化MCP服务器,懒加载实现
            const serverInstance = value;
            const serverName = mcpservername;
            if (!serverInstance?.server) {
                console.log("Initializing MCP server", serverName, serverConfig);
                const instance = await createMcpServer(serverName, serverConfig);
                serverInstance.server = instance.server;
                serverInstance.client = instance.client;
                serverInstance.transport = instance.transport;
            }
            else {
                console.log("already Initialized  MCP server", serverName, serverConfig);
            }
            const options = {
                onMessage(message) {
                    console.log("wsTransport message", message);
                },
                onError(error) {
                    console.error("wsTransport error", error);
                },
                onOpen(socket) {
                    console.log("wsTransport opened", socket.url);
                },
                onsessionclosed: (sessionId) => {
                    console.log("wsTransport sessionClosed", sessionId);
                },
                onsessioninitialized: (sessionId) => {
                    console.log("wsTransport sessionInitialized", sessionId);
                },
                onClose: (socket) => {
                    console.log("wsTransport closed", socket.url);
                    wss.close();
                },
                onConnection: (socket) => {
                    console.log("wsTransport connected", socket.url);
                },
                path: (config.wsServer?.pathPrefix ?? "/ws") +
                    "/" +
                    encodeURIComponent(serverName),
                noServer: true,
                verifyClient: !(config.apiKey ?? process.env.HTTP_API_TOKEN)
                    ? undefined
                    : async function (info, callback) {
                        const request = info.req;
                        const authHeader = request.headers["authorization"];
                        if (!authHeader || !authHeader.startsWith("Bearer ")) {
                            console.log("no authHeader,verifyClient failed");
                            callback(false);
                            return;
                        }
                        const token = authHeader.slice("Bearer ".length);
                        const result = validateBearerToken(token);
                        console.log("verifyClient result", result);
                        callback(result);
                    },
            };
            const wss = new WebSocketServer({ port, host, ...options });
            wss.on("error", (error) => {
                console.error("WebSocketServerTransport error", error);
            });
            wss.on("connection", (ws, request) => {
                const wsTransport = new WebSocketServerTransport(ws, request, options);
                console.log("wsserverTransport", wsTransport);
                if (!wsTransport) {
                    throw new Error("wsTransport is not defined");
                }
                const mcpserverinstance = serverInstance.server;
                if (!mcpserverinstance) {
                    throw new Error("mcpserverinstance is not defined");
                }
                // const wss = wsTransport.wss;
                // if (!wss) {
                //   throw new Error("wss is not defined");
                // }
                //@ts-ignore
                await mcpserverinstance.connect(wsTransport);
                console.log("mcpserverinstance connect", mcpserverinstance);
                console.log("wsTransport connected", wsTransport);
                wsservertransports.add(wsTransport);
                console.log("wsTransport connected", wsTransport.sessionId);
            });
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        }
        catch (error) {
            console.error("wsTransport error", error);
        }
    });
    server.on("error", (err) => {
        console.error(`Error starting server: ${err.message}`);
        cleanup();
        process.exit(1);
    });
    server.listen(port, host, ( /* err */) => {
        // if (err) {
        //   console.error("Failed to start server:", err);
        //   process.exit(1);
        // }
        if (config.enableHttpServer) {
            console.log(`🚀 MCP Bridge (stdio ↔ Streamable HTTP) \n listening on http://${host}:${port}${pathPrefix}`);
        }
        if (config.apiKey) {
            console.log(`🔒 API Key authentication enabled`);
        }
        else {
            console.log(`🔒 API Key authentication disabled`);
        }
        if (config.hotReload) {
            console.log(`🔄 Hot reload enabled`);
        }
        console.log(`📦 Configured MCP servers: ${Object.keys(config.mcpServers || {}).join(", ")}`);
        // 打印所有MCP HTTP端点
        if (config.wsServer?.enabled) {
            console.log("🌐 Available MCP ws endpoints:");
            for (const [key] of servers) {
                const endpoint = `${config.wsServer?.pathPrefix ?? "/ws"}/${encodeURIComponent(key)}`;
                const encodedEndpoint = endpoint;
                console.log(key, `\n   http://${host}:${port}${encodedEndpoint}`);
            }
        }
        if (config.enableHttpServer) {
            console.log("🌐 Available MCP HTTP endpoints:");
            for (const [key] of servers) {
                const endpoint = `${pathPrefix}/${encodeURIComponent(key)}`;
                const encodedEndpoint = endpoint;
                console.log(key, `\n   http://${host}:${port}${encodedEndpoint}`);
            }
        }
        if (config.sseServer && config.sseServer.enabled) {
            console.log("🌐 Available MCP SSE endpoints:");
            const sseEndpoint = config.sseServer.endpoint || "/sse";
            const messageEndpoint = config.sseServer.messageEndpoint || "/messages";
            for (const [key] of servers) {
                console.log(key, `\nSSE Endpoint: \n http://${host}:${port}${sseEndpoint}/${encodeURIComponent(key)}`, "\n", key, `\nMessage Endpoint: \n http://${host}:${port}${messageEndpoint}/${encodeURIComponent(key)}`);
            }
        }
    });
    return {
        async close() {
            cleanup();
            return new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        reject(err);
                    }
                    console.log("server closed");
                    resolve(true);
                });
            });
        },
    };
}
// 启动应用
let server = await main().catch((error) => {
    console.error("Failed to start application:", error);
    process.exit(1);
});
function cleanup() {
    for (const transport of wsservertransports) {
        transport.close();
    }
    wsservertransports.clear();
}
//# sourceMappingURL=main.js.map