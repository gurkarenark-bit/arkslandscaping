# Ark Ops MVP — Codex Autopilot Controller

This file is the persistent “controller” for Codex/agents working in this repo.
If any instruction conflicts with other docs, follow this precedence:

**Order of precedence**
1) docs/CHAT_CONTEXT.md  
2) docs/SPEC.md  
3) docs/TESTPLAN.md  
4) docs/PARITY_CHECKLIST.md  
5) docs/AUTOPILOT.md (this file)  
6) README.md  

---

## Objective

Build a Housecall Pro–like internal ops MVP for Ark’s Landscaping with:
- Multi-user support with roles/permissions
- Customer portal with reusable magic links (no password login for customers)
- Jobs + scheduling (multi-visit) + ETA updates (in-app notifications)
- In-app messaging (staff ↔ customer) using Supabase Realtime
- Draft → Admin finalization workflow for quotes/invoices
- Safe uploads (restricted types, size, signature validation, private storage + signed URLs)
- Attachment retention cleanup after 1 year (placeholder endpoint + cron note)
- **NO** Postmark / Twilio / Stripe for now (email/SMS/payments come later)

---

## Non-negotiables

### Branch/PR Safety
- Never commit directly to `main`.
- Always create a new branch and open a PR.
- Never merge automatically.
- CI must be green (status check: `ci`).
- PR requires **1 human approval** (repo branch protection).
- Keep branch up-to-date with `main` before merge (strict checks enabled).

### Build/Test Expectations
- Repo must succeed in GitHub Actions:
  - `npm ci`
  - `npm run build`
  - `npm run test`
- If Codex’s sandbox cannot install/build (network/proxy issues), it must:
  - still open a PR,
  - rely on GitHub Actions CI as the source of truth,
  - and clearly note this in the PR description.

### Scope Control
- Do not add features not specified in docs/SPEC.md.
- If you identify improvements, record them in docs/BACKLOG.md (or TODO list) instead of implementing.

### Dependency Hygiene
- Do NOT run `npm audit fix --force`.
- Do NOT do large dependency upgrades unless required to fix CI/build.

---

## Repo Map (current)
- Next.js App Router app at repo root.
- Internal staff UI: `/app` (Admin/Office/Crew)
- Customer portal: `/portal`
- Server APIs: `/api/*`
- Supabase: DB + RLS + Storage + Realtime + staff auth
- Customer auth: custom reusable magic links (14-day TTL) + auto-login

---

## Required behaviors (must match docs/SPEC.md)

### Roles & Permissions
- Admin: tenant-wide full access, finalizes quotes/invoices, can revoke magic links.
- Office: tenant-wide access; can schedule/reschedule; can send drafts; **cannot finalize**.
- Crew: only assigned jobs/visits/customers/threads/attachments/notifications.
- Customer: only their own data (email+phone-linked) across quotes/jobs/invoices/messages.

### Magic Links (Customers)
- Reusable until expiry
- TTL = 14 days
- Auto-login when consumed
- Token stored hashed (never store raw token)
- Revocable by Admin
- Rate limit request/consume endpoints

### Jobs & Scheduling
- Job lifecycle as per SPEC
- Multi-visit jobs supported
- Per-visit statuses
- 1-hour arrival window derived from visit start time
- ETA updates create in-app notification (email/SMS skipped)

### Messaging
- Staff↔customer messaging
- Threaded inbox
- Realtime updates via Supabase Realtime
- Must be compatible with RLS policies (no data leakage across roles/tenants)

### Draft → Finalize Workflow
- Office can send draft quotes/invoices
- Customer can view draft but **cannot e-sign** until Admin finalizes
- Sending a draft generates an Admin in-app task/notification to finalize

### Uploads
- Allowed: pdf, jpg/jpeg, png, heic
- Max: 25MB
- Server-side signature validation (not extension-only)
- Private Supabase storage + signed URL access
- Malware scanning: planned later (do not implement heavy scanning now)

### Retention
- Attachments deleted after 1 year
- Remove references in UI/DB (do not show “expired”)
- Provide cleanup endpoint suitable for Vercel Cron later

### Health endpoint
- `/api/health` must return `{ status: "ok" }`
- Must not require Supabase env vars

---

## Working Loop (single PR)
When doing a large change, follow this loop in ONE PR:

1) Implement missing items toward SPEC parity  
2) Add/extend tests (minimum: health + magic-link reuse/expiry)  
3) Update docs/PARITY_CHECKLIST.md with “Implemented/Partial/Missing” + file paths  
4) Keep CI green (GitHub Actions is authoritative)  
5) Ensure PR description contains evidence & run instructions  

---

## PR Description Template (required)

### Summary
- What changed and why

### Spec Parity Checklist
- Link SPEC sections → file paths/migrations/tests

### How to run locally
- npm ci
- npm run dev
- npm run test
- npm run build

### What is deferred
- Bullet list of TODOs moved to docs/BACKLOG.md or TODO section

### CI Status
- Confirm CI is green (or paste failing step if not)

---

## Backlog Rules (parallel work)
If running a separate “Backlog Bot”:
- Do NOT edit:
  - `supabase/migrations/*`
  - RLS policies
  - magic-link auth core
  - messaging core tables
- Safe backlog work:
  - UI polish, docs, read-only reporting screens, non-DB unit tests

---

## Manual steps (human-only)
- Approve PRs (required by branch protection)
- Merge PRs after CI green and approval
- Create Supabase project later (not required for migrations-first work)

End of controller.
