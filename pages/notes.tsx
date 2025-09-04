'use client';

import { useEffect, useRef, useState } from 'react';
import {
  loadNotes,
  saveNotes,
  StoredNote,
  exportNotes as exportNotesJson,
  importNotes as importNotesJson,
} from '../utils/storage-opfs';

export default function NotesPage() {
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [query, setQuery] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      setNotes(await loadNotes());
    })();
  }, []);

  const addNote = async () => {
    const text = textRef.current?.value.trim();
    if (!text) return;
    const tags = tagsRef.current?.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean) || [];
    const newNotes = [
      ...notes,
      { id: Date.now().toString(), text, tags },
    ];
    setNotes(newNotes);
    await saveNotes(newNotes);
    if (textRef.current) textRef.current.value = '';
    if (tagsRef.current) tagsRef.current.value = '';
  };

  const filteredNotes = notes.filter((n) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      n.text.toLowerCase().includes(q) ||
      n.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const exportNotes = async () => {
    const json = await exportNotesJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importNotes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const imported = await importNotesJson(text);
    setNotes(imported);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <textarea
          ref={textRef}
          placeholder="Note"
          className="border w-full p-2"
        />
        <input
          ref={tagsRef}
          placeholder="tags (comma separated)"
          className="border w-full p-2"
        />
        <button onClick={addNote} className="bg-blue-500 text-white px-3 py-1">
          Add
        </button>
      </div>
      <div className="space-y-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="border w-full p-2"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={exportNotes}
            className="bg-green-600 text-white px-3 py-1"
          >
            Export
          </button>
          <input type="file" accept="application/json" onChange={importNotes} />
        </div>
      </div>
      <ul className="space-y-4">
        {filteredNotes.map((note) => (
          <li key={note.id} className="border p-2">
            <p>{note.text}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-200 rounded px-2 py-1 text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
