import { z } from "zod";

export const templateTypeEnum = z.enum([
    "simple",
    "welcome",
    "reset-password",
    "forgot-password",
    "otp",
]);

export type TemplateType = z.infer<typeof templateTypeEnum>;

const attachmentSchema = z.object({
    filename: z.string(),
    content: z.string(), // base64
    contentType: z.string().optional(),
});

export const sendMailSchema = z.object({
    from: z.string().email().optional(),
    to: z.union([z.string().email(), z.array(z.string().email())]),
    subject: z.string().min(1),
    cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    attachment: z
        .union([attachmentSchema, z.array(attachmentSchema)])
        .optional(),
    text: z.string().optional(),
    link: z.string().url().optional(),
    value: z.string().optional(),
    templateType: templateTypeEnum.default("simple"),
});

export type SendMailInput = z.infer<typeof sendMailSchema>;