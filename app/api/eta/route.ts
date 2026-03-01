import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireStaffRole } from '@/lib/staff-auth';

export async function POST(request: Request) {
  try {
    requireStaffRole(['Admin', 'Crew']);
    const { visitId, eta, tenantId } = await request.json();
    const supabase = createServiceClient();

    const { error } = await supabase.from('job_visits').update({ eta }).eq('id', visitId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from('in_app_notifications').insert({
      tenant_id: tenantId ?? null,
      title: 'ETA update',
      body: `Visit ${visitId} ETA changed to ${eta}`
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
}
