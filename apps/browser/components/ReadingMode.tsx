'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import { createStore, set as idbSet } from 'idb-keyval';
import useBrowserStorage from '../useBrowserStorage';
import { useBrowserContext } from '../context';

type Mode = 'live' | 'snapshot';

const isMode = (v: unknown): v is Mode => v === 'live' || v === 'snapshot';

const ReadingMode = () => {
  const { isIncognito } = useBrowserContext();
  const [mode, setMode] = useBrowserStorage<Mode>('reading-mode-mode', 'live', isMode);
  const [snapshot, setSnapshot] = useBrowserStorage<string>(
    'reading-mode-snapshot',
    '',
    (value): value is string => typeof value === 'string',
  );
  const [content, setContent] = useState('');
  const snapshotStore = useMemo(
    () => createStore(isIncognito ? 'reading-mode-incognito' : 'reading-mode', 'snapshots'),
    [isIncognito],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const doc = document.cloneNode(true) as Document;
    const article = new Readability(doc).parse();
    const cleaned = DOMPurify.sanitize(article?.content ?? '');
    setContent(cleaned);
  }, []);

  const saveSnapshot = useCallback(async () => {
    if (!isIncognito) {
      await idbSet('last', content, snapshotStore);
    }
    setSnapshot(content);
    setMode('snapshot');
  }, [content, isIncognito, setSnapshot, setMode, snapshotStore]);

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
      <article dangerouslySetInnerHTML={{ __html: displayed }} />
    </div>
  );
};

export default ReadingMode;

