# Ark Landscaping Monorepo

This monorepo contains four deployable Node/TypeScript apps and one Render PostgreSQL database:

- `apps/api` - NestJS API (`/health` endpoint)
- `apps/web-app` - Next.js public app
- `apps/portal` - Next.js portal app
- `apps/worker` - Node TypeScript worker process
- `render.yaml` - Render Blueprint describing staging services

## 1) Deploy on Render via Blueprint

1. Push this repository to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Connect the GitHub repo and choose the branch to deploy.
4. Render will detect `render.yaml` and show all services:
   - `ark-api-staging`
   - `ark-worker-staging`
   - `ark-web-app-staging`
   - `ark-portal-staging`
   - `ark-postgres-staging`
5. Review the generated services and click **Apply**.
6. After the first deploy, open each service and verify logs:
   - API boot log and `GET /health` response
   - Worker periodic `worker alive` log every minute
   - Next.js apps serving their default pages

## 2) Environment variables to set in Render

Set secrets in Render dashboard (never commit real values):

- `JWT_SECRET=<your-jwt-secret>`
- `ENCRYPTION_KEY=<your-encryption-key>`
- `POSTMARK_API_TOKEN=<your-postmark-token>`

Set base URL variables:

- `API_BASE_URL=https://ark-api-staging.onrender.com`
- `WEB_APP_BASE_URL=https://ark-web-app-staging.onrender.com`
- `PORTAL_BASE_URL=https://ark-portal-staging.onrender.com`
- `NEXT_PUBLIC_API_BASE_URL=https://ark-api-staging.onrender.com` (for both `ark-web-app-staging` and `ark-portal-staging`)

Notes:

- `DATABASE_URL` is wired automatically from `ark-postgres-staging` in `render.yaml`.
- Use staging URLs above as placeholders and replace with custom domains when ready.

## 3) Add custom domains on Render + Hover CNAME entries

### In Render

1. Open service -> **Settings** -> **Custom Domains**.
2. Click **Add Custom Domain** and enter hostname, for example:
   - `api.yourdomain.com` -> `ark-api-staging`
   - `app.yourdomain.com` -> `ark-web-app-staging`
   - `portal.yourdomain.com` -> `ark-portal-staging`
3. Render will provide a target CNAME value for each domain.
4. Leave domain verification pending while DNS is configured.

### In Hover DNS

1. Open Hover -> your domain -> **DNS**.
2. Add a **CNAME** record for each host:
   - `api` -> Render-provided CNAME target for API service
   - `app` -> Render-provided CNAME target for web-app service
   - `portal` -> Render-provided CNAME target for portal service
3. Save records and wait for DNS propagation.
4. Return to Render and confirm certificate/verification status turns active.
5. Update environment variables to custom domains:
   - `API_BASE_URL=https://api.yourdomain.com`
   - `WEB_APP_BASE_URL=https://app.yourdomain.com`
   - `PORTAL_BASE_URL=https://portal.yourdomain.com`
   - `NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com`

## 4) Postmark setup steps

1. Create (or sign in to) a Postmark account.
2. Create a **Server** for this environment (for example, `ark-staging`).
3. Add and verify sender signature(s) or domain.
4. Copy the **Server API Token**.
5. In Render, set `POSTMARK_API_TOKEN` on API and worker services.
6. Trigger a test email flow from your app and verify delivery in Postmark activity.

## Local development (optional)

From repo root:

```bash
npm install
```

Run each service as needed:

```bash
npm run start:dev -w @ark/api
npm run start:dev -w @ark/worker
npm run dev -w @ark/web-app
npm run dev -w @ark/portal
```
