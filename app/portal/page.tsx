import { getPortalSession } from '@/lib/portal-auth';
import { customers, jobs, visits } from '@/lib/mvp-data';

export default function PortalDashboard() {
  const session = getPortalSession();
  const customer = customers.find((entry) => entry.email === session?.email) ?? customers[0];
  const customerJobs = jobs.filter((job) => job.customerId === customer.id);
  const customerVisits = visits.filter((visit) => customerJobs.some((job) => job.id === visit.jobId));

  return (
    <div className="card">
      <h3>Portal Dashboard</h3>
      <p>Logged in as: {session?.email ?? customer.email}</p>
      <p>Jobs: {customerJobs.length} | Visits: {customerVisits.length} | Quotes: 1 | Invoices: 1</p>
      <h4>Upcoming visits</h4>
      <ul>
        {customerVisits.map((visit) => (
          <li key={visit.id}>
            {visit.title} at {new Date(visit.scheduledStart).toLocaleString()} (arrival window: 1 hour)
          </li>
        ))}
      </ul>
      <h4>Financial docs</h4>
      <ul>
        <li>Quote Q-1001 — status: sent (e-sign disabled until admin finalizes)</li>
        <li>Invoice I-1001 — status: sent</li>
      </ul>
    </div>
  );
}
