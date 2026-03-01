# Ark's Landscaping MVP (Vercel + Supabase)

Single Next.js App Router app at repo root.

## Architecture

- Internal staff portal: `/app` (Admin / Office / Crew)
- Customer portal: `/portal`
- Server APIs: `/api/*`
- Supabase for database, storage, realtime, and staff auth
- Custom reusable magic-link auth for customers (no passwords)

## Source of Truth

`docs/SPEC.md` is the canonical specification and must be followed.

When requirements conflict, resolve against:
1. `docs/SPEC.md`
2. `docs/CHAT_CONTEXT.md`
3. `docs/TESTPLAN.md`
4. `docs/PARITY_CHECKLIST.md`

## MVP Scope

No external providers yet (no Stripe, Twilio, or Postmark). In-app messaging only.

## Required env vars

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PORTAL_SESSION_SECRET=... # long random string used to hash tokens + sign session cookies
```

## Supabase Setup

1. Create a Supabase project.
2. Apply migrations from `supabase/migrations/` (MVP baseline: `supabase/migrations/001_mvp_schema.sql`).
3. Create a **private** storage bucket named `attachments`.
4. Keep staff auth with Supabase email/password.
5. Customer auth uses a custom reusable magic-link flow.
6. No magic-link email provider is required in development mode.

## Development Workflow

```bash
npm ci
npm run dev
npm run build
npm run test
```

Open `http://localhost:3000` for local development.

## Portal Magic Links

Customer authentication is passwordless and uses reusable magic links with the following behavior:

- reusable until expiry
- TTL = 14 days
- auto-login
- stored hashed in `portal_magic_links`
- revocable

Implementation endpoints:
- Request endpoint: `POST /api/portal/magic-link/request`
- Consume page: `/portal/magic-link/consume?token=...`
- Revoke endpoint (Admin): `POST /api/portal/magic-link/revoke`
- Request/consume rate limiting via `api_rate_limits`

### Development mode behavior

If no outbound email provider is configured, the request endpoint returns `devMagicLink` in JSON in development so you can open it directly.

## Security Model

- Row Level Security (RLS) enforces tenant and role isolation at the database layer.
- API and UI role gates enforce workflow rules:
  - **Admin**: full access
  - **Office**: can draft/send but cannot finalize quotes/invoices
  - **Crew**: limited to assigned jobs and related records
  - **Customer**: limited to records tied to their own email
- Portal/customer sessions are secured with httpOnly cookies.

## Draft / Finalize Rules

- Office can send draft quotes/invoices.
- Office cannot finalize.
- Admin-only finalize endpoints:
  - `POST /api/quotes/finalize`
  - `POST /api/invoices/finalize`
- UI gates e-sign until `finalized_by_admin_at` is present.

## Upload Rules

- Allowed file types: `pdf`, `jpg`, `jpeg`, `png`, `heic`
- Max size: 25MB
- Server-side file signature validation
- Private Supabase storage and signed URL access only
- Malware scanning is planned but not yet implemented

## Retention

- Attachment files and related references are deleted after 1 year.
- Cleanup endpoint exists at `GET /api/cleanup-attachments`.

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

## CI Behavior

CI is branch-protected: `npm ci`, `npm run build`, and `npm run test` must pass before merging pull requests.

## Seed data

```bash
npm run db:seed
```

Creates Ark's Landscaping tenant, staff users (Admin/Office/Crew), customer, and sample job/visit.

## Verification

- Integration/unit checks:

```bash
npm run test
```

- RLS sanity checklist SQL:
  - `docs/rls-sanity-check.md`

## Deployment

- Deploy to Vercel (Render config is deprecated for this MVP).
- Configure environment variables in Vercel project settings.
