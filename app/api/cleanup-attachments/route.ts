import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  const { data: oldRows, error: listError } = await supabase
    .from('attachments')
    .select('id,storage_path')
    .or(`retention_delete_after.lte.${new Date().toISOString()},created_at.lte.${cutoff}`)
    .is('deleted_at', null);

  if (listError) return NextResponse.json({ ok: false, error: listError.message }, { status: 500 });
  if (!oldRows?.length) return NextResponse.json({ ok: true, deletedCount: 0, guidance: 'Configure Vercel cron for /api/cleanup-attachments' });

  const paths = oldRows.map((row) => row.storage_path);
  const ids = oldRows.map((row) => row.id);
  const { error: storageError } = await supabase.storage.from('attachments').remove(paths);
  if (storageError) return NextResponse.json({ ok: false, error: storageError.message }, { status: 500 });

  const { error: deleteError } = await supabase.from('attachments').delete().in('id', ids);
  if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true, deletedCount: ids.length, guidance: 'Configure Vercel cron for /api/cleanup-attachments' });
}
