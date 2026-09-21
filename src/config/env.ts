import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    MAIL_API_KEY: z.string().min(1),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number(),
    SMTP_SECURE: z.coerce.boolean().default(true),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    MAIL_FROM: z.string().min(1),
    ALLOWED_EMAIL_DOMAINS: z.string().optional(),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);

export const ALLOWED_DOMAINS = env.ALLOWED_EMAIL_DOMAINS
    ? env.ALLOWED_EMAIL_DOMAINS.split(",").map((d) => d.trim().toLowerCase())
    : null;

export const IS_PRODUCTION = env.NODE_ENV === "production";