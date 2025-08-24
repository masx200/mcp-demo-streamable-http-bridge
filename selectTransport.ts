import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServerConfig } from "./main.js";
import { WebSocketClientTransport } from "./websocket.js";

// 根据McpServerConfig选择合适的transport
export function selectTransport(
  serverConfig: McpServerConfig,
):
  | StdioClientTransport
  | SSEClientTransport
  | StreamableHTTPClientTransport
  | WebSocketClientTransport
  | null {
  // 如果配置了command，使用stdio transport
  if (
    serverConfig.command ||
    serverConfig.type == "stdio" ||
    serverConfig.transport == "stdio"
  ) {
    if (!serverConfig.command) {
      throw new Error("command is required for stdio transport");
    }
    return new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      cwd: serverConfig.cwd || process.env.BRIDGE_API_PWD || process.cwd(),
      env: Object.assign({}, serverConfig.env, process.env) as
        | Record<string, string>
        | undefined,
    });
  }
  if (
    serverConfig.url &&
    (serverConfig.type == "sse" || serverConfig.transport == "sse")
  ) {
    return new SSEClientTransport(new URL(serverConfig.url), {
      requestInit: { headers: serverConfig.headers },
    });
  }
  // 如果配置了sseUrl，使用SSE transport
  if (
    serverConfig.sseUrl ||
    serverConfig.type == "sse" ||
    serverConfig.transport == "sse"
  ) {
    if (!serverConfig.sseUrl) {
      throw new Error("sseUrl is required for sse transport");
    }
    return new SSEClientTransport(new URL(serverConfig.sseUrl), {
      requestInit: { headers: serverConfig.headers },
    });
  }
  if (
    serverConfig.url &&
    (serverConfig.type == "ws" || serverConfig.transport == "ws")
  ) {
    return new WebSocketClientTransport(new URL(serverConfig.url), {
      headers: serverConfig.headers,
      protocols: serverConfig.protocols,
    });
  }
  // 如果配置了wsUrl，使用WebSocket transport
  if (
    serverConfig.wsUrl ||
    serverConfig.type == "ws" ||
    serverConfig.transport == "ws"
  ) {
    if (!serverConfig.wsUrl) {
      throw new Error("wsUrl is required for ws transport");
    }
    // 注意：WebSocketClientTransport需要从websocket.ts导入
    // 这里假设WebSocketClientTransport的构造函数接受URL和headers
    return new WebSocketClientTransport(new URL(serverConfig.wsUrl), {
      headers: serverConfig.headers,
      protocols: serverConfig.protocols,
    });
  }
  if (
    serverConfig.url &&
    (serverConfig.type == "http" || serverConfig.transport == "http")
  ) {
    return new StreamableHTTPClientTransport(new URL(serverConfig.url), {
      requestInit: { headers: serverConfig.headers },
    });
  }
  // 如果配置了httpUrl或url，使用StreamableHTTP transport
  const httpUrl = serverConfig.httpUrl || serverConfig.url;
  if (httpUrl) {
    return new StreamableHTTPClientTransport(new URL(httpUrl), {
      requestInit: { headers: serverConfig.headers },
    });
  }

  // 如果明确指定了transport类型，根据类型选择
  if (serverConfig.transport) {
    switch (serverConfig.transport.toLowerCase()) {
      case "stdio":
        if (serverConfig.command) {
          return new StdioClientTransport({
            command: serverConfig.command,
            args: serverConfig.args,
            cwd: serverConfig.cwd || process.env.BRIDGE_API_PWD ||
              process.cwd(),
            env: Object.assign({}, serverConfig.env, process.env) as
              | Record<string, string>
              | undefined,
          });
        }
        break;

      case "sse":
        if (serverConfig.sseUrl) {
          return new SSEClientTransport(new URL(serverConfig.sseUrl), {
            requestInit: { headers: serverConfig.headers },
          });
        }
        break;

      case "ws":
        if (serverConfig.wsUrl) {
          return new WebSocketClientTransport(new URL(serverConfig.wsUrl), {
            headers: serverConfig.headers,
            protocols: serverConfig.protocols,
          });
        }
        break;

      case "http":
        const url = serverConfig.httpUrl || serverConfig.url;
        if (url) {
          return new StreamableHTTPClientTransport(new URL(url), {
            requestInit: { headers: serverConfig.headers },
          });
        }
        break;
    }
  }

  // 如果没有匹配的配置，返回null
  return null;
}
