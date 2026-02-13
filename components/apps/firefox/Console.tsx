import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import VirtualList, { ListRef } from 'rc-virtual-list';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

type LogSource = 'browser' | 'network' | 'security' | 'extensions';

type ConsoleLogEntry = {
  id: string;
  sequence: number;
  level: LogLevel;
  source: LogSource;
  message: string;
  timestamp: string;
};

type FilterState = {
  levels: Record<LogLevel, boolean>;
  source: LogSource | 'all';
  query: string;
};

type FirefoxConsoleProps = {
  className?: string;
  height?: number;
};

const FILTER_STORAGE_KEY = 'firefox:console:filters';
const MAX_LOGS = 12000;

const LEVEL_METADATA: Record<LogLevel, { label: string; badge: string; text: string }> = {
  info: { label: 'Info logs', badge: 'bg-blue-500', text: 'text-blue-200' },
  warn: { label: 'Warning logs', badge: 'bg-yellow-400', text: 'text-yellow-200' },
  error: { label: 'Error logs', badge: 'bg-red-500', text: 'text-red-200' },
  debug: { label: 'Debug logs', badge: 'bg-purple-500', text: 'text-purple-200' },
};

const SOURCE_METADATA: Record<LogSource, { label: string; description: string }> = {
  browser: {
    label: 'Firefox Runtime',
    description: 'Messages from the simulated browser runtime.',
  },
  network: {
    label: 'Network Monitor',
    description: 'Requests, responses, and latency notes.',
  },
  security: {
    label: 'Security Scanner',
    description: 'Alerts from defensive scans and safe lab exercises.',
  },
  extensions: {
    label: 'Extension Sandbox',
    description: 'Telemetry from installed extensions and add-ons.',
  },
};

const SAMPLE_MESSAGES: Record<LogSource, Record<LogLevel, string[]>> = {
  browser: {
    info: [
      'Console ready — developer tools initialised.',
      'New tab detected: https://www.kali.org/docs/',
    ],
    warn: [
      'Legacy API usage detected. Consider updating to async Clipboard API.',
      'Mixed content blocked on simulated HTTP asset.',
    ],
    error: [
      'Unhandled promise rejection caught during simulated page load.',
      'Content security policy violation prevented inline script execution.',
    ],
    debug: [
      'Rendering pipeline frame completed in 4.3ms.',
      'Service worker heartbeat acknowledged.',
    ],
  },
  network: {
    info: [
      'XHR https://api.internal.example/summary completed in 214ms.',
      'Prefetch succeeded for https://cdn.example/toolkit.js.',
    ],
    warn: [
      '302 redirect observed from simulated target. Stored for replay.',
      'High latency detected on CDN asset (1.8s).',
    ],
    error: [
      'TLS handshake failed for https://legacy.example — certificate expired.',
      'DNS lookup timed out for lab asset. Check sandbox resolver.',
    ],
    debug: [
      'Queued 4 fetch requests for waterfall visualisation.',
      'Streaming response chunk received (48KB).',
    ],
  },
  security: {
    info: [
      'Security baseline scan completed — 0 critical findings.',
      'Simulation: Recon report exported to evidence vault.',
    ],
    warn: [
      'Lab reminder: rotate API tokens used in demos every 30 days.',
      'Deprecated cipher suites still enabled on training target.',
    ],
    error: [
      'Simulated intrusion detected. Operator flagged suspicious beacon.',
      'Credential reuse discovered in practice dataset. Review password policy.',
    ],
    debug: [
      'Rule evaluation stack executed 12 checks.',
      'Correlation engine matched training artifact signatures.',
    ],
  },
  extensions: {
    info: [
      'Theme extension applied custom stylesheet.',
      'Notes extension synchronised 2 drafts.',
    ],
    warn: [
      'Extension requested additional clipboard permission — review scope.',
      'Sandboxed add-on exceeded storage budget. Purging oldest entries.',
    ],
    error: [
      'Extension sandbox violation blocked — attempted cross-origin request.',
      'Background script crashed. Restart scheduled.',
    ],
    debug: [
      'Extension messaging channel opened (port: lab-channel).',
      'Prefetched glossary metadata for offline help.',
    ],
  },
};

const DEFAULT_FILTERS: FilterState = {
  levels: {
    info: true,
    warn: true,
    error: true,
    debug: true,
  },
  source: 'all',
  query: '',
};

