'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import useOPFS from '../../hooks/useOPFS';

const STORAGE_KEY = 'kali-notepad-notes';
const ACTIVE_KEY = 'kali-notepad-active-note';

const DEFAULT_NOTE = {
  id: 'about-me',
  title: 'About Me',
  content: `Hey there! 👋

I’m Alex — a security-minded builder who loves crafting playful, interactive experiences. This desktop is my way of blending
retro Linux vibes with modern web tech. Explore around, open apps, and leave yourself a note!

• Passion: UX + security storytelling
• Playground: simulated tools, games, and utilities
• Motto: learn, tinker, and share

Thanks for stopping by!`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const buildNoteId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const sanitizeFileName = (title: string) => {
  const trimmed = title.trim();
  if (!trimmed) return 'note.txt';
  const safe = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${safe || 'note'}.txt`;
};

const loadNotes = () => {
  if (typeof window === 'undefined') return [DEFAULT_NOTE];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [DEFAULT_NOTE];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_NOTE];
    return parsed;
  } catch {
    return [DEFAULT_NOTE];
  }
};

const loadActiveId = (notes: Array<{ id: string }>) => {
  if (typeof window === 'undefined') return notes[0]?.id ?? DEFAULT_NOTE.id;
  const stored = window.localStorage.getItem(ACTIVE_KEY);
  if (stored && notes.some((note) => note.id === stored)) return stored;
  return notes[0]?.id ?? DEFAULT_NOTE.id;
};

export default function Notepad() {
  const [notes, setNotes] = useState(() => [DEFAULT_NOTE]);
  const [activeId, setActiveId] = useState(DEFAULT_NOTE.id);
  const [status, setStatus] = useState('Saved locally');
  const initialized = useRef(false);
  const { supported: opfsSupported, getDir, writeFile } = useOPFS();

  useEffect(() => {
    const loadedNotes = loadNotes();
    setNotes(loadedNotes);
    setActiveId(loadActiveId(loadedNotes));
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    window.localStorage.setItem(ACTIVE_KEY, activeId);
    setStatus('Saved locally');
  }, [notes, activeId]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeId) ?? notes[0],
    [notes, activeId],
  );

  const updateNote = (id: string, updates: Partial<typeof DEFAULT_NOTE>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, ...updates, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  };

  const createNote = () => {
    const id = buildNoteId();
    const newNote = {
      id,
      title: 'Untitled Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [...prev, newNote]);
    setActiveId(id);
  };

  const deleteNote = () => {
    if (!activeNote) return;
    setNotes((prev) => {
      const next = prev.filter((note) => note.id !== activeNote.id);
      if (next.length === 0) {
        const replacement = {
          ...DEFAULT_NOTE,
          id: buildNoteId(),
          title: 'Untitled Note',
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setActiveId(replacement.id);
        return [replacement];
      }
      const nextActive = next[0];
      setActiveId(nextActive.id);
      return next;
    });
  };

  const saveToFiles = async () => {
    if (!activeNote) return;
    if (!opfsSupported) {
      setStatus('Files integration is unavailable in this browser.');
      return;
    }
    const dir = await getDir('notes');
    if (!dir) {
      setStatus('Unable to access Files storage.');
      return;
    }
    const filename = sanitizeFileName(activeNote.title);
    const ok = await writeFile(filename, activeNote.content || '', dir);
    setStatus(
      ok ? `Saved to Files/notes/${filename}` : 'Failed to save to Files.',
    );
  };

  return (
    <div className="w-full h-full flex bg-ub-gedit-dark text-white">
      <aside className="w-1/3 min-w-[200px] max-w-[260px] border-r border-ubt-gedit-blue/60 bg-ub-gedit-darker flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-ubt-gedit-blue/60">
          <span className="text-sm font-semibold">Notes</span>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded bg-ub-gedit-light hover:bg-ub-gedit-light/80"
            onClick={createNote}
          >
            New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={`w-full text-left px-3 py-2 border-b border-white/5 hover:bg-white/5 ${
                note.id === activeId ? 'bg-white/10' : ''
              }`}
              onClick={() => setActiveId(note.id)}
            >
              <div className="text-sm font-medium truncate">{note.title}</div>
              <div className="text-[11px] text-white/60">
                {note.updatedAt
                  ? `Updated ${new Date(note.updatedAt).toLocaleString()}`
                  : 'Just now'}
              </div>
            </button>
          ))}
        </div>
      </aside>
      <section className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-4 py-2 border-b border-ubt-gedit-blue/60 bg-ub-gedit-light/40">
          <div className="flex items-center gap-2">
            <label htmlFor="note-title" className="sr-only">
              Note title
            </label>
            <input
              id="note-title"
              value={activeNote?.title ?? ''}
              onChange={(event) =>
                updateNote(activeNote.id, { title: event.target.value })
              }
              className="bg-transparent border-b border-white/40 text-sm font-semibold px-1 focus:outline-none focus:border-white"
              placeholder="Untitled note"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              className="px-2 py-1 rounded border border-white/30 hover:bg-white/10"
              onClick={saveToFiles}
            >
              Save to Files
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded border border-red-400/60 text-red-200 hover:bg-red-500/20"
              onClick={deleteNote}
            >
              Delete
            </button>
          </div>
        </header>
        <div className="flex-1 p-4">
          <label htmlFor="note-content" className="sr-only">
            Note content
          </label>
          <textarea
            id="note-content"
            value={activeNote?.content ?? ''}
            onChange={(event) =>
              updateNote(activeNote.id, { content: event.target.value })
            }
            className="w-full h-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
            placeholder="Start typing your note..."
          />
        </div>
        <footer className="px-4 py-2 border-t border-ubt-gedit-blue/60 text-xs text-white/70">
          <span role="status" aria-live="polite">
            {status}
          </span>
        </footer>
      </section>
    </div>
  );
}
