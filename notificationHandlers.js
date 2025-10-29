import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CancelledNotificationSchema, InitializedNotificationSchema, LoggingMessageNotificationSchema, ProgressNotificationSchema, PromptListChangedNotificationSchema, ResourceListChangedNotificationSchema, ResourceUpdatedNotificationSchema, RootsListChangedNotificationSchema, ToolListChangedNotificationSchema, } from "@modelcontextprotocol/sdk/types.js";
export function setupAllNotificationHandlers(client, server, serverName) {
    client.setNotificationHandler(ToolListChangedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Tool list changed...`, JSON.stringify(notification, null, 4));
        server.sendToolListChanged();
        client.listTools().then((tools) => {
            console.log("更新后的工具列表:", tools);
        });
    });
    client.setNotificationHandler(ResourceListChangedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Resource list changed...`, JSON.stringify(notification, null, 4));
        server.sendResourceListChanged();
        client.listResources().then((resources) => {
            console.log("更新后的资源列表:", resources);
        });
    });
    client.setNotificationHandler(PromptListChangedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Prompt list changed...`, JSON.stringify(notification, null, 4));
        server.sendPromptListChanged();
        client.listPrompts().then((prompts) => {
            console.log("更新后的提示列表:", prompts);
        });
    });
    client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Resource updated...`, JSON.stringify(notification, null, 4));
    });
    client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
        console.log(`[${serverName}] Progress update...`, JSON.stringify(notification, null, 4));
    });
    client.setNotificationHandler(CancelledNotificationSchema, (notification) => {
        console.log(`[${serverName}] Operation cancelled...`, JSON.stringify(notification, null, 4));
    });
    client.setNotificationHandler(InitializedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Client initialized...`, JSON.stringify(notification, null, 4));
    });
    client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
        console.log(`[${serverName}] Log message...`, JSON.stringify(notification, null, 4));
        server.sendLoggingMessage(notification.params);
    });
    client.setNotificationHandler(RootsListChangedNotificationSchema, (notification) => {
        console.log(`[${serverName}] Roots list changed...`, JSON.stringify(notification, null, 4));
    });
}
//# sourceMappingURL=notificationHandlers.js.map