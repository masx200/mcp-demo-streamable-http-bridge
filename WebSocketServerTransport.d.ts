import type { Transport, TransportSendOptions } from "@modelcontextprotocol/sdk/shared/transport.js";
import { type JSONRPCMessage, type MessageExtraInfo } from "@modelcontextprotocol/sdk/types.js";
import { WebSocket } from "ws";
import type { ServerOptions } from "ws";
import type { IncomingMessage } from "node:http";
export interface WebSocketServerTransportOptions extends ServerOptions {
    sessionIdGenerator?: (() => string) | undefined;
    onsessioninitialized?: (sessionId: string) => void | Promise<void>;
    onsessionclosed?: (sessionId: string) => void | Promise<void>;
    port?: number;
    host?: string;
    onOpen?: (socket: WebSocket) => void;
    onConnection?: (socket: WebSocket) => void;
    onClose?: (socket: WebSocket) => void;
    onError?: (error: Error) => void;
    onMessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
    allowedOrigins?: string[];
    enableDnsRebindingProtection?: boolean;
}
export declare class WebSocketServerTransport implements Transport {
    ws: WebSocket;
    request: IncomingMessage;
    options: WebSocketServerTransportOptions;
    private started;
    constructor(ws: WebSocket, request: IncomingMessage, options: WebSocketServerTransportOptions);
    start(): Promise<void>;
    send(message: JSONRPCMessage, options?: TransportSendOptions | undefined): Promise<void>;
    close(): Promise<void>;
    onclose?: (() => void) | undefined;
    onerror?: ((error: Error) => void) | undefined;
    onmessage?: ((message: JSONRPCMessage, extra?: MessageExtraInfo | undefined) => void) | undefined;
    sessionId?: string | undefined;
    setProtocolVersion?: ((version: string) => void) | undefined;
}
//# sourceMappingURL=WebSocketServerTransport.d.ts.map