import type {
  Transport,
  TransportSendOptions,
} from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type JSONRPCMessage,
  JSONRPCMessageSchema,
  type MessageExtraInfo,
} from "@modelcontextprotocol/sdk/types.js";
import type { ClientRequestArgs } from "http";
import { v4 as uuid } from "uuid";
import { WebSocket } from "ws";
const SUBPROTOCOL = "mcp";

/**
 * Client transport for WebSocket: this will connect to a server over the WebSocket protocol.
 */
export class WebSocketClientTransport implements Transport {
  private _socket?: WebSocket;
  private _url: URL;
  sessionId = uuid();
  onclose?: () => void;
  onerror?: (error: Error) => void;
  //@ts-ignore
  onmessage?: (
    message: JSONRPCMessage,
    //@ts-ignore
    extra?: MessageExtraInfo & { sessionId: string },
  ) => void;

  constructor(
    public url: URL,
    public options?: (WebSocket.ClientOptions | ClientRequestArgs) & {
      protocols?: string | string[];
    },
  ) {
    this._url = url;
  }

  start(): Promise<void> {
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
      };

      this._socket.onopen = () => {
        resolve();
      };

      this._socket.onclose = () => {
        this.onclose?.();
      };

      this._socket.onmessage = (event: WebSocket.MessageEvent) => {
        try {
          if (typeof event.data !== "string") {
            throw new Error("WebSocket message must be a string");
          }
        } catch (error) {
          this.onerror?.(error as Error);
          return;
        }

        let message: JSONRPCMessage & { sessionId: string };
        try {
          message = Object.assign(
            JSONRPCMessageSchema.parse(JSON.parse(event.data)),
            { sessionId: JSON.parse(event.data).sessionId },
          );
          if (
            message?.sessionId !== undefined &&
            message?.sessionId !== this.sessionId
          ) {
            this.sessionId = message.sessionId;
          }
        } catch (error) {
          this.onerror?.(error as Error);
          return;
        }

        this.onmessage?.(message, {
          sessionId: message.sessionId,
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
    return new Promise((resolve, reject) => {
      if (!this._socket) {
        reject(new Error("Not connected"));
        return;
      }

      this._socket?.send(
        JSON.stringify(
          Object.assign(message, {
            sessionId: options?.relatedRequestId ?? this.sessionId,
          }),
        ),
      );
      resolve();
    });
  }
}
