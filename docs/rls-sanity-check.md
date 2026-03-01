# RLS sanity checks

Run these checks after applying migrations:

```sql
-- Confirm RLS is enabled on all required tables.
select tablename, rowsecurity
from pg_tables
join pg_class on pg_class.relname = pg_tables.tablename
where schemaname = 'public'
  and tablename in (
    'tenants','user_profiles','customers','jobs','job_visits','job_assignments',
    'quotes','quote_line_items','change_orders','invoices','invoice_line_items','invoice_payments',
    'message_threads','messages','attachments','in_app_notifications','audit_logs','portal_magic_links'
  )
order by tablename;

-- Verify Office cannot set finalized status.
-- (Run as Office user)
update quotes set status = 'finalized' where id = '<quote-id>';

-- Verify Crew only sees assigned jobs.
-- (Run as Crew user)
select id, title from jobs;

-- Verify customer visibility tied to matching customer email.
-- (Run as Customer auth context)
select id, status from invoices;
```

Expected:
- `rowsecurity = true` for all listed tables.
- Office finalize update is denied by policy.
- Crew only receives assigned jobs.
- Customer sees only their rows.
