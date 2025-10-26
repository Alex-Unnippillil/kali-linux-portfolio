import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DiffResult,
  DiffServiceEntry,
  DiffStateChangeEntry,
  DiffRequest,
  HostRecord,
  emptyDiff,
  mergeDiffResults,
  computeDiff,
} from './diffEngine';

interface RunMetadata {
  id: string;
  label: string;
  startedAt?: string;
  profile?: string;
  notes?: string;
  hosts: HostRecord[];
}

interface CompareProps {
  runs: RunMetadata[];
  isLoading?: boolean;
}

type FilterKey = 'all' | 'new' | 'lost' | 'state';

type CombinedEntry =
  | (DiffServiceEntry & { type: 'new' | 'lost' })
  | (DiffStateChangeEntry & { type: 'state' });

interface WorkerMessage {
  result?: DiffResult;
  error?: string;
}

interface Task {
  payload: DiffRequest;
  resolve: (result: DiffResult) => void;
  reject: (err: Error) => void;
}

class DiffWorkerPool {
  size: number;
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private active = new Map<Worker, Task>();
  private queue: Task[] = [];

  constructor(size: number) {
    this.size = Math.max(1, size);
    for (let i = 0; i < this.size; i += 1) {
      const worker = new Worker(new URL('./diff.worker.ts', import.meta.url));
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        this.handleMessage(worker, event.data);
      };
      worker.onerror = (event: ErrorEvent) => {
        this.handleError(worker, new Error(event.message || 'diff-worker-error'));
      };
      this.workers.push(worker);
      this.idle.push(worker);
    }
  }

  run(payload: DiffRequest): Promise<DiffResult> {
    return new Promise<DiffResult>((resolve, reject) => {
      const task: Task = { payload, resolve, reject };
      this.queue.push(task);
      this.dispatch();
    });
  }

  private dispatch() {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const worker = this.idle.pop();
      const task = this.queue.shift();
      if (!worker || !task) return;
      this.active.set(worker, task);
      worker.postMessage(task.payload);
    }
  }

  private handleMessage(worker: Worker, message: WorkerMessage) {
    const task = this.active.get(worker);
    if (!task) return;
    this.active.delete(worker);
    this.idle.push(worker);
    if (message?.error) {
      task.reject(new Error(message.error));
    } else {
      task.resolve(message.result ?? emptyDiff());
    }
    this.dispatch();
  }

  private handleError(worker: Worker, error: Error) {
    const task = this.active.get(worker);
    if (task) {
      this.active.delete(worker);
      task.reject(error);
    }
    this.idle.push(worker);
    this.dispatch();
  }

  dispose() {
    this.queue = [];
    this.active.clear();
    this.idle = [];
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
  }
}

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
};

const describeRun = (run?: RunMetadata) => {
  if (!run) return '';
  const timestamp = formatDate(run.startedAt);
  if (!timestamp) return run.label;
  return `${run.label} — ${timestamp}`;
};

const badgeStyles: Record<FilterKey, string> = {
  all: 'bg-gray-700 text-gray-100',
  new: 'bg-emerald-700 text-emerald-100',
  lost: 'bg-rose-700 text-rose-100',
  state: 'bg-amber-700 text-amber-100',
};

