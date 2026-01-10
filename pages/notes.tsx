'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface BlogNote {
  id: string;
  title: string;
  icon?: string;
  date?: string;
  tags?: string[];
}

interface NotesPageState {
  notes: BlogNote[];
  error?: string;
}

export default function NotesPage() {
  const [state, setState] = useState<NotesPageState>({ notes: [] });

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase env vars missing; notes feature disabled');
      setState({ notes: [], error: 'supabase_unavailable' });
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    supabase
      .from('notes')
      .select()
      .then(({ data, error }) => {
        if (error) {
          setState({ notes: [], error: error.message });
        } else {
          setState({ notes: (data as BlogNote[]) ?? [] });
        }
      });
  }, []);

  if (state.error) {
    return <pre>{JSON.stringify({ error: state.error }, null, 2)}</pre>;
  }

  if (!state.notes.length) {
    return <p className="p-4">No notes available.</p>;
  }

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : '';

  return (
    <main className="p-4 text-white">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 place-items-center">
        {state.notes
          .slice()
          .sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : 0))
          .map((note) => (
            <article
              key={note.id}
              className="flex flex-col items-center w-full max-w-[10rem] bg-gray-800 rounded-lg p-3 text-center"
            >
              {note.icon ? (
                <img src={note.icon} alt="" className="w-12 h-12 mb-2" />
              ) : (
                <span className="text-4xl mb-2" role="img" aria-label="note">
                  📝
                </span>
              )}
              <h2 className="text-sm font-semibold line-clamp-2">{note.title}</h2>
              {note.date && (
                <time className="mt-1 text-[0.625rem] uppercase tracking-widest text-gray-400">
                  {formatDate(note.date)}
                </time>
              )}
              {note.tags && note.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {note.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-black/20 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
      </div>
    </main>
  );
}

