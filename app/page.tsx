import Link from 'next/link';

export default function Home() {
  return (
    <div className="card">
      <h1>Ark&apos;s Landscaping MVP</h1>
      <p>Single Next.js app ready for Vercel + Supabase.</p>
      <p>
        <Link href="/app">Internal Staff UI</Link> | <Link href="/portal">Customer Portal</Link>
      </p>
    </div>
  );
}
