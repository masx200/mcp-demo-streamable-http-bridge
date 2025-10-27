# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) bridge server that converts stdio-based MCP servers to multiple HTTP-based transport protocols. The project demonstrates how to bridge MCP protocol communications from local stdio processes to accessible HTTP endpoints.

## Architecture

### Dual Version Implementation
- **TypeScript Version** (`main.ts`) - Enhanced multi-server architecture (recommended)


### Supported Transport Protocols
- **Stdio Transport**: Direct process communication with MCP servers
- **HTTP/Streamable HTTP**: RESTful JSON-RPC over HTTP
- **SSE (Server-Sent Events)**: Real-time server push with client messaging
- **WebSocket**: Bidirectional real-time communication

### Configuration Priority System
1. Command-line arguments (highest priority)
2. Environment variables
3. JSON configuration file (`settings.json`)
4. Default fallback values

## Development Commands

### Building and Running
```bash
# Primary development workflow (TypeScript)
yarn run dev          # Development mode with hot reload and file watching
yarn run start        # Build and run the TypeScript version
yarn run build        # Compile TypeScript to JavaScript

# Direct execution
yarn run dev:ts       # Run TypeScript directly with ts-node
yarn run start:bridge # Run the JavaScript version

# JavaScript version (legacy)
yarn run start:bridge # Run the compiled JavaScript version
```

### Development Environment Setup
```bash
# Install dependencies
yarn install

# Development mode (watch + hot reload)
yarn run dev

# Build for production
yarn run build
```

## Configuration

### Main Configuration File (`settings.json`)
The primary configuration supports multiple MCP servers with different transport protocols:

```json
{
  "sseServer": {
    "enabled": true,
    "endpoint": "/sse",
    "messageEndpoint": "/messages"
  },
  "enableHttpServer": true,
  "wsServer": {
    "enabled": true,
    "pathPrefix": "/ws"
  },
  "pathPrefix": "/mcp",
  "hotReload": true,
  "apiKey": "",
  "port": 3000,
  "host": "0.0.0.0",
  "corsAllowOrigins": ["*"],
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "time": {
      "command": "uvx",
      "args": ["mcp-server-time", "--local-timezone=America/New_York"]
    }
  }
}
```

### Transport Protocol Configuration

#### Stdio Transport
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"],
  "cwd": "/path/to/workdir",
  "env": {
    "MEMORY_FILE_PATH": "/path/to/custom/memory.json"
  },
  "transport": "stdio"
}
```

#### SSE Client Mode
```json
{
  "sseUrl": "http://localhost:8080/sse",
  "headers": {
    "Authorization": "Bearer your-token",
    "Content-Type": "application/json"
  },
  "transport": "sse"
}
```

#### WebSocket Client Mode
```json
{
  "wsUrl": "ws://localhost:8080/ws",
  "headers": {
    "Authorization": "Bearer your-token",
    "User-Agent": "mcp-client/1.0"
  },
  "transport": "ws"
}
```

#### HTTP/Streamable-HTTP Mode
```json
{
  "url": "http://localhost:8080/mcp",
  "headers": {
    "Authorization": "Bearer your-token",
    "Content-Type": "application/json"
  },
  "transport": "http"
}
```

### Command Line Options
```bash
--hot-reload                 # Enable configuration file hot reload
--config <path>             # Specify configuration file path (default: settings.json)
--api-key <key>             # Set API authentication key
--port <port>               # Set listening port (default: 3000)
--host <host>               # Set binding host (default: localhost)
--cors-allow-origins <urls> # Set CORS allowed origins (can be used multiple times)
--path-prefix <path>        # Set URL path prefix (default: /mcp)
--sse-server-enabled        # Enable SSE server mode
--sse-endpoint <path>       # SSE server endpoint path (default: /sse)
--sse-message-endpoint <path> # SSE server message endpoint path (default: /messages)
```

### Environment Variables
- `BRIDGE_STREAMABLE_HTTP_PATH` - Override pathPrefix
- `BRIDGE_API_TOKEN` - Override apiKey
- `BRIDGE_API_PORT` - Override port
- `BRIDGE_API_PWD` - Set working directory for stdio processes

## Key Implementation Files

### Core Architecture
- `main.ts` - Main enhanced TypeScript server (23,717 lines)

- `createMcpServer.ts` - MCP server factory implementation
- `selectTransport.ts` - Protocol selection logic
- `authenticateToken.ts` - JWT/Bearer token authentication

### Transport Implementations
- `WebSocketClientTransport.ts` - WebSocket client implementation
- `WebSocketServerTransport.ts` - WebSocket server implementation

### Configuration and Utilities
- `parseCommandLineArgs.ts` - CLI argument parsing
- `mergeConfigs.ts` - Configuration merging utilities

## Important Architecture Patterns

### Multi-Server Support
The TypeScript version supports running multiple MCP servers simultaneously, with each server accessible via different transport protocols. Each server maintains its own session management and transport lifecycle.

### Session Management
- Multi-session support with automatic cleanup
- Session isolation between different MCP servers
- Transport-specific session handling

### Transport Selection Logic
The `selectTransport` function automatically chooses the appropriate transport protocol based on configuration:
1. Stdio when `command` is specified
2. SSE when `sseUrl` is specified
3. WebSocket when `wsUrl` is specified
4. HTTP when `httpUrl` is specified

### Hot Reload Configuration
When enabled, the server monitors configuration file changes and automatically:
- Reloads the configuration
- Restarts affected MCP servers
- Maintains existing connections where possible

## Security Features

### Authentication
- Bearer token authentication via `apiKey` configuration
- CORS configuration with allowed origins
- Input validation for all parameters

### Production Deployment
- Docker support via `dockerfile`
- Health monitoring and session tracking
- Performance optimizations with connection pooling

## Testing and Development

### MCP Server Testing
The project includes example MCP servers in the default configuration:
- **memory server** (`@modelcontextprotocol/server-memory`) - Memory storage operations
- **time server** (`mcp-server-time`) - Time zone operations

### Integration Testing
Use the provided endpoint URLs to test different transport protocols:
- HTTP: `http://localhost:3000/mcp/{server-name}`
- WebSocket: `http://localhost:3000/ws/{server-name}`
- SSE: `http://localhost:3000/sse/{server-name}`

## Common Issues and Solutions

### Port Conflicts
If port 3000 is in use, change it via:
- Command line: `--port 8080`
- Configuration: `"port": 8080`
- Environment: `BRIDGE_API_PORT=8080`

### MCP Server Failures
Check that:
- The MCP server command exists and is accessible
- Required environment variables are set
- File paths in `cwd` are correct

### CORS Issues
Configure allowed origins in `corsAllowOrigins` or use `--cors-allow-origins` command line option.

### Connection Problems
Verify:
- Host binding (use `0.0.0.0` for external access)
- Firewall settings
- API token authentication if enabled