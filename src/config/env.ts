import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    MAIL_API_KEY: z.string().min(1),
    BREVO_API_KEY: z.string().min(1),
    MAIL_FROM: z.string().min(1),
    ALLOWED_EMAIL_DOMAINS: z.string().optional(),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);

export const ALLOWED_DOMAINS = env.ALLOWED_EMAIL_DOMAINS
    ? env.ALLOWED_EMAIL_DOMAINS.split(",").map((d) => d.trim().toLowerCase())
    : null;

export const IS_PRODUCTION = env.NODE_ENV === "production";

const mailFromSchema = z
    .array(
        z.object({
            app: z.string().min(1),
            email: z.string().min(1),
        }),
    )
    .min(1);

export type Sender = { name?: string; email: string };

function parseSender(value: string): Sender {
    const match = value.match(/^(.*)<(.+)>$/);
    return match
        ? { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() }
        : { email: value.trim() };
}

export const SENDERS: Record<string, Sender> = (() => {
    let raw: unknown;
    try {
        raw = JSON.parse(env.MAIL_FROM);
    } catch {
        throw new Error(
            'MAIL_FROM doit être un JSON valide, ex: [{"app":"techwatch","email":"TECHWATCH <noreply@example.com>"}]',
        );
    }

    const entries = mailFromSchema.parse(raw);
    return Object.fromEntries(
        entries.map((e) => [e.app.trim().toLowerCase(), parseSender(e.email)]),
    );
})();

export const ALLOWED_APPS = Object.keys(SENDERS);

export function getSender(app: string): Sender {
    const sender = SENDERS[app.trim().toLowerCase()];
    if (!sender) {
        throw new Error(`Application inconnue: ${app}`);
    }
    return sender;
}