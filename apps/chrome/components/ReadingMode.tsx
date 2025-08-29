'use client';

import { useEffect, useState, useCallback } from 'react';
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import { createStore, set as idbSet } from 'idb-keyval';
import usePersistentState from '../../../hooks/usePersistentState';

const snapshotStore = createStore('reading-mode', 'snapshots');

type Mode = 'live' | 'snapshot';

const isMode = (v: unknown): v is Mode => v === 'live' || v === 'snapshot';

const ReadingMode = () => {
  const [mode, setMode] = usePersistentState<Mode>(
    'reading-mode-mode',
    'live',
    isMode,
  );
  const [snapshot, setSnapshot] = usePersistentState<string>(
    'reading-mode-snapshot',
    '',
    (v): v is string => typeof v === 'string',
  );
  const [content, setContent] = useState('');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const doc = document.cloneNode(true) as Document;
    const article = new Readability(doc).parse();
    const cleaned = article ? DOMPurify.sanitize(article.content) : '';
    setContent(cleaned);
  }, []);

  const saveSnapshot = useCallback(async () => {
    await idbSet('last', content, snapshotStore);
    setSnapshot(content);
    setMode('snapshot');
  }, [content, setSnapshot, setMode]);

  const displayed = mode === 'snapshot' ? snapshot : content;

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="mb-4 flex space-x-2">
        <button
          className="p-2 border rounded"
          onClick={() => setMode(mode === 'live' ? 'snapshot' : 'live')}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="sr-only">
            {mode === 'live' ? 'Show Saved' : 'Show Live'}
          </span>
        </button>
        <button
          className="p-2 border rounded"
          onClick={saveSnapshot}
          disabled={!content}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M12 5v8m0 0l3-3m-3 3l-3-3M5 19h14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="sr-only">Save snapshot</span>
        </button>
      </div>
      <article dangerouslySetInnerHTML={{ __html: displayed }} />
    </div>
  );
};

export default ReadingMode;

