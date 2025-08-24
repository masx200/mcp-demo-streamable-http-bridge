import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServerConfig } from "./bridge-streamable-ts.js";
import { WebSocketClientTransport } from "./websocket.js";
export declare function selectTransport(
  serverConfig: McpServerConfig,
):
  | StdioClientTransport
  | SSEClientTransport
  | StreamableHTTPClientTransport
  | WebSocketClientTransport
  | null;
//# sourceMappingURL=selectTransport.d.ts.map
