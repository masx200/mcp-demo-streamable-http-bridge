import type { Transport, TransportSendOptions } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage, MessageExtraInfo } from "@modelcontextprotocol/sdk/types.js";
import { WebSocket } from "ws";
import { EventEmitter } from "events";
import type { WebSocketServerTransportOptions } from "./WebSocketServerTransportOptions.js";
export declare class WebSocketServerTransport extends EventEmitter implements Transport {
    readonly options: WebSocketServerTransportOptions;
    private clients;
    private wss?;
    private socket?;
    sessionId: string;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
    setProtocolVersion?: (version: string) => void;
    onConnection: ((socket: WebSocket) => void) | undefined;
    constructor(options?: WebSocketServerTransportOptions);
    onconnection?: (clientId: string) => void;
    ondisconnection?: (clientId: string) => void;
    start(): Promise<void>;
    send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=WebSocketServerTransport.d.ts.map