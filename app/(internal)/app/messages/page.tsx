'use client';

import { useEffect, useState } from 'react';
import { createAnonClient } from '@/lib/supabase';

export default function MessagesPage() {
  const [liveCount, setLiveCount] = useState(0);

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

  return (
    <div className="card">
      <h3>Messages</h3>
      <p>Realtime updates from Supabase Realtime. New messages this session: {liveCount}</p>
    </div>
  );
}
