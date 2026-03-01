create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt()->>'tenant_id', '')::uuid
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt()->>'role', '')
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt()->>'customer_id', '')::uuid
$$;

create or replace function public.customer_matches(custom_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from customers c
    where c.id = custom_id
      and c.tenant_id = current_tenant_id()
      and (
        c.id = current_customer_id()
        or (
          lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
          and regexp_replace(coalesce(c.phone, ''), '\\D','','g') = regexp_replace(coalesce(auth.jwt()->>'phone', ''), '\\D','','g')
        )
      )
  )
$$;

create or replace function public.crew_can_access_job(target_job_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from job_assignments a
    join jobs j on j.id = a.job_id
    where a.job_id = target_job_id
      and a.crew_user_id = auth.uid()
      and j.tenant_id = current_tenant_id()
  )
$$;

create or replace function public.staff_tenant_access(required_roles text[])
returns boolean
language sql
stable
as $$
  select current_tenant_id() is not null and current_app_role() = any(required_roles)
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
alter table in_app_notifications enable row level security;
alter table attachments enable row level security;
alter table audit_logs enable row level security;
alter table quotes enable row level security;
alter table quote_line_items enable row level security;
alter table change_orders enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table invoice_payments enable row level security;
alter table portal_magic_links enable row level security;
alter table api_rate_limits enable row level security;

drop policy if exists tenants_access on tenants;
create policy tenants_access on tenants for all
using (
  id = current_tenant_id() and staff_tenant_access(array['Admin','Office','Crew'])
)
with check (
  id = current_tenant_id() and staff_tenant_access(array['Admin'])
);

drop policy if exists user_profiles_access on user_profiles;
create policy user_profiles_access on user_profiles for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or user_id = auth.uid()
  )
)
with check (
  tenant_id = current_tenant_id() and staff_tenant_access(array['Admin'])
);

drop policy if exists customers_access on customers;
create policy customers_access on customers for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and exists (select 1 from jobs j where j.customer_id = customers.id and crew_can_access_job(j.id)))
    or (current_app_role() = 'Customer' and customer_matches(customers.id))
  )
)
with check (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Customer' and customer_matches(customers.id))
  )
);

drop policy if exists customer_properties_access on customer_properties;
create policy customer_properties_access on customer_properties for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and exists (select 1 from jobs j where j.property_id = customer_properties.id and crew_can_access_job(j.id)))
    or (current_app_role() = 'Customer' and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Customer' and customer_matches(customer_id))
  )
);

drop policy if exists jobs_access on jobs;
create policy jobs_access on jobs for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and crew_can_access_job(id))
    or (current_app_role() = 'Customer' and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and crew_can_access_job(id))
  )
);

drop policy if exists job_visits_access on job_visits;
create policy job_visits_access on job_visits for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and crew_can_access_job(job_id))
    or (current_app_role() = 'Customer' and exists (select 1 from jobs j where j.id = job_visits.job_id and customer_matches(j.customer_id)))
  )
)
with check (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and crew_can_access_job(job_id))
  )
);

drop policy if exists job_assignments_access on job_assignments;
create policy job_assignments_access on job_assignments for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and crew_user_id = auth.uid() and crew_can_access_job(job_id))
  )
)
with check (
  tenant_id = current_tenant_id() and staff_tenant_access(array['Admin','Office'])
);

drop policy if exists message_threads_access on message_threads;
create policy message_threads_access on message_threads for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and job_id is not null and crew_can_access_job(job_id))
    or (current_app_role() = 'Customer' and customer_id is not null and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office','Crew'])
    or (current_app_role() = 'Customer' and customer_id is not null and customer_matches(customer_id))
  )
);

drop policy if exists messages_access on messages;
create policy messages_access on messages for all
using (
  tenant_id = current_tenant_id() and exists (
    select 1 from message_threads t
    where t.id = messages.thread_id and (
      staff_tenant_access(array['Admin','Office'])
      or (current_app_role() = 'Crew' and t.job_id is not null and crew_can_access_job(t.job_id))
      or (current_app_role() = 'Customer' and t.customer_id is not null and customer_matches(t.customer_id))
    )
  )
)
with check (
  tenant_id = current_tenant_id() and exists (
    select 1 from message_threads t
    where t.id = messages.thread_id and (
      staff_tenant_access(array['Admin','Office','Crew'])
      or (current_app_role() = 'Customer' and t.customer_id is not null and customer_matches(t.customer_id))
    )
  )
);

