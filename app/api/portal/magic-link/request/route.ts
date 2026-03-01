import { NextResponse } from 'next/server';
import { createRawMagicToken, tokenHash } from '@/lib/portal-auth';
import { createServiceClient } from '@/lib/supabase';
import { enforceRateLimit } from '@/lib/rate-limit';

const REQUESTS_PER_HOUR_EMAIL = 5;
const REQUESTS_PER_HOUR_IP = 30;
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

function getRequestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

export async function POST(request: Request) {
  const { email, phone } = await request.json();
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  if (!normalizedEmail) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const ip = getRequestIp(request);
  if (!(await enforceRateLimit(`magic-request-email:${normalizedEmail}`, REQUESTS_PER_HOUR_EMAIL))) {
    return NextResponse.json({ error: 'Too many requests for email' }, { status: 429 });
  }
  if (!(await enforceRateLimit(`magic-request-ip:${ip}`, REQUESTS_PER_HOUR_IP))) {
    return NextResponse.json({ error: 'Too many requests for IP' }, { status: 429 });
  }

  const supabase = createServiceClient();
  const { data: tenant, error: tenantError } = await supabase.from('tenants').select('id').eq('name', "Ark's Landscaping").single();
  if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 500 });

  let { data: customer } = await supabase
    .from('customers')
    .select('id,tenant_id,email,phone')
    .eq('tenant_id', tenant.id)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (!customer) {
    const insert = await supabase
      .from('customers')
      .insert({ tenant_id: tenant.id, email: normalizedEmail, phone: phone ?? null, full_name: normalizedEmail })
      .select('id,tenant_id,email,phone')
      .single();
    if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 });
    customer = insert.data;
  }

  const now = new Date();
  const rawToken = createRawMagicToken();
  const expiresAt = new Date(now.getTime() + TTL_MS);

  // Safe rule: always mint a new token and keep old active tokens reusable until expiry/revocation.
  // This avoids returning previously issued raw tokens while preserving reuse semantics.
  const hashed = tokenHash(rawToken);

  const { error: linkError } = await supabase.from('portal_magic_links').insert({
    tenant_id: tenant.id,
    customer_id: customer.id,
    token_prefix: rawToken.slice(0, 12),
    token_hash: hashed,
    expires_at: expiresAt.toISOString()
  });

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  await supabase.from('in_app_notifications').insert({
    tenant_id: tenant.id,
    title: 'Portal link requested',
    body: `Portal magic link requested for ${normalizedEmail}`
  });

  const link = `${new URL(request.url).origin}/portal/magic-link/consume?token=${rawToken}`;
  return NextResponse.json({
    ok: true,
    expiresAt: expiresAt.toISOString(),
    devMagicLink: process.env.NODE_ENV === 'development' ? link : undefined
  });
}
