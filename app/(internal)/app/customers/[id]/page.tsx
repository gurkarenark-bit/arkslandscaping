import { notFound } from 'next/navigation';
import { customers, jobs, threads, visits } from '@/lib/mvp-data';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = customers.find((entry) => entry.id === params.id);
  if (!customer) return notFound();

  const customerJobs = jobs.filter((job) => job.customerId === customer.id);
  const jobIds = new Set(customerJobs.map((job) => job.id));
  const customerVisits = visits.filter((visit) => jobIds.has(visit.jobId));
  const customerThreads = threads.filter((thread) => thread.customerId === customer.id);

  return (
    <div className="card">
      <h3>{customer.name}</h3>
      <p>{customer.email}</p>
      <p>{customer.phone}</p>
      <p>{customer.address}</p>

      <h4>Jobs</h4>
      <ul>{customerJobs.map((job) => <li key={job.id}>{job.title} ({job.status})</li>)}</ul>
      <h4>Visits</h4>
      <ul>{customerVisits.map((visit) => <li key={visit.id}>{visit.title} ({visit.status})</li>)}</ul>
      <h4>Messages</h4>
      <ul>{customerThreads.map((thread) => <li key={thread.id}>{thread.subject}</li>)}</ul>
    </div>
  );
}
