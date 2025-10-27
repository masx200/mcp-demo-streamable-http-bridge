import { JSONSchemaToZod } from "@dmitryrechkin/json-schema-to-zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  SetLevelRequestSchema,
  ToolListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getServerCapabilities } from "./getServerCapabilities.js";
import { type McpServerConfig, type ServerInstance } from "./main.js";
import { selectTransport } from "./selectTransport.js";

// 创建MCP服务器实例
export async function createMcpServer(
  serverName: string,
  serverConfig: McpServerConfig,
): Promise<ServerInstance> {
  // 使用selectTransport函数选择合适的transport
  const transport = selectTransport(serverConfig);

  if (!transport) {
    throw new Error(
      "Failed to create transport, please check the configuration.",
    );
  }
  console.log("clienttransport", transport);
  //  const client= new McpClient()
  const client = new Client(
    { name: `bridge-client-${serverName}`, version: "1.0.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );
  //@ts-ignore
  await client.connect(transport);
  console.log("client connected", transport);
  const capabilities = (await getServerCapabilities(client)) ?? {};
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
      JSON.stringify(tools, null, 4),
    );
    listOutputs.tools = tools;

    capabilities.tools = {
      listChanged: true,
    };
  } catch (error) {
    console.error(`[${serverName}] Error listing tools:`, error);
    capabilities.tools = undefined;
  }

  // 获取提示列表
  try {
    const prompts = await client.listPrompts();
    console.log(
      `[${serverName}] Registering prompts:`,
      JSON.stringify(prompts, null, 4),
    );
    listOutputs.prompts = prompts;
    capabilities.prompts = {
      listChanged: true,
    };
  } catch (error) {
    console.error(`[${serverName}] Error listing prompts:`, error);
    capabilities.prompts = undefined;
  }

  // 获取资源列表
  try {
    const Resources = await client.listResources();
    console.log(
      `[${serverName}] Registering Resources:`,
      JSON.stringify(Resources, null, 4),
    );
    listOutputs.resources = Resources;
    capabilities.resources = {
      listChanged: true,
    };
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
      JSON.stringify(ResourcesTemplates, null, 4),
    );
    listOutputs.resourceTemplates = ResourcesTemplates;
    capabilities.resources = {
      listChanged: true,
    };
  } catch (error: any) {
    console.error(`[${serverName}] Error listing ResourcesTemplates:`, error);

    if (
      String(error).includes("McpError: MCP error -32001: Request timed out")
    ) {
      throw error;
    }
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
      capabilities: Object.assign(capabilities, {
        tools: { listChanged: true },
      }),
    },
  );

  // 注册工具
  try {
    if (capabilities.tools && listOutputs.tools) {
      server.server.registerCapabilities({
        tools: { listChanged: true },
      });
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
              4,
            ),
          );
          //@ts-ignore
          const inputSchema = JSONSchemaToZod.convert(tool.inputSchema).shape;
          const outputSchema = tool.outputSchema
            //@ts-ignore
            ? JSONSchemaToZod.convert(tool.outputSchema).shape
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
                JSON.stringify({ name: tool.name, params }, null, 4),
              );
              const result = await client.callTool({
                name: tool.name,
                arguments: params,
              });
              return result;
            },
          );
        }),
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
            JSON.stringify(request.params, null, 4),
          );
          const result = await client.getPrompt(request.params);
          return result;
        },
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
            JSON.stringify(request.params, null, 4),
          );
          const result = await client.readResource(request.params);
          return result;
        },
      );

      server.server.setRequestHandler(
        ListResourcesRequestSchema,
        //@ts-ignore
        async (request) => {
          console.log(
            `[${serverName}] Listing resources...`,
            JSON.stringify(request.params, null, 4),
          );
          return listOutputs.resources;
        },
      );

      server.server.setRequestHandler(
        ListResourceTemplatesRequestSchema,
        //@ts-ignore
        async (request) => {
          console.log(
            `[${serverName}] Listing resourceTemplates...`,
            JSON.stringify(request.params, null, 4),
          );
          return listOutputs.resourceTemplates;
        },
      );
    }
  } catch (error) {
    console.error(`[${serverName}] Error Registering Resources:`, error);
  }
  console.log("getServerCapabilities", client.getServerCapabilities());

  if (client.getServerCapabilities()?.logging) {
    server.server.setRequestHandler(SetLevelRequestSchema, async (args) => {
      console.log(
        `[${serverName}] Setting logging level...`,
        JSON.stringify(args.params, null, 4),
      );

      return await client.setLoggingLevel(args.params.level);
    });
  }

  server.server.setRequestHandler(
    ListToolsRequestSchema,
    async (request, extra) => {
      const tools = await client.listTools(request.params);
      return tools;
    },
  );

  client.setNotificationHandler(
    ToolListChangedNotificationSchema,
    (notification) => {
      console.log(
        `[${serverName}] Tool list changed...`,
        JSON.stringify(notification.params, null, 4),
      );
      server.sendToolListChanged();

      client.listTools().then((tools) => {
        console.log("更新后的工具列表:", tools);
      });
    },
  );

  return {
    config: serverConfig,
    server,
    client,
    transport: transport,
    httpTransports: null as any,
  };
}
