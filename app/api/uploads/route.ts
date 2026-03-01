import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { allowedMimeTypes, isValidSignature } from '@/lib/file-signature';
import { createServiceClient } from '@/lib/supabase';

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 25MB' }, { status: 400 });
  }

  if (!allowedMimeTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported type' }, { status: 400 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!isValidSignature(buffer, file.type)) {
    return NextResponse.json({ error: 'Invalid file signature' }, { status: 400 });
  }

  const path = `private/${randomUUID()}-${file.name}`;
  const supabase = createServiceClient();

  const { error: storageError } = await supabase.storage.from('attachments').upload(path, buffer, {
    contentType: file.type,
    upsert: false
  });
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 400 });

  // TODO: malware scanning should be added before release.
  const { error: insertError } = await supabase.from('attachments').insert({
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  const { data: signedData } = await supabase.storage.from('attachments').createSignedUrl(path, 300);
  return NextResponse.json({ path, signedUrl: signedData?.signedUrl });
}
