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

export const SENDER = (() => {
    const match = env.MAIL_FROM.match(/^(.*)<(.+)>$/);
    return match
        ? { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() }
        : { email: env.MAIL_FROM.trim() };
})();