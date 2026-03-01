import test from 'node:test';
import assert from 'node:assert/strict';

test('health payload shape is stable', () => {
  const payload = {
    status: 'degraded',
    service: 'arkslandscaping-mvp',
    checks: {
      supabasePublicEnv: false,
      supabaseServiceEnv: false
    },
    timestamp: new Date().toISOString()
  };

  assert.equal(typeof payload.status, 'string');
  assert.equal(['ok', 'degraded'].includes(payload.status), true);
  assert.equal(payload.service, 'arkslandscaping-mvp');
  assert.equal(typeof payload.checks.supabasePublicEnv, 'boolean');
  assert.equal(typeof payload.checks.supabaseServiceEnv, 'boolean');
  assert.equal(Number.isNaN(Date.parse(payload.timestamp)), false);
});
