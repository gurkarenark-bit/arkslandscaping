'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useStaffSession } from '@/components/staff-shell';
import { customers, jobsForRole } from '@/lib/mvp-data';

export default function JobsPage() {
  const session = useStaffSession();
  const [createdJob, setCreatedJob] = useState('');
  const visibleJobs = jobsForRole(session.role);

  const onCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (session.role === 'Crew') return;
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '');
    const customerId = String(formData.get('customerId') ?? '');
    const customerName = customers.find((customer) => customer.id === customerId)?.name ?? 'Unknown customer';
    setCreatedJob(`Created “${title}” for ${customerName} (demo UI state).`);
    event.currentTarget.reset();
  };

  return (
    <>
      <div className="card">
        <h3>Jobs</h3>
        <ul>
          {visibleJobs.map((job) => (
            <li key={job.id}>
              <Link href={`/app/jobs/${job.id}`}>{job.title}</Link> — {job.status}
            </li>
          ))}
        </ul>
      </div>
      {session.role !== 'Crew' ? (
        <div className="card">
          <h3>Create job</h3>
          <form onSubmit={onCreate}>
            <label htmlFor="job-title">Title</label>
            <input id="job-title" name="title" required />
            <label htmlFor="job-customer">Customer</label>
            <select id="job-customer" name="customerId">
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
            <button type="submit">Create</button>
          </form>
          {createdJob ? <p>{createdJob}</p> : null}
        </div>
      ) : null}
    </>
  );
}
