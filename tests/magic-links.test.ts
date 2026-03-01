import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const secret = 'test-secret';

function tokenHash(token: string) {
  return createHmac('sha256', secret).update(token).digest('hex');
}

type LinkRecord = {
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
};

function isMagicLinkValid(record: LinkRecord, rawToken: string, now = new Date()) {
  if (record.revoked_at) return false;
  if (new Date(record.expires_at).getTime() <= now.getTime()) return false;
  return tokenHash(rawToken) === record.token_hash;
}

test('magic links use hashed tokens and are reusable until expiry', () => {
  const raw = 'magic-token';
  const record: LinkRecord = {
    token_hash: tokenHash(raw),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    revoked_at: null
  };

  assert.notEqual(record.token_hash, raw, 'raw token must never be stored');
  assert.equal(isMagicLinkValid(record, raw), true);
  assert.equal(isMagicLinkValid(record, raw), true, 'link remains reusable before expiry');
  assert.equal(isMagicLinkValid({ ...record, expires_at: new Date(Date.now() - 1_000).toISOString() }, raw), false);
});

test('revoked links are invalid before expiry', () => {
  const raw = 'revoked-token';
  const record: LinkRecord = {
    token_hash: tokenHash(raw),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    revoked_at: new Date().toISOString()
  };

  assert.equal(isMagicLinkValid(record, raw), false);
});
