# Austyle NestJS backend

Standalone NestJS project. Open this folder (`DanielLocksStorage`) in VS Code. Source code, package.json, .gitignore and Railway configuration are all at this level. No npm workspace and no apps/api directory.

## Commands

```powershell
npm ci
npm run build
```

Build compiles only; it does not start a server. Start only when explicitly requested:

```powershell
npm run start:dev
# Or, after building:
npm run start:prod
```

`npm test` includes an HTTP test that opens a local listener; do not run it without permission. `npm run format` formats source and configuration.

## Structure

- `src/`: Nest modules for chat, AI, knowledge, persistence, email and health.
- `supabase/`: SQL setup for the backend database and staging tables.
- `.env`: local secrets (ignored by Git); `.env.example`: empty template.
- `API.md`: frontend integration contract with independent widget, Maintenance and per-product sessions.
- `railway.json`, `RAILWAY.md`: deployment configuration and instructions.
- `dist/`: generated output after build; `node_modules/`: installed dependencies. Both are ignored by Git.

Original documents, collected knowledge, collection scripts and existing local conversation/email records are preserved separately in the sibling `../DanielLocksMaterials` folder. That folder is not part of this Git repository or Railway deployment. Local `.env` points DATA_DIR at its data folder to preserve access to existing records.

## Configuration

Use the single root `.env`; restart after changes. Gemini uses AI_PROVIDER, GEMINI_API_KEY and GEMINI_MODEL. Supabase uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. CORS_ORIGINS accepts exact frontend origins without page paths.

Railway uses Variables, not your local .env. Follow [RAILWAY.md](RAILWAY.md). Keep secrets and client materials out of Git.

## Prototype scope

Supabase persists conversations; answers use curated `src/knowledge/knowledge.ts`. Unreviewed scraped material is not automatically used. Live stock/pricing, attachments, full diagnostic flows and completed-session report emails remain unimplemented. SMTP must be configured to send real email; capture mode only stores previews. Dependency advisories and public abuse controls still require attention before production.

See [API.md](API.md) for exact endpoints, payloads and limitations.
