import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import type { Config } from "./bridge-streamable-ts.js";

// 解析命令行参数
export function parseCommandLineArgs(): Config {
  const argv = yargs(hideBin(process.argv))
    .version(false)
    .option("hot-reload", {
      type: "boolean",
      description: "Enable hot reload for configuration changes",
    })
    .option("version", {
      type: "boolean",
      description: "Show version information",
    }).alias("version", "v")
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

    config: argv.config,
    hotReload: argv.hotReload,
    version: argv.version,
    apiKey: argv.apiKey,
    port: argv.port,
    host: argv.host,
    corsAllowOrigins: argv.corsAllowOrigins as string[] | undefined,
    pathPrefix: argv.pathPrefix,
    mcpServers: {},
  } satisfies Config;
}
