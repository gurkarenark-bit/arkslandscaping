# Ark's Landscaping MVP (Vercel + Supabase)

Single Next.js App Router app at repo root.

## Architecture

- Internal staff UI: `/app` (Admin / Office / Crew)
- Customer portal: `/portal`
- Privileged server APIs: `/api/*`
- Supabase for database, storage, realtime and staff auth
- Custom reusable portal magic links for customer auth

## Required env vars

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PORTAL_SESSION_SECRET=... # long random string used to hash tokens + sign session cookies
```

## Install / run

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create Supabase project.
2. Apply SQL migration: `supabase/migrations/001_mvp_schema.sql`.
3. Create private storage bucket named `attachments`.
4. Keep staff auth with Supabase email/password.
5. Customer auth is custom reusable magic-link flow (no password login in portal).

## Portal magic links (reusable, 14-day TTL)

- Request endpoint: `POST /api/portal/magic-link/request`
- Consume page: `/portal/magic-link/consume?token=...`
- Tokens are stored hashed in `portal_magic_links` and can be reused until `expires_at` unless revoked.
- Admin can revoke tokens via `POST /api/portal/magic-link/revoke`.
- Rate limits are enforced via `api_rate_limits` table for request and consume operations.

### Dev mode behavior

If no outbound email provider is configured, the request endpoint returns `devMagicLink` in JSON during development so you can open it directly.

## Draft / finalize rules

- Office can send draft quotes/invoices.
- Office cannot finalize.
- Admin-only finalize endpoints:
  - `POST /api/quotes/finalize`
  - `POST /api/invoices/finalize`
- UI gates e-sign until `finalized_by_admin_at` is present.

## Upload hardening

- Allowed: `pdf`, `jpg/jpeg`, `png`, `heic`
- Max 25MB
- Server-side file signature validation
- Private Supabase storage + signed URL responses only
- TODO placeholder included for malware scanning

## Retention cleanup + Vercel Cron

Use `/api/cleanup-attachments` to remove attachment records/files older than 1 year.

### Vercel Cron setup

Add in `vercel.json` (or Vercel dashboard equivalent):

```json
{
  "crons": [
    {
      "path": "/api/cleanup-attachments",
      "schedule": "0 4 * * *"
    }
  ]
}
```

This runs daily at 04:00 UTC.

## Seed data

```bash
npm run db:seed
```

Creates Ark's Landscaping tenant, staff users (Admin/Office/Crew), customer, and sample job/visit.

## Verification

- Run integration test:

```bash
npm test
```

- Run RLS sanity checklist SQL:
  - `docs/rls-sanity-check.md`

## Deployment

- Deploy to Vercel (Render config is deprecated for this MVP).
- Configure env vars in Vercel project settings.
