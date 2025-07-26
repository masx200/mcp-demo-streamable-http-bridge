# mcp-demo-streamable-http-bridge

#### 介绍

mcp-demo-streamable-http-bridge

#### 软件架构

软件架构说明

#### 安装教程

1. xxxx
2. xxxx
3. xxxx

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

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

##### 使用示例（无认证）

启动后，可以通过 HTTP 请求访问 MCP 服务：

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```
