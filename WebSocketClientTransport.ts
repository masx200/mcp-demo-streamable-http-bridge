import type {
  Transport,
  TransportSendOptions,
} from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type JSONRPCMessage,
  JSONRPCMessageSchema,
  type MessageExtraInfo,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocket } from "ws";
import type { ClientRequestArgs } from "http";
const SUBPROTOCOL = "mcp";
export type WebSocketClientOptions =
  & (
    | WebSocket.ClientOptions
    | ClientRequestArgs
  )
  & {
    protocols?: string | string[];
    onError?: (error: Error) => void;
    onClose?: (socket: WebSocket) => void;
    onOpen?: (socket: WebSocket) => void;
    onMessage?: (
      message: JSONRPCMessage,
      //@ts-ignore
      extra?: MessageExtraInfo,
    ) => void;
  };

/**
 * Client transport for WebSocket: this will connect to a server over the WebSocket protocol.
 */
export class WebSocketClientTransport implements Transport {
  private _socket?: WebSocket;
  private _url: URL;
  //这里不能先设定sessionId,否则会影响初始化
  sessionId?: string | undefined;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  //@ts-ignore
  onmessage?: (
    message: JSONRPCMessage,
    //@ts-ignore
    extra?: MessageExtraInfo,
  ) => void;

  constructor(public url: URL, public options?: WebSocketClientOptions) {
    this._url = url;
  }

  async start(): Promise<void> {
    if (this._socket) {
      throw new Error(
        "WebSocketClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    }

    return new Promise((resolve, reject) => {
      this._socket = new WebSocket(
        this._url,
        this.options?.protocols ?? SUBPROTOCOL,
        this.options,
      );

      this._socket.onerror = (event: WebSocket.ErrorEvent) => {
        const error = "error" in event
          ? (event.error as Error)
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

      this._socket.onmessage = (event: WebSocket.MessageEvent) => {
        console.log("WebSocketClientTransport message", event.data.toString());
        try {
          if (typeof event.data !== "string") {
            throw new Error("WebSocket message must be a string");
          }
        } catch (error: any) {
          this.onerror?.(error as Error);
          this.options?.onError?.(error);
          return;
        }

        let message: JSONRPCMessage;
        try {
          message = Object.assign(
            JSONRPCMessageSchema.parse(JSON.parse(event.data)),
            // { sessionId: JSON.parse(event.data).sessionId }
          );

          // if (
          //   message?.sessionId !== undefined &&
          //   message?.sessionId !== this.sessionId
          // ) {
          //   this.sessionId = message.sessionId;
          // }
        } catch (error: any) {
          console.error("WebSocketClientTransport message error", error);
          this.onerror?.(error as Error);
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

  async close(): Promise<void> {
    this._socket?.close();
  }

  send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    console.log(
      "send WebSocketClientTransport",
      JSON.stringify(message, null, 4),
    );
    return new Promise((resolve, reject) => {
      if (!this._socket) {
        reject(new Error("Not connected"));
        return;
      }
      if (this._socket.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not open"));
        return;
      }
      this._socket?.send(
        JSON.stringify(
          Object.assign(message, {
            // sessionId: options?.relatedRequestId ?? this.sessionId,
          }),
        ),
      );
      console.log(
        "send WebSocketClientTransport",
        JSON.stringify(message, null, 4),
      );
      resolve();
    });
  }
}
