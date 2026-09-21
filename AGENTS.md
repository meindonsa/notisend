## Context
Notisend is a TypeScript HTTP server for sending notifications, currently focused on email delivery through SMTP.
Stack: TypeScript, Node.js, Hono, `@hono/node-server`, Nodemailer, Zod, dotenv.
The application is an ESM project (`"type": "module"`) and uses strict TypeScript settings.

## Commands
- Install: `npm install`
- Development: `npm run dev` (starts `tsx watch src/index.ts`)
- Build and type-check: `npm run build` (runs `tsc`)
- Production: `npm run start` (runs `node dist/index.js`)
- No test suite or linter is currently configured. Validate changes with `npm run build`; for runtime changes, also run `npm run dev` and exercise the relevant endpoint.

## Architecture
- `src/index.ts`: application bootstrap, middleware registration, routes, startup and server configuration.
- `src/config/`: environment configuration and validation.
- `src/middlewares/`: shared HTTP middleware such as security headers.
- `src/routes/`: Hono route definitions and request handling.
- `src/services/`: business logic and integrations, including SMTP mail delivery and audit/error handling.
- `src/templates/`: notification/email templates.
- `src/types/`: shared TypeScript types.
- `CONTEXT/`: project context and reference material; read relevant files before making changes that affect the API or notification behavior.

## Code conventions
- Use TypeScript with strict typing; avoid `any` unless there is a documented reason.
- Preserve ESM imports and include the `.js` extension in local imports, matching the existing source files.
- Keep route definitions focused on HTTP concerns and move reusable business logic into `src/services/`.
- Validate external input with the existing Zod-based configuration and validation patterns.
- Use the existing error handling and audit helpers instead of exposing raw errors or secrets.
- Keep secrets and environment-specific values in environment variables; update `.env.example` when adding a required variable.

## Workflow
- Use Conventional Commits (`feat`, `fix`, `docs`, `chore`, etc.).
- Keep each commit limited to one coherent unit of work.
- Never commit `.env`, SMTP credentials, API keys, or other secrets.
- Run `npm run build` before committing changes.
- Do not edit generated output in `dist/`; regenerate it with the build command.

## Limits
- Never read, edit, or delete `.env`; `.env.example` may be read and updated.
- Do not change public API routes, authentication behavior, SMTP configuration, or security middleware without checking all affected callers and documenting the impact.
- Ask permission before installing a new dependency, changing the directory structure, or introducing a new notification provider.
