import type { MiddlewareHandler } from "hono";
import { env } from "../config/env.js";
import crypto from "node:crypto";

export const apiKeyAuth: MiddlewareHandler = async (c, next) => {
    const apiKey = c.req.header("x-api-key");

    if (!apiKey || !env.MAIL_API_KEY) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const a = Buffer.from(apiKey.padEnd(env.MAIL_API_KEY.length, "\0"));
    const b = Buffer.from(env.MAIL_API_KEY.padEnd(apiKey.length, "\0"));

    if (!crypto.timingSafeEqual(a, b)) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
};
