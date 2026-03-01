import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireStaffRole } from '@/lib/staff-auth';

export async function POST(request: Request) {
  try {
    requireStaffRole(['Admin']);
    const { id } = await request.json();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'finalized', finalized_by_admin_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
}
