import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    MAIL_API_KEY: z.string().min(1),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number(),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    MAIL_FROM: z.string().min(1),
});

export const env = envSchema.parse(process.env);