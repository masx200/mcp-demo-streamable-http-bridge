import type {
  Transport,
  TransportSendOptions,
} from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type JSONRPCMessage,
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
  onMessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
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
export declare class WebSocketServerTransport implements Transport {
  ws: WebSocket;
  request: IncomingMessage;
  options: WebSocketServerTransportOptions;
  private started;
  constructor(
    ws: WebSocket,
    request: IncomingMessage,
    options: WebSocketServerTransportOptions,
  );
  start(): Promise<void>;
  send(
    message: JSONRPCMessage,
    options?: TransportSendOptions | undefined,
  ): Promise<void>;
  close(): Promise<void>;
  onclose?: (() => void) | undefined;
  onerror?: ((error: Error) => void) | undefined;
  onmessage?:
    | ((message: JSONRPCMessage, extra?: MessageExtraInfo | undefined) => void)
    | undefined;
  sessionId?: string | undefined;
  setProtocolVersion?: ((version: string) => void) | undefined;
}
//# sourceMappingURL=WebSocketServerTransport.d.ts.map
