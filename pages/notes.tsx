'use client';

import { useEffect, useState } from 'react';

interface NotesPageState {
  notes: unknown[] | null;
  error?: string;
}

export default function NotesPage() {
  const [state, setState] = useState<NotesPageState>({ notes: null });

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase env vars missing; notes feature disabled');
      setState({ notes: null, error: 'supabase_unavailable' });
      return;
    }
    fetch(`${supabaseUrl}/rest/v1/notes?select=*`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Request failed');
        }
        return res.json();
      })
      .then((data) => setState({ notes: data ?? null }))
      .catch((err: Error) => {
        console.error('Failed to fetch notes', err);
        setState({ notes: null, error: err.message });
      });
  }, []);

  if (state.error) {
    return <pre>{JSON.stringify({ error: state.error }, null, 2)}</pre>;
  }

  return <pre>{JSON.stringify(state.notes, null, 2)}</pre>;
}
