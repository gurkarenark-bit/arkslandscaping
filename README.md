# Ark's Landscaping MVP (Next.js + Supabase)

This repository is refactored into a **single Next.js App Router app at the repo root** for Vercel deployment.

## Architecture

- `/app` internal staff UI (Admin / Office / Crew)
- `/portal` customer-facing portal
- `/api` Next.js route handlers for privileged server-side actions
- Supabase for auth, Postgres, storage, and realtime messaging

> `render.yaml` is no longer used by this MVP architecture and should be ignored.

## Environment variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Supabase setup

1. Create a new Supabase project.
2. Run SQL from `supabase/migrations/001_mvp_schema.sql`.
3. Create a private storage bucket named `attachments`.
4. Configure auth:
   - Enable magic-link / OTP for customer flows.
   - Set customer session expiry to 14 days.
   - Keep email/password enabled for staff users.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Seed demo data

```bash
npm run db:seed
```

Creates Ark's Landscaping tenant + demo Admin/Office/Crew/Customer users, customer record, and a sample job/visit.

## Security highlights

- RLS enabled with tenant isolation and role-aware policy examples.
- Office users can create/send drafts but cannot finalize quotes/invoices.
- Crew can update ETA and access assigned jobs.
- Customer visibility is automatically tied to matching customer email.
- Attachment uploads enforce MIME type + basic file-signature checks, max 25MB, private storage + signed URL response.
- Placeholder cleanup API route exists for scheduled 1-year attachment retention deletion.

## Deploying to Vercel

1. Import this repo to Vercel.
2. Set the three env vars above in Vercel project settings.
3. Deploy (no Render config required).
