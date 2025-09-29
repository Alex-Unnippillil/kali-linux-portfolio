'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useOPFS from '../../../hooks/useOPFS';

export interface WordlistEntry {
  id: string;
  name: string;
  entries: string[];
  updatedAt: number;
}

const STORAGE_DIR = 'john/wordlists';

export const dedupeWordlist = (raw: string): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];

  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (!seen.has(line)) {
        seen.add(line);
        unique.push(line);
      }
    });

  return unique;
};

const slugify = (value: string): string => {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'wordlist';
};

const createEntry = (name: string, entries: string[]): WordlistEntry => ({
  id: slugify(name),
  name: name.trim() || 'Wordlist',
  entries,
  updatedAt: Date.now(),
});

const WordlistComposer: React.FC = () => {
  const { supported, getDir, listFiles, readFile, writeFile } = useOPFS();
  const [listName, setListName] = useState('Custom Wordlist');
  const [rawEntries, setRawEntries] = useState('');
  const [savedLists, setSavedLists] = useState<WordlistEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sortedLists = useMemo(
    () => [...savedLists].sort((a, b) => b.updatedAt - a.updatedAt),
    [savedLists],
  );

  const fetchLists = useCallback(async (): Promise<WordlistEntry[]> => {
    if (!supported) return [];
    const dir = await getDir(STORAGE_DIR);
    if (!dir) return [];

    const files = await listFiles(dir);
    const lists: WordlistEntry[] = [];
    for (const handle of files) {
      const raw = await readFile(handle.name, dir);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as WordlistEntry;
        lists.push({
          ...parsed,
          entries: dedupeWordlist(parsed.entries.join('\n')),
        });
      } catch {
        // Ignore malformed files
      }
    }
    return lists;
  }, [supported, getDir, listFiles, readFile]);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const lists = await fetchLists();
      if (!cancelled) {
        setSavedLists(lists);
        setStatus(null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, fetchLists]);

  const handleSave = useCallback(async () => {
    const entries = dedupeWordlist(rawEntries);
    if (entries.length === 0) {
      setStatus('Add at least one entry before saving.');
      return;
    }

    const entry = createEntry(listName, entries);
    setSavedLists((prev) => {
      const filtered = prev.filter((item) => item.id !== entry.id);
      return [...filtered, entry];
    });
    setStatus(
      `Saved ${entry.name} with ${entries.length} unique entr${
        entries.length === 1 ? 'y' : 'ies'
      }.`,
    );

    if (supported) {
      const dir = await getDir(STORAGE_DIR);
      if (dir) {
        await writeFile(`${entry.id}.json`, JSON.stringify(entry), dir);
      }
    }
  }, [listName, rawEntries, supported, getDir, writeFile]);

  return (
    <section className="space-y-4 bg-gray-900 text-white p-4 rounded" aria-label="Wordlist composer">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Wordlist Composer</h2>
        <p className="text-sm text-gray-300">
          Build custom wordlists, deduplicate entries instantly, and store them in your browser&apos;s
          private filesystem.
        </p>
      </div>

      <label className="block text-sm font-medium" htmlFor="wordlist-name">
        List Name
      </label>
      <input
        id="wordlist-name"
        aria-label="List name"
        className="w-full rounded px-2 py-1 text-black"
        value={listName}
        onChange={(event) => setListName(event.target.value)}
        placeholder="Example: Engagement A"
      />

      <label className="block text-sm font-medium" htmlFor="wordlist-entries">
        Entries (one per line)
      </label>
      <textarea
        id="wordlist-entries"
        aria-label="Entries"
        className="w-full min-h-[160px] rounded px-2 py-1 text-black"
        value={rawEntries}
        onChange={(event) => setRawEntries(event.target.value)}
        placeholder="password123\nadmin\nletmein"
      />

      <button
        type="button"
        onClick={handleSave}
        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition"
      >
        Save Wordlist
      </button>

      {status && <p role="status" className="text-sm text-green-300">{status}</p>}

      <div className="space-y-2">
        <h3 className="text-md font-semibold">Saved Wordlists</h3>
        {!supported && (
          <p className="text-xs text-yellow-300">
            OPFS is not supported in this environment. Wordlists will not persist between sessions.
          </p>
        )}
        {loading && <p className="text-sm text-gray-300">Loading saved lists…</p>}
        {!loading && sortedLists.length === 0 && (
          <p className="text-sm text-gray-400">No saved lists yet.</p>
        )}
        {!loading && sortedLists.length > 0 && (
          <ul className="space-y-3">
            {sortedLists.map((list) => (
              <li
                key={list.id}
                data-testid={`saved-list-${list.id}`}
                className="rounded border border-gray-700 p-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="font-medium">{list.name}</span>
                  <span className="text-xs text-gray-400">
                    {list.entries.length} unique entr{list.entries.length === 1 ? 'y' : 'ies'}
                  </span>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words bg-gray-800 p-2 rounded text-xs">
                  {list.entries.join('\n')}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default WordlistComposer;
