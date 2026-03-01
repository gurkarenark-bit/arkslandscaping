'use client';

import { FormEvent, useState } from 'react';

export default function PortalAuthPage() {
  const [message, setMessage] = useState('');

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
      return;
    }

    setMessage(payload.devMagicLink ? `Dev link: ${payload.devMagicLink}` : 'Portal link requested. Check configured delivery channel.');
  };

  return (
    <div className="card">
      <h3>Portal Login</h3>
      <p>Customers authenticate with reusable portal magic links only (no password login).</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
        <button type="submit">Request magic link</button>
      </form>
      <p>{message}</p>
    </div>
  );
}
