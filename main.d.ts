import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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
    transport?: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport | WebSocketClientTransport;
    httpTransport?: StreamableHTTPServerTransport;
    sseTransport?: SSEServerTransport;
    config: McpServerConfig;
}
export declare const DEFAULT_CONFIG: Config;
//# sourceMappingURL=main.d.ts.map