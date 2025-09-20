export const dynamic = 'force-dynamic';

async function loadNotes() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { notes: null, error: 'supabase_unavailable' } as const;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.from('notes').select();
    if (error) {
      return { notes: null, error: error.message } as const;
    }
    return { notes: data ?? null, error: null } as const;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch_failed';
    return { notes: null, error: message } as const;
  }
}

export default async function NotesPage() {
  const { notes, error } = await loadNotes();
  const content = error ? { error } : notes;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <pre className="max-w-2xl overflow-auto rounded bg-white p-4 text-sm text-gray-900 shadow">
        {JSON.stringify(content, null, 2)}
      </pre>
    </main>
  );
}
