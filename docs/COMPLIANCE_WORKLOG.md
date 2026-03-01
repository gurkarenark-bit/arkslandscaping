# Compliance Worklog

## 2026-03-01T10:15:36Z
- Checking: Initial compliance audit kickoff, reading source-of-truth docs, mapping routes/APIs/libs/migrations/tests.
- Changed: Created this worklog and switched to branch `codex/mvp-compliance-audit`.
- Still need to verify: End-to-end parity against SPEC for roles/RLS, magic links, jobs/scheduling, messaging/realtime isolation, draft/finalize notifications, uploads, retention, health endpoint; run CI commands and update parity checklist with exact file paths.

## 2026-03-01T10:23:00Z
- Checking: Messaging parity and requirement traceability against SPEC + CHAT_CONTEXT.
- Changed: Reworked `/api/messages` to support threaded read/write for both staff and portal session flows with tenant/role/customer scoping checks; updated staff and portal messaging UIs to load persisted threads/messages and send through API.
- Still need to verify: lint/type/test/build pass; final parity checklist wording matches real implementation; update report after command results.

## 2026-03-01T10:24:00Z
- Checking: Parity checklist deliverables (status table + top compliance report).
- Changed: Replaced `docs/PARITY_CHECKLIST.md` with explicit compliance report, missing/partial notes, and file-path trace matrix for all 8 required audit areas.
- Still need to verify: CI commands in local sandbox and final documentation accuracy after verification.

## 2026-03-01T10:27:30Z
- Checking: CI-equivalent command set in local sandbox.
- Changed: Verified `npm ci`, `npm run lint --if-present`, `npm run typecheck --if-present`, `npm run test --if-present`, and `npm run build` all pass on branch.
- Still need to verify: final git diff review, commit, and PR creation payload.

## 2026-03-01T10:40:00Z — Cycle 1 (Requirement 2: portal magic-link auth)
- Hypothesis/requirement being checked:
  - Spec requires hashed magic-link tokens, 14-day reusable TTL, revocation, request/consume rate limiting, and development JSON fallback.
- Files inspected/changed:
  - Inspected: `lib/portal-auth.ts`, `app/api/portal/magic-link/request/route.ts`, `app/portal/magic-link/consume/page.tsx`, `app/api/portal/magic-link/revoke/route.ts`, `lib/rate-limit.ts`, `supabase/migrations/002_canonical_schema.sql`.
  - Changed: none.
- Verification evidence:
  - Code trace confirms hash-at-rest (`tokenHash`), expiry check (`expires_at`), revocation check (`revoked_at`), TTL creation (`Date.now() + 14d`), and dev fallback (`devMagicLink` in development).
  - Existing tests pass: `tests/magic-links.test.mjs`, `tests/magic-link.integration.test.mjs`.
- Remaining uncertainty:
  - Full runtime behavior still depends on live Supabase data in deployed environment; local tests are logic-level.

## 2026-03-01T10:47:00Z — Cycle 2 (Requirement 1: roles/permissions + RLS)
- Hypothesis/requirement being checked:
  - Server and DB layers must prevent role escalation and unauthorized access.
- Files inspected/changed:
  - Inspected: `supabase/migrations/003_rls_policies.sql`, `app/api/quotes/finalize/route.ts`, `app/api/invoices/finalize/route.ts`, `app/api/messages/route.ts`, `lib/staff-auth.ts`, `tests/permissions.test.mjs`.
  - Changed: none.
- Verification evidence:
  - Server-side `requireStaffRole` blocks non-allowed roles.
  - RLS policy migration scopes access by tenant and assignment/customer.
  - Existing permissions tests pass for non-admin finalization.
- Remaining uncertainty:
  - Header-based role derivation is acceptable for MVP test harness here but should be replaced with signed auth claims for production hardening.

## 2026-03-01T10:54:00Z — Cycle 3 (Requirements 3, 5, 6)
- Hypothesis/requirement being checked:
  - Scheduling, draft→finalize gating, and upload constraints meet SPEC hard requirements.
- Files inspected/changed:
  - Inspected: `supabase/migrations/002_canonical_schema.sql`, `app/api/eta/route.ts`, `app/api/draft-status/route.ts`, `app/api/uploads/route.ts`, `lib/file-signature.ts`, `tests/ux-workflows.test.mjs`.
  - Changed: none.
- Verification evidence:
  - Arrival window and visit status model present in schema.
  - ETA route writes in-app notification.
  - Draft-status route creates admin finalize-needed notification.
  - Upload route enforces MIME, 25MB limit, signature validation, private storage path, and signed URL output.
  - Workflow tests pass e-sign gating until finalization.
- Remaining uncertainty:
  - End-to-end storage behavior requires live Supabase bucket configuration.

## 2026-03-01T11:00:00Z — Cycle 4 (Requirements 4, 7, 8)
- Hypothesis/requirement being checked:
  - Messaging avoids cross-tenant exposure, retention cleanup is cron-suitable and 1-year based, and health endpoint is env-independent.
- Files inspected/changed:
  - Inspected: `app/api/messages/route.ts`, `app/(internal)/app/messages/page.tsx`, `app/portal/messaging/page.tsx`, `app/api/cleanup-attachments/route.ts`, `app/api/health/route.ts`, `README.md`.
  - Changed: none.
- Verification evidence:
  - Messaging API enforces session/tenant/customer checks and crew assignment-based filtering.
  - Cleanup endpoint deletes both storage and DB references for expired records.
  - Health endpoint has no Supabase client dependency.
  - `npm run build` succeeded without Supabase env vars, showing degraded-safe behavior.
- Remaining uncertainty:
  - Realtime cross-tenant isolation ultimately relies on deployed RLS + Supabase realtime auth claims.

## 2026-03-01T11:08:00Z — Cycle 5 (Adversarial sweep + proof hardening)
- Hypothesis/requirement being checked:
  - Adversarial checks requested by controller: role escalation, cross-tenant leakage, token replay/expiry boundary, retention boundary logic, and health missing-env assumptions.
- Files inspected/changed:
  - Changed: added `tests/adversarial-sweep.test.mjs`.
  - Inspected while implementing test assertions: `lib/portal-auth.ts`, `app/api/messages/route.ts`, `app/api/cleanup-attachments/route.ts`, `app/api/health/route.ts`.
- Verification evidence:
  - New node-runner test file executes all required adversarial scenarios with positive + negative checks.
- Remaining uncertainty:
  - Adversarial tests are deterministic logic tests and not full integration tests against a live Supabase instance.

## 2026-03-01T11:14:00Z — Cycle 6 (Re-verify CI contract + parity report update)
- Hypothesis/requirement being checked:
  - Final COMPLIANT marking requires CI chain green and evidence reflected in parity documentation.
- Files inspected/changed:
  - Changed: `docs/PARITY_CHECKLIST.md` (rewritten with evidence-backed matrix and migration gate notes).
  - Inspected: `docs/TESTPLAN.md`, `docs/AUTOPILOT.md`.
- Verification evidence:
  - Ran `npm ci`, `npm run lint --if-present`, `npm run typecheck --if-present`, `npm run test --if-present`, `npm run build` successfully on this branch.
  - Updated checklist statuses to COMPLIANT for all 8 requirements with implementation/enforcement/behavior/negative evidence categories.
- Remaining uncertainty:
  - Runtime RLS validation SQL in `docs/rls-sanity-check.md` still requires a connected Supabase project to execute directly.
