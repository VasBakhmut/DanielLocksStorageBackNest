# Railway deployment through GitHub

This folder is a standalone NestJS repository. Deploy its root containing package.json, src/ and railway.json. There is no apps/api workspace. No local server needs to be started to push or deploy.

1. Push this repository to a **private GitHub repository**.
2. In Railway create a service from that GitHub repository. Set Root Directory to `/`.
3. `railway.json` configures the build (`npm run build`), start (`node dist/main.js`) and healthcheck (`/health`). Keep one replica for the current in-process conversation locks.
4. Add the variables below before the first successful deployment. Railway supplies `PORT`; do not copy the local PORT variable.
5. Generate a Railway HTTPS domain and set that URL as the frontend API base URL. Configure the exact frontend origin in `CORS_ORIGINS`.

## Variables

```env
NODE_ENV=production
HOST=0.0.0.0
CORS_ORIGINS=https://your-frontend-domain.example
AI_PROVIDER=gemini
GEMINI_MODEL=<copy your working model ID from local .env>
GEMINI_API_KEY=<copy privately from local .env>
SUPABASE_URL=<copy from local .env>
SUPABASE_SERVICE_ROLE_KEY=<copy privately from local .env>
MAIL_MODE=capture
```

Use Railway Variables for secrets. `.env`, local chat records, source documents and the unreviewed ingestion corpus are stored outside this repository in ../DanielLocksMaterials. The runtime uses curated knowledge bundled with the backend and Supabase; those excluded files are not needed for startup. Public PDF/image citations must be hosted by your frontend separately as described in `API.md`.

## Email preview and persistence

For `MAIL_MODE=capture`, mount a Railway Volume at `/data` and set `DATA_DIR=/data` to preserve preview emails through redeploys. Without a volume, captured emails are temporary and may be lost. Capture mode never sends a real email and the frontend must show that clearly. Sessions persist in Supabase when its variables are present.

For actual mail, use `MAIL_MODE=smtp` and supply `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SUPPORT_FROM`, `SUPPORT_TO`. This prototype does not yet have a transactional mail outbox or end-of-consultation report emails.

## Validation and limits

Local compilation may be run with `npm run build`; it does not start a server. **Do not run start/dev or HTTP tests without the user's explicit permission.** `npm test` includes an HTTP test that briefly opens a local listener.

After the user authorizes deployment, verify `/health` on the Railway domain and the three independent frontend session scenarios. A health response does not verify Gemini generation or SMTP delivery. Public abuse controls/authentication and the previously reported dependency advisories remain outstanding; this is a limited prototype, not production readiness.

Official configuration references: https://docs.railway.com/config-as-code and https://docs.railway.com/networking/troubleshooting/application-failed-to-respond
