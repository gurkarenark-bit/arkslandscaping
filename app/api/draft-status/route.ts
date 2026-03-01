import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireStaffRole } from '@/lib/staff-auth';

export async function POST(request: Request) {
  try {
    const role = requireStaffRole(['Admin', 'Office']);
    const { entity, id, status, tenantId } = await request.json();
    const supabase = createServiceClient();
    const table = entity === 'invoice' ? 'invoices' : 'quotes';

    if (status === 'finalized' && role !== 'Admin') {
      return NextResponse.json({ error: 'Only Admin can finalize documents' }, { status: 403 });
    }

    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (status === 'draft_sent' && role === 'Office') {
      await supabase.from('in_app_notifications').insert({
        tenant_id: tenantId ?? null,
        title: 'Admin review required',
        body: `${entity} ${id} was sent as draft and requires admin finalization.`
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
}
