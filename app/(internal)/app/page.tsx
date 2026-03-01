import Link from 'next/link';

export default function InternalDashboard() {
  return (
    <div className="card">
      <h3>Staff Login (MVP placeholder)</h3>
      <p>Use Supabase email/password auth for Admin, Office, and Crew users.</p>
      <ul>
        <li>Office can schedule/reschedule, draft quote/invoice, respond, add change orders.</li>
        <li>Admin can finalize quotes and invoices.</li>
        <li>Crew sees assigned customers/jobs only, updates ETA, messages, uploads attachments.</li>
      </ul>
      <Link href="/app/jobs">Go to jobs</Link>
    </div>
  );
}
