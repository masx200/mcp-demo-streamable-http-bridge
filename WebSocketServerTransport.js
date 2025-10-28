import { JSONRPCMessageSchema } from "@modelcontextprotocol/sdk/types.js";
import { WebSocket } from "ws";
/**
 * Server transport for WebSocket: this implements the MCP WebSocket transport specification.
 * It supports session management and follows the same patterns as StreamableHTTPServerTransport.
 *
 * Usage example:
 *
 * ```typescript
 * // Stateful mode - server sets the session ID
 * const statefulTransport = new WebSocketServerTransport({
 *   sessionIdGenerator: () => randomUUID(),
 *   port: 8080
 * });
 *
 * // Stateless mode - explicitly set session ID to undefined
 * const statelessTransport = new WebSocketServerTransport({
 *   sessionIdGenerator: undefined,
 *   port: 8080
 * });
 * ```
 *
 * In stateful mode:
 * - Session ID is generated and managed
 * - Session validation is performed
 * - State is maintained in-memory (connections, message history)
 *
 * In stateless mode:
 * - No session ID is generated
 * - No session validation is performed
 */
export class WebSocketServerTransport {
  ws;
  request;
  options;
  started = false;
  constructor(ws, request, options) {
    this.ws = ws;
    this.request = request;
    this.options = options;
    this.ws = ws;
    this.request = request;
  }
  async start() {
    if (this.started) {
      throw new Error(
        "WebSocketServerTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    }
    try {
      return new Promise((resolve, reject) => {
        //@ts-ignore
        this.options.onsessioninitialized(this.sessionId);
        this.options.onOpen?.(this.ws);
        this.options.onConnection?.(this.ws);
        this.ws.on("error", (error) => {
          this.onerror?.(error);
          this.options.onError?.(error);
          reject(error);
        });
        this.ws.on("close", () => {
          this.onclose?.();
          //@ts-ignore
          this.options.onsessionclosed(this.sessionId);
          this.options.onClose?.(this.ws);
        });
        this.ws.on("message", (data) => {
          const message = JSONRPCMessageSchema.parse(
            JSON.parse(data.toString()),
          );
          this.onmessage?.(message);
          this.options.onMessage?.(message);
        });
        this.ws.on("open", () => {
          resolve();
          this.options.onOpen?.(this.ws);
        });
      });
    } finally {
      this.started = true;
    }
    //@ts-ignore
  }
  async send(message, options) {
    console.log(
      "WebSocketServerTransport send",
      JSON.stringify(message, null, 4),
    );
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
    this.ws.send(JSON.stringify(message));
    console.log(
      "WebSocketServerTransport send",
      JSON.stringify(message, null, 4),
    );
  }
  async close() {
    this.ws.close();
    this.onclose?.();
    this.options.onClose?.(this.ws);
  }
  onclose;
  onerror;
  onmessage;
  //这里不能先设定sessionId,否则会影响初始化
  sessionId;
  setProtocolVersion;
}
//# sourceMappingURL=WebSocketServerTransport.js.map
