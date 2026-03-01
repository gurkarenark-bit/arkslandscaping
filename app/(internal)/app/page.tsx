'use client';

import { useStaffSession } from '@/components/staff-shell';
import { jobsForRole, visitsForRole } from '@/lib/mvp-data';

export default function InternalDashboard() {
  const session = useStaffSession();
  const jobs = jobsForRole(session.role);
  const visits = visitsForRole(session.role);

  const counts = jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.status] = (acc[job.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="card">
      <h3>Dashboard</h3>
      <p>Today’s schedule</p>
      <ul>
        {visits.map((visit) => (
          <li key={visit.id}>
            {visit.title} — {new Date(visit.scheduledStart).toLocaleTimeString()} (window ends{' '}
            {new Date(new Date(visit.scheduledStart).getTime() + 60 * 60 * 1000).toLocaleTimeString()})
          </li>
        ))}
      </ul>
      <h4>Status counts</h4>
      <ul>
        {Object.entries(counts).map(([status, count]) => (
          <li key={status}>
            {status}: {count}
          </li>
        ))}
      </ul>
    </div>
  );
}
