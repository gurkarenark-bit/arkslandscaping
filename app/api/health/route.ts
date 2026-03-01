import { NextResponse } from 'next/server';

function hasEnv(name: string) {
  return Boolean(process.env[name] && process.env[name]?.trim());
}

export async function GET() {
  const hasSupabase = hasEnv('NEXT_PUBLIC_SUPABASE_URL') && hasEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const hasService = hasEnv('SUPABASE_SERVICE_ROLE_KEY');

  return NextResponse.json({
    status: hasSupabase ? 'ok' : 'degraded',
    service: 'arkslandscaping-mvp',
    checks: {
      supabasePublicEnv: hasSupabase,
      supabaseServiceEnv: hasService
    },
    timestamp: new Date().toISOString()
  });
}
