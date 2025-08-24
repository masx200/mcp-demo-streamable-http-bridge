import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServerConfig } from "./main.js";
import { WebSocketClientTransport } from "./WebSocketClientTransport.js";
export declare function selectTransport(serverConfig: McpServerConfig): StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport | WebSocketClientTransport | null;
//# sourceMappingURL=selectTransport.d.ts.map