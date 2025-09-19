'use client';

import { useEffect, useState, useCallback } from 'react';
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import { createStore, set as idbSet } from 'idb-keyval';
import usePersistentState from '../../../hooks/usePersistentState';
import { createTrustedHTML } from '../../../utils/trustedTypes';

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
    const cleaned = DOMPurify.sanitize(article?.content ?? '');
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
      <div className="mb-4 space-x-2">
        <button
          className="border px-2 py-1 rounded"
          onClick={() => setMode(mode === 'live' ? 'snapshot' : 'live')}
        >
          {mode === 'live' ? 'Show Saved' : 'Show Live'}
        </button>
        <button
          className="border px-2 py-1 rounded"
          onClick={saveSnapshot}
          disabled={!content}
        >
          Save snapshot
        </button>
      </div>
      <article
        dangerouslySetInnerHTML={{ __html: createTrustedHTML(displayed) }}
      />
    </div>
  );
};

export default ReadingMode;

