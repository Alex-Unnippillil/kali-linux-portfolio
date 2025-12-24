import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverOnly } from './server-only';

serverOnly('lib/server/service-client');

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
