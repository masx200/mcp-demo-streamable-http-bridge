import express from "express";
import { type Config } from "./main.js";

// 认证中间件
export default function (config: Config) {
  return function (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    const expectedToken = config.apiKey;

    // 如果配置了API密钥，则进行验证
    if (expectedToken) {
      if (!token || !authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Access token required",
          },
          id: null,
        });
      }

      if (token !== expectedToken) {
        return res.status(403).json({
          jsonrpc: "2.0",
          error: {
            code: -32002,
            message: "Invalid access token",
          },
          id: null,
        });
      }
    }

    next();
  };
}
