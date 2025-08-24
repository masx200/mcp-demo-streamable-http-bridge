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
export class WebSocketServerTransport
  extends EventEmitter
  implements Transport
{
  private wss?: WebSocketServer;
  private socket?: WebSocket;
  sessionId = uuid();
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  setProtocolVersion?: (version: string) => void;
  constructor(private readonly options: WebSocketServerTransportOptions = {}) {
    super();
  }

  /* ---------- Transport 接口实现 ---------- */

  async start(): Promise<void> {
    const { port = 3000, host = "localhost", onConnection } = this.options;
    this.wss = new WebSocketServer({ port, host, ...this.options });

    return new Promise((resolve) => {
      this.wss!.on("connection", (ws) => {
        // 只允许单个连接；如有需要可扩展为多连接会话
        this.socket = ws;

        // 透传上层回调
        onConnection?.(ws);

        // 收到消息 -> 解析 -> 调用onmessage回调
        ws.on("message", (data) => {
          let msg: JSONRPCMessage;
          try {
            msg = JSON.parse(data.toString());
          } catch {
            return; // 非法 JSON 直接忽略
          }
          this.onmessage?.(msg);
        });

        ws.on("close", () => {
          this.onclose?.();
          this.close();
        });
        ws.on("error", (err) => {
          this.onerror?.(err);
          this.emit("error", err);
        });
      });

      this.wss!.on("listening", resolve);
    });
  }

  async send(
    message: JSONRPCMessage,
    options?: TransportSendOptions
  ): Promise<void> {
    if (!this.socket || this.socket.readyState !== this.socket.OPEN) {
      throw new Error("WebSocket is not ready");
    }
    this.socket.send(JSON.stringify(message));
  }

  async close(): Promise<void> {
    this.socket?.close();
    this.wss?.close();
    this.onclose?.();
    this.emit("close");
  }
}
