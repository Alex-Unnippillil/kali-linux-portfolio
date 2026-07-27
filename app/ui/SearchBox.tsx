'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface SearchBoxProps {
  files: string[];
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  resultLimit?: number;
}

type WorkerDirectoryCount = { name: string; count: number };

type SearchWorkerResultMessage = {
  type: 'result';
  requestId: number;
  total: number;
  matches: string[];
  directories: WorkerDirectoryCount[];
  extensions: WorkerDirectoryCount[];
};

type SearchWorkerErrorMessage = {
  type: 'error';
  requestId: number;
  message: string;
};

type SearchWorkerResponse =
  | SearchWorkerResultMessage
  | SearchWorkerErrorMessage;

type SearchWorkerRequest = {
  type: 'count';
  files: string[];
  query?: string;
  limit?: number;
  requestId?: number;
};

const combineClassNames = (...values: Array<string | undefined>): string =>
  values.filter(Boolean).join(' ');

const formatSummary = (result: SearchWorkerResultMessage | null, query: string) => {
  if (!result) {
    return query
      ? `Searching ${query}\u2026`
      : 'Start typing to filter the project files.';
  }

  if (result.total === 0) {
    return query
      ? `No files found for “${query}”.`
      : 'No files to display yet.';
  }

  if (query) {
    return `Showing ${result.matches.length} of ${result.total} matching files for “${query}”.`;
  }

  return `Listing ${result.matches.length} of ${result.total} project files.`;
};

const SearchBox = ({
  files,
  placeholder = 'Search files…',
  className,
  debounceMs = 150,
  resultLimit = 20,
}: SearchBoxProps) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchWorkerResultMessage | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const requestCounterRef = useRef(0);
  const activeRequestRef = useRef(0);
  const inputId = useId();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const worker = new Worker(
        new URL('../../public/workers/search.worker.ts', import.meta.url),
        { type: 'module' },
      );

      workerRef.current = worker;
      setWorkerReady(true);

      worker.onmessage = (
        event: MessageEvent<SearchWorkerResponse>,
      ) => {
        const data = event.data;

        if (!data || typeof data !== 'object') return;
        if (
          'requestId' in data &&
          typeof data.requestId === 'number' &&
          data.requestId !== activeRequestRef.current
        ) {
          if (data.requestId < activeRequestRef.current) {
            return;
          }
        }

        if (data.type === 'result') {
          setResult(data);
          setStatus('ready');
          setError(null);
        } else if (data.type === 'error') {
          setStatus('error');
          setError(data.message);
        }
      };

      worker.onerror = () => {
        setStatus('error');
        setError('Search worker encountered an error.');
      };

      return () => {
        setWorkerReady(false);
        workerRef.current = null;
        worker.terminate();
      };
    } catch (err) {
      console.error('Failed to start search worker', err);
      setStatus('error');
      setError('Search worker could not be started.');
    }
  }, []);

  useEffect(() => {
    if (!workerReady) return;
    const worker = workerRef.current;
    if (!worker) return;

    setStatus('loading');
    setError(null);

    const handle = window.setTimeout(() => {
      const requestId = requestCounterRef.current + 1;
      requestCounterRef.current = requestId;
      activeRequestRef.current = requestId;

      const message: SearchWorkerRequest = {
        type: 'count',
        files,
        query,
        limit: resultLimit,
        requestId,
      };

      try {
        worker.postMessage(message);
      } catch (err) {
        console.error('Failed to post message to search worker', err);
        setStatus('error');
        setError('Unable to communicate with the search worker.');
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(handle);
    };
  }, [files, query, debounceMs, resultLimit, workerReady]);

  const summary = useMemo(
    () => formatSummary(result, query),
    [query, result],
  );

  const topDirectories = useMemo(
    () => (result ? result.directories.slice(0, 6) : []),
    [result],
  );

  const topExtensions = useMemo(
    () => (result ? result.extensions.slice(0, 6) : []),
    [result],
  );

  const visibleMatches = useMemo(
    () => (result ? result.matches : []),
    [result],
  );

  return (
    <div
      className={combineClassNames(
        'space-y-4 rounded-lg border border-zinc-700/40 bg-zinc-950/70 p-4 shadow-xl shadow-black/30 backdrop-blur',
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor={inputId}
          className="text-sm font-semibold uppercase tracking-wide text-zinc-300"
        >
          Search files
        </label>
        <input
          id={inputId}
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          aria-describedby={`${inputId}-summary`}
        />
      </div>

      <div
        id={`${inputId}-summary`}
        className="text-xs text-zinc-400"
        aria-live="polite"
      >
        {status === 'loading' && (
          <p className="text-cyan-300">Scanning files…</p>
        )}
        {status === 'error' && error && (
          <p className="text-rose-400">{error}</p>
        )}
        {status !== 'error' && summary && <p>{summary}</p>}
      </div>

      {status === 'ready' && result && result.total > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Top directories
            </h3>
            <ul className="space-y-1 text-sm text-zinc-200">
              {topDirectories.length === 0 && (
                <li className="rounded bg-zinc-900/50 px-3 py-2 text-zinc-500">
                  No directories to show.
                </li>
              )}
              {topDirectories.map((item) => (
                <li
                  key={`${item.name}-${item.count}`}
                  className="flex items-center justify-between rounded bg-zinc-900/70 px-3 py-1.5"
                >
                  <span className="mr-2 truncate" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-xs text-zinc-400">{item.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Top extensions
            </h3>
            <ul className="space-y-1 text-sm text-zinc-200">
              {topExtensions.length === 0 && (
                <li className="rounded bg-zinc-900/50 px-3 py-2 text-zinc-500">
                  No extensions to show.
                </li>
              )}
              {topExtensions.map((item) => (
                <li
                  key={`${item.name}-${item.count}`}
                  className="flex items-center justify-between rounded bg-zinc-900/70 px-3 py-1.5"
                >
                  <span className="mr-2 truncate" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-xs text-zinc-400">{item.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {status === 'ready' && visibleMatches.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Sample matches
          </h3>
          <ul className="space-y-1 text-sm text-zinc-100">
            {visibleMatches.map((match) => (
              <li
                key={match}
                className="truncate rounded bg-zinc-900/60 px-3 py-1.5"
                title={match}
              >
                {match}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default SearchBox;
