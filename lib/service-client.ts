import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { serverEnv } from './env.server';

export function getServiceClient(): SupabaseClient | null {
  const url = serverEnv.SUPABASE_URL;
  const serviceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn(
      'Supabase service client unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set',
    );
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
