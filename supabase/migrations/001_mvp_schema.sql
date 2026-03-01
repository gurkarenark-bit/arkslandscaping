create extension if not exists "pgcrypto";

create type app_role as enum ('Admin','Office','Crew','Customer');
create type doc_status as enum ('draft','draft_sent','finalized');

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
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
  created_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
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
  tenant_id uuid references tenants(id) on delete cascade,
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
  tenant_id uuid references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create or replace function current_tenant_id() returns uuid language sql stable as $$
  select tenant_id from user_profiles where user_id = auth.uid()
$$;

create or replace function current_role() returns app_role language sql stable as $$
  select role from user_profiles where user_id = auth.uid()
$$;

alter table tenants enable row level security;
alter table user_profiles enable row level security;
alter table customers enable row level security;
alter table jobs enable row level security;
alter table job_visits enable row level security;
alter table job_assignments enable row level security;
alter table message_threads enable row level security;
alter table messages enable row level security;
alter table attachments enable row level security;
alter table quotes enable row level security;
alter table invoices enable row level security;
alter table change_orders enable row level security;
alter table in_app_notifications enable row level security;
alter table invoice_payments enable row level security;

create policy tenant_isolation_customers on customers for all using (tenant_id = current_tenant_id());
create policy tenant_isolation_jobs on jobs for all using (tenant_id = current_tenant_id());
create policy tenant_isolation_threads on message_threads for all using (tenant_id = current_tenant_id());
create policy tenant_isolation_quotes on quotes for all using (tenant_id = current_tenant_id());
create policy tenant_isolation_invoices on invoices for all using (tenant_id = current_tenant_id());

create policy crew_assigned_jobs on jobs for select using (
  current_role() <> 'Crew' or exists (
    select 1 from job_assignments a where a.job_id = jobs.id and a.crew_user_id = auth.uid()
  )
);

create policy office_cannot_finalize_quotes on quotes for update using (
  current_role() in ('Admin','Office')
) with check (
  current_role() = 'Admin' or status <> 'finalized'
);

create policy office_cannot_finalize_invoices on invoices for update using (
  current_role() in ('Admin','Office')
) with check (
  current_role() = 'Admin' or status <> 'finalized'
);

create policy customer_read_quotes on quotes for select using (
  current_role() = 'Customer' and customer_id in (
    select c.id from customers c where lower(c.email) = lower((auth.jwt() ->> 'email'))
  )
);

create policy customer_read_invoices on invoices for select using (
  current_role() = 'Customer' and customer_id in (
    select c.id from customers c where lower(c.email) = lower((auth.jwt() ->> 'email'))
  )
);

create policy customer_no_payments on invoice_payments for insert with check (
  current_role() <> 'Customer'
);

create policy crew_can_update_eta on job_visits for update using (
  current_role() in ('Admin','Crew')
);

create publication supabase_realtime_messages for table messages;
