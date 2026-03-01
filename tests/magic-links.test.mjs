import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const secret = 'test-secret';

const tokenHash = (token) => crypto.createHmac('sha256', secret).update(token).digest('hex');

function isMagicLinkValid(record, rawToken, now = new Date()) {
  if (record.revoked_at) return false;
  if (new Date(record.expires_at).getTime() <= now.getTime()) return false;
  return tokenHash(rawToken) === record.token_hash;
}

test('magic link is reusable until expiry and invalid after expiry', () => {
  const token = 'raw-token-value';
  const record = {
    token_hash: tokenHash(token),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    revoked_at: null
  };

  assert.equal(isMagicLinkValid(record, token), true);
  assert.equal(isMagicLinkValid(record, token), true);
  assert.equal(
    isMagicLinkValid({ ...record, expires_at: new Date(Date.now() - 1_000).toISOString() }, token),
    false
  );
  assert.equal(isMagicLinkValid({ ...record, revoked_at: new Date().toISOString() }, token), false);
});