const Compare: React.FC<CompareProps> = ({ runs, isLoading }) => {
  const [baseId, setBaseId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [diff, setDiff] = useState<DiffResult>(() => emptyDiff());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'computing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const poolRef = useRef<DiffWorkerPool | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return undefined;
    }
    const concurrency = Math.min(4, Math.max(1, navigator?.hardwareConcurrency || 2));
    poolRef.current = new DiffWorkerPool(concurrency);
    return () => {
      poolRef.current?.dispose();
      poolRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!Array.isArray(runs) || runs.length === 0) {
      setBaseId('');
      setTargetId('');
      return;
    }
    setBaseId((prev) => {
      if (prev && runs.some((run) => run.id === prev)) return prev;
      return runs[0].id;
    });
  }, [runs]);

  useEffect(() => {
    if (!Array.isArray(runs) || runs.length < 2) {
      setTargetId('');
      return;
    }
    setTargetId((prev) => {
      if (prev && prev !== baseId && runs.some((run) => run.id === prev)) {
        return prev;
      }
      const alternative = runs.find((run) => run.id !== baseId);
      return alternative ? alternative.id : '';
    });
  }, [runs, baseId]);

  const baseRun = useMemo(() => runs.find((run) => run.id === baseId), [runs, baseId]);
  const targetRun = useMemo(
    () => runs.find((run) => run.id === targetId),
    [runs, targetId]
  );

  useEffect(() => {
    if (!baseRun || !targetRun) {
      setDiff(emptyDiff());
      setError(null);
      setStatus('idle');
      return;
    }

    const hostKeys = new Set<string>([
      ...((baseRun.hosts || []).map((host) => host.address)),
      ...((targetRun.hosts || []).map((host) => host.address)),
    ].filter(Boolean) as string[]);

    if (hostKeys.size === 0) {
      setDiff(emptyDiff());
      setError(null);
      setStatus('idle');
      return;
    }

    const baseMap = new Map(
      (baseRun.hosts || []).map((host) => [host.address, host] as const)
    );
    const targetMap = new Map(
      (targetRun.hosts || []).map((host) => [host.address, host] as const)
    );

    let cancelled = false;
    const runDiff = async () => {
      setStatus('computing');
      setError(null);

      const keys = Array.from(hostKeys);
      const pool = poolRef.current;

      const createPayload = (chunk: string[]): DiffRequest => ({
        baseHosts: chunk.map((key) => baseMap.get(key) || { address: key, ports: [] }),
        targetHosts: chunk.map((key) => targetMap.get(key) || { address: key, ports: [] }),
      });

      try {
        if (!pool) {
          const payload = createPayload(keys);
          const single = computeDiff(payload);
          if (!cancelled) {
            setDiff(single);
            setStatus('idle');
          }
          return;
        }

        const chunkSize = Math.max(1, Math.ceil(keys.length / pool.size));
        const tasks: Promise<DiffResult>[] = [];
        for (let i = 0; i < keys.length; i += chunkSize) {
          const slice = keys.slice(i, i + chunkSize);
          if (slice.length === 0) continue;
          tasks.push(pool.run(createPayload(slice)));
        }
        const parts = await Promise.all(tasks);
        const combined = mergeDiffResults(parts);
        if (!cancelled) {
          setDiff(combined);
          setStatus('idle');
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus('idle');
          setDiff(emptyDiff());
          setError(err?.message || 'Failed to compare runs');
        }
      }
    };

    runDiff();

    return () => {
      cancelled = true;
    };
  }, [baseRun, targetRun]);

  const combined = useMemo<CombinedEntry[]>(() => {
    const items: CombinedEntry[] = [];
    for (const entry of diff.newServices) {
      items.push({ ...entry, type: 'new' });
    }
    for (const entry of diff.lostServices) {
      items.push({ ...entry, type: 'lost' });
    }
    for (const entry of diff.stateChanges) {
      items.push({ ...entry, type: 'state' });
    }
    return items.sort((a, b) => {
      const host = a.host.localeCompare(b.host);
      if (host !== 0) return host;
      if (a.port !== b.port) return a.port - b.port;
      return a.protocol.localeCompare(b.protocol);
    });
  }, [diff]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return combined.filter((entry) => {
      if (filter !== 'all' && entry.type !== filter) return false;
      if (!q) return true;
      const haystack = [
        entry.host,
        'hostname' in entry ? entry.hostname : undefined,
        entry.service,
        entry.product,
        'fromState' in entry ? entry.fromState : undefined,
        entry.state,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [combined, filter, query]);

  const totals = useMemo(
    () => ({
      all: combined.length,
      new: diff.newServices.length,
      lost: diff.lostServices.length,
      state: diff.stateChanges.length,
    }),
    [combined.length, diff]
  );

  const selectionReady = baseRun && targetRun && baseRun.id !== targetRun.id;

  return (
    <section className="mt-6 border-t border-gray-700 pt-4">
      <h2 className="text-lg font-semibold mb-3 text-white">Compare saved runs</h2>
      {isLoading ? (
        <p className="text-sm text-gray-300">Loading run history…</p>
      ) : runs.length < 2 ? (
        <p className="text-sm text-gray-300">
          Save at least two simulated scans to unlock comparisons.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="nmap-compare-base"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-300 mb-1"
              >
                Base run
              </label>
              <select
                id="nmap-compare-base"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm"
                value={baseId}
                onChange={(e) => setBaseId(e.target.value)}
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {describeRun(run)}
                  </option>
                ))}
              </select>
              {baseRun?.profile && (
                <p className="text-xs text-gray-400 mt-1">
                  {baseRun.profile}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="nmap-compare-target"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-300 mb-1"
              >
                Target run
              </label>
              <select
                id="nmap-compare-target"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id} disabled={run.id === baseId}>
                    {describeRun(run)}
                  </option>
                ))}
              </select>
              {targetRun?.profile && (
                <p className="text-xs text-gray-400 mt-1">
                  {targetRun.profile}
                </p>
              )}
            </div>
          </div>
          {selectionReady ? (
            <p className="text-xs text-gray-400">
              Comparing {describeRun(baseRun)} to {describeRun(targetRun)}.
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Select two different runs to compute a diff.
            </p>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Diff filters">
            {(['all', 'new', 'lost', 'state'] as FilterKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  filter === key ? badgeStyles[key] : 'bg-gray-800 text-gray-300'
                }`}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
              >
                {key === 'all'
                  ? `All changes (${totals[key]})`
                  : key === 'new'
                  ? `New services (${totals[key]})`
                  : key === 'lost'
                  ? `Lost services (${totals[key]})`
                  : `Port state changes (${totals[key]})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="nmap-compare-filter" className="sr-only">
              Filter hosts or services
            </label>
            <input
              id="nmap-compare-filter"
              type="search"
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
              placeholder="Filter by host, service, or state"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded"
                onClick={() => setQuery('')}
              >
                Clear
              </button>
            )}
          </div>
          {error && (
            <div className="text-sm text-red-400" role="alert">
              {error}
            </div>
          )}
          {status === 'computing' && (
            <p className="text-xs text-gray-400">Computing diff…</p>
          )}
          {selectionReady && filtered.length === 0 && status === 'idle' && !error && (
            <p className="text-sm text-gray-300">No changes match the current filters.</p>
          )}
          {selectionReady && filtered.length > 0 && (
            <ul className="space-y-3">
              {filtered.map((entry) => (
                <li
                  key={`${entry.type}-${entry.host}-${entry.port}-${entry.protocol}-${
                    'fromState' in entry ? entry.fromState : entry.state
                  }-${'toState' in entry ? entry.toState : ''}`}
                  className="border border-gray-700 rounded p-3 bg-gray-900"
                >
                  <div className="flex flex-wrap gap-2 items-center mb-1">
                    <span className={`px-2 py-0.5 rounded text-[0.65rem] font-semibold uppercase tracking-wide ${
                      badgeStyles[entry.type === 'state' ? 'state' : entry.type]
                    }`}>
                      {entry.type === 'new'
                        ? 'New service'
                        : entry.type === 'lost'
                        ? 'Lost service'
                        : 'Port state change'}
                    </span>
                    <span className="font-mono text-sm text-blue-200">
                      {entry.host}
                      {entry.hostname ? ` (${entry.hostname})` : ''}
                    </span>
                  </div>
                  <div className="text-sm text-gray-200">
                    {entry.port}/{entry.protocol} • {entry.service || 'unknown service'}
                  </div>
                  {entry.product && (
                    <div className="text-xs text-gray-400 mt-0.5">{entry.product}</div>
                  )}
                  {entry.type === 'state' ? (
                    <div className="text-xs text-gray-300 mt-1">
                      State changed from
                      <span className="mx-1 text-amber-200">{entry.fromState || 'unknown'}</span>
                      to
                      <span className="ml-1 text-emerald-200">{entry.toState || 'unknown'}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300 mt-1">
                      Current state: <span className="text-emerald-200">{entry.state || 'unknown'}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export type { RunMetadata };
export default Compare;
