import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { WebSocketClientTransport } from "./WebSocketClientTransport.js";
import { WebSocket } from "ws";
export function selectTransport(serverConfig) {
    if (serverConfig.command ||
        serverConfig.type == "stdio" ||
        serverConfig.transport == "stdio") {
        if (!serverConfig.command) {
            throw new Error("command is required for stdio transport");
        }
        const command = serverConfig.command;
        const isWindows = process.platform === "win32";
        const commandExtension = isWindows ? ".exe" : "";
        const fullCommand = command.endsWith(commandExtension)
            ? command
            : command + commandExtension;
        console.log(`[selectTransport] Creating stdio transport for command: ${fullCommand}`);
        return new StdioClientTransport({
            command: serverConfig.command,
            args: serverConfig.args,
            cwd: serverConfig.cwd || process.env.BRIDGE_API_PWD || process.cwd(),
            env: Object.assign({}, serverConfig.env, process.env),
        });
    }
    if (serverConfig.url &&
        (serverConfig.type == "sse" || serverConfig.transport == "sse")) {
        return new SSEClientTransport(new URL(serverConfig.url), {
            requestInit: { headers: serverConfig.headers },
        });
    }
    if (serverConfig.sseUrl ||
        serverConfig.type == "sse" ||
        serverConfig.transport == "sse") {
        if (!serverConfig.sseUrl) {
            throw new Error("sseUrl is required for sse transport");
        }
        return new SSEClientTransport(new URL(serverConfig.sseUrl), {
            requestInit: { headers: serverConfig.headers },
        });
    }
    if (serverConfig.url &&
        (serverConfig.type == "ws" || serverConfig.transport == "ws")) {
        return createWebSocketClientTransport(serverConfig);
    }
    if (serverConfig.wsUrl ||
        serverConfig.type == "ws" ||
        serverConfig.transport == "ws") {
        if (!serverConfig.wsUrl) {
            throw new Error("wsUrl is required for ws transport");
        }
        return createWebSocketClientTransport(serverConfig);
    }
    if (serverConfig.url &&
        (serverConfig.type == "http" || serverConfig.transport == "http")) {
        return new StreamableHTTPClientTransport(new URL(serverConfig.url), {
            requestInit: { headers: serverConfig.headers },
        });
    }
    const httpUrl = serverConfig.httpUrl || serverConfig.url;
    if (httpUrl) {
        return new StreamableHTTPClientTransport(new URL(httpUrl), {
            requestInit: { headers: serverConfig.headers },
        });
    }
    if (serverConfig.transport) {
        switch (serverConfig.transport.toLowerCase()) {
            case "stdio":
                if (serverConfig.command) {
                    return new StdioClientTransport({
                        command: serverConfig.command,
                        args: serverConfig.args,
                        cwd: serverConfig.cwd || process.env.BRIDGE_API_PWD || process.cwd(),
                        env: Object.assign({}, serverConfig.env, process.env),
                    });
                }
                break;
            case "sse":
                if (serverConfig.sseUrl) {
                    return new SSEClientTransport(new URL(serverConfig.sseUrl), {
                        requestInit: { headers: serverConfig.headers },
                    });
                }
                break;
            case "ws":
                if (serverConfig.wsUrl) {
                    return createWebSocketClientTransport(serverConfig);
                }
            case "http":
                const url = serverConfig.httpUrl || serverConfig.url;
                if (url) {
                    return new StreamableHTTPClientTransport(new URL(url), {
                        requestInit: { headers: serverConfig.headers },
                    });
                }
                break;
        }
    }
    return null;
}
export function createWebSocketClientTransport(serverConfig) {
    return new WebSocketClientTransport(new URL(String(serverConfig.url ?? serverConfig.wsUrl)), {
        headers: serverConfig.headers,
        protocols: serverConfig.protocols,
        onError: (error) => {
            console.error("WebSocketClientTransport error", error);
        },
        onClose: (socket) => {
            console.log("WebSocketClientTransport closed", socket.url);
        },
        onOpen: (socket) => {
            console.log("WebSocketClientTransport opened", socket.url);
        },
        onMessage: (message) => {
            console.log("WebSocketClientTransport message", JSON.stringify(message, null, 4));
        },
    });
}
//# sourceMappingURL=selectTransport.js.map