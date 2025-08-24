import type {
  Transport,
  TransportSendOptions,
} from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type JSONRPCMessage,
  JSONRPCMessageSchema,
  type MessageExtraInfo,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocket } from "ws";

import type { ServerOptions } from "ws";
import type { IncomingMessage } from "node:http";
/**
 * Configuration options for WebSocketServerTransport
 */
export interface WebSocketServerTransportOptions extends ServerOptions {
  /**
   * Function that generates a session ID for the transport.
   * The session ID SHOULD be globally unique and cryptographically secure (e.g., a securely generated UUID, a JWT, or a cryptographic hash)
   *
   * Return undefined to disable session management.
   */
  sessionIdGenerator?: (() => string) | undefined;

  /**
   * A callback for session initialization events
   * This is called when the server initializes a new session.
   * Useful in cases when you need to register multiple mcp sessions
   * and need to keep track of them.
   * @param sessionId The generated session ID
   */
  onsessioninitialized?: (sessionId: string) => void | Promise<void>;

  /**
   * A callback for session close events
   * This is called when the server closes a session.
   * Useful in cases when you need to clean up resources associated with the session.
   * @param sessionId The session ID that was closed
   */
  onsessionclosed?: (sessionId: string) => void | Promise<void>;

  /**
   * 监听端口，默认 3000
   */
  port?: number;

  /**
   * 监听 host，默认 'localhost'
   */
  host?: string;

  /**
   * 连接建立后的额外回调
   */
  onOpen?: (socket: WebSocket) => void;
  onConnection?: (socket: WebSocket) => void;
  onClose?: (socket: WebSocket) => void;
  onError?: (error: Error) => void;
  onMessage?: (
    message: JSONRPCMessage,
    //@ts-ignore
    extra?: MessageExtraInfo,
  ) => void;
  /**
   * List of allowed origin header values for DNS rebinding protection.
   * If not specified, origin validation is disabled.
   */
  allowedOrigins?: string[];

  /**
   * Enable DNS rebinding protection (requires allowedOrigins to be configured).
   * Default is false for backwards compatibility.
   */
  enableDnsRebindingProtection?: boolean;
}

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
export class WebSocketServerTransport implements Transport {
  constructor(
    public ws: WebSocket,
    public request: IncomingMessage,
    public options: WebSocketServerTransportOptions,
  ) {
    this.ws = ws;
    this.request = request;
  }
  async start(): Promise<void> {
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
        const message = JSONRPCMessageSchema.parse(JSON.parse(data.toString()));
        this.onmessage?.(message);
        this.options.onMessage?.(message);
      });
      this.ws.on("open", () => {
        resolve();
        this.options.onOpen?.(this.ws);
      });
    });
    //@ts-ignore
  }
  async send(
    message: JSONRPCMessage,
    options?: TransportSendOptions | undefined,
  ): Promise<void> {
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
  async close(): Promise<void> {
    this.ws.close();
    this.onclose?.();
    this.options.onClose?.(this.ws);
  }
  onclose?: (() => void) | undefined;
  onerror?: ((error: Error) => void) | undefined;
  onmessage?:
    | ((message: JSONRPCMessage, extra?: MessageExtraInfo | undefined) => void)
    | undefined;
    //这里不能先设定sessionId,否则会影响初始化
  sessionId?: string | undefined 
  setProtocolVersion?: ((version: string) => void) | undefined;
}
