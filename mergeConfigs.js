import { DEFAULT_CONFIG } from "./bridge-streamable-ts.js";
// 合并配置
export function mergeConfigs(cliConfig, fileConfig, envConfig) {
    const mergedMcpServers = {
        ...DEFAULT_CONFIG.mcpServers,
        ...fileConfig.mcpServers,
        ...envConfig.mcpServers,
    };
    const cliSseConfig = cliConfig?.sseServer;
    return {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        ...cliConfig,
        ...envConfig,
        port: envConfig.port ||
            cliConfig.port ||
            fileConfig.port ||
            DEFAULT_CONFIG.port,
        host: envConfig.host ||
            cliConfig.host ||
            fileConfig.host ||
            DEFAULT_CONFIG.host,
        hotReload: envConfig.hotReload ||
            cliConfig.hotReload ||
            fileConfig.hotReload ||
            DEFAULT_CONFIG.hotReload,
        pathPrefix: envConfig.pathPrefix ||
            cliConfig.pathPrefix ||
            fileConfig.pathPrefix ||
            DEFAULT_CONFIG.pathPrefix,
        corsAllowOrigins: envConfig.corsAllowOrigins ||
            cliConfig.corsAllowOrigins ||
            fileConfig.corsAllowOrigins ||
            DEFAULT_CONFIG.corsAllowOrigins,
        config: envConfig.config ||
            cliConfig.config ||
            fileConfig.config ||
            DEFAULT_CONFIG.config,
        version: envConfig.version ||
            cliConfig.version ||
            fileConfig.version ||
            DEFAULT_CONFIG.version,
        apiKey: envConfig.apiKey ||
            cliConfig.apiKey ||
            fileConfig.apiKey ||
            DEFAULT_CONFIG.apiKey,
        mcpServers: mergedMcpServers,
        sseServer: Object.assign({}, cliSseConfig, fileConfig.sseServer),
    };
}
//# sourceMappingURL=mergeConfigs.js.map