const INITIAL_LOGS: Array<Omit<ConsoleLogEntry, 'id' | 'sequence' | 'timestamp'>> = [
  { level: 'info', source: 'browser', message: 'Console ready — developer tools initialised.' },
  { level: 'warn', source: 'network', message: 'High latency detected on CDN asset (1.8s).' },
  { level: 'info', source: 'security', message: 'Security baseline scan completed — 0 critical findings.' },
  { level: 'debug', source: 'extensions', message: 'Extension messaging channel opened (port: lab-channel).' },
  { level: 'error', source: 'browser', message: 'Content security policy violation prevented inline script execution.' },
];

const readStoredFilters = (): FilterState => {
  if (typeof window === 'undefined') {
    return DEFAULT_FILTERS;
  }
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_FILTERS;
    }
    const parsed = JSON.parse(raw) as Partial<FilterState>;
    return {
      levels: { ...DEFAULT_FILTERS.levels, ...(parsed.levels ?? {}) },
      source: parsed.source ?? DEFAULT_FILTERS.source,
      query: parsed.query ?? DEFAULT_FILTERS.query,
    };
  } catch {
    return DEFAULT_FILTERS;
  }
};

const formatTimestamp = (timestamp: string) => {
  const iso = new Date(timestamp).toISOString();
  return iso.substring(11, 19);
};

