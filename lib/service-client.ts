import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function createSupabaseServerClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn(
      'Supabase service client unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set',
    );
    return null;
  }
  return createSupabaseServerClient(url, serviceKey);
}

export function getAnonServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.warn(
      'Supabase anon client unavailable: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set',
    );
    return null;
  }
  return createSupabaseServerClient(url, anonKey);
}
