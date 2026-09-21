import nodemailer from "nodemailer";
import { env, ALLOWED_DOMAINS } from "../config/env.js";
import type { SendMailInput } from "../types/mail.types.js";

export const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: true,
    },
});

export async function verifyMailer() {
    await transporter.verify();
}

const MAX_ATTACHMENT_SIZE = 5_000_000;
const ALLOWED_CONTENT_TYPES = [
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "application/pdf",
    "text/plain", "text/html",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function sanitizeEmail(email: string): string {
    return email.replace(/[\r\n]/g, "").trim().toLowerCase();
}

function isValidDomain(email: string): boolean {
    if (!ALLOWED_DOMAINS) return true;
    const domain = email.split("@").pop()?.toLowerCase() ?? "";
    return ALLOWED_DOMAINS.includes(domain);
}

export function validateRecipient(email: string): void {
    const sanitized = sanitizeEmail(email);
    if (!isValidDomain(sanitized)) {
        throw new Error(`Domain non autorisé pour l'email: ${sanitized.split("@").pop()}`);
    }
}

export function validateAttachments(attachments: SendMailInput["attachment"]) {
    if (!attachments) return;
    const list = Array.isArray(attachments) ? attachments : [attachments];
    for (const a of list) {
        const contentBuffer = Buffer.from(a.content, "base64");
        if (contentBuffer.length > MAX_ATTACHMENT_SIZE) {
            throw new Error(`Pièce jointe "${a.filename}" dépasse la taille maximale de 5 Mo`);
        }
        if (a.contentType && !ALLOWED_CONTENT_TYPES.includes(a.contentType)) {
            throw new Error(`Type de pièce jointe "${a.contentType}" non autorisé`);
        }
    }
}

export async function sendMail(input: SendMailInput & { html: string }) {
    const recipients = [
        input.to,
        ...(input.cc ?? []),
        ...(input.bcc ?? []),
    ];

    for (const r of recipients.flat()) {
        validateRecipient(r);
    }

    if (input.from) {
        validateRecipient(input.from);
    }

    if (input.attachment) {
        validateAttachments(input.attachment);
    }

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

    const sanitizedFrom = input.from ? sanitizeEmail(input.from) : undefined;
    const sanitizedTo = typeof input.to === "string" ? sanitizeEmail(input.to) : input.to.map(sanitizeEmail);

    return transporter.sendMail({
        from: sanitizedFrom ?? env.MAIL_FROM,
        to: sanitizedTo,
        cc: input.cc ? (typeof input.cc === "string" ? sanitizeEmail(input.cc) : input.cc.map(sanitizeEmail)) : undefined,
        bcc: input.bcc ? (typeof input.bcc === "string" ? sanitizeEmail(input.bcc) : input.bcc.map(sanitizeEmail)) : undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments,
    });
}
