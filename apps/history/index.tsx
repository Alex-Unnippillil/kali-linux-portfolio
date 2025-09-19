'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  FixedSizeList as List,
  type ListChildComponentProps,
} from 'react-window';
import { safeLocalStorage } from '../../utils/safeStorage';

const JOURNAL_STORAGE_KEY = 'desktop-journal';
const JOURNAL_EVENT = 'desktop-journal:updated';

interface JournalEntry {
  id: string;
  appId: string;
  appName: string;
  status: string;
  statusKey: string;
  message: string;
  timestamp: number;
}

type EntryRowProps = ListChildComponentProps<JournalEntry[]>;

type MaybeJournal = {
  entries?: unknown;
  getEntries?: () => unknown;
  subscribe?: (handler: (value: unknown) => void) => () => void;
  clear?: () => void;
  setEntries?: (value: unknown) => void;
};

function getStorage(): Storage | undefined {
  if (safeLocalStorage) return safeLocalStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

const successStatuses = new Set([
  'success',
  'ok',
  'completed',
  'complete',
  'done',
  'pass',
  'passed',
  'resolved',
]);
const errorStatuses = new Set([
  'error',
  'failed',
  'failure',
  'fatal',
  'crashed',
  'aborted',
]);
const warningStatuses = new Set(['warning', 'warn', 'degraded']);
const runningStatuses = new Set([
  'running',
  'in-progress',
  'processing',
  'started',
  'executing',
  'active',
]);
const queuedStatuses = new Set(['queued', 'pending', 'waiting', 'scheduled']);
const infoStatuses = new Set(['info', 'informational', 'notice']);

const STATUS_CLASSES: Record<string, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-black',
  running: 'bg-sky-600 text-white',
  queued: 'bg-indigo-500 text-white',
  info: 'bg-slate-600 text-white',
};

const OuterElement = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function OuterElement(props, ref) {
    return <div {...props} ref={ref} role="presentation" />;
  },
);

function parseTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function normalizeStatus(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!base) return 'info';
  if (successStatuses.has(base)) return 'success';
  if (errorStatuses.has(base)) return 'error';
  if (warningStatuses.has(base)) return 'warning';
  if (runningStatuses.has(base)) return 'running';
  if (queuedStatuses.has(base)) return 'queued';
  if (infoStatuses.has(base)) return 'info';
  return base;
}

function formatStatusLabel(value: string): string {
  if (!value) return 'Info';
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ');
}

function extractMessage(record: Record<string, unknown>): string {
  const candidates = [
    record.message,
    record.summary,
    record.description,
    record.details,
    record.event,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '';
}

function sanitizeEntries(value: unknown): JournalEntry[] {
  if (!Array.isArray(value)) return [];
  const result: JournalEntry[] = [];
  const seen = new Set<string>();

  value.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    const timestamp = parseTimestamp(
      record.timestamp ?? record.time ?? record.date ?? record.createdAt,
    );
    if (timestamp === null) return;

    const rawAppId =
      typeof record.appId === 'string' && record.appId.trim()
        ? record.appId.trim()
        : typeof record.app === 'string' && record.app.trim()
        ? record.app.trim()
        : typeof record.source === 'string' && record.source.trim()
        ? record.source.trim()
        : 'unknown';

    const appName =
      typeof record.appName === 'string' && record.appName.trim()
        ? record.appName.trim()
        : typeof record.title === 'string' && record.title.trim()
        ? record.title.trim()
        : rawAppId;

    const rawStatus =
      typeof record.status === 'string' && record.status.trim()
        ? record.status
        : typeof record.level === 'string' && record.level.trim()
        ? record.level
        : typeof record.state === 'string' && record.state.trim()
        ? record.state
        : 'info';

    const statusKey = normalizeStatus(rawStatus);
    const status = formatStatusLabel(rawStatus);
    const message = extractMessage(record);

    const baseId =
      typeof record.id === 'string' && record.id.trim()
        ? record.id.trim()
        : `${timestamp}-${index}`;

    let id = baseId;
    let counter = 1;
    while (seen.has(id)) {
      id = `${baseId}-${counter++}`;
    }
    seen.add(id);

    result.push({
      id,
      appId: rawAppId,
      appName,
      status,
      statusKey,
      message,
      timestamp,
    });
  });

  result.sort((a, b) => b.timestamp - a.timestamp);
  return result;
}

