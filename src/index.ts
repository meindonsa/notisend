import * as dns from "node:dns";
dns.setDefaultResultOrder('ipv4first')

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { env } from "./config/env.js";
import { mailRoutes } from "./routes/mail.routes.js";
import { verifyMailer } from "./services/mailer.js";
import { securityHeaders } from "./middlewares/security.js";
import { safeError } from "./services/audit.js";

const app = new Hono();

app.use("*", cors());
app.use("*", securityHeaders);

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/api/mail", mailRoutes);

async function start() {
  try {
    await verifyMailer();
    console.log("✅ Connexion SMTP vérifiée");
  } catch (err) {
    console.error("❌ Impossible de se connecter au SMTP:", safeError(err));
    process.exit(1);
  }

  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`🚀 Mail server démarré sur http://localhost:${info.port}`);
  });
}

start();
