'use client';

import { FormEvent, useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { useStaffSession } from '@/components/staff-shell';
import { jobs, staffMembers, visits } from '@/lib/mvp-data';

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const session = useStaffSession();
  const job = jobs.find((entry) => entry.id === params.id);
  const [status, setStatus] = useState(job?.status ?? 'scheduled');
  const [notice, setNotice] = useState('');
  const jobVisits = useMemo(() => visits.filter((visit) => visit.jobId === params.id), [params.id]);

  if (!job) return notFound();

  const onVisitAction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (session.role === 'Crew') return;
    const form = new FormData(event.currentTarget);
    setNotice(`Visit ${String(form.get('title'))} saved and crew assignment updated (demo state).`);
  };

  const onEtaUpdate = (visitTitle: string) => {
    setNotice(`ETA updated for ${visitTitle}. Customer notification + portal thread entry created.`);
  };

  return (
    <div className="card">
      <h3>{job.title}</h3>
      <p>{job.notes}</p>

      <label htmlFor="job-status">Lifecycle status</label>
      <select id="job-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
        {STATUSES.map((entry) => (
          <option key={entry} value={entry}>{entry}</option>
        ))}
      </select>

      <h4>Visits</h4>
      <ul>
        {jobVisits.map((visit) => (
          <li key={visit.id}>
            {visit.title} — {new Date(visit.scheduledStart).toLocaleString()} (arrival window 1h)
            <button type="button" onClick={() => onEtaUpdate(visit.title)}>Set ETA</button>
          </li>
        ))}
      </ul>

      {session.role !== 'Crew' ? (
        <form onSubmit={onVisitAction}>
          <h4>Add / edit visit</h4>
          <label htmlFor="visit-title">Visit title</label>
          <input id="visit-title" name="title" required />
          <label htmlFor="crew-id">Assign crew</label>
          <select id="crew-id" name="crewId" defaultValue={staffMembers.find((member) => member.role === 'Crew')?.id}>
            {staffMembers
              .filter((member) => member.role === 'Crew')
              .map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          <button type="submit">Save visit</button>
        </form>
      ) : null}
      {notice ? <p>{notice}</p> : null}
    </div>
  );
}
