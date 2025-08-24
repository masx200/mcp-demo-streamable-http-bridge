import { JSONRPCMessageSchema, } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
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
    options;
    get wss() {
        return this._wss;
    }
    // when sessionId is not set (undefined), it means the transport is in stateless mode
    sessionIdGenerator;
    _started = false;
    _clients = new Map();
    _requestToClientMapping = new Map();
    _initialized = false;
    _wss;
    _onsessioninitialized;
    _onsessionclosed;
    _allowedOrigins;
    _enableDnsRebindingProtection;
    _onConnection;
    sessionId;
    onclose;
    onerror;
    //@ts-ignore
    onmessage;
    setProtocolVersion;
    constructor(options = {}) {
        this.options = options;
        const { port = 3000, host = "localhost", onConnection } = options;
        this.sessionIdGenerator = options.sessionIdGenerator ??
            (() => randomUUID());
        this._onsessioninitialized = options.onsessioninitialized;
        this._onsessionclosed = options.onsessionclosed;
        this._allowedOrigins = options.allowedOrigins;
        this._enableDnsRebindingProtection = options.enableDnsRebindingProtection ??
            false;
        this._onConnection = onConnection;
        this._wss = new WebSocketServer({ port, host, ...options });
    }
    /**
     * Starts the transport. This is required by the Transport interface.
     */
    async start() {
        if (this._started) {
            throw new Error("Transport already started");
        }
        this._wss.on("connection", (ws, req) => {
            // Validate request headers for DNS rebinding protection
            const validationError = this.validateWebSocketRequest(req);
            if (validationError) {
                ws.close(1008, validationError);
                this.onerror?.(new Error(validationError));
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
                    Promise.resolve(this._onsessioninitialized(this.sessionId)).catch((error) => {
                        this.onerror?.(error);
                    });
                }
            }
            // 透传上层回调
            this._onConnection?.(ws);
            // 收到消息 -> 解析 -> 调用onmessage回调
            ws.on("message", (data) => {
                let msg;
                try {
                    msg = Object.assign(JSONRPCMessageSchema.parse(JSON.parse(data.toString())), { sessionId: JSON.parse(data.toString()).sessionId });
                }
                catch (err) {
                    this.onerror?.(new Error(`Failed to parse message: ${err}`));
                    return; // 非法 JSON 直接忽略
                }
                const authInfo = undefined;
                const requestInfo = { headers: req.headers };
                this.onmessage?.(msg, {
                    authInfo,
                    requestInfo,
                    sessionId: msg.sessionId,
                });
            });
            ws.on("close", () => {
                this._clients.delete(clientId);
                // Clean up request mappings
                for (const [requestId, mappedClientId,] of this._requestToClientMapping.entries()) {
                    if (mappedClientId === clientId) {
                        this._requestToClientMapping.delete(requestId);
                    }
                }
            });
            ws.on("error", (err) => {
                this.onerror?.(err);
            });
        });
        this._started = true;
    }
    /**
     * Validates WebSocket request headers for DNS rebinding protection.
     * @returns Error message if validation fails, undefined if validation passes.
     */
    validateWebSocketRequest(req) {
        // Skip validation if protection is not enabled
        if (!this._enableDnsRebindingProtection) {
            return undefined;
        }
        // Validate Origin header if allowedOrigins is configured
        if (this._allowedOrigins && this._allowedOrigins.length > 0) {
            const originHeader = req.headers.origin;
            if (!originHeader || !this._allowedOrigins.includes(originHeader)) {
                return `Invalid Origin header: ${originHeader}`;
            }
        }
        return undefined;
    }
    /**
     * Sends a message through the WebSocket transport
     */
    async send(message, options) {
        const clientId = options?.relatedRequestId;
        if (clientId) {
            // Send to specific client
            const client = this._clients.get(String(clientId));
            if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
                // Track request-to-client mapping for response routing
                if ("sessionId" in message && message.sessionId !== undefined) {
                    this._requestToClientMapping.set(String(message.sessionId), String(clientId));
                }
            }
            else {
                // Client disconnected, clean up
                this._clients.delete(String(clientId));
                for (const [requestId, mappedClientId,] of this._requestToClientMapping.entries()) {
                    if (mappedClientId === String(clientId)) {
                        this._requestToClientMapping.delete(requestId);
                    }
                }
                throw new Error(`Client ${clientId} is not connected`);
            }
        }
        else {
            // Broadcast to all connected clients
            let sent = false;
            for (const [clientId, client] of this._clients.entries()) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(Object.assign(message, { sessionId: clientId ?? this.sessionId })));
                    sent = true;
                    // Track request-to-client mapping for response routing
                    if ("sessionId" in message && message.sessionId !== undefined) {
                        this._requestToClientMapping.set(String(message.sessionId), clientId);
                    }
                }
            }
            if (!sent) {
                throw new Error("No connected clients available");
            }
        }
    }
    /**
     * Closes the transport and cleans up resources
     */
    async close() {
        return new Promise((resolve) => {
            // Close all client connections
            for (const client of this._clients.values()) {
                if (client.readyState === WebSocket.OPEN) {
                    client.close();
                }
            }
            this._clients.clear();
            this._requestToClientMapping.clear();
            // Close the server
            this._wss?.close(() => {
                // Call session closed callback if we have a session
                if (this.sessionId && this._onsessionclosed) {
                    Promise.resolve(this._onsessionclosed(this.sessionId)).catch((error) => {
                        this.onerror?.(error);
                    });
                }
                this._initialized = false;
                this.sessionId = undefined;
                this.onclose?.();
                resolve();
            });
        });
    }
}
//# sourceMappingURL=WebSocketServerTransport.js.map