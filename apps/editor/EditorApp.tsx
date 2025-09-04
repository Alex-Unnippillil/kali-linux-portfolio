'use client';

import { useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { kaliTheme } from '../../styles/themes/kali';

export default function EditorApp() {
  const [editor, setEditor] = useState<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [decorations, setDecorations] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const handleMount: OnMount = (editorInstance, monaco) => {
    monaco.editor.defineTheme('kali-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f1317',
        'editorCursor.foreground': '#1793d1',
        'editor.lineHighlightBackground': '#1a1f26',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#1793d133',
      },
    });
    editorInstance.updateOptions({
      lineNumbers: 'on',
      minimap: { enabled: false },
    });
    setEditor(editorInstance);
  };

  const handleSearch = () => {
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    if (!search) {
      setDecorations(editor.deltaDecorations(decorations, []));
      return;
    }
    const matches = model.findMatches(search, false, false, false, null, true);
    const newDecorations = editor.deltaDecorations(
      decorations,
      matches.map(m => ({
        range: m.range,
        options: { inlineClassName: 'editor-search-highlight' },
      })),
    );
    setDecorations(newDecorations);
    if (matches[0]) editor.revealRangeInCenter(matches[0].range);
  };

  return (
    <>
      <div
        className="flex flex-col h-full w-full"
        style={{ backgroundColor: kaliTheme.background }}
      >
        <div
          className="flex gap-2 p-2"
          style={{ backgroundColor: kaliTheme.sidebar }}
        >
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            aria-label="Search within file"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-2 py-1 text-sm rounded bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-muted)]"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-1 rounded text-sm"
            style={{ backgroundColor: kaliTheme.accent, color: '#fff' }}
          >
            Find
          </button>
        </div>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Start typing..."
          theme="kali-dark"
          onMount={handleMount}
          options={{ fontSize: 14, minimap: { enabled: false }, lineNumbers: 'on' }}
        />
      </div>
      <style jsx global>{`
        .editor-search-highlight {
          background-color: var(--color-primary);
          color: var(--color-inverse);
        }
      `}</style>
    </>
  );
}

