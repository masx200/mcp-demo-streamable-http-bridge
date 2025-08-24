# mcp-demo-streamable-http-bridge

#### 介绍

mcp-demo-streamable-http-bridge

# mcp-demo-streamable-http-bridge

## 介绍

这是一个演示项目，用于展示如何将 stdio 协议转换为 streamable-http
协议的桥接服务器。项目包含两个版本：

- **JavaScript 版本** (`bridge-streamable.js`) - 原始版本，支持单个 MCP 服务器
- **TypeScript 版本** (`bridge-streamable-ts.ts`) -
  增强版本，支持多服务器、配置文件、热重载等高级功能

## 软件架构

该桥接服务器使用 JavaScript/TypeScript 编写，基于 Node.js 平台，通过 HTTP
协议与客户端进行交互。

## 安装教程

1. 确保已安装 Node.js 和 npm。
2. 克隆仓库到本地。
3. 进入项目目录并运行 `npm install` 安装依赖。
4. 编译 TypeScript 版本（如果需要）：`npx tsc bridge-streamable-ts.ts`

## 使用说明

### 版本选择

#### JavaScript 版本 (bridge-streamable.js)

适合简单场景，支持单个 MCP 服务器桥接。

#### TypeScript 版本 (bridge-streamable-ts.ts)

推荐使用，支持以下高级功能：

- 多 MCP 服务器同时运行
- 配置文件支持
- 命令行参数解析
- 热重载配置
- 更好的错误处理和日志

### 把 stdio 协议转为 streamable-http 协议

此桥接服务器可以接收来自 stdio 的输入，并将其转换为 HTTP 请求，以便在 HTTP
协议下进行通信。

### TypeScript 版本使用说明

#### 编译和运行

```bash
# 编译TypeScript文件
npx tsc bridge-streamable-ts.ts

# 运行编译后的文件
node bridge-streamable-ts.js

# 或者直接运行（需要ts-node）
npx ts-node bridge-streamable-ts.ts
```

#### 命令行参数

TypeScript 版本支持以下命令行参数：

```bash
node bridge-streamable-ts.js [选项]

选项：
  --hot-reload          启用配置文件热重载
  --version             显示版本信息
  --config <路径>       指定配置文件路径（默认：settings.json）
  --api-key <密钥>      设置API认证密钥
  --port <端口>         设置监听端口（默认：3000）
  --host <主机>         设置绑定主机（默认：localhost）
  --cors-allow-origins <域名>  设置CORS允许的源（可多次使用）
  --path-prefix <路径>  设置URL路径前缀（默认：/mcp）
  --sse-server-enabled  启用SSE服务器模式
  --sse-endpoint <路径>  SSE服务器端点路径（默认：/sse）
  --sse-message-endpoint <路径>  SSE服务器消息端点路径（默认：/messages）
  -h, --help            显示帮助信息
```

#### 使用示例

```bash
# 基本启动
node bridge-streamable-ts.js

# 启用热重载
node bridge-streamable-ts.js --hot-reload

# 指定配置文件
node bridge-streamable-ts.js --config my-config.json

# 设置端口和API密钥
node bridge-streamable-ts.js --port 8080 --api-key my-secret-key

# 设置CORS允许的源
node bridge-streamable-ts.js --cors-allow-origins http://localhost:3000 --cors-allow-origins http://localhost:8080
```

#### 配置文件支持

TypeScript 版本支持 JSON 配置文件，默认为`settings.json`。配置文件示例：

```json
{
  "pathPrefix": "/mcp",
  "hotReload": true,
  "apiKey": "your-secret-api-key",
  "port": 3000,
  "host": "0.0.0.0",
  "corsAllowOrigins": ["*"],
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/path/to/custom/memory.json"
      }
    },
    "time": {
      "command": "uvx",
      "args": ["mcp-server-time", "--local-timezone=America/New_York"]
    }
  }
}
```

##### 配置文件参数说明

- **pathPrefix**: URL 路径前缀（默认："/mcp"）
- **hotReload**: 是否启用配置文件热重载（默认：false）
- **apiKey**: API 认证密钥（可选）
- **port**: 服务器监听端口（默认：3000）
- **host**: 服务器绑定主机（默认："localhost"）
- **corsAllowOrigins**: CORS 允许的源列表（默认：["*"]）
- **mcpServers**: MCP 服务器配置对象

##### mcpServers 配置

