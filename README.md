# mcp-demo-streamable-http-bridge

#### 介绍

mcp-demo-streamable-http-bridge

# mcp-demo-streamable-http-bridge

## 介绍

这是一个演示项目，用于展示如何将 stdio 协议转换为 streamable-http
协议的桥接服务器。

## 软件架构

该桥接服务器使用 JavaScript 编写，基于 Node.js 平台，通过 HTTP
协议与客户端进行交互。

## 安装教程

1. 确保已安装 Node.js 和 npm。
2. 克隆仓库到本地。
3. 进入项目目录并运行 `npm install` 安装依赖。

## 使用说明

### 把 stdio 协议转为 streamable-http 协议

此桥接服务器可以接收来自 stdio 的输入，并将其转换为 HTTP 请求，以便在 HTTP
协议下进行通信。

### 桥接服务器使用说明

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
node D:\github\mcp-streamable-http-bridge\bridge-streamable.js "cmd" "/c"  "npx" "-y"  "@gitee/mcp-gitee@latest" -token <GITEE_ACCESS_TOKEN>
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

1. **Token认证**: 始终在生产环境中启用 `BRIDGE_API_TOKEN`
2. **HTTPS**: 使用反向代理添加HTTPS支持
3. **CORS**: 配置适当的CORS策略
4. **速率限制**: 实施API速率限制
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
