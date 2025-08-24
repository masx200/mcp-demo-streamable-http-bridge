import type {
  Transport,
  TransportSendOptions,
} from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type JSONRPCMessage,
  JSONRPCMessageSchema,
  type MessageExtraInfo,
  type RequestInfo,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import { v4 as uuid } from "uuid";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { ServerOptions } from "ws";
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
    extra?: MessageExtraInfo
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
  socket: WebSocket | undefined;
  get wss(): WebSocketServer | undefined {
    return this._wss;
  }

  // when sessionId is not set (undefined), it means the transport is in stateless mode
  private sessionIdGenerator: (() => string) | undefined;
  private _started: boolean = false;
  private _clients: Map<string, WebSocket> = new Map();
  // private _requestToClientMapping: Map<string, string> = new Map();
  private _initialized: boolean = false;
  private _wss?: WebSocketServer;
  private _onsessioninitialized?: (sessionId: string) => void | Promise<void>;
  private _onsessionclosed?: (sessionId: string) => void | Promise<void>;
  private _allowedOrigins?: string[];
  private _enableDnsRebindingProtection: boolean;
  private _onConnection?: (socket: WebSocket) => void;

  sessionId?: string = uuid();
  onclose?: () => void;
  onerror?: (error: Error) => void;
  //@ts-ignore
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  setProtocolVersion?: (version: string) => void;

  constructor(public options: WebSocketServerTransportOptions = {}) {
    const { port, host, onConnection } = options;
    this.sessionIdGenerator =
      options.sessionIdGenerator ?? (() => randomUUID());
    this._onsessioninitialized = options.onsessioninitialized;
    this._onsessionclosed = options.onsessionclosed;
    this._allowedOrigins = options.allowedOrigins;
    this._enableDnsRebindingProtection =
      options.enableDnsRebindingProtection ?? false;
    this._onConnection = onConnection;

    this._wss = new WebSocketServer({ port, host, ...options });
  }

  /**
   * Starts the transport. This is required by the Transport interface.
   */
  async start(): Promise<void> {
    console.log("starting WebSocketServerTransport");
    if (this._started) {
      throw new Error("Transport already started");
    }
    this._wss!.on("error", (error) => {
      console.error("WebSocketServerTransport error", error);
      this.options.onError?.(error);
      this.onerror?.(error);
    });
    this._wss!.on("connection", (ws, req) => {
      this.socket = ws;
      this.options?.onOpen?.(ws);
      console.log("WebSocketServerTransport connection", ws.url, req.url);
      try {
        // Validate request headers for DNS rebinding protection
        const validationError = this.validateWebSocketRequest(req);
        if (validationError) {
          ws.close(1008, validationError.message);
          this.options.onError?.(new Error(validationError.message));
          this.onerror?.(new Error(validationError.message));
          return;
        }

        const clientId = randomUUID();
        this._clients.set(clientId, ws);

        // Initialize session if this is the first connection
        if (!this._initialized && this.sessionIdGenerator) {
          this.sessionId = this.sessionIdGenerator();
          this._initialized = true;

          // If we have a session ID and an onsessioninitialized handler, call it immediately
          if (this.sessionId && this._onsessioninitialized) {
            Promise.resolve(this._onsessioninitialized(this.sessionId)).catch(
              (error) => {
                this.onerror?.(error);

                this.options.onError?.(error);
              }
            );
          }
        }

        // 透传上层回调
        this._onConnection?.(ws);

        // 收到消息 -> 解析 -> 调用onmessage回调
        ws.on("message", (data) => {
          console.log("WebSocketServerTransport message", data.toString());
          let msg: JSONRPCMessage & { sessionId: string };

          try {
            msg = Object.assign(
              JSONRPCMessageSchema.parse(JSON.parse(data.toString())),
              { sessionId: JSON.parse(data.toString()).sessionId }
            );
          } catch (err) {
            this.onerror?.(new Error(`Failed to parse message: ${err}`));
            this.options.onError?.(
              new Error(`Failed to parse message: ${err}`)
            );
            return; // 非法 JSON 直接忽略
          }

          const authInfo: AuthInfo | undefined = undefined;
          const requestInfo: RequestInfo = { headers: req.headers };
          this.options.onMessage?.(msg, {
            authInfo,
            requestInfo,
            // sessionId: msg.sessionId,
          });
          this.onmessage?.(msg, {
            authInfo,
            requestInfo,
            // sessionId: msg.sessionId,
          });
        });

        ws.on("close", () => {
          this.options.onClose?.(ws);
          this._clients.delete(clientId);
          // Clean up request mappings
          // for (const [
          //   requestId,
          //   mappedClientId,
          // ] of this._requestToClientMapping.entries()) {
          //   if (mappedClientId === clientId) {
          //     this._requestToClientMapping.delete(requestId);
          //   }
          // }
          this.close();
        });

        ws.on("error", (error) => {
          this.onerror?.(error);
          this.options.onError?.(error);
        });

        this._started = true;
      } catch (error: any) {
        this.options.onError?.(error);
        this.onerror?.(error);
      }
    });
    console.log("started WebSocketServerTransport");
  }

  /**
   * Validates WebSocket request headers for DNS rebinding protection.
   * @returns Error message if validation fails, undefined if validation passes.
   */
  public validateWebSocketRequest(req: any): Error | undefined {
    // Skip validation if protection is not enabled
    if (!this._enableDnsRebindingProtection) {
      return undefined;
    }

    // Validate Origin header if allowedOrigins is configured
    if (this._allowedOrigins && this._allowedOrigins.length > 0) {
      const originHeader = req.headers.origin;
      if (!originHeader || !this._allowedOrigins.includes(originHeader)) {
        return new Error(`Invalid Origin header: ${originHeader}`);
      }
    }

    return undefined;
  }

  /**
   * Sends a message through the WebSocket transport
   */
  async send(
    message: JSONRPCMessage & { sessionId: string },
    options?: TransportSendOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let sent = false;
      if (!this.socket) {
        reject(new Error("Not connected"));
        return;
      }
      this.socket?.send(
        JSON.stringify(
          Object.assign(message, {
            // sessionId: options?.relatedRequestId ?? this.sessionId,
          })
        )
      );
      resolve();
      if (!sent) {
        throw new Error("No connected clients available");
      }
    });
  }

  /**
   * Closes the transport and cleans up resources
   */
  async close(): Promise<void> {
    console.log("close WebSocketServerTransport", this.sessionId);
    return new Promise((resolve) => {
      // Close all client connections
      for (const client of this._clients.values()) {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }

      this._clients.clear();
      // this._requestToClientMapping.clear();

      // Close the server
      this._wss?.close(() => {
        // Call session closed callback if we have a session
        if (this.sessionId && this._onsessionclosed) {
          Promise.resolve(this._onsessionclosed(this.sessionId)).catch(
            (error) => {
              this.options.onError?.(error);
              this.onerror?.(error);
            }
          );
        }

        this._initialized = false;
        this.sessionId = undefined;
        this.onclose?.();
        //@ts-ignore
        this.options?.onClose?.(this.socket);
        resolve();
      });
    });
  }
}
