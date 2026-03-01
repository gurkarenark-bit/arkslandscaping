'use client';

import { FormEvent, useState } from 'react';
import { createAnonClient } from '@/lib/supabase';

export default function PortalAuthPage() {
  const [message, setMessage] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email'));
    const supabase = createAnonClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
        shouldCreateUser: true
      }
    });
    setMessage(error ? error.message : 'Magic link sent (14-day Supabase session recommended in auth settings).');
  };

  return (
    <div className="card">
      <h3>Magic Link Login</h3>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
        <button type="submit">Send magic link</button>
      </form>
      <p>{message}</p>
    </div>
  );
}
