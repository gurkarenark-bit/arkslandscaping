create extension if not exists "pgcrypto";

create type app_role as enum ('Admin','Office','Crew','Customer');
do $$ begin
  create type job_status as enum ('lead','quote','approved','scheduled','in_progress','completed','invoiced','closed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type visit_status as enum ('scheduled','in_progress','completed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type quote_status as enum ('draft','sent','finalized','accepted','rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type invoice_status as enum ('draft','sent','finalized','paid','overdue');
exception when duplicate_object then null; end $$;

alter table if exists tenants add column if not exists updated_at timestamptz not null default now();

alter table if exists user_profiles add column if not exists id uuid default gen_random_uuid();
alter table if exists user_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists customer_properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  label text,
  address_line1 text not null,
  address_line2 text,
  city text,
  province text,
  postal_code text,
  country text default 'CA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists customers add column if not exists updated_at timestamptz not null default now();
alter table if exists customers add column if not exists phone_normalized text;

alter table if exists jobs add column if not exists property_id uuid references customer_properties(id) on delete set null;
alter table if exists jobs add column if not exists status job_status not null default 'lead';
alter table if exists jobs add column if not exists updated_at timestamptz not null default now();

alter table if exists job_visits add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists job_visits add column if not exists status visit_status not null default 'scheduled';
alter table if exists job_visits add column if not exists arrival_window_start timestamptz;
alter table if exists job_visits add column if not exists updated_at timestamptz not null default now();
update job_visits set tenant_id = j.tenant_id, arrival_window_start = start_time from jobs j where j.id = job_visits.job_id and (job_visits.tenant_id is null or job_visits.arrival_window_start is null);
alter table if exists job_visits alter column tenant_id set not null;
alter table if exists job_visits alter column arrival_window_start set default now();
update job_visits set arrival_window_start = start_time where arrival_window_start is null;
alter table if exists job_visits alter column arrival_window_start set not null;

alter table if exists job_assignments add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists job_assignments add column if not exists updated_at timestamptz not null default now();
update job_assignments set tenant_id = j.tenant_id from jobs j where j.id = job_assignments.job_id and job_assignments.tenant_id is null;
alter table if exists job_assignments alter column tenant_id set not null;

alter table if exists message_threads add column if not exists updated_at timestamptz not null default now();
alter table if exists messages add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists messages add column if not exists updated_at timestamptz not null default now();
update messages m set tenant_id = t.tenant_id from message_threads t where t.id = m.thread_id and m.tenant_id is null;
alter table if exists messages alter column tenant_id set not null;

alter table if exists in_app_notifications add column if not exists related_job_id uuid references jobs(id) on delete set null;
alter table if exists in_app_notifications add column if not exists related_thread_id uuid references message_threads(id) on delete set null;
alter table if exists in_app_notifications add column if not exists read_at timestamptz;
alter table if exists in_app_notifications add column if not exists updated_at timestamptz not null default now();

alter table if exists attachments add column if not exists linked_entity_type text;
alter table if exists attachments add column if not exists linked_entity_id uuid;
alter table if exists attachments add column if not exists retention_delete_after timestamptz not null default (now() + interval '1 year');
alter table if exists attachments add column if not exists deleted_at timestamptz;
alter table if exists attachments add column if not exists updated_at timestamptz not null default now();

alter table if exists quotes add column if not exists status quote_status;
update quotes set status = case status::text when 'draft_sent' then 'sent' when 'finalized' then 'finalized' else 'draft' end where status::text in ('draft','draft_sent','finalized');
alter table if exists quotes alter column status set default 'draft';
alter table if exists quotes alter column status set not null;
alter table if exists quotes add column if not exists subtotal_amount numeric(12,2) not null default 0;
alter table if exists quotes add column if not exists hst_amount numeric(12,2) not null default 0;
alter table if exists quotes add column if not exists discount_amount numeric(12,2) not null default 0;
alter table if exists quotes add column if not exists approved_by_name text;
alter table if exists quotes add column if not exists approved_at timestamptz;
alter table if exists quotes add column if not exists updated_at timestamptz not null default now();

alter table if exists quote_line_items add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists quote_line_items add column if not exists line_total numeric(12,2) generated always as (quantity * unit_price) stored;
alter table if exists quote_line_items add column if not exists sort_order integer not null default 0;
alter table if exists quote_line_items add column if not exists updated_at timestamptz not null default now();
update quote_line_items qli set tenant_id = q.tenant_id from quotes q where q.id = qli.quote_id and qli.tenant_id is null;
alter table if exists quote_line_items alter column tenant_id set not null;

alter table if exists change_orders add column if not exists customer_id uuid references customers(id) on delete set null;
alter table if exists change_orders add column if not exists status quote_status not null default 'draft';
alter table if exists change_orders add column if not exists approved_by_name text;
alter table if exists change_orders add column if not exists approved_at timestamptz;
alter table if exists change_orders add column if not exists total_amount numeric(12,2) not null default 0;
alter table if exists change_orders add column if not exists updated_at timestamptz not null default now();

alter table if exists invoices add column if not exists status invoice_status;
update invoices set status = case status::text when 'draft_sent' then 'sent' when 'finalized' then 'finalized' else 'draft' end where status::text in ('draft','draft_sent','finalized');
alter table if exists invoices alter column status set default 'draft';
alter table if exists invoices alter column status set not null;
alter table if exists invoices add column if not exists quote_id uuid references quotes(id) on delete set null;
alter table if exists invoices add column if not exists subtotal_amount numeric(12,2) not null default 0;
alter table if exists invoices add column if not exists hst_amount numeric(12,2) not null default 0;
alter table if exists invoices add column if not exists deposit_amount numeric(12,2) not null default 0;
alter table if exists invoices add column if not exists balance_due numeric(12,2) not null default 0;
alter table if exists invoices add column if not exists marked_paid_at timestamptz;
alter table if exists invoices add column if not exists updated_at timestamptz not null default now();

alter table if exists invoice_line_items add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists invoice_line_items add column if not exists line_total numeric(12,2) generated always as (quantity * unit_price) stored;
alter table if exists invoice_line_items add column if not exists sort_order integer not null default 0;
alter table if exists invoice_line_items add column if not exists updated_at timestamptz not null default now();
update invoice_line_items ili set tenant_id = i.tenant_id from invoices i where i.id = ili.invoice_id and ili.tenant_id is null;
alter table if exists invoice_line_items alter column tenant_id set not null;

alter table if exists invoice_payments add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists invoice_payments add column if not exists notes text;
alter table if exists invoice_payments add column if not exists updated_at timestamptz not null default now();
update invoice_payments ip set tenant_id = i.tenant_id from invoices i where i.id = ip.invoice_id and ip.tenant_id is null;
alter table if exists invoice_payments alter column tenant_id set not null;

alter table if exists audit_logs add column if not exists entity_type text;
alter table if exists audit_logs add column if not exists entity_id uuid;
alter table if exists audit_logs add column if not exists updated_at timestamptz not null default now();

alter table if exists portal_magic_links add column if not exists created_ip text;
alter table if exists portal_magic_links add column if not exists created_user_agent text;
alter table if exists portal_magic_links add column if not exists updated_at timestamptz not null default now();
alter table if exists portal_magic_links alter column expires_at set default (now() + interval '14 days');
create index if not exists idx_portal_magic_links_token_hash on portal_magic_links(token_hash);

alter table if exists api_rate_limits add column if not exists tenant_id uuid references tenants(id) on delete set null;
alter table if exists api_rate_limits add column if not exists scope text not null default 'global';
alter table if exists api_rate_limits add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_jobs_tenant_status on jobs(tenant_id, status);
create index if not exists idx_job_visits_tenant_start on job_visits(tenant_id, start_time);
create index if not exists idx_messages_tenant_created on messages(tenant_id, created_at);
create index if not exists idx_notifications_tenant_user on in_app_notifications(tenant_id, user_id);
create index if not exists idx_attachments_retention on attachments(retention_delete_after) where deleted_at is null;
