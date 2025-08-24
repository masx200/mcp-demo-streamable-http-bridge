import yargs from "yargs";
import { hideBin } from "yargs/helpers";
// 解析命令行参数
export function parseCommandLineArgs() {
  const argv = yargs(hideBin(process.argv))
    .version(false)
    .option("hot-reload", {
      type: "boolean",
      description: "Enable hot reload for configuration changes",
    })
    .option("version", {
      type: "boolean",
      description: "Show version information",
    })
    .alias("version", "v")
    .option("config", {
      type: "string",
      description: "Path to configuration file",
    })
    .option("api-key", {
      type: "string",
      description: "API key for authentication",
    })
    .option("port", {
      type: "number",
      description: "Port to listen on",
    })
    .option("host", {
      type: "string",
      description: "Host to bind to",
    })
    .option("cors-allow-origins", {
      type: "array",
      description: "CORS allowed origins",
    })
    .option("path-prefix", {
      type: "string",
      description: "URL path prefix for MCP endpoints",
    })
    .option("sse-server-enabled", {
      type: "boolean",
      description: "Enable SSE server mode",
    })
    .option("ws-server-enabled", {
      type: "boolean",
      description: "Enable WS server mode",
    })
    .option("ws-path-prefix", {
      type: "string",
      description: "WS server path prefix  (default: /ws)",
    })
    .option("http-server-enabled", {
      type: "boolean",
      description: "Enable http server mode",
    })
    .option("sse-endpoint", {
      type: "string",
      description: "SSE server endpoint path (default: /sse)",
    })
    .option("sse-message-endpoint", {
      type: "string",
      description: "SSE server message endpoint path (default: /messages)",
    })
    .help()
    .alias("help", "h")
    .parseSync();
  return {
    sseServer: {
      enabled: argv.sseServerEnabled,
      endpoint: argv.sseEndpoint,
      messageEndpoint: argv.sseMessageEndpoint,
    },
    enableHttpServer: argv.httpServerEnabled,
    wsServer: {
      enabled: argv.wsServerEnabled,
      pathPrefix: argv.wsPathPrefix,
    },
    config: argv.config,
    hotReload: argv.hotReload,
    version: argv.version,
    apiKey: argv.apiKey,
    port: argv.port,
    host: argv.host,
    corsAllowOrigins: argv.corsAllowOrigins,
    pathPrefix: argv.pathPrefix,
    mcpServers: {},
  };
}
//# sourceMappingURL=parseCommandLineArgs.js.map
