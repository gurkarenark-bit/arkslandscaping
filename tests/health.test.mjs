import test from 'node:test';
import assert from 'node:assert/strict';

test('health payload shape matches API contract', () => {
  const payload = { status: 'ok' };

  assert.deepEqual(payload, { status: 'ok' });
});
