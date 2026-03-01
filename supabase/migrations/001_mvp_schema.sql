create extension if not exists "pgcrypto";

create type app_role as enum ('Admin','Office','Crew','Customer');
create type doc_status as enum ('draft','draft_sent','finalized');

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role app_role not null,
  full_name text,
  phone text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  phone text,
  full_name text,
  created_at timestamptz not null default now(),
  unique(tenant_id, email)
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  service_address text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists job_visits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  start_time timestamptz not null,
  eta timestamptz,
  arrival_window_end timestamptz generated always as (start_time + interval '1 hour') stored,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  crew_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(job_id, crew_user_id)
);

create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_customer_id uuid references customers(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  message_id uuid references messages(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  status doc_status not null default 'draft',
  finalized_by_admin_at timestamptz,
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null,
  unit_price numeric(12,2) not null
);

create table if not exists change_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  status doc_status not null default 'draft',
  finalized_by_admin_at timestamptz,
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null,
  unit_price numeric(12,2) not null
);

create table if not exists invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists portal_magic_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  token_prefix text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null
);

create table if not exists api_rate_limits (
  id bigint generated by default as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create or replace function current_tenant_id() returns uuid language sql stable as $$
  select tenant_id from user_profiles where user_id = auth.uid()
$$;

create or replace function current_role() returns app_role language sql stable as $$
  select role from user_profiles where user_id = auth.uid()
$$;

create or replace function is_admin_or_office() returns boolean language sql stable as $$
  select current_role() in ('Admin','Office')
$$;

create or replace function can_access_job(_job_id uuid) returns boolean language sql stable as $$
  select
    current_role() in ('Admin','Office')
    or exists (select 1 from job_assignments a where a.job_id = _job_id and a.crew_user_id = auth.uid())
$$;

create or replace function is_customer_row(_customer_id uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from customers c
    where c.id = _customer_id
      and c.tenant_id = current_tenant_id()
      and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email',''))
  )
$$;

alter table tenants enable row level security;
alter table user_profiles enable row level security;
alter table customers enable row level security;
alter table jobs enable row level security;
alter table job_visits enable row level security;
alter table job_assignments enable row level security;
alter table quotes enable row level security;
alter table quote_line_items enable row level security;
alter table change_orders enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table invoice_payments enable row level security;
alter table message_threads enable row level security;
alter table messages enable row level security;
alter table attachments enable row level security;
alter table in_app_notifications enable row level security;
alter table audit_logs enable row level security;
alter table portal_magic_links enable row level security;
alter table api_rate_limits enable row level security;

create policy tenant_rw_tenants on tenants for all using (id = current_tenant_id()) with check (id = current_tenant_id());
create policy tenant_rw_profiles on user_profiles for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
create policy tenant_rw_customers on customers for all using (
  tenant_id = current_tenant_id() and (current_role() in ('Admin','Office') or is_customer_row(id) or exists (select 1 from jobs j join job_assignments a on a.job_id=j.id where j.customer_id=id and a.crew_user_id=auth.uid()))
) with check (tenant_id = current_tenant_id());
create policy tenant_rw_jobs on jobs for all using (
  tenant_id = current_tenant_id() and (current_role() in ('Admin','Office') or can_access_job(id) or is_customer_row(customer_id))
) with check (tenant_id = current_tenant_id());
create policy tenant_rw_job_visits on job_visits for all using (can_access_job(job_id) or current_role()='Office' or current_role()='Admin') with check (can_access_job(job_id) or current_role() in ('Office','Admin'));
create policy tenant_rw_assignments on job_assignments for all using (can_access_job(job_id) or current_role() in ('Office','Admin')) with check (current_role() in ('Office','Admin'));

create policy tenant_rw_quotes on quotes for all using (
  tenant_id = current_tenant_id() and (current_role() in ('Admin','Office') or can_access_job(job_id) or is_customer_row(customer_id))
) with check (
  tenant_id = current_tenant_id() and (current_role() = 'Admin' or status <> 'finalized')
);
create policy tenant_rw_quote_items on quote_line_items for all using (exists (select 1 from quotes q where q.id=quote_id and q.tenant_id=current_tenant_id())) with check (exists (select 1 from quotes q where q.id=quote_id and q.tenant_id=current_tenant_id()));

create policy tenant_rw_change_orders on change_orders for all using (
  tenant_id = current_tenant_id() and (current_role() in ('Admin','Office') or can_access_job(job_id))
) with check (tenant_id = current_tenant_id() and current_role() in ('Admin','Office'));

create policy tenant_rw_invoices on invoices for all using (
  tenant_id = current_tenant_id() and (current_role() in ('Admin','Office') or can_access_job(job_id) or is_customer_row(customer_id))
) with check (
  tenant_id = current_tenant_id() and (current_role() = 'Admin' or status <> 'finalized')
);
create policy tenant_rw_invoice_items on invoice_line_items for all using (exists (select 1 from invoices i where i.id=invoice_id and i.tenant_id=current_tenant_id())) with check (exists (select 1 from invoices i where i.id=invoice_id and i.tenant_id=current_tenant_id()));
create policy tenant_rw_invoice_payments on invoice_payments for all using (exists (select 1 from invoices i where i.id=invoice_id and i.tenant_id=current_tenant_id()) and current_role() <> 'Customer') with check (current_role() <> 'Customer');

create policy tenant_rw_threads on message_threads for all using (
  tenant_id = current_tenant_id() and (current_role() in ('Admin','Office') or (job_id is not null and can_access_job(job_id)) or (customer_id is not null and is_customer_row(customer_id)))
) with check (tenant_id = current_tenant_id());
create policy tenant_rw_messages on messages for all using (
  exists (select 1 from message_threads t where t.id=thread_id and t.tenant_id=current_tenant_id())
) with check (
  exists (select 1 from message_threads t where t.id=thread_id and t.tenant_id=current_tenant_id())
);
create policy tenant_rw_attachments on attachments for all using (
  tenant_id=current_tenant_id() and (
    current_role() in ('Admin','Office')
    or exists (select 1 from messages m join message_threads t on t.id=m.thread_id where m.id=message_id and t.job_id is not null and can_access_job(t.job_id))
    or exists (select 1 from messages m join message_threads t on t.id=m.thread_id where m.id=message_id and t.customer_id is not null and is_customer_row(t.customer_id))
  )
) with check (tenant_id=current_tenant_id());

create policy tenant_rw_notifications on in_app_notifications for all using (tenant_id=current_tenant_id()) with check (tenant_id=current_tenant_id());
create policy tenant_rw_audit on audit_logs for all using (tenant_id=current_tenant_id() and current_role() in ('Admin','Office')) with check (tenant_id=current_tenant_id());
create policy tenant_rw_portal_links on portal_magic_links for all using (
  tenant_id=current_tenant_id() and current_role() in ('Admin','Office')
) with check (tenant_id=current_tenant_id());
create policy staff_rw_rate_limits on api_rate_limits for all using (current_role() in ('Admin','Office')) with check (true);

create publication supabase_realtime_messages for table messages;
