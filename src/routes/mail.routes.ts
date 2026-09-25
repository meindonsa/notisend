import { Hono } from "hono";
import { sendMailSchema } from "../types/mail.types.js";
import { sendMail } from "../services/mailer.js";
import { SENDERS } from "../config/env.js";
import { renderTemplate } from "../services/template.js";
import { apiKeyAuth } from "../middlewares/auth.js";
import { rateLimit, maxBodySize } from "../middlewares/security.js";
import { auditLog, safeError } from "../services/audit.js";

export const mailRoutes = new Hono();

mailRoutes.use("*", auditLog, rateLimit, maxBodySize, apiKeyAuth);

mailRoutes.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = sendMailSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400);
    }

    const data = parsed.data;

    if (!SENDERS[data.app.trim().toLowerCase()]) {
        return c.json({ error: "Application inconnue" }, 400);
    }
    console.log("Recieve sent : " + data.subject || "a")
    try {
        const html = await renderTemplate(data.templateType, {
            subject: data.subject,
            text: data.text,
            link: data.link,
            value: data.value,
        });

        const info = await sendMail({ ...data, html });
        console.log("Message sent")
        return c.json({ success: true, messageId: info.messageId });
    } catch (err) {
        console.error("Erreur envoi mail:", safeError(err));
        return c.json({ error: "Échec de l'envoi de l'email" }, 500);
    }
});
