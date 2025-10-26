'use client';

import React, { useCallback, useMemo, useState } from 'react';
import DorkBuilder from './DorkBuilder';
import usePersistentState from '../../../hooks/usePersistentState';

const RECENT_KEY = 'osint-toolkit-recent-queries';
const MAX_RECENT = 10;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const OsintToolkit: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [recent, setRecent, , clearRecent] = usePersistentState<string[]>(
    RECENT_KEY,
    [],
    isStringArray,
  );

  const hasRecent = recent.length > 0;

  const addRecent = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setStatus('Enter a query before saving it.');
        return;
      }

      setRecent((prev) => {
        const deduped = prev.filter((entry) => entry !== trimmed);
        return [trimmed, ...deduped].slice(0, MAX_RECENT);
      });
      setStatus('Query saved locally.');
    },
    [setRecent, setStatus],
  );

  const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();
      addRecent(query);
    },
    [addRecent, query],
  );

  const handleInsert = useCallback(
    (template: string) => {
      setQuery(template);
      setStatus('Template inserted into the editor.');
    },
    [setQuery, setStatus],
  );

  const loadRecent = useCallback(
    (value: string) => {
      setQuery(value);
      setStatus('Loaded query from history.');
    },
    [setQuery, setStatus],
  );

  const clearHistory = useCallback(() => {
    clearRecent();
    setStatus('Cleared saved queries.');
  }, [clearRecent, setStatus]);

  const helperText = useMemo(
    () =>
      [
        'This toolkit never sends live queries.',
        'Use the templates as starting points and adapt them for ethical research.',
        'Store ideas locally and revisit them whenever you need inspiration.',
      ].join(' '),
    [],
  );

  return (
    <div className="flex h-full flex-col bg-gray-950 text-white">
      <header className="border-b border-gray-800 p-4">
        <h1 className="text-2xl font-semibold">OSINT Toolkit</h1>
        <p className="mt-1 text-sm text-gray-300">
          Craft focused Google dorks, plan recon steps, and keep a personal log of recent search ideas without leaving the
          lab.
        </p>
      </header>
      <main className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded border border-gray-800 bg-gray-900 p-4 shadow"
          aria-labelledby="osint-query-label"
        >
          <div className="flex flex-col gap-2">
            <label
              id="osint-query-label"
              htmlFor="osint-query"
              className="text-sm font-semibold uppercase tracking-wide text-gray-300"
            >
              Primary query
            </label>
            <input
              id="osint-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Combine operators and keywords here"
              className="w-full rounded border border-gray-700 bg-gray-950 p-2 text-sm text-emerald-200 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Save to recents
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatus(null);
              }}
              className="rounded border border-gray-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Clear
            </button>
            <span className="text-xs text-gray-400">{helperText}</span>
          </div>
          <p aria-live="polite" className="text-xs text-amber-300">
            {status}
          </p>
        </form>
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <DorkBuilder onInsert={handleInsert} />
          <aside className="space-y-4">
            <section className="rounded border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent queries</h2>
                {hasRecent && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-xs text-gray-400 underline hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    Clear history
                  </button>
                )}
              </div>
              {hasRecent ? (
                <ul className="mt-3 space-y-2">
                  {recent.map((entry) => (
                    <li
                      key={entry}
                      className="group flex items-start justify-between gap-2 rounded border border-gray-800 bg-black/50 p-2"
                    >
                      <button
                        type="button"
                        onClick={() => loadRecent(entry)}
                        className="flex-1 text-left text-xs font-mono text-emerald-200 hover:text-emerald-100 focus:outline-none focus:text-emerald-100"
                      >
                        {entry}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-gray-400">
                  Saved searches appear here. Use the builder or enter your own ideas to build a personal notebook.
                </p>
              )}
            </section>
            <section className="rounded border border-gray-800 bg-gray-900 p-4 text-xs text-gray-300">
              <h2 className="text-sm font-semibold text-white">Field notes</h2>
              <p className="mt-2">
                Pair dorks with reconnaissance plans: map your target&apos;s domains, pivot to related hosts, and capture
                metadata before ever touching production systems. Everything stays local for safe practice.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default OsintToolkit;
