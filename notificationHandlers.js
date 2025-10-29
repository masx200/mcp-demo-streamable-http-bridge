import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LoggingMessageNotificationSchema, PromptListChangedNotificationSchema, ResourceListChangedNotificationSchema, ToolListChangedNotificationSchema, } from "@modelcontextprotocol/sdk/types.js";
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
    client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
        console.log(`[${serverName}] Log message...`, JSON.stringify(notification, null, 4));
        server.sendLoggingMessage(notification.params);
    });
}
//# sourceMappingURL=notificationHandlers.js.map