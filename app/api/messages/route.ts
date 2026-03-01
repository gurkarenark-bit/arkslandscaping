import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireStaffRole } from '@/lib/staff-auth';

export async function POST(request: Request) {
  try {
    requireStaffRole(['Admin', 'Office', 'Crew']);
    const body = await request.json();
    const supabase = createServiceClient();
    const { error, data } = await supabase.from('messages').insert(body).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from('in_app_notifications').insert({
      tenant_id: body.tenant_id,
      related_thread_id: body.thread_id,
      title: 'New message',
      body: 'You have a new message in a thread.'
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
}
