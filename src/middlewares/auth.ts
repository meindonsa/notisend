import type { MiddlewareHandler } from "hono";
import { env } from "../config/env.js";

export const apiKeyAuth: MiddlewareHandler = async (c, next) => {
    const apiKey = c.req.header("x-api-key");

    if (!apiKey || apiKey !== env.MAIL_API_KEY) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
};