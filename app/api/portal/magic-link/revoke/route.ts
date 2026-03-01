import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireStaffRole } from '@/lib/staff-auth';

export async function POST(request: Request) {
  try {
    requireStaffRole(['Admin']);
    const { id, customerId } = await request.json();
    if (!id && !customerId) {
      return NextResponse.json({ error: 'id or customerId required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const query = supabase.from('portal_magic_links').update({ revoked_at: new Date().toISOString() });
    const scoped = id ? query.eq('id', id) : query.eq('customer_id', customerId).is('revoked_at', null);
    const { error } = await scoped;

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
}