`mcpServers`对象支持配置多个 MCP 服务器，每个服务器包含：

- **command**: 启动命令
- **args**: 命令参数数组

#### 热重载功能

启用热重载后，当配置文件发生变化时，服务器会自动重新加载配置并重启 MCP 服务器：

```bash
# 启用热重载
node bridge-streamable-ts.js --hot-reload

# 或在配置文件中设置
{
  "hotReload": true
}
```

#### 多服务器支持

TypeScript 版本支持同时运行多个 MCP
服务器，所有服务器的工具、提示和资源都会被桥接到 HTTP 接口：

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/path/to/custom/memory.json"
      }
    },
    "time": {
      "command": "uvx",
      "args": ["mcp-server-time", "--local-timezone=America/New_York"]
    }
  }
}
```

举例,可以通过这些网址访问 mcp 服务器的 memory 和 time 工具:

http://localhost:3000/mcp/memory

http://localhost:3000/mcp/time

🌐 Available MCP HTTP endpoints:

memory http://localhost:3000/mcp/memory

time http://localhost:3000/mcp/time

🌐 Available MCP SSE endpoints:

SSE Endpoint: http://localhost:3000/sse/memory

Message Endpoint:

http://localhost:3000/messages/memory

SSE Endpoint:

http://localhost:3000/sse/time

Message Endpoint:

http://localhost:3000/messages/time

#### 环境变量支持

TypeScript 版本仍然支持原有的环境变量配置：

- **BRIDGE_STREAMABLE_HTTP_PATH**: 覆盖配置文件中的 pathPrefix
- **BRIDGE_API_TOKEN**: 覆盖配置文件中的 apiKey
- **BRIDGE_API_PORT**: 覆盖配置文件中的 port
- **BRIDGE_API_PWD**: 设置 stdio 进程的工作目录

优先级：命令行参数 > 环境变量 > 配置文件 > 默认值

### JavaScript 版本使用说明（原始版本）

#### 启动桥接服务器

运行以下命令启动桥接服务器：

```bash
node bridge-streamable.js
```

#### 环境变量配置

桥接服务器支持以下环境变量：

- **BRIDGE_STREAMABLE_HTTP_PATH**: Streamable HTTP 的路径（stdio→Streamable HTTP
  模式，默认：/mcp)

  - Streamable HTTP 的路径（stdio→Streamable HTTP 模式，默认：/mcp)
  - 示例: `export BRIDGE_STREAMABLE_HTTP_PATH="/mcp"`

- **BRIDGE_API_TOKEN**: HTTP API Token 认证密钥（可选）

  - 用于启用 HTTP API 的 Token 认证功能
  - 示例: `export BRIDGE_API_TOKEN="your-secret-token"`

- **BRIDGE_API_PORT**: 服务器监听端口（可选）

  - 设置桥接服务器监听的 HTTP 端口
  - 默认值: `3000`
  - 示例: `export BRIDGE_API_PORT=8080`

- **BRIDGE_API_PWD**: 工作目录路径（可选）
  - 设置 stdio 进程的工作目录
  - 默认值: 当前工作目录
  - 示例: `export BRIDGE_API_PWD="/path/to/workdir"`

#### HTTP API Token 认证（可选）

为了增加安全性，可以配置 HTTP API Token 认证。在服务器配置中设置
Token，并在客户端请求时提供相应的 Token。

#### Linux/Mac

在 Linux 或 Mac 系统上，可以直接使用上述命令启动服务器。

#### Windows

在 Windows 系统上，确保已安装 Node.js，并使用命令提示符运行启动命令。

## 使用示例（无认证）

启动服务器后，可以通过发送 HTTP
请求来与桥接服务器进行交互。具体请求格式和示例请参考项目文档或代码中的注释。

#### 使用说明

### 把 stdio 协议转为 streamable-http 协议

```
node bridge-streamable.js "cmd" "/c"  "npx" "-y"  "@gitee/mcp-gitee@latest" -token <GITEE_ACCESS_TOKEN>
```

#### 桥接服务器使用说明

##### 启动桥接服务器

```bash
node bridge-streamable.js node index-stdio.js
```

##### 环境变量配置

可以通过设置以下环境变量来配置桥接服务器：

```bash
# Linux/Mac
export BRIDGE_API_TOKEN="your-secret-token"      # 可选：Token认证
export BRIDGE_API_PORT=8080                       # 可选：端口配置，默认3000
export BRIDGE_API_PWD="/path/to/workdir"          # 可选：工作目录
node bridge-streamable.js node index-stdio.js

