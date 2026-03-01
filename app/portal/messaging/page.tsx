'use client';

import { useEffect, useState } from 'react';
import { createAnonClient } from '@/lib/supabase';

export default function PortalMessagesPage() {
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    const supabase = createAnonClient();
    const channel = supabase
      .channel('messages-portal')
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
      <h3>Inbox</h3>
      <p>Realtime thread updates without refresh. New messages this session: {liveCount}</p>
    </div>
  );
}
