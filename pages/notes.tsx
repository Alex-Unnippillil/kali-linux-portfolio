'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { clientEnv } from '../lib/env.client';

interface NotesPageState {
  notes: unknown[] | null;
  error?: string;
}

export default function NotesPage() {
  const [state, setState] = useState<NotesPageState>({ notes: null });

  useEffect(() => {
    const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const supabaseKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase env vars missing; notes feature disabled');
      setState({ notes: null, error: 'supabase_unavailable' });
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    supabase
      .from('notes')
      .select()
      .then(({ data, error }) => {
        if (error) {
          setState({ notes: null, error: error.message });
        } else {
          setState({ notes: data ?? null });
        }
      });
  }, []);

  if (state.error) {
    return <pre>{JSON.stringify({ error: state.error }, null, 2)}</pre>;
  }

  return <pre>{JSON.stringify(state.notes, null, 2)}</pre>;
}

