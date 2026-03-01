'use client';

import { FormEvent, ReactNode, createContext, useContext, useMemo, useState } from 'react';
import { createAnonClient } from '@/lib/supabase';
import { StaffRole } from '@/lib/mvp-data';

type StaffSession = {
  email: string;
  role: StaffRole;
};

const StaffContext = createContext<StaffSession | null>(null);

export function useStaffSession() {
  const session = useContext(StaffContext);
  if (!session) {
    throw new Error('Staff session required');
  }
  return session;
}

function linksForRole(role: StaffRole) {
  const common = [
    { href: '/app', label: 'Dashboard' },
    { href: '/app/jobs', label: 'Jobs' },
    { href: '/app/schedule', label: 'Schedule' },
    { href: '/app/messages', label: 'Messages' }
  ];

  if (role === 'Crew') return common;

  return [...common, { href: '/app/customers', label: 'Customers' }, { href: '/app/quotes-invoices', label: 'Quotes & Invoices' }];
}

export function StaffShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [error, setError] = useState('');

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const role = String(formData.get('role') ?? 'Office') as StaffRole;

    const supabase = createAnonClient();
    if (!supabase) {
      setSession({ email, role });
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(`${signInError.message}. For local UX preview, use any credentials and choose a role.`);
      setSession({ email: email || 'preview@local.dev', role });
      return;
    }

    setSession({ email, role });
  };

  const value = useMemo(() => session, [session]);

  if (!session) {
    return (
      <div className="card">
        <h3>Staff sign in</h3>
        <p>Use Supabase email/password. Role-aware UX gates are enabled after login.</p>
        <form onSubmit={onLogin}>
          <label htmlFor="staff-email">Email</label>
          <input id="staff-email" name="email" type="email" required />
          <label htmlFor="staff-password">Password</label>
          <input id="staff-password" name="password" type="password" required />
          <label htmlFor="staff-role">Role</label>
          <select id="staff-role" name="role" defaultValue="Office">
            <option value="Admin">Admin</option>
            <option value="Office">Office</option>
            <option value="Crew">Crew</option>
          </select>
          <button type="submit">Sign in</button>
        </form>
        {error ? <p>{error}</p> : null}
      </div>
    );
  }

  return (
    <StaffContext.Provider value={value}>
      <header className="card">
        <h2>Internal Staff Portal</h2>
        <p>
          Logged in as {session.email} ({session.role})
        </p>
        <nav className="stack-row">
          {linksForRole(session.role).map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </header>
      {children}
    </StaffContext.Provider>
  );
}
