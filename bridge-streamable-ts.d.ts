import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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
      cwd?: string;
      env?: Record<string, string>;
    };
  };
}
export interface ServerInstance {
  server: McpServer;
  client: Client;
  transport: StdioClientTransport;
  httpTransport: StreamableHTTPServerTransport;
}
//# sourceMappingURL=bridge-streamable-ts.d.ts.map
