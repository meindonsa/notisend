import { env, ALLOWED_DOMAINS, getSender } from "../config/env.js";
import type { SendMailInput } from "../types/mail.types.js";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export async function verifyMailer() {
    const res = await fetch("https://api.brevo.com/v3/account", {
        headers: { "api-key": env.BREVO_API_KEY },
    });
    if (!res.ok) {
        throw new Error(`Clé API Brevo invalide (${res.status})`);
    }
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

function toEmailList(value: string | string[] | undefined): { email: string }[] | undefined {
    if (!value) return undefined;
    const arr = Array.isArray(value) ? value : [value];
    return arr.map((e) => ({ email: sanitizeEmail(e) }));
}

export async function sendMail(input: SendMailInput & { html: string }) {
    const recipients = [input.to, ...(input.cc ?? []), ...(input.bcc ?? [])];
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

    const attachment = rawAttachments?.map((a) => ({
        name: a.filename,
        content: a.content, // déjà en base64, Brevo l'attend tel quel
    }));

    const payload = {
        sender: getSender(input.app),
        to: toEmailList(input.to),
        cc: toEmailList(input.cc),
        bcc: toEmailList(input.bcc),
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
        attachment,
    };

    const res = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
            "api-key": env.BREVO_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Échec envoi Brevo (${res.status}): ${body}`);
    }

    return res.json();
}