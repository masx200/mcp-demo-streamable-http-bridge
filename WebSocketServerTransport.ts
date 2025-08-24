// websocket-transport.ts
// websocket-transport.ts
import type {
  Transport,
  TransportSendOptions,
} from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  JSONRPCMessage,
  MessageExtraInfo,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocket, WebSocketServer } from "ws";
import { EventEmitter } from "events";
import type { WebSocketServerTransportOptions } from "./WebSocketServerTransportOptions.js";
import { v4 as uuid } from "uuid";
export class WebSocketServerTransport extends EventEmitter
  implements Transport {
  private clients: Map<string, WebSocket> = new Map();
  private wss?: WebSocketServer;
  private socket?: WebSocket;
  sessionId = uuid();
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  setProtocolVersion?: (version: string) => void;
  onConnection: ((socket: WebSocket) => void) | undefined;
  constructor(public readonly options: WebSocketServerTransportOptions = {}) {
    super();
    const { port = 3000, host = "localhost", onConnection } = options;
    this.wss = new WebSocketServer({ port, host, ...options });
    this.onConnection = onConnection;
  }
  onconnection?: (clientId: string) => void;
  /* ---------- Transport 接口实现 ---------- */
  ondisconnection?: (clientId: string) => void;
  async start(): Promise<void> {
    this.wss!.on("connection", (ws) => {
      // 只允许单个连接；如有需要可扩展为多连接会话
      this.socket = ws;
      const clientId = uuid();
      this.clients.set(clientId, ws);
      this.onconnection?.(clientId);
      // 透传上层回调
      this.onConnection?.(ws);

      // 收到消息 -> 解析 -> 调用onmessage回调
      ws.on("message", (data) => {
        let msg: JSONRPCMessage;
        try {
          msg = JSON.parse(data.toString());
        } catch (err) {
          this.onerror?.(new Error(`Failed to parse message: ${err}`));
          return; // 非法 JSON 直接忽略
        }
        this.onmessage?.(msg);
      });

      ws.on("close", () => {
        this.ondisconnection?.(clientId);
        this.clients.delete(clientId);
        this.onclose?.();
        this.close();
      });
      ws.on("error", (err) => {
        this.onerror?.(err);
        this.emit("error", err);
      });
    });
  }

  async send(
    message: JSONRPCMessage,
    options?: TransportSendOptions,
  ): Promise<void> {
    const clientId = options?.relatedRequestId;

    if (clientId) {
      const client = this.clients.get(String(clientId));
      if (client) {
        if (client?.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        } else {
          this.clients.delete(String(clientId));
          this.ondisconnection?.(String(clientId));
        }
      }
    } else {
      if (!this.socket || this.socket.readyState !== this.socket.OPEN) {
        throw new Error("WebSocket is not ready");
      }
      this.socket.send(JSON.stringify(message));
    }
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.socket?.close();
      this.wss?.close(() => {
        this.clients.clear();
        resolve();
      });
      this.onclose?.();
      this.emit("close");
    });
  }
}
