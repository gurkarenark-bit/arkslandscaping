import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export function createAnonClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false }
  });
}

export function createServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
}

export type AppRole = 'Admin' | 'Office' | 'Crew' | 'Customer';
