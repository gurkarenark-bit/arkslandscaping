import Link from 'next/link';

export default function PortalDashboard() {
  return (
    <div className="card">
      <h3>Portal Dashboard</h3>
      <p>Customers can view all jobs, quotes, and invoices tied to their email.</p>
      <p>
        <Link href="/portal/auth">Request magic link</Link>
      </p>
    </div>
  );
}
