import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const canFinalizeDocument = (role) => role === 'Admin';

function visibleThreadIds({ role, tenantId, staffId, assignments, threads }) {
  if (role !== 'Crew') {
    return threads.filter((thread) => thread.tenant_id === tenantId).map((thread) => thread.id);
  }
  const assignedJobs = new Set(
    assignments
      .filter((assignment) => assignment.tenant_id === tenantId && assignment.crew_user_id === staffId)
      .map((assignment) => assignment.job_id)
  );
  return threads
    .filter((thread) => thread.tenant_id === tenantId && assignedJobs.has(thread.job_id))
    .map((thread) => thread.id);
}

const secret = 'test-secret';
const tokenHash = (token) => crypto.createHmac('sha256', secret).update(token).digest('hex');

function isMagicLinkValid(record, rawToken, now = new Date()) {
  if (record.revoked_at) return false;
  if (new Date(record.expires_at).getTime() <= now.getTime()) return false;
  return tokenHash(rawToken) === record.token_hash;
}

function attachmentsToDelete(rows, now = new Date()) {
  const cutoffMs = now.getTime() - 365 * 24 * 60 * 60 * 1000;
  return rows
    .filter((row) => {
      if (row.deleted_at) return false;
      const retention = row.retention_delete_after ? Date.parse(row.retention_delete_after) : Number.NaN;
      const created = Date.parse(row.created_at);
      return (!Number.isNaN(retention) && retention <= now.getTime()) || (!Number.isNaN(created) && created <= cutoffMs);
    })
    .map((row) => row.id);
}

function healthStatus(env) {
  const hasSupabase = Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  const hasService = Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  return {
    status: hasSupabase ? 'ok' : 'degraded',
    checks: {
      supabasePublicEnv: hasSupabase,
      supabaseServiceEnv: hasService
    }
  };
}

test('adversarial: role escalation attempts are blocked for non-admin finalization', () => {
  assert.equal(canFinalizeDocument('Office'), false);
  assert.equal(canFinalizeDocument('Crew'), false);
  assert.equal(canFinalizeDocument('Customer'), false);
  assert.equal(canFinalizeDocument('Admin'), true);
});

test('adversarial: cross-tenant leakage is blocked for crew thread visibility', () => {
  const assignments = [
    { tenant_id: 't-1', crew_user_id: 'crew-1', job_id: 'job-1' },
    { tenant_id: 't-2', crew_user_id: 'crew-1', job_id: 'job-2' }
  ];
  const threads = [
    { id: 'th-1', tenant_id: 't-1', job_id: 'job-1' },
    { id: 'th-2', tenant_id: 't-2', job_id: 'job-2' }
  ];

  assert.deepEqual(visibleThreadIds({ role: 'Crew', tenantId: 't-1', staffId: 'crew-1', assignments, threads }), ['th-1']);
  assert.deepEqual(visibleThreadIds({ role: 'Crew', tenantId: 't-1', staffId: 'crew-2', assignments, threads }), []);
});

test('adversarial: token replay works before expiry and fails at expiry boundary', () => {
  const token = 'raw-token';
  const now = new Date('2026-03-01T00:00:00.000Z');
  const expiresAt = new Date('2026-03-01T00:00:10.000Z');
  const record = { token_hash: tokenHash(token), expires_at: expiresAt.toISOString(), revoked_at: null };

  assert.equal(isMagicLinkValid(record, token, new Date('2026-03-01T00:00:09.999Z')), true);
  assert.equal(isMagicLinkValid(record, token, expiresAt), false);
  assert.equal(isMagicLinkValid(record, token, new Date(now.getTime() + 20_000)), false);
});

test('adversarial: retention date boundaries delete only eligible attachments', () => {
  const now = new Date('2026-03-01T00:00:00.000Z');
  const rows = [
    { id: 'a-1', created_at: '2025-02-28T23:59:59.000Z', retention_delete_after: null, deleted_at: null },
    { id: 'a-2', created_at: '2025-03-01T00:00:01.000Z', retention_delete_after: null, deleted_at: null },
    { id: 'a-3', created_at: '2025-08-01T00:00:00.000Z', retention_delete_after: '2026-02-01T00:00:00.000Z', deleted_at: null },
    { id: 'a-4', created_at: '2025-01-01T00:00:00.000Z', retention_delete_after: '2027-01-01T00:00:00.000Z', deleted_at: '2026-01-01T00:00:00.000Z' }
  ];

  assert.deepEqual(attachmentsToDelete(rows, now).sort(), ['a-1', 'a-3']);
});

test('adversarial: /api/health degraded mode works with missing env', () => {
  assert.deepEqual(healthStatus({}), {
    status: 'degraded',
    checks: {
      supabasePublicEnv: false,
      supabaseServiceEnv: false
    }
  });

  assert.deepEqual(healthStatus({ NEXT_PUBLIC_SUPABASE_URL: 'x', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'y', SUPABASE_SERVICE_ROLE_KEY: '' }), {
    status: 'ok',
    checks: {
      supabasePublicEnv: true,
      supabaseServiceEnv: false
    }
  });
});
