'use client';

import { useEffect, useState } from 'react';

type SupabaseModule = typeof import('@supabase/supabase-js');

let supabasePromise: Promise<SupabaseModule> | null = null;
const loadSupabase = () => {
  if (!supabasePromise) {
    supabasePromise = import('@supabase/supabase-js');
  }
  return supabasePromise;
};

interface NotesPageState {
  notes: unknown[] | null;
  error?: string;
  status: 'idle' | 'loading' | 'ready';
}

const NotesClient: React.FC = () => {
  const [state, setState] = useState<NotesPageState>({
    notes: null,
    status: 'idle',
  });

  useEffect(() => {
    let cancelled = false;

    const fetchNotes = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase env vars missing; notes feature disabled');
        if (!cancelled) {
          setState({ notes: null, error: 'supabase_unavailable', status: 'ready' });
        }
        return;
      }

      try {
        if (!cancelled) {
          setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
        }
        const { createClient } = await loadSupabase();
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase.from('notes').select();
        if (!cancelled) {
          if (error) {
            setState({ notes: null, error: error.message, status: 'ready' });
          } else {
            setState({ notes: data ?? null, status: 'ready' });
          }
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setState({
            notes: null,
            status: 'ready',
            error: error instanceof Error ? error.message : 'Failed to load notes',
          });
        }
      }
    };

    fetchNotes();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ub-cool-grey text-white">
        <p className="animate-pulse text-sm tracking-wide">Loading notes…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ub-cool-grey p-4 text-white">
        <pre className="rounded bg-black/40 p-4 text-sm">
          {JSON.stringify({ error: state.error }, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ub-cool-grey p-4 text-white">
      <pre className="max-h-[60vh] w-full max-w-3xl overflow-auto rounded bg-black/40 p-4 text-left text-sm">
        {JSON.stringify(state.notes, null, 2)}
      </pre>
    </div>
  );
};

export default NotesClient;
