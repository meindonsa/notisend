import { z } from "zod";

const attachmentSchema = z.object({
    filename: z.string(),
    content: z.string(), // base64
    contentType: z.string().optional(),
});

export const sendMailSchema = z.object({
    to: z.union([z.string().email(), z.array(z.string().email())]),
    subject: z.string().min(1),
    html: z.string().optional(),
    text: z.string().optional(),
    cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    attachments: z.array(attachmentSchema).optional(),
}).refine((data) => data.html || data.text, {
    message: "html ou text est requis",
});

export type SendMailInput = z.infer<typeof sendMailSchema>;