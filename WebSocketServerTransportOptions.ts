// websocket-transport.ts
import { WebSocket } from "ws";
export interface WebSocketServerTransportOptions {
  /** 监听端口，默认 3000 */
  port?: number;
  /** 监听 host，默认 'localhost' */
  host?: string;
  /** 连接建立后的额外回调 */
  onConnection?: (socket: WebSocket) => void;
}
