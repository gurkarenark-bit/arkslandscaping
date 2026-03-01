-- Canonical schema hardening for Ark Operations.
-- Single-tenant ready (Ark default) and multi-tenant capable by enforcing tenant_id
-- across all tenant-scoped tables.

create extension if not exists "pgcrypto";

-- Enums aligned to SPEC state machine + role model.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('Admin', 'Office', 'Crew', 'Customer');
  end if;
end $$;

alter type app_role add value if not exists 'Admin';
alter type app_role add value if not exists 'Office';
alter type app_role add value if not exists 'Crew';
alter type app_role add value if not exists 'Customer';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_visit_status') then
    create type job_visit_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type quote_status as enum ('draft', 'sent', 'finalized', 'accepted', 'rejected');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('draft', 'sent', 'finalized', 'paid', 'overdue');
  end if;
end $$;

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
  unique (tenant_id, email)
);

create table if not exists customer_properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  service_address text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  customer_property_id uuid references customer_properties(id) on delete set null,
  title text not null,
  service_address text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists job_visits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  scheduled_start timestamptz,
  start_time timestamptz,
  eta timestamptz,
  status job_visit_status not null default 'scheduled',
  arrival_window_start timestamptz generated always as (coalesce(scheduled_start, start_time)) stored,
  arrival_window_end timestamptz generated always as (coalesce(scheduled_start, start_time) + interval '1 hour') stored,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists job_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  visit_id uuid references job_visits(id) on delete cascade,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, assigned_to)
);

create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_customer_id uuid references customers(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  thread_id uuid references message_threads(id) on delete set null,
  message_id uuid references messages(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,
  change_order_id uuid references change_orders(id) on delete set null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  status quote_status not null default 'draft',
  finalized_at timestamptz,
  finalized_by_user_id uuid references auth.users(id) on delete set null,
  subtotal numeric(12, 2) not null default 0,
  tax_hst numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  customer_signed_name text,
  customer_signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists quote_line_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  quote_id uuid not null references quotes(id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null,
  unit_price numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists change_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,
  status text not null default 'draft',
  customer_signed_name text,
  customer_signed_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists change_order_line_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  change_order_id uuid not null references change_orders(id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null,
  unit_price numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,
  status invoice_status not null default 'draft',
  finalized_at timestamptz,
  finalized_by_user_id uuid references auth.users(id) on delete set null,
  subtotal numeric(12, 2) not null default 0,
  tax_hst numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  deposit_amount numeric(12, 2) not null default 0,
  balance_due numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null,
  unit_price numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists invoice_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12, 2) not null,
  method text not null default 'manual',
  marked_paid_by_user_id uuid references auth.users(id) on delete set null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'unread',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id uuid,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists portal_magic_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null
);

create table if not exists api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, key, window_start)
);

-- Ensure canonical columns exist on pre-existing MVP tables.
alter table if exists jobs add column if not exists status text not null default 'scheduled';
alter table if exists job_visits add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists job_visits add column if not exists scheduled_start timestamptz;
alter table if exists job_visits add column if not exists status job_visit_status not null default 'scheduled';
alter table if exists job_assignments add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists job_assignments add column if not exists assigned_to uuid references auth.users(id) on delete cascade;
alter table if exists messages add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists quote_line_items add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists invoice_line_items add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists invoice_payments add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- Remove non-canonical token prefix storage if present.
alter table if exists portal_magic_links drop column if exists token_prefix;

-- Indexes for tenancy and frequent access paths.
create index if not exists idx_user_profiles_tenant_id on user_profiles(tenant_id);
create index if not exists idx_customers_tenant_id on customers(tenant_id);
create index if not exists idx_jobs_tenant_id on jobs(tenant_id);
create index if not exists idx_jobs_customer_id on jobs(customer_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_created_at on jobs(created_at);
create index if not exists idx_job_visits_tenant_id on job_visits(tenant_id);
create index if not exists idx_job_visits_job_id on job_visits(job_id);
create index if not exists idx_job_visits_status on job_visits(status);
create index if not exists idx_job_visits_created_at on job_visits(created_at);
create index if not exists idx_job_assignments_tenant_id on job_assignments(tenant_id);
create index if not exists idx_job_assignments_job_id on job_assignments(job_id);
create index if not exists idx_job_assignments_assigned_to on job_assignments(assigned_to);
create index if not exists idx_message_threads_tenant_id on message_threads(tenant_id);
create index if not exists idx_message_threads_customer_id on message_threads(customer_id);
create index if not exists idx_message_threads_job_id on message_threads(job_id);
create index if not exists idx_messages_tenant_id on messages(tenant_id);
create index if not exists idx_messages_thread_id on messages(thread_id);
create index if not exists idx_messages_created_at on messages(created_at);
create index if not exists idx_attachments_tenant_id on attachments(tenant_id);
create index if not exists idx_attachments_job_id on attachments(job_id);
create index if not exists idx_attachments_thread_id on attachments(thread_id);
create index if not exists idx_attachments_created_at on attachments(created_at);
create index if not exists idx_quotes_tenant_id on quotes(tenant_id);
create index if not exists idx_quotes_customer_id on quotes(customer_id);
create index if not exists idx_quotes_job_id on quotes(job_id);
create index if not exists idx_quotes_status on quotes(status);
create index if not exists idx_quotes_created_at on quotes(created_at);
create index if not exists idx_quote_line_items_tenant_id on quote_line_items(tenant_id);
create index if not exists idx_quote_line_items_quote_id on quote_line_items(quote_id);
create index if not exists idx_change_orders_tenant_id on change_orders(tenant_id);
create index if not exists idx_change_orders_job_id on change_orders(job_id);
create index if not exists idx_invoices_tenant_id on invoices(tenant_id);
create index if not exists idx_invoices_customer_id on invoices(customer_id);
create index if not exists idx_invoices_job_id on invoices(job_id);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_created_at on invoices(created_at);
create index if not exists idx_invoice_line_items_tenant_id on invoice_line_items(tenant_id);
create index if not exists idx_invoice_line_items_invoice_id on invoice_line_items(invoice_id);
create index if not exists idx_invoice_payments_tenant_id on invoice_payments(tenant_id);
create index if not exists idx_invoice_payments_created_at on invoice_payments(created_at);
create index if not exists idx_notifications_tenant_id on in_app_notifications(tenant_id);
create index if not exists idx_notifications_created_at on in_app_notifications(created_at);
create index if not exists idx_notifications_status on in_app_notifications(status);
create index if not exists idx_audit_logs_tenant_id on audit_logs(tenant_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at);
create index if not exists idx_magic_links_tenant_id on portal_magic_links(tenant_id);
create index if not exists idx_magic_links_customer_id on portal_magic_links(customer_id);
create index if not exists idx_magic_links_created_at on portal_magic_links(created_at);
create index if not exists idx_api_rate_limits_tenant_id on api_rate_limits(tenant_id);
create index if not exists idx_api_rate_limits_created_at on api_rate_limits(created_at);
