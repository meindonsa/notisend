import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import type { SendMailInput } from "../types/mail.types.js";

export const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

export async function verifyMailer() {
    await transporter.verify();
}

export async function sendMail(input: SendMailInput & { html: string }) {
    const rawAttachments = input.attachment
        ? Array.isArray(input.attachment)
            ? input.attachment
            : [input.attachment]
        : undefined;

    const attachments = rawAttachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, "base64"),
        contentType: a.contentType,
    }));

    return transporter.sendMail({
        from: input.from ?? env.MAIL_FROM,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments,
    });
}