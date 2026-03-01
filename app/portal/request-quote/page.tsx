'use client';

import { FormEvent, useState } from 'react';

const ACCEPT = 'application/pdf,image/jpeg,image/jpg,image/png,image/heic';

export default function QuoteRequestPage() {
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('photos') as File | null;

    if (file && file.size > 0) {
      const upload = new FormData();
      upload.append('file', file);
      upload.append('tenantId', '00000000-0000-0000-0000-000000000001');

      const response = await fetch('/api/uploads', { method: 'POST', body: upload });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? 'Upload failed');
        setPreview('');
        return;
      }
      setPreview(payload.signedUrl ?? '');
    }

    setStatus('Quote request submitted. Office team has been notified in-app.');
    form.reset();
  };

  return (
    <div className="card">
      <h3>Request New Quote</h3>
      <form onSubmit={onSubmit}>
        <label htmlFor="address">Address</label>
        <input id="address" name="address" required />
        <label htmlFor="service">Service requested</label>
        <input id="service" name="service" required />
        <label htmlFor="dates">Preferred dates</label>
        <input id="dates" name="dates" />
        <label htmlFor="availability">Availability for in-person quote</label>
        <textarea id="availability" name="availability" />
        <label htmlFor="photos">Photos / attachment (PDF/JPG/JPEG/PNG/HEIC, max 25MB)</label>
        <input id="photos" name="photos" type="file" accept={ACCEPT} />
        <button type="submit">Submit</button>
      </form>
      {status ? <p>{status}</p> : null}
      {preview ? (
        <p>
          Attachment preview: <a href={preview} target="_blank">Open signed URL</a>
        </p>
      ) : null}
    </div>
  );
}
