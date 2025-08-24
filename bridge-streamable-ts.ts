import { JSONSchemaToZod } from "@dmitryrechkin/json-schema-to-zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  GetPromptRequestSchema,
  isInitializeRequest,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  type ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import express from "express";
import fs, { type StatWatcher } from "fs";
import morgan from "morgan";
import { randomUUID } from "node:crypto";
import { readFileSync, unwatchFile, watchFile } from "node:fs";
import { WebSocketClientTransport } from "./websocket.js";
export interface McpServerConfig {
  protocols?: string | string[];
  headers?: Record<string, string>;
  type?: string;
  transport?: string;
  url?: string;
  httpUrl?: string;
  sseUrl?: string;
  wsUrl?: string;
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

// 配置接口定义
export interface Config {
  sseServer?: {
    enabled?: boolean;
    endpoint?: string;
    messageEndpoint?: string;
  };
  config?: string | undefined;
  pathPrefix?: string;
  hotReload?: boolean;
  version?: boolean;
  apiKey?: string;
  port?: number;
  host?: string;
  corsAllowOrigins?: string[];
  mcpServers?: {
    [key: string]: McpServerConfig;
  };
}
export interface ServerInstance {
  server?: McpServer;
  client?: Client;
  transport?:
    | StdioClientTransport
    | SSEClientTransport
    | StreamableHTTPClientTransport
    | WebSocketClientTransport;
  httpTransport?: StreamableHTTPServerTransport;
  sseTransport?: SSEServerTransport;