const FirefoxConsole: React.FC<FirefoxConsoleProps> = ({ className, height = 320 }) => {
  const [filters, setFilters] = useState<FilterState>(() => readStoredFilters());
  const [logs, setLogs] = useState<ConsoleLogEntry[]>(() => {
    const now = new Date();
    return INITIAL_LOGS.map((entry, index) => ({
      ...entry,
      id: `log-${index + 1}`,
      sequence: index + 1,
      timestamp: new Date(now.getTime() + index * 1000).toISOString(),
    }));
  });
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<ListRef>(null);
  const timerRef = useRef<number | null>(null);
  const logCounterRef = useRef(logs.length);

  const persistFilters = useCallback((next: FilterState) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures (private browsing, quota errors, etc.)
    }
  }, []);

  useEffect(() => {
    persistFilters(filters);
  }, [filters, persistFilters]);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
  }, []);

  const appendLogs = useCallback((entries: Array<{ level: LogLevel; source: LogSource; message: string }>) => {
    setLogs((prev) => {
      const created = entries.map((entry) => {
        logCounterRef.current += 1;
        const sequence = logCounterRef.current;
        return {
          ...entry,
          id: `log-${sequence}`,
          sequence,
          timestamp: new Date().toISOString(),
        };
      });
      const combined = [...prev, ...created];
      if (combined.length > MAX_LOGS) {
        return combined.slice(combined.length - MAX_LOGS);
      }
      return combined;
    });
  }, []);

  const emitRandomLog = useCallback(() => {
    const sources = Object.keys(SOURCE_METADATA) as LogSource[];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const levels = Object.keys(LEVEL_METADATA) as LogLevel[];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    const options = SAMPLE_MESSAGES[randomSource][randomLevel];
    const randomMessage = options[Math.floor(Math.random() * options.length)];
    appendLogs([
      {
        level: randomLevel,
        source: randomSource,
        message: randomMessage,
      },
    ]);
  }, [appendLogs]);

  useEffect(() => {
    if (!isStreaming) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      emitRandomLog();
    }, 2500);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [emitRandomLog, isStreaming]);

  const filteredLogs = useMemo(() => {
    const lowerQuery = filters.query.trim().toLowerCase();
    return logs.filter((log) => {
      if (!filters.levels[log.level]) {
        return false;
      }
      if (filters.source !== 'all' && log.source !== filters.source) {
        return false;
      }
      if (!lowerQuery) {
        return true;
      }
      return (
        log.message.toLowerCase().includes(lowerQuery) ||
        SOURCE_METADATA[log.source].label.toLowerCase().includes(lowerQuery)
      );
    });
  }, [filters.levels, filters.query, filters.source, logs]);

  useEffect(() => {
    setActiveIndex((prev) => {
      if (filteredLogs.length === 0) {
        return prev === null ? prev : null;
      }
      const nextIndex = prev === null ? 0 : Math.min(prev, filteredLogs.length - 1);
      return nextIndex === prev ? prev : nextIndex;
    });
  }, [filteredLogs.length]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }
    listRef.current?.scrollTo({ index: activeIndex, align: 'auto' });
  }, [activeIndex, filteredLogs.length]);

  const visibleCounts = useMemo(() => {
    return filteredLogs.reduce<Record<LogLevel, number>>((acc, log) => {
      acc[log.level] += 1;
      return acc;
    }, {
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
    });
  }, [filteredLogs]);

  const toggleLevel = (level: LogLevel) => {
    setFilters((prev) => {
      const nextLevels = { ...prev.levels, [level]: !prev.levels[level] };
      return { ...prev, levels: nextLevels };
    });
  };

  const handleSourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as FilterState['source'];
    setFilters((prev) => ({ ...prev, source: value }));
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, query: event.target.value }));
  };

  const copyText = useCallback(async (text: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyMessage('Copied visible logs to clipboard.');
    } catch {
      setCopyMessage('Unable to access the clipboard.');
    }
    window.setTimeout(() => setCopyMessage(null), 2500);
  }, []);

  const handleCopyVisible = () => {
    if (filteredLogs.length === 0) {
      setCopyMessage('No logs available to copy.');
      window.setTimeout(() => setCopyMessage(null), 2000);
      return;
    }
    const formatted = filteredLogs
      .map(
        (log) =>
          `${formatTimestamp(log.timestamp)} [${SOURCE_METADATA[log.source].label}] ${
            log.level
          } #${log.sequence}: ${log.message}`
      )
      .join('\n');
    void copyText(formatted);
  };

  const handleCopyEntry = (log: ConsoleLogEntry) => {
    const formatted = `${formatTimestamp(log.timestamp)} [${SOURCE_METADATA[log.source].label}] ${
      log.level
    } #${log.sequence}: ${log.message}`;
    void copyText(formatted);
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (filteredLogs.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => {
        const current = prev ?? 0;
        const nextIndex = Math.min(current + 1, filteredLogs.length - 1);
        return nextIndex;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => {
        const current = prev ?? 0;
        const nextIndex = Math.max(current - 1, 0);
        return nextIndex;
      });
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(filteredLogs.length - 1);
    } else if ((event.key === 'c' || event.key === 'C') && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      const current = activeIndex ?? 0;
      const log = filteredLogs[current];
      if (log) {
        handleCopyEntry(log);
      }
    }
  };

  const classNames = ['space-y-4'];
  if (className) {
    classNames.push(className);
  }

  const activeLog = activeIndex !== null ? filteredLogs[activeIndex] : null;

  return (
    <div className={classNames.join(' ')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(LEVEL_METADATA) as LogLevel[]).map((level) => {
            const metadata = LEVEL_METADATA[level];
            const checked = filters.levels[level];
            return (
              <label key={level} className="flex items-center gap-2 rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-gray-600 bg-gray-800 text-blue-400 focus:ring-blue-400"
                  checked={checked}
                  onChange={() => toggleLevel(level)}
                  aria-label={metadata.label}
                />
                <span className="flex items-center gap-2 text-gray-200">
                  <span className={`h-2 w-2 rounded-full ${metadata.badge}`} aria-hidden="true" />
                  {metadata.label}
                  <span className="text-[0.65rem] text-gray-400">({visibleCounts[level]})</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-xs text-gray-300">
            Source
            <select
              value={filters.source}
              onChange={handleSourceChange}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-400 focus:outline-none"
            >
              <option value="all">All sources</option>
              {(Object.keys(SOURCE_METADATA) as LogSource[]).map((source) => (
                <option key={source} value={source}>
                  {SOURCE_METADATA[source].label}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            value={filters.query}
            onChange={handleQueryChange}
            placeholder="Filter by keyword"
            aria-label="Filter logs by keyword"
            className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-400 focus:outline-none sm:w-48"
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-black p-3 shadow-inner">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
          <button
            type="button"
            onClick={() =>
              appendLogs([
                {
                  level: 'info',
                  source: 'network',
                  message: 'XHR https://api.internal.example/summary completed in 214ms.',
                },
              ])
            }
            className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-blue-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Log network request
          </button>
          <button
            type="button"
            onClick={() =>
              appendLogs([
                {
                  level: 'warn',
                  source: 'extensions',
                  message: 'Sandboxed add-on exceeded storage budget. Purging oldest entries.',
                },
              ])
            }
            className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-yellow-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            Flag extension warning
          </button>
          <button
            type="button"
            onClick={() =>
              appendLogs([
                {
                  level: 'error',
                  source: 'security',
                  message: 'Simulated intrusion detected. Operator flagged suspicious beacon.',
                },
              ])
            }
            className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Raise security alert
          </button>
          <button
            type="button"
            onClick={() =>
              appendLogs([
                {
                  level: 'debug',
                  source: 'browser',
                  message: 'Rendering pipeline frame completed in 4.3ms.',
                },
              ])
            }
            className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-purple-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            Trace debug workflow
          </button>
          <button
            type="button"
            onClick={() => {
              const burst = Array.from({ length: 50 }, () => {
                const sources = Object.keys(SOURCE_METADATA) as LogSource[];
                const levels = Object.keys(LEVEL_METADATA) as LogLevel[];
                const source = sources[Math.floor(Math.random() * sources.length)];
                const level = levels[Math.floor(Math.random() * levels.length)];
                const options = SAMPLE_MESSAGES[source][level];
                const message = options[Math.floor(Math.random() * options.length)];
                return { level, source, message };
              });
              appendLogs(burst);
            }}
            className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-gray-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Burst 50 events
          </button>
          <button
            type="button"
            onClick={() => {
              const batch = Array.from({ length: 10000 }, (_, index) => {
                const sources = Object.keys(SOURCE_METADATA) as LogSource[];
                const levels = Object.keys(LEVEL_METADATA) as LogLevel[];
                const source = sources[index % sources.length];
                const level = levels[index % levels.length];
                return {
                  level,
                  source,
                  message: `Bulk simulation ${index + 1}/10000 from ${SOURCE_METADATA[source].label}`,
                };
              });
              appendLogs(batch);
            }}
            className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-teal-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            Generate 10,000 events
          </button>
          <button
            type="button"
            onClick={() => setIsStreaming((prev) => !prev)}
            className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-gray-100 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-pressed={isStreaming}
          >
            {isStreaming ? 'Stop live stream' : 'Start live stream'}
          </button>
          <button
            type="button"
            onClick={handleCopyVisible}
            className="rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Copy visible logs
          </button>
          {copyMessage ? <span className="ml-1 text-[0.65rem] text-gray-400">{copyMessage}</span> : null}
        </div>
        <div
          aria-live="polite"
          data-testid="firefox-console-active-log"
          className="sr-only"
        >
          {activeLog ? `Active log #${activeLog.sequence}` : 'No log selected'}
        </div>
        <VirtualList
          ref={listRef}
          data={filteredLogs}
          height={height}
          itemHeight={52}
          itemKey="id"
          className="firefox-console-list max-h-96 overflow-y-auto rounded-md border border-gray-800 bg-gray-950"
          role="listbox"
          aria-label="Firefox console output"
          tabIndex={0}
          onKeyDown={handleListKeyDown}
        >
          {(log: ConsoleLogEntry, index: number) => {
            const metadata = LEVEL_METADATA[log.level];
            const source = SOURCE_METADATA[log.source];
            const isActive = index === activeIndex;
            return (
              <div
                key={log.id}
                role="option"
                aria-selected={isActive}
                className={`flex items-start justify-between gap-3 border-b border-gray-800 px-3 py-2 text-xs transition ${
                  isActive ? 'bg-gray-800/80 ring-1 ring-inset ring-blue-400' : 'bg-transparent hover:bg-gray-900/60'
                }`}
                onClick={() => setActiveIndex(index)}
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="font-mono text-[0.7rem] text-gray-400">
                    <span className={`mr-2 inline-flex h-2 w-2 rounded-full ${metadata.badge}`} aria-hidden="true" />
                    {formatTimestamp(log.timestamp)} · #{log.sequence} · {source.label}
                  </span>
                  <span className={`text-sm ${metadata.text}`}>{log.message}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-gray-700 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-gray-300">
                    {log.level}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyEntry(log)}
                    className="rounded bg-gray-800 px-2 py-1 text-[0.65rem] text-gray-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    Copy entry
                  </button>
                </div>
              </div>
            );
          }}
        </VirtualList>
        {filteredLogs.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-700 bg-gray-900/60 px-3 py-4 text-center text-xs text-gray-400">
            No logs match the current filters. Adjust the level toggles or keyword query to continue practising.
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 text-xs text-gray-300 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(SOURCE_METADATA) as LogSource[]).map((source) => (
          <div key={source} className="rounded-md border border-gray-800 bg-gray-900/40 p-3">
            <h3 className="text-sm font-semibold text-gray-100">{SOURCE_METADATA[source].label}</h3>
            <p className="mt-2 text-[0.7rem] leading-relaxed text-gray-400">{SOURCE_METADATA[source].description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FirefoxConsole;
