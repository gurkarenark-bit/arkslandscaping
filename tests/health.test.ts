import test from 'node:test';
import assert from 'node:assert/strict';

test('api/health returns ok without Supabase env vars', async () => {
  const original = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const { GET } = await import('../app/api/health/route.ts');
  const response = await GET();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });

  Object.assign(process.env, original);
});
