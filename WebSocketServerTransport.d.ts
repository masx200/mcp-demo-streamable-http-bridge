import type { Transport, TransportSendOptions } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage, MessageExtraInfo } from "@modelcontextprotocol/sdk/types.js";
import { EventEmitter } from "events";
import type { WebSocketServerTransportOptions } from "./WebSocketServerTransportOptions.js";
export declare class WebSocketServerTransport extends EventEmitter implements Transport {
    private readonly options;
    private wss?;
    private socket?;
    sessionId: string;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
    setProtocolVersion?: (version: string) => void;
    constructor(options?: WebSocketServerTransportOptions);
    start(): Promise<void>;
    send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=WebSocketServerTransport.d.ts.map