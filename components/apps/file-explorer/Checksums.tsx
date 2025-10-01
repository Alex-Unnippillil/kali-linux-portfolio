'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type FileEntry = {
  name: string;
  handle: FileSystemFileHandle;
};

type WorkerMessage =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'result'; results: Record<string, string> };

type MatchStatus = 'match' | 'mismatch' | 'missing' | 'pending';

interface ItemState {
  progress: number;
  status: 'idle' | 'processing' | 'done' | 'error';
  md5?: string;
  sha256?: string;
  error?: string;
  expectedSha256?: string | null;
  matchStatus?: MatchStatus;
}

interface ChecksumsProps {
  files: FileEntry[];
  directoryHandle?: FileSystemDirectoryHandle | null;
  onClose?: () => void;
  initialSelection?: string[];
  autoStart?: boolean;
}

const parseSha256Sidecar = (content: string, fileName: string): string | null => {
  const lines = content.split(/\r?\n/);
  const normalizedTarget = fileName.replace(/^\.\//, '');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^([a-fA-F0-9]{64})\s+\*?(.*)$/);
    if (match) {
      const [, hash, rest] = match;
      const cleaned = (rest || '').replace(/^\*?/, '').trim();
      if (!cleaned) return hash.toLowerCase();

      const normalizedClean = cleaned
        .replace(/^\.\//, '')
        .replace(/^\*?/, '')
        .trim();

      if (
        normalizedClean === normalizedTarget ||
        normalizedClean.endsWith(`/${normalizedTarget}`)
      ) {
        return hash.toLowerCase();
      }
    }
  }

  const fallback = content.match(/([a-fA-F0-9]{64})/);
  return fallback ? fallback[1].toLowerCase() : null;
};

const statusLabel: Record<MatchStatus, string> = {
  match: 'Matches sidecar',
  mismatch: 'Mismatch – expected value differs',
  missing: 'No sidecar found',
  pending: 'Awaiting verification',
};

const statusClass: Record<MatchStatus, string> = {
  match: 'text-green-300',
  mismatch: 'text-red-300',
  missing: 'text-yellow-300',
  pending: 'text-sky-300',
};

const Checksums = ({
  files,
  directoryHandle,
  onClose,
  initialSelection,
  autoStart,
}: ChecksumsProps) => {
  const fileMap = useMemo(() => {
    const entries = new Map<string, FileEntry>();
    for (const entry of files) {
      entries.set(entry.name, entry);
    }
    return entries;
  }, [files]);

  const selectionKey = useMemo(
    () => (initialSelection && initialSelection.length ? initialSelection.join('|') : '__all__'),
    [initialSelection],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [running, setRunning] = useState(false);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const worker = new Worker(new URL('../../../workers/hash-worker.ts', import.meta.url));
    workerRef.current = worker;
    return () => {
      workerRef.current = null;
      worker.terminate();
    };
  }, []);

  const queueRef = useRef<string[]>([]);
  const currentFileRef = useRef<string | null>(null);
  const autoStartedRef = useRef(false);
  const initialisedRef = useRef(false);

  useEffect(() => {
    const defaultsSource =
      initialSelection && initialSelection.length
        ? initialSelection
        : Array.from(fileMap.keys());

    const defaults = defaultsSource.filter((name) => fileMap.has(name));

    setSelected(new Set(defaults));
    setItems(() => {
      const next: Record<string, ItemState> = {};
      for (const name of defaults) {
        next[name] = {
          progress: 0,
          status: 'idle',
        };
      }
      return next;
    });
    queueRef.current = [];
    currentFileRef.current = null;
    setRunning(false);
    autoStartedRef.current = false;
    initialisedRef.current = true;
  }, [fileMap, selectionKey, initialSelection]);

  useEffect(() => {
    if (!initialisedRef.current) return;
    setSelected((prev) => {
      const next = new Set<string>();
      for (const name of prev) {
        if (fileMap.has(name)) next.add(name);
      }
      if (next.size === 0) {
        for (const name of fileMap.keys()) {
          next.add(name);
        }
      }
      return next;
    });
  }, [fileMap]);

  useEffect(() => {
    if (!directoryHandle) {
      setItems((prev) => {
        const next: Record<string, ItemState> = {};
        for (const [name, value] of Object.entries(prev)) {
          next[name] = {
            ...value,
            expectedSha256: value.expectedSha256 ?? null,
            matchStatus: value.expectedSha256 ? value.matchStatus : 'missing',
          };
        }
        return next;
      });
      return;
    }

    let cancelled = false;
    const load = async () => {
      for (const name of selected) {
        if (!fileMap.has(name)) continue;
        const existing = itemsRef.current[name];
        if (existing && existing.expectedSha256 !== undefined) continue;
        try {
          const handle = await directoryHandle.getFileHandle(`${name}.sha256`);
          const file = await handle.getFile();
          const text = await file.text();
          if (cancelled) return;
          const parsed = parseSha256Sidecar(text, name);
          setItems((prev) => {
            const current = prev[name] ?? { progress: 0, status: 'idle' };
            return {
              ...prev,
              [name]: {
                ...current,
                expectedSha256: parsed,
                matchStatus: parsed ? 'pending' : 'missing',
              },
            };
          });
        } catch (error) {
          if (cancelled) return;
          setItems((prev) => {
            const current = prev[name] ?? { progress: 0, status: 'idle' };
            return {
              ...prev,
              [name]: {
                ...current,
                expectedSha256: null,
                matchStatus: 'missing',
              },
            };
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [selected, directoryHandle, fileMap]);

  const toggleSelection = useCallback((name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setItems((prev) => {
      if (prev[name]) return prev;
      return {
        ...prev,
        [name]: { progress: 0, status: 'idle' },
      };
    });
  }, []);

  const selectAll = useCallback(() => {
    const all = Array.from(fileMap.keys());
    setSelected(new Set(all));
    setItems((prev) => {
      const next = { ...prev };
      for (const name of all) {
        if (!next[name]) {
          next[name] = { progress: 0, status: 'idle' };
        }
      }
      return next;
    });
  }, [fileMap]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const start = useCallback(() => {
    const queue = Array.from(selected).filter((name) => fileMap.has(name));
    if (!queue.length) return;

    if (!workerRef.current) {
      setItems((prev) => {
        const next: Record<string, ItemState> = { ...prev };
        for (const name of queue) {
          const current = next[name] ?? { progress: 0, status: 'idle' };
          next[name] = {
            ...current,
            status: 'error',
            error: 'Hash worker unavailable in this environment',
          };
        }
        return next;
      });
      return;
    }

    queueRef.current = queue;
    currentFileRef.current = null;
    setItems((prev) => {
      const next: Record<string, ItemState> = { ...prev };
      for (const name of queue) {
        const current = next[name] ?? { progress: 0, status: 'idle' };
        next[name] = {
          ...current,
          status: 'processing',
          progress: 0,
          error: undefined,
          md5: undefined,
          sha256: undefined,
        };
        if (current.expectedSha256 === null) {
          next[name].matchStatus = 'missing';
        } else if (current.expectedSha256) {
          next[name].matchStatus = 'pending';
        }
      }
      return next;
    });
    setRunning(true);
  }, [selected, fileMap]);

  const stop = useCallback(() => {
    queueRef.current = [];
    currentFileRef.current = null;
    setRunning(false);
    setItems((prev) => {
      const next: Record<string, ItemState> = { ...prev };
      for (const [name, value] of Object.entries(next)) {
        if (value.status === 'processing') {
          next[name] = { ...value, status: 'idle', progress: 0 };
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || !selected.size) return;
    autoStartedRef.current = true;
    start();
  }, [autoStart, selected, start]);

  useEffect(() => {
    if (!running) return;
    const worker = workerRef.current;
    if (!worker) {
      setRunning(false);
      return;
    }

    let cancelled = false;

    const processNext = async (): Promise<void> => {
      if (cancelled) return;
      const nextName = queueRef.current.shift();
      if (!nextName) {
        currentFileRef.current = null;
        setRunning(false);
        return;
      }

      currentFileRef.current = nextName;
      setItems((prev) => {
        const current = prev[nextName] ?? { progress: 0, status: 'idle' };
        return {
          ...prev,
          [nextName]: {
            ...current,
            status: 'processing',
            progress: 0,
            error: undefined,
          },
        };
      });

      try {
        const fileEntry = fileMap.get(nextName);
        if (!fileEntry) throw new Error('File handle unavailable');
        const file = await fileEntry.handle.getFile();
        if (cancelled) return;
        worker.postMessage({ file, algorithms: ['MD5', 'SHA-256'] });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unable to read file';
        setItems((prev) => {
          const current = prev[nextName] ?? { progress: 0, status: 'idle' };
          return {
            ...prev,
            [nextName]: {
              ...current,
              status: 'error',
              error: message,
            },
          };
        });
        await processNext();
      }
    };

    const handleMessage = (event: MessageEvent<WorkerMessage>) => {
      if (cancelled) return;
      const payload = event.data;
      const currentName = currentFileRef.current;
      if (!currentName) return;

      if (payload.type === 'progress') {
        const progress = payload.total ? payload.loaded / payload.total : 0;
        setItems((prev) => {
          const current = prev[currentName] ?? { progress: 0, status: 'idle' };
          return {
            ...prev,
            [currentName]: {
              ...current,
              progress,
              status: 'processing',
            },
          };
        });
      } else if (payload.type === 'result') {
        const md5 = payload.results.MD5 ? payload.results.MD5.toLowerCase() : undefined;
        const sha256 = payload.results['SHA-256']
          ? payload.results['SHA-256'].toLowerCase()
          : undefined;

        setItems((prev) => {
          const current = prev[currentName] ?? { progress: 0, status: 'idle' };
          const expected = current.expectedSha256 || undefined;
          let matchStatus = current.matchStatus;
          if (expected) {
            matchStatus = sha256 && sha256 === expected ? 'match' : 'mismatch';
          } else if (current.expectedSha256 === null) {
            matchStatus = 'missing';
          }

          return {
            ...prev,
            [currentName]: {
              ...current,
              progress: 1,
              status: 'done',
              md5,
              sha256,
              matchStatus,
            },
          };
        });

        processNext();
      }
    };

    worker.addEventListener('message', handleMessage as EventListener);
    processNext();

    return () => {
      cancelled = true;
      worker.removeEventListener('message', handleMessage as EventListener);
    };
  }, [running, fileMap]);

  const copy = useCallback(async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      /* ignore */
    }
  }, []);

  const saveSidecar = useCallback(
    async (name: string) => {
      if (!directoryHandle) return;
      const item = itemsRef.current[name];
      if (!item?.sha256) return;
      try {
        const handle = await directoryHandle.getFileHandle(`${name}.sha256`, { create: true });
        const writable = await handle.createWritable();
        await writable.write(`${item.sha256.toLowerCase()}  ${name}\n`);
        await writable.close();
        setItems((prev) => ({
          ...prev,
          [name]: {
            ...prev[name],
            expectedSha256: item.sha256.toLowerCase(),
            matchStatus: 'match',
            error: undefined,
          },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save sidecar';
        setItems((prev) => ({
          ...prev,
          [name]: {
            ...prev[name],
            error: message,
          },
        }));
      }
    },
    [directoryHandle],
  );

  const visibleItems = useMemo(() => {
    const ordered = Array.from(selected).filter((name) => fileMap.has(name));
    ordered.sort((a, b) => a.localeCompare(b));
    return ordered.map((name) => ({ name, state: items[name] }));
  }, [selected, fileMap, items]);

  const overallProgress = useMemo(() => {
    if (!visibleItems.length) return 0;
    const total = visibleItems.reduce((sum, item) => sum + (item.state?.progress ?? 0), 0);
    return total / visibleItems.length;
  }, [visibleItems]);

  const processingName = currentFileRef.current;

  return (
    <div className="w-full max-w-3xl bg-ub-warm-grey text-white rounded-lg shadow-lg flex flex-col max-h-[80vh]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black border-opacity-30">
        <div>
          <h2 className="text-lg font-semibold">Checksums</h2>
          <p className="text-xs text-gray-300">
            Compute MD5 and SHA-256 hashes, verify sidecars, and export .sha256 files.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="px-2 py-1 bg-black bg-opacity-40 rounded hover:bg-opacity-60"
            onClick={selectAll}
          >
            Select all
          </button>
          <button
            className="px-2 py-1 bg-black bg-opacity-40 rounded hover:bg-opacity-60"
            onClick={clearSelection}
          >
            Clear
          </button>
          <button
            className="px-2 py-1 bg-black bg-opacity-60 rounded disabled:opacity-50"
            onClick={start}
            disabled={running || !selected.size}
          >
            {running ? 'Running…' : 'Start'}
          </button>
          {running && (
            <button
              className="px-2 py-1 bg-black bg-opacity-40 rounded"
              onClick={stop}
            >
              Stop
            </button>
          )}
          <button
            className="px-2 py-1 bg-black bg-opacity-40 rounded hover:bg-opacity-60"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      <div className="px-4 py-2 text-xs text-gray-300 border-b border-black border-opacity-20">
        {selected.size} file(s) selected
        {processingName ? ` • Processing ${processingName}` : ''}
      </div>
      {visibleItems.length > 0 && (
        <div className="px-4 py-2 border-b border-black border-opacity-20">
          <progress className="w-full" value={overallProgress} max={1} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs">
        {visibleItems.length === 0 && (
          <div className="text-center text-gray-300">
            No files selected. Use the checkboxes to add items.
          </div>
        )}
        {visibleItems.map(({ name, state }) => {
          const matchStatus = state?.matchStatus;
          const statusText = matchStatus ? statusLabel[matchStatus] : undefined;
          const statusColor = matchStatus ? statusClass[matchStatus] : '';
          const statusLine = state?.status;
          return (
            <div
              key={name}
              className="border border-black border-opacity-30 rounded bg-black bg-opacity-30 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="accent-ub-orange"
                    checked={selected.has(name)}
                    onChange={() => toggleSelection(name)}
                    aria-label={`Toggle ${name} for checksum processing`}
                  />
                  <span className="break-all">{name}</span>
                </label>
                <span className="text-gray-300">
                  {statusLine === 'processing'
                    ? 'Processing…'
                    : statusLine === 'done'
                    ? 'Ready'
                    : statusLine === 'error'
                    ? 'Error'
                    : 'Idle'}
                </span>
              </div>
              {statusText && (
                <div className={`${statusColor} text-[11px]`}>{statusText}</div>
              )}
              {state?.expectedSha256 && matchStatus === 'mismatch' && (
                <div className="text-red-300 text-[11px]">
                  Expected {state.expectedSha256}
                </div>
              )}
              {state?.status === 'processing' && (
                <progress className="w-full" value={state.progress} max={1} />
              )}
              {state?.status === 'done' && state.progress < 1 && (
                <progress className="w-full" value={state.progress} max={1} />
              )}
              {state?.md5 && (
                <div className="flex items-center gap-2">
                  <span className="w-16 uppercase">MD5</span>
                  <code className="flex-1 break-all bg-black bg-opacity-50 px-2 py-1 rounded">
                    {state.md5}
                  </code>
                  <button
                    className="px-2 py-1 bg-black bg-opacity-40 rounded hover:bg-opacity-60"
                    onClick={() => copy(state.md5)}
                  >
                    Copy
                  </button>
                </div>
              )}
              {state?.sha256 && (
                <div className="flex items-center gap-2">
                  <span className="w-16 uppercase">SHA-256</span>
                  <code className="flex-1 break-all bg-black bg-opacity-50 px-2 py-1 rounded">
                    {state.sha256}
                  </code>
                  <button
                    className="px-2 py-1 bg-black bg-opacity-40 rounded hover:bg-opacity-60"
                    onClick={() => copy(state.sha256)}
                  >
                    Copy
                  </button>
                  {directoryHandle && (
                    <button
                      className="px-2 py-1 bg-black bg-opacity-40 rounded hover:bg-opacity-60"
                      onClick={() => saveSidecar(name)}
                    >
                      Save .sha256
                    </button>
                  )}
                </div>
              )}
              {state?.error && (
                <div className="text-red-300 text-[11px]">{state.error}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Checksums;
