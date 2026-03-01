import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const { entity, id, status } = await request.json();
  const supabase = createServiceClient();
  const table = entity === 'invoice' ? 'invoices' : 'quotes';

  const { error } = await supabase.from(table).update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (status === 'draft_sent') {
    await supabase.from('in_app_notifications').insert({
      title: 'Admin review required',
      body: `${entity} ${id} was sent as draft and requires admin finalization.`
    });
  }

  return NextResponse.json({ ok: true });
}
