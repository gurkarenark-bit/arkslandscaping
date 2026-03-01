import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { allowedMimeTypes, isValidSignature } from '@/lib/file-signature';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const tenantId = String(formData.get('tenantId') ?? '');

  if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
  if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File exceeds 25MB' }, { status: 400 });
  if (!allowedMimeTypes.includes(file.type)) return NextResponse.json({ error: 'Unsupported type' }, { status: 400 });

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!isValidSignature(buffer, file.type)) return NextResponse.json({ error: 'Invalid file signature' }, { status: 400 });

  const path = `private/${randomUUID()}-${file.name}`;
  const supabase = createServiceClient();
  const { error: storageError } = await supabase.storage.from('attachments').upload(path, buffer, {
    contentType: file.type,
    upsert: false
  });
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 400 });

  // TODO: Add malware scanning integration before production launch.
  const { error: insertError } = await supabase.from('attachments').insert({
    tenant_id: tenantId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    retention_delete_after: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  const { data: signedData } = await supabase.storage.from('attachments').createSignedUrl(path, 300);
  return NextResponse.json({ path, signedUrl: signedData?.signedUrl });
}
