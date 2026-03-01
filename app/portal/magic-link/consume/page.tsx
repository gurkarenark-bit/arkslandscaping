import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase';
import { enforceRateLimit } from '@/lib/rate-limit';
import { isMagicLinkValid, setPortalSessionCookie } from '@/lib/portal-auth';

export const runtime = 'nodejs';

const ATTEMPTS_PER_HOUR_TOKEN = 20;
const ATTEMPTS_PER_HOUR_IP = 60;

export default async function ConsumeMagicLinkPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  if (!token) redirect('/portal/auth?error=missing_token');

  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const tokenKey = token.slice(0, 12);
  if (!(await enforceRateLimit(`magic-consume-token:${tokenKey}`, ATTEMPTS_PER_HOUR_TOKEN))) {
    redirect('/portal/auth?error=rate_limit_token');
  }
  if (!(await enforceRateLimit(`magic-consume-ip:${ip}`, ATTEMPTS_PER_HOUR_IP))) {
    redirect('/portal/auth?error=rate_limit_ip');
  }

  const supabase = createServiceClient();
  const { data: link } = await supabase
    .from('portal_magic_links')
    .select('id,token_hash,expires_at,revoked_at,tenant_id,customer_id,customers(email)')
    .eq('token_prefix', tokenKey)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  const match = (link ?? []).find((row) =>
    isMagicLinkValid(
      {
        token_hash: row.token_hash,
        expires_at: row.expires_at,
        revoked_at: row.revoked_at
      },
      token
    )
  );

  if (!match) redirect('/portal/auth?error=invalid_or_expired');

  await supabase.from('portal_magic_links').update({ last_used_at: new Date().toISOString() }).eq('id', match.id);

  setPortalSessionCookie(
    {
      tenantId: match.tenant_id,
      customerId: match.customer_id,
      email: (match.customers as { email: string }[] | null)?.[0]?.email ?? ''
    },
    new Date(match.expires_at)
  );

  redirect('/portal');
}