  config: McpServerConfig;
}

// 默认配置
export const DEFAULT_CONFIG: Config = {
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
let config: Config = { ...DEFAULT_CONFIG };
let servers: Map<string, ServerInstance> = new Map();
let configFilePath: string = "settings.json";
let configWatcher: StatWatcher | null = null;

// 加载配置文件
function loadConfigFile(filePath: string): Config {
  try {
    const fileContent = readFileSync(filePath, "utf-8");
    const fileConfig = JSON.parse(fileContent) as Config;
    return { ...DEFAULT_CONFIG, ...fileConfig };
  } catch (error) {
    console.warn(`Failed to load config file ${filePath}:`, error);
    return DEFAULT_CONFIG;
  }
}

// 从环境变量加载配置
function loadEnvConfig(): Partial<Config> {
  return {
    apiKey: process.env.BRIDGE_API_TOKEN,
    port: process.env.BRIDGE_API_PORT
      ? parseInt(process.env.BRIDGE_API_PORT)
      : undefined,
    pathPrefix: process.env.BRIDGE_STREAMABLE_HTTP_PATH,
  };
}

// 获取服务器能力
async function getServerCapabilities(
  client: Client
): Promise<ServerCapabilities | undefined> {
  try {
    return await client.getServerCapabilities();
  } catch (error) {
    console.error("Error getting server capabilities:", error);
    return {
      tools: {},
      resources: {},
      prompts: {},
    };
  }
}

// 创建MCP服务器实例
async function createMcpServer(
  serverName: string,
  serverConfig: McpServerConfig
): Promise<ServerInstance> {
  // 使用selectTransport函数选择合适的transport
  const transport = selectTransport(serverConfig);

  if (!transport) {
    throw new Error(
      "Failed to create transport, please check the configuration."
    );
  }

  const client = new Client(
    { name: `bridge-client-${serverName}`, version: "1.0.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  await client.connect(transport);
  const capabilities = Object.assign({}, await getServerCapabilities(client));
  console.log(`[${serverName}] capabilities:`, capabilities);

  const listOutputs = {
    tools: null as
      | Awaited<ReturnType<typeof client.listTools>>
      | undefined
      | null,
    prompts: null as
      | Awaited<ReturnType<typeof client.listPrompts>>
      | undefined
      | null,
    resources: null as
      | Awaited<ReturnType<typeof client.listResources>>
      | undefined
      | null,
    resourceTemplates: null as
      | Awaited<ReturnType<typeof client.listResourceTemplates>>
      | undefined
      | null,
  };

  // 获取工具列表
  try {
    const tools = await client.listTools();
    console.log(
      `[${serverName}] Registering tools:`,
      JSON.stringify(tools, null, 4)
    );
    listOutputs.tools = tools;
  } catch (error) {
    console.error(`[${serverName}] Error listing tools:`, error);
    capabilities.tools = undefined;
  }

  // 获取提示列表
  try {
    const prompts = await client.listPrompts();
    console.log(
      `[${serverName}] Registering prompts:`,
      JSON.stringify(prompts, null, 4)
    );
    listOutputs.prompts = prompts;
  } catch (error) {
    console.error(`[${serverName}] Error listing prompts:`, error);
    capabilities.prompts = undefined;
  }

  // 获取资源列表
  try {
    const Resources = await client.listResources();
    console.log(
      `[${serverName}] Registering Resources:`,
      JSON.stringify(Resources, null, 4)
    );
    listOutputs.resources = Resources;
  } catch (error) {
    console.error(`[${serverName}] Error listing Resources:`, error);
    capabilities.resources = undefined;

    if (listOutputs.resources || listOutputs.resourceTemplates) {
      capabilities.resources = {};
    }
  }
  try {
    const ResourcesTemplates = await client.listResourceTemplates();
    console.log(
      `[${serverName}] Registering ResourcesTemplates:`,
      JSON.stringify(ResourcesTemplates, null, 4)
    );
    listOutputs.resourceTemplates = ResourcesTemplates;
  } catch (error) {
    console.error(`[${serverName}] Error listing ResourcesTemplates:`, error);
    capabilities.resources = undefined;
    if (listOutputs.resources || listOutputs.resourceTemplates) {
      capabilities.resources = {};
    }
  }
  const server = new McpServer(
    {
      name: `bridge-service-${serverName}`,
      version: "1.0.0",
    },
    {
      capabilities: capabilities,
    }
  );

  // 注册工具
  try {
    if (capabilities.tools && listOutputs.tools) {
      const tools = listOutputs.tools;
      await Promise.all(
        tools.tools.map(async (tool) => {
          console.log(
            `[${serverName}] Registering tool: `,
            JSON.stringify(
              {
                name: tool.name,
                description: tool.description,
                annotations: tool.annotations,
              },
              null,
              4
            )
          );
          //@ts-ignore
          const inputSchema = JSONSchemaToZod.convert(tool.inputSchema).shape;
          const outputSchema = tool.outputSchema
            ? //@ts-ignore
              JSONSchemaToZod.convert(tool.outputSchema).shape
            : tool.outputSchema;

          server.registerTool(
            tool.name,
            {
              description: tool.description,
              annotations: tool.annotations,
              ...tool,
              inputSchema: inputSchema,
              outputSchema,
            },
            //@ts-ignore
            async (params: any) => {
              console.log(
                `[${serverName}] Calling tool`,
                JSON.stringify({ name: tool.name, params }, null, 4)
              );
              const result = await client.callTool({
                name: tool.name,
                arguments: params,
              });
              return result;
            }
          );
        })
      );
    }
  } catch (error) {
    console.error(`[${serverName}] Error Registering tools:`, error);
  }

  // 注册提示
  try {
    if (capabilities.prompts && listOutputs.prompts) {
      //@ts-ignore
      server.server.setRequestHandler(ListPromptsRequestSchema, async () => {
        console.log(`[${serverName}] Listing prompts...`);
        return listOutputs.prompts;
      });

      server.server.setRequestHandler(
        GetPromptRequestSchema,
        async (request) => {
          console.log(
            `[${serverName}] Getting prompt...`,
            JSON.stringify(request.params, null, 4)
          );
          const result = await client.getPrompt(request.params);
          return result;
        }
      );
    }
  } catch (error) {
    console.error(`[${serverName}] Error Registering prompts:`, error);
  }

  // 注册资源
  try {
    if (capabilities.resources && listOutputs.resources) {
      server.server.setRequestHandler(
        ReadResourceRequestSchema,
        async (request) => {
          console.log(
            `[${serverName}] Reading resource...`,
            JSON.stringify(request.params, null, 4)
          );
          const result = await client.readResource(request.params);
          return result;
        }
      );

      server.server.setRequestHandler(
        ListResourcesRequestSchema,
        //@ts-ignore
        async (request) => {
          console.log(
            `[${serverName}] Listing resources...`,
            JSON.stringify(request.params, null, 4)
          );
          return listOutputs.resources;
        }
      );

      server.server.setRequestHandler(
        ListResourceTemplatesRequestSchema,
        //@ts-ignore
        async (request) => {
          console.log(
            `[${serverName}] Listing resourceTemplates...`,
            JSON.stringify(request.params, null, 4)
          );
          return listOutputs.resourceTemplates;
        }
      );
    }
  } catch (error) {
    console.error(`[${serverName}] Error Registering Resources:`, error);
  }

  return {
    config: serverConfig,
    server,
    client,
    transport: transport,
    httpTransport: null as any,
  };
}

// 初始化所有MCP服务器
async function initializeServers(config: Config) {
  if (!config.mcpServers) return;

  // 清理现有服务器
  for (const [serverName, instance] of servers) {
    try {
      instance?.server?.close();
      instance?.client?.close();
      instance?.transport?.close();
      if (instance.httpTransport) {
        instance.httpTransport.close();
      }
    } catch (error) {
      console.error(`Error closing server ${serverName}:`, error);
    }
  }
  servers.clear();

  // 创建新服务器
  for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
    if (
      !Object.keys(serverConfig).includes("url") &&
      !Object.keys(serverConfig).includes("command") &&
      !Object.keys(serverConfig).includes("wsUrl") &&
      !Object.keys(serverConfig).includes("httpUrl") &&
      !Object.keys(serverConfig).includes("sseUrl")
    ) {
      throw new Error(
        "url, command, wsUrl, httpUrl, sseUrl are required,configuration  is invalid,    please check the configuration file"
      );
    }
    try {
      // const instance = await createMcpServer(serverName, serverConfig);
      servers.set(serverName, { config: serverConfig });
      console.log(`✅ Server '${serverName}' initialized successfully`);
    } catch (error) {
      console.error(`❌ Failed to initialize server '${serverName}':`, error);
      process.exit(1);
    }
  }
}

// 设置配置文件监听
function setupConfigWatcher(configFilePath: string) {
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

  console.log(JSON.stringify(cliConfig, null, 4));
  console.log(JSON.stringify(fileConfig, null, 4));
  console.log(JSON.stringify(envConfig, null, 4));

  config = mergeConfigs(cliConfig, fileConfig, envConfig);

  console.log("📋 Configuration reloaded:", JSON.stringify(config, null, 2));

  // 重新设置配置监听
  setupConfigWatcher(configFilePath);

  // 重新初始化服务器
  await initializeServers(config);
  await server.close();
  server = await main();
}

// 认证中间件
function authenticateToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  const expectedToken = config.apiKey;

  // 如果配置了API密钥，则进行验证
  if (expectedToken) {
    if (!token || !authHeader?.startsWith("Bearer ")) {
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

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConfigs } from "./mergeConfigs.js";
import { parseCommandLineArgs } from "./parseCommandLineArgs.js";
import { selectTransport } from "./selectTransport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//@ts-ignore
const packageJson = await fs.promises.readFile(
  join(__dirname, "./package.json"),
  {
    encoding: "utf-8",
  }
);
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

  console.log(JSON.stringify(cliConfig, null, 4));
  console.log(JSON.stringify(fileConfig, null, 4));
  console.log(JSON.stringify(envConfig, null, 4));

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
  app.use(
    cors({
      origin: config.corsAllowOrigins,
      exposedHeaders: ["Mcp-Session-Id"],
      allowedHeaders: ["Content-Type", "mcp-session-id", "Authorization"],
    })
  );

  app.use(express.json());
  app.use(authenticateToken);

  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sseTransports = new Map<string, SSEServerTransport>();
  const pathPrefix = config.pathPrefix || "/mcp";
  for (const [key, value] of servers) {
    // 处理MCP请求
    console.log(
      "registering pathPrefix",
      pathPrefix + "/" + key,
      pathPrefix + "/" + encodeURIComponent(key)
    );
    app.all(pathPrefix + "/" + encodeURIComponent(key), async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports.has(sessionId)) {
        transport = transports.get(sessionId)!;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // 新的初始化请求
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            transports.set(transport.sessionId!, transport);
            console.log(`New session initialized: ${sessionId}`);
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

        serverInstance.httpTransport = transport;

        // 清理传输
        transport.onclose = () => {
          if (transport.sessionId) {
            console.log(`Session closed: ${transport.sessionId}`);
            transports.delete(transport.sessionId);
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
        } else {
          console.log(
            "already Initialized  MCP server",
            serverName,
            serverConfig
          );
        }

        // 连接到MCP服务器
        //@ts-ignore
        await serverInstance.server.connect(transport);
      } else {
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
            console.log(
              "Initializing MCP server for SSE",
              serverName,
              serverConfig
            );
            const instance = await createMcpServer(serverName, serverConfig);
            serverInstance.server = instance.server;
            serverInstance.client = instance.client;
            serverInstance.transport = instance.transport;
          }

          // 创建SSE传输
          const sseTransport = new SSEServerTransport(
            messageEndpoint + `/${encodeURIComponent(key)}`,
            res
          );
          serverInstance.sseTransport = sseTransport;

          // 存储SSE传输
          sseTransports.set(sseTransport.sessionId, sseTransport);

          // 设置响应关闭时的清理逻辑
          res.on("close", () => {
            if (serverInstance.sseTransport === sseTransport) {
              serverInstance.sseTransport = undefined;
            }
            sseTransports.delete(sseTransport.sessionId);
            console.log(`SSE session closed: ${sseTransport.sessionId}`);
          });

          // 连接到MCP服务器
          //@ts-ignore
          await serverInstance.server.connect(sseTransport);
        } catch (error) {
          console.error(`Error handling SSE connection:`, error);
          if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error" });
          }
        }
      });

      // SSE消息端点
      app.post(
        `${messageEndpoint}/${encodeURIComponent(key)}`,
        async (req, res) => {
          try {
            const sessionId = req.query.sessionId as string;
            const sseTransport = sseTransports.get(sessionId);
            if (sseTransport) {
              await sseTransport.handlePostMessage(req, res, req.body);
            } else {
              res
                .status(400)
                .json({ error: "No SSE transport found for sessionId" });
            }
          } catch (error) {
            console.error(`Error handling SSE message:`, error);
            if (!res.headersSent) {
              res.status(500).json({ error: "Internal server error" });
            }
          }
        }
      );
    }
  }

  // 启动服务器
  const port = config.port || 3000;
  const host = config.host || "localhost";
  console.log(JSON.stringify(config, null, 4));
  const server = app.listen(port, host, (err) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }

    console.log(
      `🚀 MCP Bridge (stdio ↔ Streamable HTTP) listening on http://${host}:${port}${pathPrefix}`
    );

    if (config.apiKey) {
      console.log(`🔒 API Key authentication enabled`);
    }

    if (config.hotReload) {
      console.log(`🔄 Hot reload enabled`);
    }

    console.log(
      `📦 Configured MCP servers: ${Object.keys(config.mcpServers || {}).join(
        ", "
      )}`
    );

    // 打印所有MCP HTTP端点
    console.log("🌐 Available MCP HTTP endpoints:");
    for (const [key] of servers) {
      const endpoint = `${pathPrefix}/${encodeURIComponent(key)}`;
      const encodedEndpoint = endpoint;
      console.log(key, `   http://${host}:${port}${encodedEndpoint}`);
    }

    if (config.sseServer && config.sseServer.enabled) {
      const sseEndpoint = config.sseServer.endpoint || "/sse";
      const messageEndpoint = config.sseServer.messageEndpoint || "/messages";
      for (const [key] of servers) {
        console.log(
          `SSE Endpoint: http://${host}:${port}${sseEndpoint}/${encodeURIComponent(
            key
          )}`,
          `Message Endpoint: http://${host}:${port}${messageEndpoint}/${encodeURIComponent(
            key
          )}`
        );
      }
    }
  });

  return {
    async close() {
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
