// bridge.js
import { JSONSchemaToZod } from "@dmitryrechkin/json-schema-to-zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
// ---------- 1. 解析命令行 ----------
const [, , ...rawArgs] = process.argv;
if (rawArgs.length === 0) {
  console.error("用法: node bridge.js <command> [arg1] [arg2] ...");
  process.exit(1);
}
const [command, ...args] = rawArgs;
async function factory() {
  const stdioTransport = new StdioClientTransport({ command, args });

  // ---------- 3. 创建 MCP Client（仅用于桥接转发） ----------
  const mcpClient = new Client(
    { name: "bridge-client", version: "1.0.0" },
    { capabilities: {} },
  );
  await mcpClient.connect(stdioTransport);

  const server = new McpServer({
    name: "calculator-service",
    version: "1.0.0",
  }, { capabilities: {} });
  const tools = await mcpClient.listTools();
  // console.log(tools)

  await Promise.all(tools.tools.map(async (tool) => {
    console.log("Registering tool: ", {
      name: tool.name,
      description: tool.description,
    });
    //json schema需要和zod schema进行转换，否则找不到输入参数！

    const inputSchema = JSONSchemaToZod.convert(tool.inputSchema).shape;
    // console.log("Registering tool: ", JSON.stringify(tool, null, 4))

    // console.log("Registering tool:inputSchema: ", inputSchema)
    server.registerTool(tool.name, {
      description: tool.description,

      annotations: tool.annotations,
      ...tool,
      inputSchema: inputSchema,
    }, async (params) => {
      console.log("Calling tool", { name: tool.name, params });
      const result = await mcpClient.callTool({
        name: tool.name,
        arguments: params,
      });

      // console.log("Tool result:", result);
      return result;
    });
  }));
  return server;
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

app.all("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  let transport;

  if (sessionId && transports.has(sessionId)) {
    transport = transports.get(sessionId);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports.set(transport.sessionId, transport);
        console.log(`New session initialized: ${sessionId}`);
      },
      // DNS rebinding protection is disabled by default for backwards compatibility
      // If you are running this server locally, you can enable it:
      // enableDnsRebindingProtection: true,
      // allowedHosts: ['127.0.0.1', 'localhost'],
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`Session closed: ${transport.sessionId}`);
        transports.delete(transport.sessionId);
      }
    };
    const server = await factory();
    // Connect to the MCP server
    await server.connect(transport);
  } else {
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(
    `🚀 MCP Bridge (stdio ↔ Streamable HTTP) listening on http://localhost:${PORT}/mcp`,
  );
  console.log(`📦 Backend: ${command} ${args.join(" ")}`);
});
