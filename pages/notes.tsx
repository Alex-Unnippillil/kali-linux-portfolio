'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NotesPage() {
  const [notes, setNotes] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('notes').select();
        if (error) setError(error.message);
        else setNotes(data ?? []);
      } catch (e: any) {
        setError(e?.message ?? 'Unexpected error');
      }
    })();
  }, []);

  if (error) return <pre>{JSON.stringify({ error }, null, 2)}</pre>;
  return <pre>{JSON.stringify(notes, null, 2)}</pre>;
}

