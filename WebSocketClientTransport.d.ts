import type {
  Transport,
  TransportSendOptions,
} from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type JSONRPCMessage,
  type MessageExtraInfo,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocket } from "ws";
import type { ClientRequestArgs } from "http";
export type WebSocketClientOptions =
  & (WebSocket.ClientOptions | ClientRequestArgs)
  & {
    protocols?: string | string[];
    onError?: (error: Error) => void;
    onClose?: (socket: WebSocket) => void;
    onOpen?: (socket: WebSocket) => void;
    onMessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  };
/**
 * Client transport for WebSocket: this will connect to a server over the WebSocket protocol.
 */
export declare class WebSocketClientTransport implements Transport {
  url: URL;
  options?: WebSocketClientOptions | undefined;
  private _socket?;
  private _url;
  sessionId?: string | undefined;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  constructor(url: URL, options?: WebSocketClientOptions | undefined);
  start(): Promise<void>;
  close(): Promise<void>;
  send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>;
}
//# sourceMappingURL=WebSocketClientTransport.d.ts.map
