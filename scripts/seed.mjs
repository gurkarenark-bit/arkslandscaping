import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const staffUsers = [
  { email: 'admin@arkslandscaping.local', password: 'Password123!', role: 'Admin', full_name: 'Alice Admin' },
  { email: 'office@arkslandscaping.local', password: 'Password123!', role: 'Office', full_name: 'Oscar Office' },
  { email: 'crew@arkslandscaping.local', password: 'Password123!', role: 'Crew', full_name: 'Casey Crew' }
];

const { data: tenant } = await supabase.from('tenants').upsert({ name: "Ark's Landscaping" }).select().single();

for (const user of staffUsers) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name }
  });
  if (error && !error.message.includes('already')) throw error;

  const userId = data?.user?.id ?? (await supabase.auth.admin.listUsers()).data.users.find((u) => u.email === user.email)?.id;
  if (!userId) throw new Error(`Unable to resolve user id for ${user.email}`);

  await supabase.from('user_profiles').upsert({
    user_id: userId,
    tenant_id: tenant.id,
    role: user.role,
    full_name: user.full_name
  });
}

const { data: customer } = await supabase.from('customers').upsert({
  tenant_id: tenant.id,
  email: 'customer@example.com',
  phone: '555-0100',
  full_name: 'Chris Customer'
}, { onConflict: 'tenant_id,email' }).select().single();

const { data: job } = await supabase.from('jobs').insert({
  tenant_id: tenant.id,
  customer_id: customer.id,
  service_address: '123 Main St',
  title: 'Spring cleanup'
}).select().single();

await supabase.from('job_visits').insert({
  job_id: job.id,
  start_time: new Date(Date.now() + 86400000).toISOString(),
  notes: 'Initial onsite visit'
});

console.log('Seed completed for Ark\'s Landscaping');