function mergeSources(sources: JournalEntry[][]): JournalEntry[] {
  const merged = new Map<string, JournalEntry>();
  for (const source of sources) {
    for (const entry of source) {
      const existing = merged.get(entry.id);
      if (!existing || entry.timestamp > existing.timestamp) {
        merged.set(entry.id, entry);
      }
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.timestamp - a.timestamp);
}

function readJournalEntries(): JournalEntry[] {
  const sources: JournalEntry[][] = [];
  if (typeof window !== 'undefined') {
    const globalJournal: MaybeJournal | undefined =
      (window as unknown as { desktopJournal?: MaybeJournal }).desktopJournal;
    if (globalJournal) {
      try {
        if (typeof globalJournal.getEntries === 'function') {
          sources.push(sanitizeEntries(globalJournal.getEntries()));
        } else if (Array.isArray(globalJournal.entries)) {
          sources.push(sanitizeEntries(globalJournal.entries));
        }
      } catch {
        // ignore malformed global journal data
      }
    }
  }

  const storage = getStorage();
  if (storage) {
    try {
      const stored = storage.getItem(JOURNAL_STORAGE_KEY);
      if (stored) {
        sources.push(sanitizeEntries(JSON.parse(stored)));
      }
    } catch {
      // ignore storage parse errors
    }
  }

  if (!sources.length) return [];
  return mergeSources(sources);
}

function clearJournalEntries() {
  if (typeof window !== 'undefined') {
    const globalJournal: MaybeJournal | undefined =
      (window as unknown as { desktopJournal?: MaybeJournal }).desktopJournal;
    if (globalJournal) {
      try {
        if (typeof globalJournal.clear === 'function') {
          globalJournal.clear();
        } else if (typeof globalJournal.setEntries === 'function') {
          globalJournal.setEntries([]);
        }
      } catch {
        // ignore errors clearing the global journal
      }
    }
  }

  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(JOURNAL_STORAGE_KEY);
    } catch {
      try {
        storage.setItem(JOURNAL_STORAGE_KEY, '[]');
      } catch {
        // ignore storage write errors
      }
    }
  }
}

function notifyJournalUpdate() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(JOURNAL_EVENT));
  } catch {
    // ignore dispatch errors
  }
}

function formatTimestampUTC(timestamp: number): string {
  const iso = new Date(timestamp).toISOString();
  const [date, time] = iso.split('T');
  return `${date} ${time.slice(0, 8)} UTC`;
}

function getStatusClass(statusKey: string): string {
  if (STATUS_CLASSES[statusKey]) return STATUS_CLASSES[statusKey];
  if (successStatuses.has(statusKey)) return STATUS_CLASSES.success;
  if (errorStatuses.has(statusKey)) return STATUS_CLASSES.error;
  if (warningStatuses.has(statusKey)) return STATUS_CLASSES.warning;
  if (runningStatuses.has(statusKey)) return STATUS_CLASSES.running;
  if (queuedStatuses.has(statusKey)) return STATUS_CLASSES.queued;
  if (infoStatuses.has(statusKey)) return STATUS_CLASSES.info;
  return 'bg-white/20 text-white';
}

