'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  SNIPPETS,
  formatShortcut,
  parseShortcut,
  type MarkdownSnippet,
  type ShortcutDef,
} from './snippetLibrary';
import { useMarkdownEditor } from '../state/MarkdownEditorContext';

const isMacPlatform = () =>
  typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const matchesShortcut = (event: KeyboardEvent, shortcut: ShortcutDef) => {
  const key = event.key.toLowerCase();
  const matchesKey = key === shortcut.key;
  if (!matchesKey) return false;

  if (shortcut.mod && !(event.metaKey || event.ctrlKey)) return false;
  if (!shortcut.mod && (event.metaKey || event.ctrlKey)) return false;
  if (shortcut.shift !== undefined && event.shiftKey !== shortcut.shift) return false;
  if (shortcut.alt !== undefined && event.altKey !== shortcut.alt) return false;

  return true;
};

const shouldHandleEvent = (
  target: EventTarget | null,
  editor: HTMLTextAreaElement | null,
) => {
  if (!editor) return false;
  if (!target) return false;
  if (target === editor) return true;
  if (target === window || target === document || target === document.body) return true;
  if (target instanceof HTMLElement && target.dataset.snippetButton) return true;
  return false;
};

const Snippets: React.FC = () => {
  const { applySnippet, textareaRef } = useMarkdownEditor();
  const platform = isMacPlatform() ? 'mac' : 'default';

  const entries = useMemo(
    () =>
      SNIPPETS.map((snippet) => ({
        ...snippet,
        shortcutDef: parseShortcut(snippet.shortcut),
      })),
    [],
  );

  const handleInsert = useCallback(
    (snippet: MarkdownSnippet) => {
      applySnippet(snippet.build);
    },
    [applySnippet],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!textareaRef.current) return;
      if (!shouldHandleEvent(event.target, textareaRef.current)) return;

      for (const entry of entries) {
        if (matchesShortcut(event, entry.shortcutDef)) {
          event.preventDefault();
          handleInsert(entry);
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [entries, handleInsert, textareaRef]);

  return (
    <section aria-label="Markdown snippets" className="space-y-2">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
          Snippets
        </h2>
        <p className="text-xs text-slate-400">
          Use keyboard shortcuts for quick inserts
        </p>
      </header>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map((snippet) => (
          <button
            key={snippet.id}
            type="button"
            data-snippet-button
            onClick={() => handleInsert(snippet)}
            className="group rounded-md border border-slate-700 bg-slate-900/40 p-3 text-left transition hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{snippet.label}</span>
              <kbd className="rounded bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-200">
                {formatShortcut(snippet.shortcutDef, platform)}
              </kbd>
            </div>
            <p className="mt-1 text-xs text-slate-300">{snippet.description}</p>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-950/70 p-2 text-xs text-slate-200">
              {snippet.preview}
            </pre>
          </button>
        ))}
      </div>
    </section>
  );
};

export default Snippets;