drop policy if exists notifications_access on in_app_notifications;
create policy notifications_access on in_app_notifications for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and exists (select 1 from jobs j where j.id = related_job_id and crew_can_access_job(j.id)))
    or (current_app_role() = 'Customer' and user_id = auth.uid())
  )
)
with check (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and exists (select 1 from jobs j where j.id = related_job_id and crew_can_access_job(j.id)))
  )
);

drop policy if exists attachments_access on attachments;
create policy attachments_access on attachments for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and exists (
      select 1 from message_threads t join messages m on m.thread_id = t.id
      where m.id = attachments.message_id and t.job_id is not null and crew_can_access_job(t.job_id)
    ))
    or (current_app_role() = 'Customer' and exists (
      select 1 from message_threads t join messages m on m.thread_id = t.id
      where m.id = attachments.message_id and t.customer_id is not null and customer_matches(t.customer_id)
    ))
  )
)
with check (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office','Crew'])
    or (current_app_role() = 'Customer' and exists (
      select 1 from message_threads t join messages m on m.thread_id = t.id
      where m.id = attachments.message_id and t.customer_id is not null and customer_matches(t.customer_id)
    ))
  )
);

drop policy if exists quotes_access on quotes;
create policy quotes_access on quotes for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and job_id is not null and crew_can_access_job(job_id))
    or (current_app_role() = 'Customer' and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id() and (
    (current_app_role() = 'Admin')
    or (current_app_role() = 'Office' and status <> 'finalized')
  )
);

drop policy if exists quote_line_items_access on quote_line_items;
create policy quote_line_items_access on quote_line_items for all
using (
  tenant_id = current_tenant_id() and exists (select 1 from quotes q where q.id = quote_id)
)
with check (
  tenant_id = current_tenant_id() and exists (
    select 1 from quotes q
    where q.id = quote_id and (
      current_app_role() = 'Admin'
      or (current_app_role() = 'Office' and q.status <> 'finalized')
    )
  )
);

drop policy if exists change_orders_access on change_orders;
create policy change_orders_access on change_orders for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and crew_can_access_job(job_id))
    or (current_app_role() = 'Customer' and customer_id is not null and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id() and staff_tenant_access(array['Admin','Office'])
);

drop policy if exists invoices_access on invoices;
create policy invoices_access on invoices for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Crew' and job_id is not null and crew_can_access_job(job_id))
    or (current_app_role() = 'Customer' and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id() and (
    current_app_role() = 'Admin'
    or (current_app_role() = 'Office' and status <> 'finalized')
  )
);

drop policy if exists invoice_line_items_access on invoice_line_items;
create policy invoice_line_items_access on invoice_line_items for all
using (
  tenant_id = current_tenant_id() and exists (select 1 from invoices i where i.id = invoice_id)
)
with check (
  tenant_id = current_tenant_id() and exists (
    select 1 from invoices i
    where i.id = invoice_id and (
      current_app_role() = 'Admin'
      or (current_app_role() = 'Office' and i.status <> 'finalized')
    )
  )
);

drop policy if exists invoice_payments_access on invoice_payments;
create policy invoice_payments_access on invoice_payments for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Customer' and exists (select 1 from invoices i where i.id = invoice_id and customer_matches(i.customer_id)))
  )
)
with check (
  tenant_id = current_tenant_id() and staff_tenant_access(array['Admin'])
);

drop policy if exists audit_logs_access on audit_logs;
create policy audit_logs_access on audit_logs for all
using (tenant_id = current_tenant_id() and staff_tenant_access(array['Admin','Office']))
with check (tenant_id = current_tenant_id() and staff_tenant_access(array['Admin','Office']));

drop policy if exists portal_links_access on portal_magic_links;
create policy portal_links_access on portal_magic_links for all
using (
  tenant_id = current_tenant_id() and (
    staff_tenant_access(array['Admin','Office'])
    or (current_app_role() = 'Customer' and customer_matches(customer_id))
  )
)
with check (
  tenant_id = current_tenant_id() and staff_tenant_access(array['Admin','Office'])
);

drop policy if exists rate_limits_access on api_rate_limits;
create policy rate_limits_access on api_rate_limits for all
using (
  coalesce(tenant_id, current_tenant_id()) = current_tenant_id()
  and (staff_tenant_access(array['Admin','Office']) or current_app_role() = 'Customer')
)
with check (
  coalesce(tenant_id, current_tenant_id()) = current_tenant_id()
  and (staff_tenant_access(array['Admin','Office']) or current_app_role() = 'Customer')
);

alter publication supabase_realtime add table message_threads;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table in_app_notifications;
