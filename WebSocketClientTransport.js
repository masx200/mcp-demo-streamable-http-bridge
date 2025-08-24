import { JSONRPCMessageSchema, } from "@modelcontextprotocol/sdk/types.js";
import { v4 as uuid } from "uuid";
import { WebSocket } from "ws";
const SUBPROTOCOL = "mcp";
/**
 * Client transport for WebSocket: this will connect to a server over the WebSocket protocol.
 */
export class WebSocketClientTransport {
    url;
    options;
    _socket;
    _url;
    sessionId = uuid();
    onclose;
    onerror;
    //@ts-ignore
    onmessage;
    constructor(url, options) {
        this.url = url;
        this.options = options;
        this._url = url;
    }
    start() {
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
                //@ts-ignore
                this.options?.onOpen?.(this._socket);
                resolve();
            };
            this._socket.onclose = () => {
                this.onclose?.();
                //@ts-ignore
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
                    // if (
                    //   message?.sessionId !== undefined &&
                    //   message?.sessionId !== this.sessionId
                    // ) {
                    //   this.sessionId = message.sessionId;
                    // }
                }
                catch (error) {
                    this.onerror?.(error);
                    this.options?.onError?.(error);
                    return;
                }
                this.options?.onMessage?.(message, {
                    // sessionId: message.sessionId,
                    //@ts-ignore
                    requestInfo: { headers: this.options?.headers ?? {} },
                });
                this.onmessage?.(message, {
                    // sessionId: message.sessionId,
                    //@ts-ignore
                    requestInfo: { headers: this.options?.headers ?? {} },
                });
            };
        });
    }
    async close() {
        this._socket?.close();
    }
    send(message, options) {
        return new Promise((resolve, reject) => {
            if (!this._socket) {
                reject(new Error("Not connected"));
                return;
            }
            this._socket?.send(JSON.stringify(Object.assign(message, {
            // sessionId: options?.relatedRequestId ?? this.sessionId,
            })));
            resolve();
        });
    }
}
//# sourceMappingURL=WebSocketClientTransport.js.map