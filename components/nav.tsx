import Link from 'next/link';

export function InternalNav() {
  return (
    <nav>
      <Link href="/app">Dashboard</Link> | <Link href="/app/customers">Customers</Link> |{' '}
      <Link href="/app/jobs">Jobs</Link> | <Link href="/app/quotes-invoices">Quotes & Invoices</Link> |{' '}
      <Link href="/app/messages">Messages</Link>
    </nav>
  );
}

export function PortalNav() {
  return (
    <nav>
      <Link href="/portal">Portal Home</Link> | <Link href="/portal/jobs">Jobs</Link> |{' '}
      <Link href="/portal/messaging">Messages</Link> | <Link href="/portal/request-quote">Request Quote</Link>
    </nav>
  );
}
