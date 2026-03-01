'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createAnonClient } from '@/lib/supabase';
import { threads as demoThreads } from '@/lib/mvp-data';

type Thread = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  subject: string | null;
};

type Message = {
  id: string;
  thread_id: string;
  body: string;
  sender_user_id: string | null;
  sender_customer_id: string | null;
  created_at: string;
};

export default function PortalMessagesPage() {
  const [selectedId, setSelectedId] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/messages', { cache: 'no-store' });
      if (!response.ok) {
        setThreads(
          demoThreads.map((thread) => ({ id: thread.id, tenant_id: '', customer_id: thread.customerId, subject: thread.subject }))
        );
        return;
      }
      const payload = await response.json();
      setThreads(payload.threads ?? []);
      setMessages(payload.messages ?? []);
      if ((payload.threads ?? []).length > 0) setSelectedId(payload.threads[0].id);
    };

    load();
  }, []);

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

  const active = useMemo(() => threads.find((thread) => thread.id === selectedId), [threads, selectedId]);
  const activeMessages = useMemo(
    () => messages.filter((message) => message.thread_id === selectedId),
    [messages, selectedId]
  );

  const onSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!active || !draft.trim()) return;

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ thread_id: active.id, body: draft })
    });

    if (response.ok) {
      const message = await response.json();
      setMessages((current) => [...current, message]);
      setDraft('');
    }
  };

  return (
    <div className="card">
      <h3>Inbox</h3>
      <p>Realtime updates: {liveCount}</p>
      <div className="split">
        <aside>
          <ul>
            {threads.map((thread) => (
              <li key={thread.id}>
                <button type="button" onClick={() => setSelectedId(thread.id)}>
                  {thread.subject ?? 'Thread'}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section>
          <h4>{active?.subject}</h4>
          <ul>
            {activeMessages.map((message) => (
              <li key={message.id}>
                <strong>{message.sender_customer_id ? 'You' : 'Staff'}:</strong> {message.body}
              </li>
            ))}
          </ul>
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
