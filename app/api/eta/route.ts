import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireStaffRole } from '@/lib/staff-auth';

export async function POST(request: Request) {
  try {
    const role = requireStaffRole(['Admin', 'Crew']);
    const { visitId, eta } = await request.json();
    const supabase = createServiceClient();

    const { data: visit, error: visitError } = await supabase
      .from('job_visits')
      .select('id,tenant_id,job_id,start_time')
      .eq('id', visitId)
      .single();
    if (visitError) return NextResponse.json({ error: visitError.message }, { status: 400 });

    const arrivalWindowEnd = new Date(new Date(visit.start_time).getTime() + 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('job_visits')
      .update({ eta, arrival_window_start: visit.start_time, arrival_window_end: arrivalWindowEnd })
      .eq('id', visitId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from('in_app_notifications').insert({
      tenant_id: visit.tenant_id,
      related_job_id: visit.job_id,
      title: 'ETA update',
      body: `ETA changed to ${eta} by ${role}`
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
}
