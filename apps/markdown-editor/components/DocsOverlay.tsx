'use client';

import React from 'react';
import {
  SNIPPETS,
  formatShortcut,
  parseShortcut,
} from './snippetLibrary';

interface DocsOverlayProps {
  onClose: () => void;
}

const DocsOverlay: React.FC<DocsOverlayProps> = ({ onClose }) => {
  const isMac =
    typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 text-slate-100"
    >
      <div className="w-full max-w-2xl space-y-4 rounded-lg border border-slate-700 bg-slate-900/95 p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Markdown Snippets Reference</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-cyan-300 underline hover:text-cyan-200"
          >
            Close
          </button>
        </header>
        <p className="text-sm text-slate-300">
          The snippets palette augments the editor with ready-made building blocks. Use the
          shortcuts below while the editor is focused to insert the corresponding markdown at the
          caret. When text is selected the snippets adapt, wrapping or restructuring the selection
          instead of starting from scratch.
        </p>
        <ul className="space-y-3">
          {SNIPPETS.map((snippet) => {
            const shortcut = parseShortcut(snippet.shortcut);
            return (
              <li key={snippet.id} className="rounded border border-slate-700/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{snippet.label}</p>
                    <p className="text-xs text-slate-300">{snippet.description}</p>
                  </div>
                  <kbd className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200">
                    {formatShortcut(shortcut, isMac ? 'mac' : 'default')}
                  </kbd>
                </div>
                <pre className="mt-2 overflow-x-auto rounded bg-slate-950/70 p-2 text-xs text-slate-200">
                  {snippet.preview}
                </pre>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default DocsOverlay;
