'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { customers, jobs, threads, visits } from '@/lib/mvp-data';

export default function CustomersPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => customers.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div className="card">
      <h3>Customers</h3>
      <label htmlFor="customer-search">Search</label>
      <input id="customer-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" />
      <ul>
        {filtered.map((customer) => {
          const customerJobs = jobs.filter((job) => job.customerId === customer.id).length;
          const customerVisits = visits.filter((visit) => jobs.find((job) => job.id === visit.jobId)?.customerId === customer.id).length;
          const customerThreads = threads.filter((thread) => thread.customerId === customer.id).length;
          return (
            <li key={customer.id}>
              <Link href={`/app/customers/${customer.id}`}>{customer.name}</Link> — {customer.email} — jobs: {customerJobs}, visits: {customerVisits}, messages: {customerThreads}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