# Windows
set BRIDGE_API_TOKEN=your-secret-token
set BRIDGE_API_PORT=8080
set BRIDGE_API_PWD=C:\\path\\to\\workdir
node bridge-streamable.js node index-stdio.js
```

##### HTTP API Token 认证（可选）

可以通过设置环境变量`BRIDGE_API_TOKEN`来启用 HTTP API Token 认证：

```bash
# Linux/Mac
export BRIDGE_API_TOKEN="your-secret-token"
node bridge-streamable.js node index-stdio.js

# Windows
set BRIDGE_API_TOKEN=your-secret-token
node bridge-streamable.js node index-stdio.js
```

启用认证后，所有 HTTP 请求都需要在 Authorization 头中提供 Bearer Token：

##### 使用示例（无认证）

启动后，可以通过 HTTP 请求访问 MCP 服务：

### Streamable-HTTP 协议 MCP 服务器配置示例

以下是使用 streamable-http 协议的 MCP 服务器配置文件示例：

#### 1. 基础 streamable-http 配置

创建 `mcp-streamable-config.json`：

```json
{
  "mcpServers": {
    "streamable-gitee": {
      "url": "http://localhost:3000/mcp",
      "transport": "streamable-http",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

#### 2. 带认证的 streamable-http 配置

创建 `mcp-streamable-auth.json`：

```json
{
  "mcpServers": {
    "streamable-secure": {
      "url": "http://localhost:3000/mcp",
      "transport": "streamable-http",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer your-api-token"
      }
    }
  }
}
```

#### 3. 使用桥接服务器的 streamable-http 配置

创建 `mcp-bridge-streamable.json`：

```json
{
  "mcpServers": {
    "gitee-bridge": {
      "transport": "streamable-http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

#### 5. 客户端连接 streamable-http 配置示例

创建 `client-streamable-config.json`：

```json
{
  "mcp": {
    "servers": {
      "streamable-server": {
        "transport": {
          "type": "streamable-http",
          "url": "http://localhost:3000/mcp",
          "headers": {
            "User-Agent": "mcp-client/1.0"
          }
        }
      }
    }
  }
}
```

## 支持的传输协议

TypeScript 版本的桥接服务器通过 `selectTransport`
函数支持多种传输协议，可以根据不同的配置自动选择合适的传输方式。以下是支持的传输协议及其配置方法：

### 1. Stdio 传输协议

**适用场景**: 本地进程间通信，通过标准输入输出进行数据交换。

**配置参数**:

- `command`: 启动命令（必需）
- `args`: 命令参数数组（可选）
- `cwd`: 工作目录（可选，默认为当前目录或 `BRIDGE_API_PWD` 环境变量）
- `env`: 环境变量对象（可选）
- `type` 或 `transport`: 设置为 `"stdio"`（可选）

**配置示例**:

```json
{
  "mcpServers": {
    "memory-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "cwd": "/path/to/workdir",
      "env": {
        "MEMORY_FILE_PATH": "/path/to/custom/memory.json"
      },
      "transport": "stdio"
    }
  }
}
```

### 2. SSE (Server-Sent Events) 传输协议

#### SSE 客户端模式

**适用场景**: 服务器向客户端推送实时数据，支持单向通信。

**配置参数**:

- `sseUrl`: SSE 服务端点 URL（必需，可通过 `url` 参数替代）
- `headers`: 请求头对象（可选）
- `type` 或 `transport`: 设置为 `"sse"`（可选）

**配置示例**:

```json
{
  "mcpServers": {
    "sse-client": {
      "sseUrl": "http://localhost:8080/sse",
      "headers": {
        "Authorization": "Bearer your-token",
        "Content-Type": "application/json"
      },
      "transport": "sse"
    }
  }
}
```

#### SSE 服务器端模式

**适用场景**:

- 需要将 MCP 服务器作为 SSE 服务器运行
- 为客户端提供 SSE 连接端点
- 支持实时双向通信

**配置参数**:

- `sseServer.enabled`: 启用 SSE 服务器模式
- `sseServer.endpoint`: SSE 端点路径（默认：`/sse`）
- `sseServer.messageEndpoint`: SSE 消息端点路径（默认：`/messages`）

**示例配置**:

```json
{
  "sseServer": {
    "enabled": true,
    "endpoint": "/sse",
    "messageEndpoint": "/messages"
  },
  "mcpServers": {}
}
```

**使用方式**:

1. 启动服务器：

```bash
npm run start -- --sse-server-enabled
```

2. 访问 SSE 端点：

```
GET http://localhost:3000/sse/sse-server/
```

3. 发送消息到 SSE 服务器：

```
POST http://localhost:3000/messages/sse-server/?sessionId=<session-id>
```

### 3. WebSocket 传输协议

**适用场景**: 需要双向实时通信的场景，支持全双工通信。

**配置参数**:

- `wsUrl`: WebSocket 服务端点 URL（必需，可通过 `url` 参数替代）
- `headers`: 请求头对象（可选）
- `type` 或 `transport`: 设置为 `"ws"`（可选）

**配置示例**:

```json
{
  "mcpServers": {
    "websocket-server": {
      "wsUrl": "ws://localhost:8080/ws",
      "headers": {
        "Authorization": "Bearer your-token",
        "User-Agent": "mcp-client/1.0"
      },
      "transport": "ws"
    }
  }
}
```

### 4. HTTP/Streamable-HTTP 传输协议

**适用场景**: 基于 HTTP 的请求-响应模式，支持 RESTful 风格的 API 调用。

**配置参数**:

- `httpUrl`: HTTP 服务端点 URL（可通过 `url` 参数替代）
- `headers`: 请求头对象（可选）
- `type` 或 `transport`: 设置为 `"http"`（可选）

**配置示例**:

```json
{
  "mcpServers": {
    "http-server": {
      "url": "http://localhost:8080/mcp",
      "headers": {
        "Authorization": "Bearer your-token",
        "Content-Type": "application/json"
      },
      "transport": "http"
    }
  }
}
```

### 传输协议选择逻辑

`selectTransport` 函数按照以下优先级自动选择传输协议：

1. **Stdio 协议**: 当配置了 `command` 参数或 `transport/type` 为 `"stdio"` 时
2. **SSE 客户端协议**: 当配置了 `sseUrl` 或 `url` 且 `transport/type` 为 `"sse"`
   时
3. **WebSocket 协议**: 当配置了 `wsUrl` 或 `url` 且 `transport/type` 为 `"ws"`
   时
4. **HTTP 协议**: 当配置了 `httpUrl` 或 `url` 且 `transport/type` 为 `"http"` 时

### 混合配置示例

支持同时配置多种传输协议的服务器：

```json
{
  "sseServer": {
    "enabled": true,
    "endpoint": "/sse",
    "messageEndpoint": "/messages"
  },
  "mcpServers": {
    "local-memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "transport": "stdio"
    },
    "remote-sse": {
      "sseUrl": "http://remote-server.com/sse",
      "headers": {
        "Authorization": "Bearer remote-token"
      },
      "transport": "sse"
    },

    "websocket-service": {
      "wsUrl": "ws://websocket-server.com/ws",
      "transport": "ws"
    },
    "http-api": {
      "url": "http://api-server.com/mcp",
      "transport": "http"
    }
  }
}
```

## 支持的 MCP 功能

桥接服务器完整支持 MCP 协议的所有核心功能，包括 Tools、Prompts 和 Resources
的转发和交互。

### 1. MCP Tools 支持

桥接服务器可以透明地转发所有 MCP Tools 调用，支持以下功能：

### 2. MCP Prompts 支持

支持 MCP Prompts 的完整生命周期管理：

### 3. MCP Resources 支持

完整支持 MCP Resources 的读取和管理：

### 6. 性能优化建议

为了获得最佳性能，建议：

1. **连接池管理**: 使用 HTTP/1.1 keep-alive 减少连接开销
2. **批处理请求**: 合并多个相关请求
3. **缓存策略**: 对静态资源启用缓存
4. **负载均衡**: 在生产环境中使用反向代理

### 7. 安全最佳实践

1. **Token 认证**: 始终在生产环境中启用 `BRIDGE_API_TOKEN`
2. **HTTPS**: 使用反向代理添加 HTTPS 支持
3. **CORS**: 配置适当的 CORS 策略
4. **速率限制**: 实施 API 速率限制
5. **输入验证**: 验证所有输入参数

### 8. 集成示例

#### 与 Cursor 集成

在 Cursor 设置中添加 MCP 服务器：

```json
{
  "mcpServers": {
    "gitee": {
      "url": "http://localhost:3000/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer your-token"
      }
    }
  }
}
```
