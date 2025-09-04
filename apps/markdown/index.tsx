'use client';

import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import useOPFS from '../../hooks/useOPFS';

export default function MarkdownEditor() {
  const [markdown, setMarkdown] = useState('');
  const [html, setHtml] = useState('');
  const { supported, writeFile } = useOPFS();

  useEffect(() => {
    setHtml(DOMPurify.sanitize(marked.parse(markdown)));
  }, [markdown]);

  const save = async (ext: 'md' | 'html') => {
    if (!supported) return;
    const name = prompt('Filename', `note.${ext}`) || `note.${ext}`;
    const data = ext === 'md' ? markdown : `<!DOCTYPE html><html><body>${html}</body></html>`;
    await writeFile(name, data);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 grid md:grid-cols-2 gap-2 overflow-hidden">
        <textarea
          className="w-full h-full p-2 border border-gray-300 bg-white text-black resize-none"
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          aria-label="Markdown editor"
        />
        <div
          className="w-full h-full p-2 overflow-auto border border-gray-300 bg-white text-black"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={() => save('md')} disabled={!supported}>
          Export .md
        </button>
        <button onClick={() => save('html')} disabled={!supported}>
          Export .html
        </button>
      </div>
    </div>
  );
}

