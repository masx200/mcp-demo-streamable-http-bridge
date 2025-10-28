import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
/**
 * 为MCP客户端设置所有通知处理器
 * @param client - MCP客户端实例
 * @param server - MCP服务器实例
 * @param serverName - 服务器名称，用于日志
 */
export declare function setupAllNotificationHandlers(
  client: Client,
  server: McpServer,
  serverName: string,
): void;
//# sourceMappingURL=notificationHandlers.d.ts.map
