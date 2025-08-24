import express from "express";
import { type Config } from "./main.js";
export default function (config: Config): (req: express.Request, res: express.Response, next: express.NextFunction) => express.Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=authenticateToken.d.ts.map