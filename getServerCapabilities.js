import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {} from "@modelcontextprotocol/sdk/types.js";
// 获取服务器能力
export async function getServerCapabilities(client) {
  try {
    return await client.getServerCapabilities();
  } catch (error) {
    console.error("Error getting server capabilities:", error);
    return {
      tools: {},
      resources: {},
      prompts: {},
    };
  }
}
//# sourceMappingURL=getServerCapabilities.js.map
