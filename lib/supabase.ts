import { ensureServerEnv } from './runtime-env';

export function getServiceSupabase() {
  ensureServerEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn(
      'Supabase service credentials missing; service functionality disabled',
    );
    return null;
  }
  return {
    from(table: string) {
      return {
        insert(values: unknown) {
          return fetch(`${url}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(values),
          });
        },
      };
    },
  };
}

export function getAnonSupabaseServer() {
  ensureServerEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn(
      'Supabase anonymous credentials missing; related features disabled',
    );
    return null;
  }
  return {
    from(table: string) {
      return {
        async select() {
          const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          });
          if (!res.ok) {
            const error = await res.text();
            return { data: null, error };
          }
          const data = await res.json();

          return { data, error: null };
        },
      };
    },
  };
}
