'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createAnonClient } from '@/lib/supabase';
import { customers, threads } from '@/lib/mvp-data';

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? '');
  const [liveCount, setLiveCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [localThreadMessages, setLocalThreadMessages] = useState(threads);

  useEffect(() => {
    const supabase = createAnonClient();
    const channel = supabase
      .channel('messages-internal')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        setLiveCount((count) => count + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeThread = useMemo(() => localThreadMessages.find((thread) => thread.id === selectedId), [localThreadMessages, selectedId]);

  const onCompose = (event: FormEvent) => {
    event.preventDefault();
    if (!activeThread || !draft.trim()) return;
    setLocalThreadMessages((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              messages: [...thread.messages, { id: `local-${Date.now()}`, sender: 'Staff', body: draft, createdAt: new Date().toISOString() }]
            }
          : thread
      )
    );
    setDraft('');
  };

  return (
    <div className="card">
      <h3>Staff Inbox</h3>
      <p>Realtime updates this session: {liveCount}</p>
      <div className="split">
        <aside>
          <h4>Threads</h4>
          <ul>
            {localThreadMessages.map((thread) => (
              <li key={thread.id}>
                <button type="button" onClick={() => setSelectedId(thread.id)}>
                  {thread.subject} ({customers.find((c) => c.id === thread.customerId)?.name})
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section>
          <h4>{activeThread?.subject ?? 'Select thread'}</h4>
          <ul>
            {(activeThread?.messages ?? []).map((message) => (
              <li key={message.id}><strong>{message.sender}:</strong> {message.body}</li>
            ))}
          </ul>
          <form onSubmit={onCompose}>
            <label htmlFor="staff-compose">Compose</label>
            <textarea id="staff-compose" value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit">Send message</button>
          </form>
        </section>
      </div>
    </div>
  );
}
