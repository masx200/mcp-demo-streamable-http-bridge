import { JSONSchemaToZod } from "@dmitryrechkin/json-schema-to-zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
import fs from "fs";
import { randomUUID } from "node:crypto";
import { readFileSync, unwatchFile, watchFile } from "node:fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// 配置接口定义
export interface Config {
  config?: string | undefined;
  pathPrefix?: string;
  hotReload?: boolean;
  version?: boolean;
  apiKey?: string;
  port?: number;
  host?: string;
  corsAllowOrigins?: string[];
  mcpServers?: {
    [key: string]: {
      command: string;
      args: string[];
    };
  };
}
export interface ServerInstance {
  server: McpServer;
  client: Client;
  transport: StdioClientTransport;
  httpTransport: StreamableHTTPServerTransport;
}

// 默认配置
const DEFAULT_CONFIG: Config = {
  pathPrefix: "/mcp",
  hotReload: false,
  version: false,
  apiKey: "",
  port: 3000,
  host: "localhost",
  corsAllowOrigins: ["*"],
  mcpServers: {},
};

// 全局变量
let config: Config = { ...DEFAULT_CONFIG };
let servers: Map<string, ServerInstance> = new Map();
let configFilePath: string = "settings.json";
let configWatcher: any = null;

// 解析命令行参数
function parseCommandLineArgs(): Config {
  const argv = yargs(hideBin(process.argv))
    .version(false)
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
    config: argv.config,
    hotReload: argv.hotReload,
    version: argv.version,
    apiKey: argv.apiKey,
    port: argv.port,
    host: argv.host,
    corsAllowOrigins: argv.corsAllowOrigins as string[] | undefined,
    pathPrefix: argv.pathPrefix,
  };
}

// 加载配置文件
function loadConfigFile(filePath: string): Config {
  try {
    const fileContent = readFileSync(filePath, "utf-8");
    const fileConfig = JSON.parse(fileContent);
    return { ...DEFAULT_CONFIG, ...fileConfig };
  } catch (error) {
    console.warn(`Failed to load config file ${filePath}:`, error);
    return DEFAULT_CONFIG;
  }
}

// 合并配置
function mergeConfigs(
  cliConfig: Config,
  fileConfig: Config,
  envConfig: Partial<Config>
): Config {
  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...cliConfig,
    ...envConfig,
    port:
      envConfig.port ||
      cliConfig.port ||
      fileConfig.port ||
      DEFAULT_CONFIG.port,
    host:
      envConfig.host ||
      cliConfig.host ||
      fileConfig.host ||
      DEFAULT_CONFIG.host,
    hotReload:
      envConfig.hotReload ||
      cliConfig.hotReload ||
      fileConfig.hotReload ||
      DEFAULT_CONFIG.hotReload,
    pathPrefix:
      envConfig.pathPrefix ||
      cliConfig.pathPrefix ||
      fileConfig.pathPrefix ||
      DEFAULT_CONFIG.pathPrefix,
    corsAllowOrigins:
      envConfig.corsAllowOrigins ||
      cliConfig.corsAllowOrigins ||
      fileConfig.corsAllowOrigins ||
      DEFAULT_CONFIG.corsAllowOrigins,
    config:
      envConfig.config ||
      cliConfig.config ||
      fileConfig.config ||
      DEFAULT_CONFIG.config,
    version:
      envConfig.version ||
      cliConfig.version ||
      fileConfig.version ||
      DEFAULT_CONFIG.version,
  };
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
  serverConfig: { command: string; args: string[] }
): Promise<ServerInstance> {
  const stdioTransport = new StdioClientTransport({
    command: serverConfig.command,
    args: serverConfig.args,
    cwd: process.env.BRIDGE_API_PWD || process.cwd(),
    env: process.env as Record<string, string>,
  });

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

  await client.connect(stdioTransport);
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

    const ResourcesTemplates = await client.listResourceTemplates();
    console.log(
      `[${serverName}] Registering ResourcesTemplates:`,
      JSON.stringify(ResourcesTemplates, null, 4)
    );
    listOutputs.resourceTemplates = ResourcesTemplates;
  } catch (error) {
    console.error(`[${serverName}] Error listing Resources:`, error);
    capabilities.resources = undefined;
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
    server,
    client,
    transport: stdioTransport,
    httpTransport: null as any,
  };
}

// 初始化所有MCP服务器
async function initializeServers() {
  if (!config.mcpServers) return;

  // 清理现有服务器
  for (const [serverName, instance] of servers) {
    try {
      instance.server.close();
      instance.client.close();
      instance.transport.close();
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
    try {
      const instance = await createMcpServer(serverName, serverConfig);
      servers.set(serverName, instance);
      console.log(`✅ Server '${serverName}' initialized successfully`);
    } catch (error) {
      console.error(`❌ Failed to initialize server '${serverName}':`, error);
    }
  }
}

// 设置配置文件监听
function setupConfigWatcher() {
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
  setupConfigWatcher();

  // 重新初始化服务器
  await initializeServers();
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
//@ts-ignore
const packageJson = await fs.promises.readFile("./package.json", {
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

  console.log(JSON.stringify(cliConfig, null, 4));
  console.log(JSON.stringify(fileConfig, null, 4));
  console.log(JSON.stringify(envConfig, null, 4));

  config = mergeConfigs(cliConfig, fileConfig, envConfig);

  console.log("📋 Configuration:", JSON.stringify(config, null, 2));

  // 设置配置文件监听
  setupConfigWatcher();

  // 初始化服务器
  await initializeServers();

  // 创建Express应用
  const app = express();

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
  const pathPrefix = config.pathPrefix || "/mcp";
  for (const [key, value] of servers) {
    // 处理MCP请求
    console.log("registering pathPrefix", pathPrefix + "/" + key);
    app.all(pathPrefix + "/" + key, async (req, res) => {
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

        // 连接到MCP服务器
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
  }

  // 启动服务器
  const port = config.port || 3000;
  const host = config.host || "localhost";
  console.log(JSON.stringify(config, null, 4));
  app.listen(port, host, (err) => {
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
  });
}

// 启动应用
main().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});
