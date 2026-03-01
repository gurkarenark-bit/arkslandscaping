import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rlsSql = readFileSync('supabase/migrations/003_rls_policies.sql', 'utf8');

test('office cannot finalize quotes or invoices by RLS check constraints', () => {
  assert.match(rlsSql, /is_office\(\)\s*\n\s*and status <> 'finalized'::quote_status/);
  assert.match(rlsSql, /is_office\(\)\s*\n\s*and status <> 'finalized'::invoice_status/);
  assert.match(rlsSql, /and finalized_at is null/);
});

test('crew access is constrained to assigned jobs and visits', () => {
  assert.match(rlsSql, /is_crew\(\) and crew_assigned_to_job\(id\)/);
  assert.match(rlsSql, /is_crew\(\) and crew_assigned_to_job\(job_id\)/);
});

test('customers cannot access other customer records', () => {
  assert.match(rlsSql, /customer_matches\(customers.id\)/);
  assert.match(rlsSql, /customer_matches\(customer_id\)/);
  assert.ok(!/using\s*\(\s*true\s*\)/i.test(rlsSql), 'forbidden permissive policy detected');
});
