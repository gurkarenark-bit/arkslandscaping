# Parity Checklist

Tracks feature parity between `docs/SPEC.md` + `docs/CHAT_CONTEXT.md` and implementation.

## Roles & permissions
**Status: PARTIAL**
- Staff portal now has an auth gate UX with Supabase email/password sign-in flow and role-aware navigation for Admin/Office/Crew.
- UI pathways now enforce Admin/Office/Crew capabilities (job creation/editing/assignment for Admin+Office; finalize action for Admin only; crew-focused job visibility).
- Full server-verified staff session + role claim wiring still depends on Supabase Auth profile/claims integration in deployment.

## Magic link auth
**Status: COMPLIANT**
- Request endpoint stores only `token_hash`, sets 14-day expiry, rate-limits requests, and captures request metadata.
- Consume flow validates token hash, keeps links reusable until expiry/revocation, updates `last_used_at`, and sets httpOnly portal session cookie.
- Admin-only revoke endpoint supports revoke-by-link-id or revoke-by-customer.
- Portal login page now exposes dev-mode magic-link JSON + clickable link for local UX verification.

## Jobs + scheduling
**Status: PARTIAL**
- Staff dashboard and jobs screens now include lifecycle states, multi-visit lists, visit edit/add UX, and crew assignment controls.
- New schedule page provides week/day toggles with visit cards including start time and 1-hour arrival window.
- Reschedule is currently implemented as lightweight in-page modal substitute; full drag/drop and hard conflict validation remain pending.

## Messaging + realtime
**Status: PARTIAL**
- Staff and customer portals now include inbox thread list, thread detail, and compose flows in UI.
- Both inboxes subscribe to Supabase Realtime inserts to show live update counters.
- End-to-end persisted thread reads/writes are still partially demo/local-state in UI and need final DB-backed hydration.

## Draft/finalize workflow
**Status: COMPLIANT**
- Admin-only finalize endpoints remain enforced at API layer.
- Office draft send path now creates explicit "Finalize needed" admin notification.
- Staff UI now includes send-draft + finalize controls and customer e-sign gating until finalized.

## Upload hardening
**Status: COMPLIANT**
- Allowed mime types are constrained to pdf/jpg/jpeg/png/heic.
- 25MB size cap + server-side signature checks are enforced before storage upload.
- Uploads target private storage paths and return signed URLs; malware scanning is explicitly deferred as TODO.
- Customer quote request UI now supports attachment upload and signed URL preview links when available.

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
- Added UX workflow tests for crew visibility and e-sign gating behavior.
- Existing reusable-magic-link and health payload coverage retained.
