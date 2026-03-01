# Parity Checklist

## Compliance Report

Audit timestamp: 2026-03-01T11:05:00Z

Conflict log: No conflicts found across canonical docs (`docs/CHAT_CONTEXT.md` → `docs/SPEC.md` → `docs/TESTPLAN.md` → `docs/PARITY_CHECKLIST.md` → `docs/AUTOPILOT.md` → `docs/rls-sanity-check.md` → `README.md`).

### Requirement Matrix (Evidence-Backed)

| # | Requirement | Status | Implementation evidence | Enforcement evidence | Behavior evidence | Negative-case evidence |
|---|---|---|---|---|---|---|
| 1 | Roles/permissions (Admin/Office/Crew/Customer, server + RLS) | COMPLIANT | Role enums, tenant keys, and assignment relations are present in canonical schema and RLS migrations (`002`, `003`). | Server role gates block finalize/revoke operations (`requireStaffRole`) and RLS policies scope by tenant, role, assignment, and customer linkage. | `tests/permissions.test.mjs` and `tests/ux-workflows.test.mjs` pass role-based workflow expectations. | `tests/adversarial-sweep.test.mjs` validates non-admin finalization is denied and crew visibility stays scoped to tenant + assignment. |
| 2 | Customer portal auth (magic link TTL 14d, reusable, hashed token, revocable, rate-limited, dev JSON fallback) | COMPLIANT | Token hashing + reusable validation + session signing in `lib/portal-auth.ts`; request/consume/revoke endpoints wired. | Rate limits on request + consume (`lib/rate-limit.ts`, request/consume handlers); revoke endpoint requires admin role. | `tests/magic-links.test.mjs` and `tests/magic-link.integration.test.mjs` verify reuse-until-expiry behavior. | `tests/adversarial-sweep.test.mjs` checks replay/expiry boundary rejection at exact expiry timestamp. |
| 3 | Jobs/scheduling (full lifecycle, multi-visit, per-visit status, arrival window +1h, ETA → notification) | COMPLIANT | Multi-visit structures and status constraints in schema; schedule/job pages and ETA API exist. | ETA route requires staff role; crew assignment filters in data access and messaging thread visibility by assigned jobs. | Existing UX and permission tests plus CI build verify schedule/job flows compile and execute. | `tests/adversarial-sweep.test.mjs` exercises cross-scope crew filtering logic against tenant/job boundaries. |
| 4 | Messaging (staff↔customer threads, Realtime, no cross-tenant leakage) | COMPLIANT | Threaded message API supports portal and staff read/write paths; staff and portal messaging pages subscribe to realtime channels. | API checks tenant/customer session match for portal posts and role/assignment scoping for crew; DB RLS policies constrain rows. | CI build + tests confirm API/UI compile and message workflow tests continue passing. | `tests/adversarial-sweep.test.mjs` includes cross-tenant leakage checks for crew-visible thread set. |
| 5 | Draft→Finalize (office sends draft, customer view-only until admin finalization, finalize-needed admin notification) | COMPLIANT | Draft status endpoint, admin-only finalize endpoints, and quote/invoice UI gates are implemented. | Office/Crew roles are blocked from finalize endpoints; draft-send path inserts admin in-app notification. | `tests/ux-workflows.test.mjs` verifies e-sign remains blocked until finalized. | `tests/permissions.test.mjs` and adversarial sweep deny non-admin finalize attempts. |
| 6 | Uploads (types, 25MB, signature validation, private storage + signed URL, malware TODO) | COMPLIANT | Upload API enforces MIME list + 25MB + signature validation; stores to private path and returns signed URL; TODO notes malware scanning deferred. | Server rejects unsupported types/size/signature before storage insert; storage bucket usage is private-path oriented. | CI build validates route integration; upload validations are enforced directly in API code path. | Rejection branches in upload route return 400 on invalid type/size/signature (explicit disallowed behavior). |
| 7 | Retention (1-year file + reference deletion, cron-suitable cleanup endpoint) | COMPLIANT | Cleanup endpoint removes expired storage objects and deletes corresponding DB rows; README documents cron wiring. | Endpoint filters eligible rows and deletes storage + DB references together to prevent dangling references. | CI build + route compilation successful; retention logic is deterministic in route implementation. | `tests/adversarial-sweep.test.mjs` checks boundary-date logic deletes only eligible records. |
| 8 | `/api/health` works without Supabase env vars in build/test context | COMPLIANT | Health route computes status from env presence only and does not connect to Supabase. | No DB client usage in route; safe in missing-env contexts. | `tests/health.test.mjs` passes payload shape checks; `npm run build` passes with missing env vars and logs degraded state. | `tests/adversarial-sweep.test.mjs` verifies degraded response when env vars are absent. |

## Migration Gate

- `supabase/migrations/001_mvp_schema.sql` exists.
- Required canonical follow-up migrations are present and audited: `supabase/migrations/002_canonical_schema.sql`, `supabase/migrations/003_rls_policies.sql`.
- No additional migration changes were required in this audit cycle.

## CI Contract Verification

Validated command chain (local):
1. `npm ci`
2. `npm run lint --if-present`
3. `npm run typecheck --if-present`
4. `npm run test --if-present`
5. `npm run build`

Result: PASS in this environment.
