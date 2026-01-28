'use client';

import { useEffect, useState } from 'react';
import demoNotes from '../data/notes-demo.json';

interface NotesPageState {
  notes: unknown[] | null;
  error?: string;
}

export default function NotesPage() {
  const [state, setState] = useState<NotesPageState>({ notes: null });

  useEffect(() => {
    setState({ notes: demoNotes });
  }, []);

  if (state.error) {
    return <pre>{JSON.stringify({ error: state.error }, null, 2)}</pre>;
  }

  return <pre>{JSON.stringify(state.notes, null, 2)}</pre>;
}
