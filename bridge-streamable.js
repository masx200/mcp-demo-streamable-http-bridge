// bridge.js
import { JSONSchemaToZod } from "@dmitryrechkin/json-schema-to-zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { GetPromptRequestSchema, isInitializeRequest, ListPromptsRequestSchema, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
// ---------- 1. 解析命令行 ----------
const [, , ...rawArgs] = process.argv;
if (rawArgs.length === 0) {
    console.error("用法: node bridge-streamable.js <command> [arg1] [arg2] ...");
    process.exit(1);
}
const [command, ...args] = rawArgs;
async function getServerCapabilities(client) {
    try {
        return await client.getServerCapabilities();
    }
    catch (error) {
        console.error("Error getting server capabilities:", error);
        const capabilities = {
            tools: {},
            resources: {},
            prompts: {},
        };
        return capabilities;
    }
}
async function factory(transport) {
    const stdioTransport = new StdioClientTransport({
        //@ts-ignore
        command,
        args,
        cwd: process.env.BRIDGE_API_PWD || process.cwd(),
        env: process.env,
    });
    //在stdio进程退出时，关闭服务端transport
    stdioTransport.onclose = () => {
        console.log("stdio process closed");
        transport.close();
    };
    stdioTransport.onerror = (error) => {
        console.log("stdio process errored", error);
        transport.close();
    };
    // stdioTransport.close();
    // ---------- 3. 创建 MCP Client（仅用于桥接转发） ----------
    const client = new Client({ name: "bridge-client", version: "1.0.0" }, {
        capabilities: {
            tools: {},
            resources: {},
            prompts: {},
        },
    });
    // client.close();
    await client.connect(stdioTransport);
    const capabilities = Object.assign({}, await getServerCapabilities(client));
    console.log("capabilities:", capabilities);
    const listOutputs = {
        tools: null,
        prompts: null,
        resources: null,
        resourceTemplates: null,
    };
    try {
        const tools = await client.listTools();
        console.log("Registering tools:", JSON.stringify(tools, null, 4));
        listOutputs.tools = tools;
    }
    catch (error) {
        console.error("Error listing tools:", error);
        capabilities.tools = undefined;
    }
    try {
        const prompts = await client.listPrompts();
        console.log("Registering prompts:", JSON.stringify(prompts, null, 4));
        listOutputs.prompts = prompts;
    }
    catch (error) {
        console.error("Error listing prompts:", error);
        capabilities.prompts = undefined;
    }
    try {
        const Resources = await client.listResources();
        console.log(` Registering Resources:`, JSON.stringify(Resources, null, 4));
        listOutputs.resources = Resources;
    }
    catch (error) {
        console.error(`Error listing Resources:`, error);
        capabilities.resources = undefined;
        if (listOutputs.resources || listOutputs.resourceTemplates) {
            capabilities.resources = {};
        }
    }
    try {
        const ResourcesTemplates = await client.listResourceTemplates();
        console.log(` Registering ResourcesTemplates:`, JSON.stringify(ResourcesTemplates, null, 4));
        listOutputs.resourceTemplates = ResourcesTemplates;
    }
    catch (error) {
        console.error(` Error listing ResourcesTemplates:`, error);
        capabilities.resources = undefined;
        if (listOutputs.resources || listOutputs.resourceTemplates) {
            capabilities.resources = {};
        }
    }
    const server = new McpServer({
        name: "bridge-service",
        version: "1.0.0",
    }, {
        capabilities: capabilities,
    });
    try {
        if (capabilities.tools && listOutputs.tools) {
            const tools = listOutputs.tools;
            await Promise.all(tools.tools.map(
            //@ts-ignore
            async (tool) => {
                console.log("Registering tool: ", JSON.stringify({
                    name: tool.name,
                    description: tool.description,
                    annotations: tool.annotations,
                }, null, 4));
                //json schema需要和zod schema进行转换，否则找不到输入参数！
                //@ts-ignore
                const inputSchema = JSONSchemaToZod.convert(tool.inputSchema).shape;
                // console.log("Registering tool: ", JSON.stringify(tool, null, 4))
                const outputSchema = tool.outputSchema
                    ? //@ts-ignore
                        JSONSchemaToZod.convert(tool.outputSchema).shape
                    : tool.outputSchema;
                // console.log("Registering tool:inputSchema: ", inputSchema)
                server.registerTool(tool.name, {
                    //@ts-ignore
                    description: tool.description,
                    //@ts-ignore
                    annotations: tool.annotations,
                    ...tool,
                    inputSchema: inputSchema,
                    outputSchema,
                }, 
                //@ts-ignore
                async (params) => {
                    console.log("Calling tool", JSON.stringify({ name: tool.name, params }, null, 4));
                    const result = await client.callTool({
                        name: tool.name,
                        arguments: params,
                    });
                    // console.log("Tool result:", result);
                    return result;
                });
            }));
        }
    }
    catch (error) {
        console.error("Error Registering tools:", error);
    }
    try {
        if (capabilities.prompts && listOutputs.prompts) {
            //@ts-ignore
            server.server.setRequestHandler(ListPromptsRequestSchema, async () => {
                console.log("Listing prompts...");
                return listOutputs.prompts;
            });
            server.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
                console.log("Getting prompt...", JSON.stringify(request.params, null, 4));
                const result = await client.getPrompt(request.params);
                // console.log("Get prompt result:", JSON.stringify(result, null, 4));
                return result;
            });
        }
    }
    catch (error) {
        console.error("Error Registering prompts:", error);
    }
    try {
        if (capabilities.resources && listOutputs.resources) {
            server.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
                console.log("Reading resource...", JSON.stringify(request.params, null, 4));
                const result = await client.readResource(request.params);
                // console.log("Read resource result:", JSON.stringify(result, null, 4));
                return result;
            });
            server.server.setRequestHandler(ListResourcesRequestSchema, 
            //@ts-ignore
            async (request) => {
                console.log("Listing resources...", JSON.stringify(request.params, null, 4));
                const result = listOutputs.resources;
                // console.log("List outputs result:", JSON.stringify(result, null, 4));
                return result;
            });
            server.server.setRequestHandler(ListResourceTemplatesRequestSchema, 
            //@ts-ignore
            async (request) => {
                console.log("Listing resourceTemplates...", JSON.stringify(request.params, null, 4));
                const result = listOutputs.resourceTemplates;
                // console.log("List outputs result:", JSON.stringify(result, null, 4));
                return result;
            });
        }
    }
    catch (error) {
        console.error("Error Registering Resources:", error);
    }
    // server.close()
    return { server, client, transport: stdioTransport };
}
// ---------- 2. 创建 StdioClientTransport ----------
// ---------- 4. 启动 Streamable HTTP Server ----------
const app = express();
// API Token认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    const expectedToken = process.env.BRIDGE_API_TOKEN;
    // 如果设置了环境变量BRIDGE_API_TOKEN，则进行验证
    if (expectedToken) {
        if (!token || !authHeader.startsWith("Bearer ")) {
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
};
app.use(cors({
    exposedHeaders: ["Mcp-Session-Id"],
    allowedHeaders: ["Content-Type", "mcp-session-id", "Authorization"],
}));
app.use(express.json());
app.use(authenticateToken);
const transports = new Map(); // sessionId -> StreamableHTTPServerTransport
const config_STREAMABLE_HTTP_PATH = process.env.BRIDGE_STREAMABLE_HTTP_PATH || "/mcp";
app.all(config_STREAMABLE_HTTP_PATH, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    let transport;
    if (sessionId && transports.has(sessionId)) {
        //@ts-ignore
        transport = transports.get(sessionId);
    }
    else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
                // Store the transport by session ID
                //@ts-ignore
                transports.set(transport.sessionId, transport);
                console.log(`New session initialized: ${sessionId}`);
            },
            // DNS rebinding protection is disabled by default for backwards compatibility
            // If you are running this server locally, you can enable it:
            // enableDnsRebindingProtection: true,
            // allowedHosts: ['127.0.0.1', 'localhost'],
        });
        const server = await factory(transport);
        // Clean up transport when closed
        transport.onclose = () => {
            if (transport.sessionId) {
                console.log(`Session closed: ${transport.sessionId}`);
                transports.delete(transport.sessionId);
            }
            server.server.close();
            server.client.close();
            server.transport.close();
        };
        transport.onerror = (error) => {
            if (transport.sessionId) {
                console.log(`Session errored: ${transport.sessionId}`);
                transports.delete(transport.sessionId);
            }
            console.error("Transport errored", error);
            server.server.close();
            server.client.close();
            server.transport.close();
        };
        // Connect to the MCP server
        await server.server.connect(transport);
    }
    else {
        // Invalid request
        res.status(400).json({
            jsonrpc: "2.0",
            error: {
                code: -32000,
                message: "Bad Request: No valid session ID provided",
            },
            id: null,
        });
        return;
    }
    await transport.handleRequest(req, res, req.body);
});
const PORT = process.env.BRIDGE_API_PORT ?? 3000;
app.listen(PORT, (error) => {
    if (error) {
        console.error("Error starting server:", error);
        return;
    }
    console.log("Environments:", JSON.stringify(process.env, null, 4));
    const expectedToken = process.env.BRIDGE_API_TOKEN;
    if (expectedToken) {
        console.log(`Bridge server listening on port ${PORT} with token ${expectedToken}`);
    }
    else {
        console.log(`🚀 MCP Bridge (stdio ↔ Streamable HTTP) listening on port ${PORT} without token`);
    }
    console.log(`🚀 MCP Bridge (stdio ↔ Streamable HTTP) listening on http://localhost:${PORT}${config_STREAMABLE_HTTP_PATH}`);
    console.log(`📦 stdio Backend: ${command} ${args.join(" ")}`);
});
//# sourceMappingURL=bridge-streamable.js.map