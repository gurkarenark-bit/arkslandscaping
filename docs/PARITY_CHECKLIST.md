# Parity Checklist

## Compliance Report

### Implemented now
- Roles are modeled across schema/RLS and server APIs enforce role gates for privileged actions (finalize, revoke, draft-send flow guardrails). Key paths: `supabase/migrations/002_canonical_schema.sql`, `supabase/migrations/003_rls_policies.sql`, `lib/staff-auth.ts`, `app/api/quotes/finalize/route.ts`, `app/api/invoices/finalize/route.ts`, `app/api/portal/magic-link/revoke/route.ts`.
- Customer magic-link auth is reusable, 14-day TTL, hashed-at-rest, revocable, auto-login, and request/consume are rate-limited. Key paths: `lib/portal-auth.ts`, `lib/rate-limit.ts`, `app/api/portal/magic-link/request/route.ts`, `app/portal/magic-link/consume/page.tsx`.
- Jobs/scheduling lifecycle and visit semantics (multi-visit + 1-hour arrival window), ETA notifications, uploads, retention cleanup, and health endpoint behavior exist in code + migrations. Key paths: `supabase/migrations/002_canonical_schema.sql`, `app/api/eta/route.ts`, `app/api/uploads/route.ts`, `app/api/cleanup-attachments/route.ts`, `app/api/health/route.ts`.
- Messaging now has threaded inbox read/write endpoints plus realtime subscriptions in staff and portal UI. Key paths: `app/api/messages/route.ts`, `app/(internal)/app/messages/page.tsx`, `app/portal/messaging/page.tsx`, `supabase/migrations/003_rls_policies.sql`.

### Missing / partially implemented
- Staff auth still uses header-driven role context in app code (`x-staff-role`) instead of fully wired Supabase-authenticated claim/session derivation in this repo snapshot; this keeps API gates functional for MVP tests but is not production-hard auth on its own.
- Messaging realtime is subscribed at table-level and depends on Supabase RLS in deployment for strict tenant isolation (policies are present, but full runtime validation depends on deployed auth claims + realtime config).

### Requirement traceability
| Requirement | Status | Evidence (exact files) |
|---|---|---|
| 1) Roles + permissions (server + RLS) | PARTIAL | `supabase/migrations/002_canonical_schema.sql`; `supabase/migrations/003_rls_policies.sql`; `lib/staff-auth.ts`; `app/api/quotes/finalize/route.ts`; `app/api/invoices/finalize/route.ts`; `app/api/portal/magic-link/revoke/route.ts`; `app/api/draft-status/route.ts` |
| 2) Customer portal auth (magic link, hash, 14d TTL, revocable, rate limit, dev link) | COMPLIANT | `lib/portal-auth.ts`; `lib/rate-limit.ts`; `app/api/portal/magic-link/request/route.ts`; `app/portal/magic-link/consume/page.tsx`; `app/portal/auth/page.tsx`; `supabase/migrations/002_canonical_schema.sql` |
| 3) Jobs + scheduling lifecycle / visits / arrival window / ETA notifications | COMPLIANT | `supabase/migrations/002_canonical_schema.sql`; `app/(internal)/app/jobs/page.tsx`; `app/(internal)/app/schedule/page.tsx`; `app/api/eta/route.ts`; `lib/mvp-data.ts` |
| 4) Messaging threaded inbox + realtime + anti-leakage controls | COMPLIANT | `app/api/messages/route.ts`; `app/(internal)/app/messages/page.tsx`; `app/portal/messaging/page.tsx`; `supabase/migrations/003_rls_policies.sql` |
| 5) Draft -> finalize workflow with admin finalize-needed notification | COMPLIANT | `app/api/draft-status/route.ts`; `app/api/quotes/finalize/route.ts`; `app/api/invoices/finalize/route.ts`; `app/(internal)/app/quotes-invoices/page.tsx`; `app/portal/page.tsx` |
| 6) Uploads (types, 25MB, signatures, private storage, signed URLs, malware deferred) | COMPLIANT | `lib/file-signature.ts`; `app/api/uploads/route.ts`; `README.md`; `supabase/migrations/002_canonical_schema.sql` |
| 7) Retention cleanup endpoint (delete storage + DB refs after 1 year) | COMPLIANT | `app/api/cleanup-attachments/route.ts`; `README.md`; `supabase/migrations/002_canonical_schema.sql` |
| 8) `/api/health` works without Supabase env | COMPLIANT | `app/api/health/route.ts`; `tests/health.test.mjs` |

## CI / tests
**Status: COMPLIANT**
- Tests remain `.mjs` and run via Node test runner.
- Coverage includes health, permissions, magic-link, and UX workflow checks.
