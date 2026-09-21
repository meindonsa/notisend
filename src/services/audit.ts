import { createWriteStream, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { MiddlewareHandler } from "hono";

const LOG_DIR = join(process.cwd(), "logs");
if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
}

const logStream = createWriteStream(join(LOG_DIR, "audit.log"), { flags: "a" });

function sanitizeLog(value: string): string {
    return value.replace(/[\r\n]/g, "").substring(0, 100);
}

export const auditLog: MiddlewareHandler = async (c, next) => {
    const startTime = Date.now();
    const apiKey = c.req.header("x-api-key");
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "none";

    await next();

    const duration = Date.now() - startTime;
    const entry = {
        timestamp: new Date().toISOString(),
        method: c.req.method,
        path: c.req.path,
        apiKey: maskedKey,
        statusCode: c.res.status,
        durationMs: duration,
        ip: c.req.header("x-forwarded-for") ?? "unknown",
    };

    const logLine = JSON.stringify(entry) + "\n";
    logStream.write(logLine);
};

export function safeError(err: unknown): string {
    if (err instanceof Error) {
        return `${err.name}: ${err.message}`;
    }
    return String(err);
}