const EntryRow = ({ index, style, data }: EntryRowProps) => {
  const entry = data[index];
  const statusClass = getStatusClass(entry.statusKey);

  return (
    <div
      style={style}
      role="listitem"
      className="px-4 py-3 border-b border-white/10 focus-within:bg-white/10"
    >
      <div className="flex items-center justify-between text-xs text-white/60">
        <span className="font-mono" data-testid="history-timestamp">
          {formatTimestampUTC(entry.timestamp)}
        </span>
        <span
          className={`px-2 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}
        >
          {entry.status}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2 text-sm">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight" title={entry.appName}>
            {entry.appName}
          </p>
          {entry.message && (
            <p className="mt-1 text-xs text-white/70 leading-snug break-words">
              {entry.message}
            </p>
          )}
        </div>
        <code className="rounded bg-white/10 px-2 py-1 text-[11px] text-white/70">
          {entry.appId}
        </code>
      </div>
    </div>
  );
};

EntryRow.displayName = 'EntryRow';

export default function HistoryApp() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => readJournalEntries());
  const [appFilter, setAppFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!confirmOpen) return;
    cancelButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = () => {
      setEntries(readJournalEntries());
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === JOURNAL_STORAGE_KEY) {
        handleUpdate();
      }
    };

    window.addEventListener(JOURNAL_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);

    const globalJournal: MaybeJournal | undefined =
      (window as unknown as { desktopJournal?: MaybeJournal }).desktopJournal;
    let unsubscribe: (() => void) | undefined;
    if (globalJournal && typeof globalJournal.subscribe === 'function') {
      try {
        unsubscribe = globalJournal.subscribe((value: unknown) => {
          setEntries(sanitizeEntries(value));
        });
      } catch {
        // ignore subscription errors
      }
    }

    return () => {
      window.removeEventListener(JOURNAL_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
      unsubscribe?.();
    };
  }, []);

  const appOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((entry) => {
      if (!map.has(entry.appId)) {
        map.set(entry.appId, entry.appName || entry.appId);
      }
    });
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }),
    );
  }, [entries]);

  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((entry) => {
      if (!map.has(entry.statusKey)) {
        map.set(entry.statusKey, entry.status);
      }
    });
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }),
    );
  }, [entries]);

  useEffect(() => {
    if (appFilter !== 'all' && !appOptions.some(([id]) => id === appFilter)) {
      setAppFilter('all');
    }
  }, [appFilter, appOptions]);

  useEffect(() => {
    if (
      statusFilter !== 'all' &&
      !statusOptions.some(([key]) => key === statusFilter)
    ) {
      setStatusFilter('all');
    }
  }, [statusFilter, statusOptions]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (appFilter !== 'all' && entry.appId !== appFilter) return false;
      if (statusFilter !== 'all' && entry.statusKey !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [entries, appFilter, statusFilter]);

  const handleClear = useCallback(() => {
    clearJournalEntries();
    setEntries([]);
    setAppFilter('all');
    setStatusFilter('all');
    notifyJournalUpdate();
    setConfirmOpen(false);
  }, []);

  const hasEntries = filteredEntries.length > 0;
  const totalEntries = entries.length;
  const filtersDisabled = totalEntries === 0;

  return (
    <div className="relative flex h-full w-full flex-col bg-ub-cool-grey text-white">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold">Activity History</h1>
          <p className="text-sm text-white/70">
            Review the desktop journal with per-app status updates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={totalEntries === 0}
          className="rounded bg-red-600 px-4 py-2 text-sm font-semibold transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-not-allowed disabled:bg-white/20"
        >
          Clear history
        </button>
      </header>
      <section className="flex flex-wrap items-center gap-4 border-b border-white/10 px-4 py-3 text-sm">
        <label className="flex items-center gap-2 text-white/80" htmlFor="history-filter-app">
          App
          <select
            id="history-filter-app"
            className="rounded border border-white/20 bg-black/30 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
            value={appFilter}
            onChange={(event) => setAppFilter(event.target.value)}
            disabled={filtersDisabled}
          >
            <option value="all">All apps</option>
            {appOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label
          className="flex items-center gap-2 text-white/80"
          htmlFor="history-filter-status"
        >
          Status
          <select
            id="history-filter-status"
            className="rounded border border-white/20 bg-black/30 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            disabled={filtersDisabled}
          >
            <option value="all">All statuses</option>
            {statusOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto text-xs text-white/60">
          Showing {filteredEntries.length} of {totalEntries} events
        </div>
      </section>
      <section
        className="flex-1 min-h-0"
        aria-label="Journal entries"
        aria-live="polite"
      >
        {hasEntries ? (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={filteredEntries.length}
                itemData={filteredEntries}
                itemSize={96}
                overscanCount={4}
                itemKey={(index, data) => data[index].id}
                outerElementType={OuterElement}
              >
                {EntryRow}
              </List>
            )}
          </AutoSizer>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/70">
            {totalEntries === 0
              ? 'No history yet. Interact with desktop apps to populate the journal.'
              : 'No entries match the current filters.'}
          </div>
        )}
      </section>
      {confirmOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-history-title"
            className="w-full max-w-md rounded-lg border border-white/20 bg-ub-cool-grey p-6 shadow-xl"
          >
            <h2 id="clear-history-title" className="text-lg font-semibold">
              Clear history?
            </h2>
            <p className="mt-2 text-sm text-white/70">
              This action removes all journal entries and cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
