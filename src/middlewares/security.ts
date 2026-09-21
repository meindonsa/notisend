import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export const rateLimit: MiddlewareHandler = async (c, next) => {
    const key = c.req.header("x-api-key") ?? c.req.header("x-forwarded-for") ?? "unknown";
    const now = Date.now();

    const entry = rateLimitStore.get(key);
    if (entry && now < entry.resetAt) {
        entry.count++;
        if (entry.count > MAX_REQUESTS) {
            return c.json({ error: "Trop de requêtes, veuillez réessayer plus tard" }, 429);
        }
    } else {
        rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    }

    await next();
};

export const securityHeaders: MiddlewareHandler = async (c, next) => {
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Content-Security-Policy", "default-src 'none'");
    c.header("X-XSS-Protection", "1; mode=block");
    c.header("Referrer-Policy", "no-referrer");
    c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    await next();
};

export const maxBodySize: MiddlewareHandler = async (c, next) => {
    const raw = c.req.raw;
    const length = raw.headers.get("content-length");
    const MAX_SIZE = 1_000_000;

    if (length && parseInt(length, 10) > MAX_SIZE) {
        return c.json({ error: "Payload trop volumineux" }, 413);
    }

    await next();
};
