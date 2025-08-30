export function getServiceSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are not set');
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
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are not set');
  }
  return {
    from(table: string) {
      return {
        async select() {
          const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
          });
          if (!response.ok) {
            return { data: null, error: new Error(await response.text()) };
          }
          const data = await response.json();
          return { data, error: null };
        },
      };
    },
  };
}
