import test from 'node:test';
import assert from 'node:assert/strict';

const canPerform = (role, action) => {
  const permissions = {
    admin: new Set(['read', 'write', 'manage-users']),
    staff: new Set(['read', 'write']),
    viewer: new Set(['read'])
  };

  return permissions[role]?.has(action) ?? false;
};

test('permission matrix enforces least privilege', () => {
  assert.equal(canPerform('admin', 'manage-users'), true);
  assert.equal(canPerform('staff', 'manage-users'), false);
  assert.equal(canPerform('viewer', 'write'), false);
  assert.equal(canPerform('viewer', 'read'), true);
  assert.equal(canPerform('unknown', 'read'), false);
});
