-- Canonical RLS hardening for tenant isolation and role-aware authorization.

create or replace function public.current_tenant_id() returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid
$$;

create or replace function public.current_role() returns app_role
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'role')::app_role, 'Customer'::app_role)
$$;

create or replace function public.is_staff() returns boolean
language sql
stable
as $$
  select current_role() in ('Admin', 'Office', 'Crew')
$$;

create or replace function public.is_admin() returns boolean
language sql
stable
as $$
  select current_role() = 'Admin'
$$;

create or replace function public.is_office() returns boolean
language sql
stable
as $$
  select current_role() = 'Office'
$$;

create or replace function public.is_crew() returns boolean
language sql
stable
as $$
  select current_role() = 'Crew'
$$;

create or replace function public.customer_matches(_customer_id uuid) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from customers c
    where c.id = _customer_id
      and c.tenant_id = current_tenant_id()
      and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (
        c.phone is null
        or coalesce(auth.jwt() ->> 'phone', '') = ''
        or regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '[^0-9]', '', 'g')
      )
  )
$$;

create or replace function public.crew_assigned_to_job(_job_id uuid) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from job_assignments ja
    where ja.job_id = _job_id
      and ja.tenant_id = current_tenant_id()
      and ja.assigned_to = auth.uid()
  )
$$;

create or replace function public.can_access_job(_job_id uuid) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jobs j
    where j.id = _job_id
      and j.tenant_id = current_tenant_id()
      and (
        is_admin()
        or is_office()
        or (is_crew() and crew_assigned_to_job(j.id))
        or customer_matches(j.customer_id)
      )
  )
$$;

create or replace function public.can_access_thread(_thread_id uuid) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from message_threads mt
    left join jobs j on j.id = mt.job_id
    where mt.id = _thread_id
      and mt.tenant_id = current_tenant_id()
      and (
        is_admin()
        or is_office()
        or (is_crew() and mt.job_id is not null and crew_assigned_to_job(mt.job_id))
        or (mt.customer_id is not null and customer_matches(mt.customer_id))
        or (mt.customer_id is null and j.customer_id is not null and customer_matches(j.customer_id))
      )
  )
$$;

alter table tenants enable row level security;
alter table user_profiles enable row level security;
alter table customers enable row level security;
alter table customer_properties enable row level security;
alter table jobs enable row level security;
alter table job_visits enable row level security;
alter table job_assignments enable row level security;
alter table message_threads enable row level security;
alter table messages enable row level security;
alter table attachments enable row level security;
alter table quotes enable row level security;
alter table quote_line_items enable row level security;
alter table change_orders enable row level security;
alter table change_order_line_items enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table invoice_payments enable row level security;
alter table in_app_notifications enable row level security;
alter table audit_logs enable row level security;
alter table portal_magic_links enable row level security;
alter table api_rate_limits enable row level security;

drop policy if exists tenants_policy on tenants;
create policy tenants_policy on tenants
for all
using (id = current_tenant_id() and (is_admin() or is_office()))
with check (id = current_tenant_id() and (is_admin() or is_office()));

drop policy if exists user_profiles_policy on user_profiles;
create policy user_profiles_policy on user_profiles
for all
using (tenant_id = current_tenant_id() and (is_admin() or is_office()))
with check (tenant_id = current_tenant_id() and (is_admin() or is_office()));

drop policy if exists customers_policy on customers;
create policy customers_policy on customers
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and exists (select 1 from jobs j where j.customer_id = customers.id and crew_assigned_to_job(j.id)))
    or customer_matches(customers.id)
  )
)
with check (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and exists (select 1 from jobs j where j.customer_id = customers.id and crew_assigned_to_job(j.id)))
    or customer_matches(customers.id)
  )
);

drop policy if exists customer_properties_policy on customer_properties;
create policy customer_properties_policy on customer_properties
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and exists (select 1 from jobs j where j.customer_property_id = customer_properties.id and crew_assigned_to_job(j.id)))
    or customer_matches(customer_id)
  )
)
with check (
  tenant_id = current_tenant_id()
  and (is_admin() or is_office())
);

drop policy if exists jobs_policy on jobs;
create policy jobs_policy on jobs
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and crew_assigned_to_job(id))
    or customer_matches(customer_id)
  )
)
with check (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and crew_assigned_to_job(id))
  )
);

drop policy if exists job_visits_policy on job_visits;
create policy job_visits_policy on job_visits
for all
using (
  tenant_id = current_tenant_id()
  and can_access_job(job_id)
)
with check (
  tenant_id = current_tenant_id()
  and (is_admin() or is_office() or (is_crew() and crew_assigned_to_job(job_id)))
);

drop policy if exists job_assignments_policy on job_assignments;
create policy job_assignments_policy on job_assignments
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and assigned_to = auth.uid())
  )
)
with check (
  tenant_id = current_tenant_id()
  and (is_admin() or is_office())
);

drop policy if exists message_threads_policy on message_threads;
create policy message_threads_policy on message_threads
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and job_id is not null and crew_assigned_to_job(job_id))
    or (customer_id is not null and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and job_id is not null and crew_assigned_to_job(job_id))
    or (customer_id is not null and customer_matches(customer_id))
  )
);

