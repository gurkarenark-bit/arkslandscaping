import Link from 'next/link';
import { getPortalSession } from '@/lib/portal-auth';

export default function PortalDashboard() {
  const session = getPortalSession();

  return (
    <div className="card">
      <h3>Portal Dashboard</h3>
      <p>Customers can view all jobs, quotes, and invoices tied to their email.</p>
      <p>Logged in as: {session?.email ?? 'Not logged in'}</p>
      <p>
        <Link href="/portal/jobs">View jobs</Link>
      </p>
    </div>
  );
}
