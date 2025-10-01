'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { normalizeWordlist } from '../../../utils/wordlist';

interface WordlistEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  initialContent: string;
  onSave: (name: string, content: string) => void;
  existingNames: string[];
}

const WordlistEditorModal: React.FC<WordlistEditorModalProps> = ({
  isOpen,
  onClose,
  initialName,
  initialContent,
  onSave,
  existingNames,
}) => {
  const [name, setName] = useState(initialName);
  const [text, setText] = useState(initialContent);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setText(initialContent);
    }
  }, [isOpen, initialContent, initialName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const summary = useMemo(() => normalizeWordlist(text), [text]);
  const sanitizedContent = useMemo(
    () => summary.entries.join('\n'),
    [summary.entries]
  );
  const previewEntries = useMemo(() => summary.entries.slice(0, 15), [summary.entries]);

  const handleSave = () => {
    if (!name.trim() || !summary.entries.length) return;
    onSave(name.trim(), sanitizedContent);
  };

  const handleDownload = () => {
    const blob = new Blob([sanitizedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'wordlist').replace(/[^a-z0-9_-]+/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const isOverwriting =
    name.trim() && existingNames.includes(name.trim()) && name.trim() !== initialName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wordlist-editor-title"
    >
      <div className="w-full max-w-2xl rounded-lg bg-gray-900 text-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 id="wordlist-editor-title" className="text-lg font-semibold">
            Wordlist Editor
          </h2>
          <button
            onClick={onClose}
            className="rounded bg-gray-800 px-2 py-1 text-sm hover:bg-gray-700"
          >
            Close
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <label htmlFor="wordlist-name" className="mb-1 block text-sm font-medium">
              Wordlist name
            </label>
            <input
              id="wordlist-name"
              className="w-full rounded bg-gray-800 p-2 text-white"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="rockyou-clean"
              aria-label="Wordlist name"
            />
            {isOverwriting && (
              <p className="mt-1 text-xs text-yellow-400">
                Saving will overwrite an existing list with the same name.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="wordlist-text" className="mb-1 block text-sm font-medium">
              Paste or edit entries
            </label>
            <textarea
              id="wordlist-text"
              className="h-48 w-full rounded bg-gray-800 p-2 text-white"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="One entry per line"
              aria-label="Wordlist entries"
            />
            <p className="mt-2 text-xs text-gray-300">
              Total lines: {summary.totalEntries} · Unique: {summary.uniqueCount} · Empty removed:{' '}
              {summary.emptyLinesRemoved} · Duplicates removed: {summary.duplicatesRemoved}
            </p>
          </div>
          {summary.entries.length > 0 ? (
            <div>
              <p className="text-sm font-medium">Preview ({previewEntries.length} of {summary.uniqueCount})</p>
              <div className="mt-2 max-h-40 overflow-auto rounded border border-gray-800 bg-gray-950 p-3 text-xs">
                <ol className="list-decimal space-y-1 pl-4">
                  {previewEntries.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Paste entries above to see a preview.</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-gray-700 px-4 py-3">
          <button
            onClick={handleDownload}
            className="rounded bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700 disabled:opacity-50"
            disabled={!summary.entries.length}
          >
            Download cleaned list
          </button>
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="rounded bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
              disabled={!name.trim() || !summary.entries.length}
            >
              Save wordlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordlistEditorModal;
