import { JSONRPCMessageSchema, } from "@modelcontextprotocol/sdk/types.js";
import { WebSocket } from "ws";
const SUBPROTOCOL = "mcp";
export class WebSocketClientTransport {
    url;
    options;
    _socket;
    _url;
    sessionId;
    onclose;
    onerror;
    onmessage;
    constructor(url, options) {
        this.url = url;
        this.options = options;
        this._url = url;
    }
    async start() {
        if (this._socket) {
            throw new Error("WebSocketClientTransport already started! If using Client class, note that connect() calls start() automatically.");
        }
        return new Promise((resolve, reject) => {
            this._socket = new WebSocket(this._url, this.options?.protocols ?? SUBPROTOCOL, this.options);
            this._socket.onerror = (event) => {
                const error = "error" in event
                    ? event.error
                    : new Error(`WebSocket error: ${JSON.stringify(event)}`);
                reject(error);
                this.onerror?.(error);
                this.options?.onError?.(error);
            };
            this._socket.onopen = () => {
                this.options?.onOpen?.(this._socket);
                resolve();
            };
            this._socket.onclose = () => {
                this.onclose?.();
                this.options?.onClose?.(this._socket);
            };
            this._socket.onmessage = (event) => {
                console.log("WebSocketClientTransport message", event.data.toString());
                try {
                    if (typeof event.data !== "string") {
                        throw new Error("WebSocket message must be a string");
                    }
                }
                catch (error) {
                    this.onerror?.(error);
                    this.options?.onError?.(error);
                    return;
                }
                let message;
                try {
                    message = Object.assign(JSONRPCMessageSchema.parse(JSON.parse(event.data)));
                }
                catch (error) {
                    console.error("WebSocketClientTransport message error", error);
                    this.onerror?.(error);
                    this.options?.onError?.(error);
                    return;
                }
                this.options?.onMessage?.(message, {
                    requestInfo: { headers: this.options?.headers ?? {} },
                });
                this.onmessage?.(message, {
                    requestInfo: { headers: this.options?.headers ?? {} },
                });
            };
        });
    }
    async close() {
        this._socket?.close();
    }
    send(message, options) {
        console.log("send WebSocketClientTransport", JSON.stringify(message, null, 4));
        return new Promise((resolve, reject) => {
            if (!this._socket) {
                reject(new Error("Not connected"));
                return;
            }
            if (this._socket.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket is not open"));
                return;
            }
            this._socket?.send(JSON.stringify(Object.assign(message, {})));
            console.log("send WebSocketClientTransport", JSON.stringify(message, null, 4));
            resolve();
        });
    }
}
//# sourceMappingURL=WebSocketClientTransport.js.map