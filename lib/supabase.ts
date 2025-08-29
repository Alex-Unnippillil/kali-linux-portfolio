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
