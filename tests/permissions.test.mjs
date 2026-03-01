import test from 'node:test';
import assert from 'node:assert/strict';

const canFinalizeDocument = (role) => role === 'Admin';

test('office cannot finalize quotes or invoices', () => {
  assert.equal(canFinalizeDocument('Admin'), true);
  assert.equal(canFinalizeDocument('Office'), false);
  assert.equal(canFinalizeDocument('Crew'), false);
  assert.equal(canFinalizeDocument('Customer'), false);
});
