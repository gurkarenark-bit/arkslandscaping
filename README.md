# Ark Landscaping Monorepo

This monorepo contains four deployable Node/TypeScript apps and one Render PostgreSQL database:

- `apps/api` - NestJS API (`/health` endpoint)
- `apps/web-app` - Next.js public app
- `apps/portal` - Next.js portal app
- `apps/worker` - Node TypeScript worker process
- `render.yaml` - Render Blueprint describing staging services

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, click **New +** -> **Blueprint**, connect the repo, and apply `render.yaml`.
3. Set required API secrets on `ark-api-staging`:
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`
4. Set `NEXT_PUBLIC_API_BASE_URL` on both frontend services:
   - `ark-web-app-staging`
   - `ark-portal-staging`
5. Use Render default service URLs for MVP (you can add custom domains later).

Notes:

- `DATABASE_URL` is wired automatically from `ark-postgres-staging` in `render.yaml`.
- Email is optional by default (`EMAIL_ENABLED=false`) and the app boots without Postmark.

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
