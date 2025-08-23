import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/webSocket.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
export interface McpServerConfig {
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
  config: McpServerConfig;
}
//# sourceMappingURL=bridge-streamable-ts.d.ts.map
