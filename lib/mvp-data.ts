export type StaffRole = 'Admin' | 'Office' | 'Crew';

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type VisitStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type Visit = {
  id: string;
  jobId: string;
  title: string;
  scheduledStart: string;
  eta: string | null;
  status: VisitStatus;
  assignedCrewIds: string[];
};

export type Job = {
  id: string;
  customerId: string;
  title: string;
  service: string;
  status: 'new' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
};

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  photoUrl?: string;
};

export type Thread = {
  id: string;
  subject: string;
  customerId: string;
  jobId: string;
  messages: { id: string; sender: string; body: string; createdAt: string }[];
};

export const staffMembers: StaffMember[] = [
  { id: 's-1', name: 'Alex Admin', role: 'Admin', phone: '416-495-6624' },
  { id: 's-2', name: 'Olivia Office', role: 'Office', phone: '416-495-6624' },
  { id: 's-3', name: 'Chris Crew', role: 'Crew', phone: '416-222-1111', photoUrl: 'https://placehold.co/80x80/png' }
];

export const customers: Customer[] = [
  { id: 'c-1', name: 'Jordan Lee', email: 'jordan@example.com', phone: '647-555-0123', address: '123 Green St, Mississauga' },
  { id: 'c-2', name: 'Taylor Morgan', email: 'taylor@example.com', phone: '647-555-0144', address: '77 Lawn Ave, Toronto' }
];

export const jobs: Job[] = [
  { id: 'j-1', customerId: 'c-1', title: 'Weekly lawn care', service: 'Lawn care', status: 'scheduled', notes: 'Gate code 4455' },
  { id: 'j-2', customerId: 'c-2', title: 'Power wash driveway', service: 'Power washing', status: 'in_progress', notes: 'Call on arrival' }
];

export const visits: Visit[] = [
  { id: 'v-1', jobId: 'j-1', title: 'Initial mowing', scheduledStart: new Date().toISOString(), eta: null, status: 'scheduled', assignedCrewIds: ['s-3'] },
  { id: 'v-2', jobId: 'j-2', title: 'Pressure wash', scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), eta: null, status: 'in_progress', assignedCrewIds: ['s-3'] }
];

export const threads: Thread[] = [
  {
    id: 't-1',
    subject: 'Arrival timing',
    customerId: 'c-1',
    jobId: 'j-1',
    messages: [
      { id: 'm-1', sender: 'Jordan Lee', body: 'Can you arrive after 10?', createdAt: new Date().toISOString() },
      { id: 'm-2', sender: 'Olivia Office', body: 'Yes, updated the window.', createdAt: new Date().toISOString() }
    ]
  }
];

export function visitsForRole(role: StaffRole, staffId = 's-3') {
  if (role !== 'Crew') return visits;
  return visits.filter((visit) => visit.assignedCrewIds.includes(staffId));
}

export function jobsForRole(role: StaffRole, staffId = 's-3') {
  if (role !== 'Crew') return jobs;
  const allowedJobIds = new Set(visitsForRole(role, staffId).map((visit) => visit.jobId));
  return jobs.filter((job) => allowedJobIds.has(job.id));
}
