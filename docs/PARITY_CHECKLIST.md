# Parity Checklist

Tracks feature parity between `docs/SPEC.md` + `docs/CHAT_CONTEXT.md` and implementation.

## Roles & permissions
**Status: PARTIAL**
- RLS hardening is now split into canonical migration (`002`) and dedicated policy migration (`003`) with explicit Admin/Office/Crew/Customer paths.
- Server-side API gates now enforce Admin-only finalize and revoke behavior for privileged actions.
- Full JWT-backed staff auth wiring still depends on Supabase Auth claim mapping in deployment.

## Magic link auth
**Status: COMPLIANT**
- Request endpoint stores only `token_hash`, sets 14-day expiry, rate-limits requests, and captures request metadata.
- Consume flow validates token hash, keeps links reusable until expiry/revocation, updates `last_used_at`, and sets httpOnly portal session cookie.
- Admin-only revoke endpoint supports revoke-by-link-id or revoke-by-customer.

## Jobs + scheduling
**Status: PARTIAL**
- Canonical schema includes lifecycle statuses and multi-visit table shape with arrival window fields.
- ETA API updates visit ETA and emits in-app notifications for Admin/Crew initiated changes.
- Full scheduling UI orchestration (outside-hours warning + double-book prevention UX) remains pending.

## Messaging + realtime
**Status: PARTIAL**
- Canonical schema and RLS include `message_threads`, `messages`, and notification scoping rules.
- Messaging API now requires staff role and emits in-app notifications.
- Client-side realtime subscription wiring/UI parity is still limited.

## Draft/finalize workflow
**Status: COMPLIANT**
- Admin-only finalize endpoints remain enforced at API layer.
- Office draft send path now creates explicit "Finalize needed" admin notification.
- Office finalize attempts are blocked in API and covered by test expectations.

## Upload hardening
**Status: COMPLIANT**
- Allowed mime types are constrained to pdf/jpg/jpeg/png/heic.
- 25MB size cap + server-side signature checks are enforced before storage upload.
- Uploads target private storage paths and return signed URLs; malware scanning is explicitly deferred as TODO.

## Retention cleanup
**Status: COMPLIANT**
- Cleanup endpoint now deletes 1-year-old attachments from storage.
- Matching DB references are removed in same run (no lingering "expired" records).
- Endpoint response includes cron guidance for Vercel scheduler wiring.

## Health endpoint
**Status: COMPLIANT**
- Added `/api/health` with stable payload shape and timestamp.
- Endpoint does not require Supabase env vars at build time.
- Missing env vars return `degraded` instead of throwing.

## CI / tests
**Status: COMPLIANT**
- Tests remain `.mjs` and run via `node --test tests/*.test.mjs`.
- Added contract-level checks for health payload and role finalization matrix.
- Existing reusable-magic-link unit coverage retained.
