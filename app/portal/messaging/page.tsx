'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createAnonClient } from '@/lib/supabase';
import { threads } from '@/lib/mvp-data';

export default function PortalMessagesPage() {
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? '');
  const [liveCount, setLiveCount] = useState(0);
  const [localThreads, setLocalThreads] = useState(threads);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const supabase = createAnonClient();
    const channel = supabase
      .channel('messages-portal')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => setLiveCount((count) => count + 1))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const active = useMemo(() => localThreads.find((thread) => thread.id === selectedId), [localThreads, selectedId]);

  const onSend = (event: FormEvent) => {
    event.preventDefault();
    if (!active || !draft.trim()) return;
    setLocalThreads((current) =>
      current.map((thread) =>
        thread.id === selectedId
          ? {
              ...thread,
              messages: [...thread.messages, { id: `local-${Date.now()}`, sender: 'Customer', body: draft, createdAt: new Date().toISOString() }]
            }
          : thread
      )
    );
    setDraft('');
  };

  return (
    <div className="card">
      <h3>Inbox</h3>
      <p>Realtime updates: {liveCount}</p>
      <div className="split">
        <aside>
          <ul>
            {localThreads.map((thread) => (
              <li key={thread.id}><button type="button" onClick={() => setSelectedId(thread.id)}>{thread.subject}</button></li>
            ))}
          </ul>
        </aside>
        <section>
          <h4>{active?.subject}</h4>
          <ul>{active?.messages.map((message) => <li key={message.id}><strong>{message.sender}:</strong> {message.body}</li>)}</ul>
          <form onSubmit={onSend}>
            <label htmlFor="portal-msg">Message</label>
            <textarea id="portal-msg" value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit">Send</button>
          </form>
        </section>
      </div>
    </div>
  );
}
