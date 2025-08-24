import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { type JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { ClientRequestArgs } from "http";
import { WebSocket } from "ws";
/**
 * Client transport for WebSocket: this will connect to a server over the WebSocket protocol.
 */
export declare class WebSocketClientTransport implements Transport {
    url: URL;
    options?: ((WebSocket.ClientOptions | ClientRequestArgs) & {
        protocols?: string | string[];
    }) | undefined;
    private _socket?;
    private _url;
    sessionId: string;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;
    constructor(url: URL, options?: ((WebSocket.ClientOptions | ClientRequestArgs) & {
        protocols?: string | string[];
    }) | undefined);
    start(): Promise<void>;
    close(): Promise<void>;
    send(message: JSONRPCMessage): Promise<void>;
}
//# sourceMappingURL=WebSocketClientTransport.d.ts.map