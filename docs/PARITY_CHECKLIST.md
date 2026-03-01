# Parity Checklist

Tracks feature parity between SPEC and implementation.

| Feature | Status | File |
|--------|--------|------|
| Magic link auth | PARTIAL | `app/api/portal/magic-link/request/route.ts`, `app/portal/magic-link/consume/page.tsx`, `supabase/migrations/002_canonical_schema.sql`, `tests/magic-links.test.ts` |
| RLS policies | COMPLIANT | `supabase/migrations/003_rls_policies.sql`, `tests/permissions.test.ts` |
| Messaging realtime | COMPLIANT | `supabase/migrations/003_rls_policies.sql` (publication updates + SELECT-safe policies) |
| Uploads validation | PARTIAL | `supabase/migrations/002_canonical_schema.sql` (attachment schema only; server-side file signature validation still deferred) |
| Scheduling | COMPLIANT | `supabase/migrations/002_canonical_schema.sql` (jobs, visits, assignments, status enums, arrival window columns) |
| Quotes workflow | COMPLIANT | `supabase/migrations/002_canonical_schema.sql`, `supabase/migrations/003_rls_policies.sql` |
| Invoices workflow | COMPLIANT | `supabase/migrations/002_canonical_schema.sql`, `supabase/migrations/003_rls_policies.sql` |
| Notifications | COMPLIANT | `supabase/migrations/002_canonical_schema.sql`, `supabase/migrations/003_rls_policies.sql` |
| Retention cleanup | PARTIAL | `supabase/migrations/002_canonical_schema.sql` (`attachments.deleted_at` included; cleanup job still deferred) |
| Health endpoint | COMPLIANT | `app/api/health/route.ts`, `tests/health.test.ts` |
| README parity with SPEC + CHAT_CONTEXT | DONE | `README.md` |

## Notes / safe defaults chosen

- Customer access rules in RLS use tenant isolation + email matching with optional phone normalization checks; when customer phone is missing in JWT, email-only matching remains allowed to avoid accidental lockout.
- Office finalization is blocked at the database layer using strict `WITH CHECK` clauses on quote/invoice status + finalized metadata fields.
- Realtime publication updates are done with idempotent `ALTER PUBLICATION` blocks and rely on RLS SELECT paths to avoid cross-tenant leakage.
