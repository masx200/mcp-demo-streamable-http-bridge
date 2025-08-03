# 更新日志

## 环境变量说明

本项目支持以下环境变量配置：

### BRIDGE_API_TOKEN

- **描述**: HTTP API Token认证密钥
- **用途**: 用于启用HTTP API的Token认证功能，增强安全性
- **示例值**: `your-secret-token`
- **使用方式**:
  - Linux/Mac: `export BRIDGE_API_TOKEN="your-secret-token"`
  - Windows: `set BRIDGE_API_TOKEN=your-secret-token`

### BRIDGE_API_PORT

- **描述**: 服务器监听端口
- **用途**: 设置桥接服务器监听的HTTP端口
- **默认值**: `3000`
- **示例值**: `8080`
- **使用方式**:
  - Linux/Mac: `export BRIDGE_API_PORT=8080`
  - Windows: `set BRIDGE_API_PORT=8080`

### BRIDGE_API_PWD

- **描述**: 工作目录路径
- **用途**: 设置桥接服务器的工作目录，影响stdio进程的当前工作目录
- **默认值**: 当前工作目录（`process.cwd()`）
- **示例值**: `/path/to/workdir`
- **使用方式**:
  - Linux/Mac: `export BRIDGE_API_PWD="/path/to/workdir"`
  - Windows: `set BRIDGE_API_PWD=C:\path\to\workdir`

## 使用示例

### 综合使用示例

```bash
# Linux/Mac
export BRIDGE_API_TOKEN="my-secret-token"
export BRIDGE_API_PORT=8080
export BRIDGE_API_PWD="/home/user/projects"
node bridge-streamable.js node index-stdio.js

# Windows
set BRIDGE_API_TOKEN=my-secret-token
set BRIDGE_API_PORT=8080
set BRIDGE_API_PWD=C:\\Users\\user\\projects
node bridge-streamable.js node index-stdio.js
```

## 修复资源清理问题并改进错误处理

确保在传输关闭或出错时正确清理服务器、客户端和传输资源

添加传输错误处理逻辑以增强稳定性
