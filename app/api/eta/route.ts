import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const { visitId, eta } = await request.json();
  const supabase = createServiceClient();

  const { error } = await supabase.from('job_visits').update({ eta }).eq('id', visitId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('in_app_notifications').insert({
    title: 'ETA update',
    body: `Visit ${visitId} ETA changed to ${eta}`
  });

  return NextResponse.json({ ok: true });
}
