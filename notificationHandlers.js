// 通知处理器实现模块
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CancelledNotificationSchema, InitializedNotificationSchema, LoggingMessageNotificationSchema, ProgressNotificationSchema, PromptListChangedNotificationSchema, ResourceListChangedNotificationSchema, ResourceUpdatedNotificationSchema, RootsListChangedNotificationSchema, ToolListChangedNotificationSchema, } from "@modelcontextprotocol/sdk/types.js";
/**
 * 为MCP客户端设置所有通知处理器
 * @param client - MCP客户端实例
 * @param server - MCP服务器实例
 * @param serverName - 服务器名称，用于日志
 */
export function setupAllNotificationHandlers(client, server, serverName) {
    // 处理工具列表变更通知
    client.setNotificationHandler(ToolListChangedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Tool list changed...`, JSON.stringify(notification, null, 4));
        server.sendToolListChanged();
        client.listTools().then((tools) => {
            console.log("更新后的工具列表:", tools);
        });
    });
    // 处理资源列表变更通知
    client.setNotificationHandler(ResourceListChangedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Resource list changed...`, JSON.stringify(notification, null, 4));
        server.sendResourceListChanged();
        client.listResources().then((resources) => {
            console.log("更新后的资源列表:", resources);
        });
    });
    // 处理提示列表变更通知
    client.setNotificationHandler(PromptListChangedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Prompt list changed...`, JSON.stringify(notification, null, 4));
        server.sendPromptListChanged();
        client.listPrompts().then((prompts) => {
            console.log("更新后的提示列表:", prompts);
        });
    });
    // 处理资源更新通知
    client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Resource updated...`, JSON.stringify(notification, null, 4));
        // 资源更新通知不需要对应的server发送方法
        // 只是记录日志，客户端可以据此更新本地缓存
    });
    // 处理进度通知
    client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
        console.log(`[${serverName}] Progress update...`, JSON.stringify(notification, null, 4));
        // 进度通知用于长时间运行操作的进度更新
        // 不需要对应的server发送方法
    });
    // 处理取消通知
    client.setNotificationHandler(CancelledNotificationSchema, (notification) => {
        console.log(`[${serverName}] Operation cancelled...`, JSON.stringify(notification, null, 4));
        // 取消通知表示某个操作被取消
        // 不需要对应的server发送方法
    });
    // 处理初始化通知
    client.setNotificationHandler(InitializedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Client initialized...`, JSON.stringify(notification, null, 4));
        // 初始化通知表示客户端已完成初始化
        // 不需要对应的server发送方法
    });
    // 处理日志消息通知
    client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
        console.log(`[${serverName}] Log message...`, JSON.stringify(notification, null, 4));
        // 转发日志消息通知到客户端
        server.sendLoggingMessage(notification.params);
    });
    // 处理根列表变更通知
    client.setNotificationHandler(RootsListChangedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Roots list changed...`, JSON.stringify(notification, null, 4));
        // 根列表变更通知表示文件系统根目录发生变化
        // 不需要对应的server发送方法
    });
}
//# sourceMappingURL=notificationHandlers.js.map