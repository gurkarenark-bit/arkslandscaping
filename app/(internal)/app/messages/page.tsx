'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createAnonClient } from '@/lib/supabase';
import { customers, threads as demoThreads } from '@/lib/mvp-data';

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

const TENANT_ID = process.env.NEXT_PUBLIC_DEMO_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/messages?tenantId=${TENANT_ID}`, {
        headers: {
          'x-staff-role': 'Office'
        },
        cache: 'no-store'
      });
      if (!response.ok) {
        setThreads(
          demoThreads.map((thread) => ({
            id: thread.id,
            tenant_id: TENANT_ID,
            customer_id: thread.customerId,
            subject: thread.subject
          }))
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
      .channel('messages-internal')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        setLiveCount((count) => count + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeThread = useMemo(() => threads.find((thread) => thread.id === selectedId), [threads, selectedId]);
  const activeMessages = useMemo(
    () => messages.filter((message) => message.thread_id === selectedId),
    [messages, selectedId]
  );

  const onCompose = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeThread || !draft.trim()) return;

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-staff-role': 'Office'
      },
      body: JSON.stringify({
        tenant_id: TENANT_ID,
        thread_id: activeThread.id,
        body: draft,
        sender_user_id: '00000000-0000-0000-0000-000000000002',
        sender_customer_id: null
      })
    });

    if (response.ok) {
      const newMessage = await response.json();
      setMessages((current) => [...current, newMessage]);
    }

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
            {threads.map((thread) => (
              <li key={thread.id}>
                <button type="button" onClick={() => setSelectedId(thread.id)}>
                  {thread.subject ?? 'Thread'} ({customers.find((c) => c.id === thread.customer_id)?.name ?? 'Customer'})
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section>
          <h4>{activeThread?.subject ?? 'Select thread'}</h4>
          <ul>
            {activeMessages.map((message) => (
              <li key={message.id}>
                <strong>{message.sender_customer_id ? 'Customer' : 'Staff'}:</strong> {message.body}
              </li>
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
