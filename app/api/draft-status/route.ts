import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireStaffRole } from '@/lib/staff-auth';

export async function POST(request: Request) {
  try {
    const role = requireStaffRole(['Admin', 'Office']);
    const { entity, id, status } = await request.json();
    const supabase = createServiceClient();
    const table = entity === 'invoice' ? 'invoices' : 'quotes';

    if (status === 'finalized' && role !== 'Admin') {
      return NextResponse.json({ error: 'Only Admin can finalize documents' }, { status: 403 });
    }

    const { data: existing, error: readError } = await supabase.from(table).select('tenant_id').eq('id', id).single();
    if (readError) return NextResponse.json({ error: readError.message }, { status: 400 });

    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (status === 'sent' && role === 'Office') {
      await supabase.from('in_app_notifications').insert({
        tenant_id: existing.tenant_id,
        title: 'Finalize needed',
        body: `${entity} ${id} was sent and requires admin finalization.`
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
}
