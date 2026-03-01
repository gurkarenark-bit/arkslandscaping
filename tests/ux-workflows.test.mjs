import test from 'node:test';
import assert from 'node:assert/strict';

const visits = [
  { id: 'v-1', job_id: 'j-1', assignedCrewIds: ['crew-1'] },
  { id: 'v-2', job_id: 'j-2', assignedCrewIds: ['crew-2'] }
];

const jobs = [
  { id: 'j-1', status: 'scheduled' },
  { id: 'j-2', status: 'in_progress' }
];

function jobsVisibleToRole(role, staffId = 'crew-1') {
  if (role !== 'Crew') return jobs;
  const allowed = new Set(visits.filter((visit) => visit.assignedCrewIds.includes(staffId)).map((visit) => visit.job_id));
  return jobs.filter((job) => allowed.has(job.id));
}

function canESign(quoteStatus, invoiceStatus) {
  return quoteStatus === 'finalized' && invoiceStatus === 'finalized';
}

test('crew sees only assigned jobs', () => {
  assert.deepEqual(jobsVisibleToRole('Crew', 'crew-1').map((job) => job.id), ['j-1']);
  assert.deepEqual(jobsVisibleToRole('Office').map((job) => job.id), ['j-1', 'j-2']);
});

test('e-sign remains disabled until admin finalizes quote and invoice', () => {
  assert.equal(canESign('sent', 'sent'), false);
  assert.equal(canESign('finalized', 'sent'), false);
  assert.equal(canESign('finalized', 'finalized'), true);
});
