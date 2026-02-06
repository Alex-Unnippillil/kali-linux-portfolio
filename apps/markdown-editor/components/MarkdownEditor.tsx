'use client';

import React, { useState } from 'react';
import { MarkdownEditorProvider, useMarkdownEditor } from '../state/MarkdownEditorContext';
import Snippets from './Snippets';
import DocsOverlay from './DocsOverlay';

const EditorSurface: React.FC = () => {
  const { value, setValue, textareaRef } = useMarkdownEditor();
  const [showDocs, setShowDocs] = useState(false);

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Markdown Editor</h1>
          <p className="text-sm text-slate-300">
            Draft notes, write documentation, and enrich content with reusable snippets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDocs(true)}
          className="rounded border border-cyan-500 px-3 py-1 text-sm text-cyan-200 transition hover:bg-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          Snippet Reference
        </button>
      </header>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-[220px] flex-1 rounded-md border border-slate-700 bg-slate-950/70 p-4 font-mono text-sm text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder="Start typing markdown..."
        aria-label="Markdown editor"
      />
      <Snippets />
      {showDocs && <DocsOverlay onClose={() => setShowDocs(false)} />}
    </div>
  );
};

const MarkdownEditor: React.FC = () => (
  <MarkdownEditorProvider>
    <EditorSurface />
  </MarkdownEditorProvider>
);

export default MarkdownEditor;
