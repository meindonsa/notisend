import { Hono } from "hono";
import { sendMailSchema } from "../types/mail.types.js";
import { sendMail } from "../services/mailer.js";
import { apiKeyAuth } from "../middlewares/auth.js";

export const mailRoutes = new Hono();

mailRoutes.use("*", apiKeyAuth);

mailRoutes.post("/send", async (c) => {
    const body = await c.req.json();
    const parsed = sendMailSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400);
    }

    try {
        const info = await sendMail(parsed.data);
        return c.json({ success: true, messageId: info.messageId });
    } catch (err) {
        console.error("Erreur envoi mail:", err);
        return c.json({ error: "Échec de l'envoi de l'email" }, 500);
    }
});