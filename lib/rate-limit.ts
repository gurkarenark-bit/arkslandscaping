import { createServiceClient } from './supabase';

export async function enforceRateLimit(key: string, maxPerHour: number) {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('api_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', since);

  if (error) throw new Error(error.message);
  if ((count ?? 0) >= maxPerHour) return false;

  const { error: insertError } = await supabase.from('api_rate_limits').insert({ key });
  if (insertError) throw new Error(insertError.message);
  return true;
}