drop policy if exists messages_policy on messages;
create policy messages_policy on messages
for all
using (
  tenant_id = current_tenant_id()
  and can_access_thread(thread_id)
)
with check (
  tenant_id = current_tenant_id()
  and can_access_thread(thread_id)
  and (
    is_admin()
    or is_office()
    or (is_crew() and sender_user_id = auth.uid())
    or (current_role() = 'Customer' and sender_customer_id is not null and customer_matches(sender_customer_id))
  )
);

drop policy if exists attachments_policy on attachments;
create policy attachments_policy on attachments
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and ((job_id is not null and crew_assigned_to_job(job_id)) or (thread_id is not null and can_access_thread(thread_id))))
    or (customer_id is not null and customer_matches(customer_id))
    or (thread_id is not null and can_access_thread(thread_id))
  )
)
with check (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and (job_id is not null and crew_assigned_to_job(job_id)))
    or (customer_id is not null and customer_matches(customer_id))
  )
);

drop policy if exists quotes_policy on quotes;
create policy quotes_policy on quotes
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and job_id is not null and crew_assigned_to_job(job_id))
    or customer_matches(customer_id)
  )
)
with check (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or (
      is_office()
      and status <> 'finalized'::quote_status
      and finalized_at is null
      and finalized_by_user_id is null
    )
  )
);

drop policy if exists quote_line_items_policy on quote_line_items;
create policy quote_line_items_policy on quote_line_items
for all
using (
  tenant_id = current_tenant_id()
  and exists (select 1 from quotes q where q.id = quote_line_items.quote_id and q.tenant_id = current_tenant_id())
)
with check (
  tenant_id = current_tenant_id()
  and exists (select 1 from quotes q where q.id = quote_line_items.quote_id and q.tenant_id = current_tenant_id() and (is_admin() or (is_office() and q.status <> 'finalized'::quote_status)))
);

drop policy if exists change_orders_policy on change_orders;
create policy change_orders_policy on change_orders
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and job_id is not null and crew_assigned_to_job(job_id))
    or (customer_id is not null and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id() and (is_admin() or is_office())
);

drop policy if exists change_order_line_items_policy on change_order_line_items;
create policy change_order_line_items_policy on change_order_line_items
for all
using (
  tenant_id = current_tenant_id()
  and exists (select 1 from change_orders co where co.id = change_order_line_items.change_order_id and co.tenant_id = current_tenant_id())
)
with check (
  tenant_id = current_tenant_id()
  and exists (select 1 from change_orders co where co.id = change_order_line_items.change_order_id and co.tenant_id = current_tenant_id() and (is_admin() or is_office()))
);

drop policy if exists invoices_policy on invoices;
create policy invoices_policy on invoices
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and job_id is not null and crew_assigned_to_job(job_id))
    or customer_matches(customer_id)
  )
)
with check (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or (
      is_office()
      and status <> 'finalized'::invoice_status
      and status <> 'paid'::invoice_status
      and finalized_at is null
      and finalized_by_user_id is null
    )
  )
);

drop policy if exists invoice_line_items_policy on invoice_line_items;
create policy invoice_line_items_policy on invoice_line_items
for all
using (
  tenant_id = current_tenant_id()
  and exists (select 1 from invoices i where i.id = invoice_line_items.invoice_id and i.tenant_id = current_tenant_id())
)
with check (
  tenant_id = current_tenant_id()
  and exists (select 1 from invoices i where i.id = invoice_line_items.invoice_id and i.tenant_id = current_tenant_id() and (is_admin() or (is_office() and i.status <> 'finalized'::invoice_status and i.status <> 'paid'::invoice_status)))
);

drop policy if exists invoice_payments_policy on invoice_payments;
create policy invoice_payments_policy on invoice_payments
for all
using (
  tenant_id = current_tenant_id()
  and exists (select 1 from invoices i where i.id = invoice_payments.invoice_id and i.tenant_id = current_tenant_id())
  and (is_admin() or is_office())
)
with check (
  tenant_id = current_tenant_id()
  and exists (select 1 from invoices i where i.id = invoice_payments.invoice_id and i.tenant_id = current_tenant_id() and is_admin())
);

drop policy if exists notifications_policy on in_app_notifications;
create policy notifications_policy on in_app_notifications
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and user_id = auth.uid())
    or (customer_id is not null and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or (is_crew() and user_id = auth.uid())
  )
);

drop policy if exists audit_logs_policy on audit_logs;
create policy audit_logs_policy on audit_logs
for all
using (tenant_id = current_tenant_id() and (is_admin() or is_office()))
with check (tenant_id = current_tenant_id() and (is_admin() or is_office()));

drop policy if exists portal_magic_links_policy on portal_magic_links;
create policy portal_magic_links_policy on portal_magic_links
for all
using (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
    or customer_matches(customer_id)
  )
)
with check (
  tenant_id = current_tenant_id()
  and (
    is_admin()
    or is_office()
  )
);

drop policy if exists api_rate_limits_policy on api_rate_limits;
create policy api_rate_limits_policy on api_rate_limits
for all
using (
  (tenant_id is null and is_staff())
  or (tenant_id = current_tenant_id() and (is_admin() or is_office()))
)
with check (
  (tenant_id is null and is_staff())
  or (tenant_id = current_tenant_id() and (is_admin() or is_office()))
);

-- Realtime publication safety note:
-- Supabase uses SELECT policies for realtime streams. The additions below rely on the
-- table-level SELECT paths above to enforce tenant and role-based isolation.
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.in_app_notifications;
  exception when duplicate_object then
    null;
  end;
end $$;
