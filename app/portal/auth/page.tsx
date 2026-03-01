'use client';

import { FormEvent, useState } from 'react';

export default function PortalAuthPage() {
  const [message, setMessage] = useState('');
  const [devLink, setDevLink] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email'));

    const response = await fetch('/api/portal/magic-link/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? 'Unable to request link');
      setDevLink('');
      return;
    }

    setMessage('Magic link requested. In dev mode, use the generated link below.');
    setDevLink(payload.devMagicLink ?? '');
  };

  return (
    <div className="card">
      <h3>Portal Login</h3>
      <p>Request a reusable (14-day) magic link. Auto-login happens on consume.</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
        <button type="submit">Request magic link</button>
      </form>
      <p>{message}</p>
      {devLink ? (
        <>
          <pre>{JSON.stringify({ devMagicLink: devLink }, null, 2)}</pre>
          <a href={devLink}>Open dev magic link</a>
        </>
      ) : null}
    </div>
  );
}
