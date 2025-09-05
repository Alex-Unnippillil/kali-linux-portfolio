'use client';

import { useEffect, useRef, useState } from 'react';

interface Note {
  id: number;
  text: string;
}

export default function NotesPanel() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const liveRef = useRef<HTMLDivElement>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('panelNotes');
      if (stored) {
        setNotes(JSON.parse(stored));
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  // Persist notes whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('panelNotes', JSON.stringify(notes));
    } catch {
      /* ignore storage errors */
    }
  }, [notes]);

  const announce = (msg: string) => {
    const el = liveRef.current;
    if (!el) return;
    el.textContent = '';
    setTimeout(() => {
      el.textContent = msg;
    }, 100);
  };

  const addNote = () => {
    if (!draft.trim()) return;
    const newNote = { id: Date.now(), text: draft.trim() };
    setNotes((n) => [...n, newNote]);
    setDraft('');
    announce('Note added');
  };

  const updateNote = (id: number, text: string) => {
    setNotes((n) => n.map((note) => (note.id === id ? { ...note, text } : note)));
  };

  const handleNoteBlur = () => announce('Note updated');

  const deleteNote = (id: number) => {
    setNotes((n) => n.filter((note) => note.id !== id));
    announce('Note deleted');
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Notes (${notes.length})`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-2 right-2 z-40 bg-gray-700 text-white rounded-full w-10 h-10 flex items-center justify-center focus:outline-none focus:ring"
      >
        📝
        {notes.length > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-red-600 rounded-full text-xs w-5 h-5 flex items-center justify-center"
            aria-hidden="true"
          >
            {notes.length}
          </span>
        )}
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white text-black p-4 rounded w-64 max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg mb-2">Notes</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addNote();
              }}
              className="mb-2"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Quick add"
                className="w-full border border-gray-300 p-1"
              />
            </form>
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={n.text}
                    onChange={(e) => updateNote(n.id, e.target.value)}
                    onBlur={handleNoteBlur}
                    className="flex-1 border border-gray-300 p-1"
                  />
                  <button
                    type="button"
                    aria-label="Delete note"
                    onClick={() => deleteNote(n.id)}
                    className="text-red-600"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div ref={liveRef} aria-live="polite" className="sr-only" data-testid="note-live" />
    </>
  );
}

