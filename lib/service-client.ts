import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('Supabase environment variables are not set');
}

export const serviceClient = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
