'use client';

import { useState } from 'react';
import { useStaffSession } from '@/components/staff-shell';
import { jobs, visitsForRole } from '@/lib/mvp-data';

export default function SchedulePage() {
  const session = useStaffSession();
  const [view, setView] = useState<'week' | 'day'>('week');
  const [rescheduleText, setRescheduleText] = useState('');
  const visits = visitsForRole(session.role);

  return (
    <div className="card">
      <h3>Schedule</h3>
      <div className="stack-row">
        <button type="button" onClick={() => setView('week')}>Week view</button>
        <button type="button" onClick={() => setView('day')}>Day view</button>
      </div>
      <p>Current view: {view}</p>
      <div className="grid">
        {visits.map((visit) => {
          const job = jobs.find((entry) => entry.id === visit.jobId);
          return (
            <article key={visit.id} className="card">
              <strong>{visit.title}</strong>
              <p>{job?.title}</p>
              <p>Start: {new Date(visit.scheduledStart).toLocaleString()}</p>
              <p>Arrival window: 1 hour</p>
              <button type="button" onClick={() => setRescheduleText(`Reschedule requested for ${visit.title} (modal substitute).`)}>
                Reschedule
              </button>
            </article>
          );
        })}
      </div>
      {rescheduleText ? <p>{rescheduleText}</p> : null}
    </div>
  );
}
