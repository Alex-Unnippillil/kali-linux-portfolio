import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import HelpPanel from '../../HelpPanel';
import { safeLocalStorage } from '../../../utils/safeStorage';

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] as const;
const PRESET_STORAGE_KEY = 'log-viewer-presets-v1';

type LogLevel = (typeof LOG_LEVELS)[number];

type LogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  tags: string[];
  metadata: Record<string, string>;
};

type FilterState = {
  levels: LogLevel[];
  source: string;
  message: string;
  tag: string;
  start: string;
  end: string;
};

type FilterPreset = {
  id: string;
  name: string;
  createdAt: string;
  filters: FilterState;
};

type LogViewerProps = {
  openApp?: (id: string) => void;
};

const LEVEL_STYLES: Record<LogLevel, string> = {
  DEBUG: 'bg-slate-800/70 text-slate-200 border border-slate-500/60',
  INFO: 'bg-sky-600/20 text-sky-300 border border-sky-500/60',
  WARN: 'bg-amber-500/20 text-amber-200 border border-amber-400/70',
  ERROR: 'bg-rose-600/20 text-rose-300 border border-rose-500/60',
  CRITICAL: 'bg-red-800/40 text-red-200 border border-red-500/70',
};

const BASE_LOGS: Array<Omit<LogEntry, 'id' | 'timestamp'>> = [
  {
    level: 'INFO',
    source: 'auth-service',
    message: 'User login succeeded',
    tags: ['auth', 'user'],
    metadata: { user: 'alice', ip: '10.0.4.21', region: 'us-east-1' },
  },
  {
    level: 'WARN',
    source: 'auth-service',
    message: 'Suspicious login attempt detected',
    tags: ['auth', 'security'],
    metadata: { user: 'bob', ip: '210.54.23.9', reason: 'geo-velocity' },
  },
  {
    level: 'ERROR',
    source: 'payments-api',
    message: 'Payment processor timeout',
    tags: ['payments', 'retry'],
    metadata: { requestId: 'req-1023', region: 'eu-central-1', attempts: '3' },
  },
  {
    level: 'DEBUG',
    source: 'scheduler',
    message: 'Job heartbeat received',
    tags: ['jobs'],
    metadata: { jobId: 'job-44', host: 'scheduler-1', queue: 'priority' },
  },
  {
    level: 'CRITICAL',
    source: 'edge-proxy',
    message: 'TLS certificate expired',
    tags: ['infra', 'security'],
    metadata: { host: 'edge-03', cert: 'api.example.com', daysExpired: '1' },
  },
  {
    level: 'INFO',
    source: 'analytics-pipeline',
    message: 'Batch export completed',
    tags: ['analytics'],
    metadata: { batchId: 'batch-221', records: '15042', duration: '12m' },
  },
  {
    level: 'WARN',
    source: 'edge-proxy',
    message: 'Increased latency from upstream origin',
    tags: ['infra', 'network'],
    metadata: { host: 'edge-01', origin: 'origin-2', rtt: '520ms' },
  },
  {
    level: 'ERROR',
    source: 'payments-api',
    message: 'Card declined by issuer',
    tags: ['payments'],
    metadata: { requestId: 'req-2220', issuer: 'Bank-01', user: 'chloe' },
  },
  {
    level: 'DEBUG',
    source: 'scheduler',
    message: 'Scheduled task completed',
    tags: ['jobs'],
    metadata: { jobId: 'job-45', host: 'scheduler-2', duration: '45s' },
  },
  {
    level: 'INFO',
    source: 'reporting-api',
    message: 'Monthly report generated',
    tags: ['reports'],
    metadata: { reportId: 'rpt-8', rows: '4582', user: 'daniela' },
  },
];

const createInitialFilters = (): FilterState => ({
  levels: [],
  source: '',
  message: '',
  tag: '',
  start: '',
  end: '',
});

const toStringOrEmpty = (value: unknown): string => (typeof value === 'string' ? value : '');

const normalizeFilters = (filters: Partial<FilterState> | undefined): FilterState => ({
  levels: Array.isArray(filters?.levels)
    ? (filters?.levels.filter((level): level is LogLevel => LOG_LEVELS.includes(level as LogLevel)) as LogLevel[])
    : [],
  source: toStringOrEmpty(filters?.source),
  message: toStringOrEmpty(filters?.message),
  tag: toStringOrEmpty(filters?.tag),
  start: toStringOrEmpty(filters?.start),
  end: toStringOrEmpty(filters?.end),
});

const cloneFilters = (filters: FilterState): FilterState => ({
  levels: [...filters.levels],
  source: filters.source,
  message: filters.message,
  tag: filters.tag,
  start: filters.start,
  end: filters.end,
});

const buildLogs = (): LogEntry[] => {
  const start = new Date('2024-04-07T12:00:00Z').getTime();
  return Array.from({ length: 1200 }).map((_, idx) => {
    const base = BASE_LOGS[idx % BASE_LOGS.length];
    const timestamp = new Date(start + idx * 45_000).toISOString();
    const metadata: Record<string, string> = {
      ...base.metadata,
      sequence: `seq-${(idx + 1).toString().padStart(4, '0')}`,
      shard: `shard-${(idx % 5) + 1}`,
    };
    if (base.level === 'WARN' && idx % 3 === 0) {
      metadata.action = 'notified';
    }
    if (base.level === 'ERROR' && idx % 2 === 0) {
      metadata.retryAfter = `${30 + (idx % 4) * 15}s`;
    }
    if (base.level === 'DEBUG') {
      metadata.details = `cycle-${idx % 10}`;
    }
    return {
      id: `log-${idx}`,
      timestamp,
      level: base.level,
      source: base.source,
      message: base.message,
      tags: [...base.tags],
      metadata,
    };
  });
};

const LOG_DATA = buildLogs();

const formatDateTime = (iso: string): string => {
  return iso.replace('T', ' ').replace('Z', ' UTC');
};

const LogRow = ({ index, style, data }: ListChildComponentProps<LogEntry[]>) => {
  const log = data[index];
  return (
    <div
      style={style}
      className="grid grid-cols-[170px_110px_1fr] items-start gap-4 border-b border-white/5 px-4 py-3 text-xs text-slate-200 md:grid-cols-[200px_140px_1fr] md:text-sm"
      data-testid="log-row"
    >
      <div className="font-mono text-[0.7rem] text-slate-400 md:text-xs" title={log.timestamp}>
        {formatDateTime(log.timestamp)}
      </div>
      <span
        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-wide md:text-[0.65rem] ${LEVEL_STYLES[log.level]}`}
      >
        {log.level}
      </span>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="truncate font-medium text-slate-100" title={log.message}>
            {log.message}
          </span>
          <span className="rounded bg-white/5 px-2 py-0.5 text-[0.65rem] font-medium text-slate-300">{log.source}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-wide text-slate-400">
          {log.tags.map((tag, tagIdx) => (
            <span key={`${log.id}-tag-${tagIdx}`} className="rounded-full border border-white/10 px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-[0.65rem] text-slate-300">
          {Object.entries(log.metadata).map(([key, value], metaIdx) => (
            <span key={`${log.id}-meta-${key}-${metaIdx}`} className="rounded border border-white/10 bg-black/30 px-2 py-1">
              <span className="uppercase text-slate-400">{key}:</span> <span className="text-slate-100">{value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const MemoLogRow = React.memo(LogRow);

const LogViewer: React.FC<LogViewerProps> = () => {
  const [filters, setFilters] = useState<FilterState>(() => createInitialFilters());
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [exportFeedback, setExportFeedback] = useState('');

  useEffect(() => {
    try {
      const raw = safeLocalStorage?.getItem(PRESET_STORAGE_KEY);
      if (!raw) return;
      const parsed: FilterPreset[] = JSON.parse(raw);
      const sanitized = parsed
        .filter((preset) => preset && typeof preset.id === 'string' && typeof preset.name === 'string')
        .map((preset) => ({
          id: preset.id,
          name: preset.name,
          createdAt: preset.createdAt ?? new Date().toISOString(),
          filters: normalizeFilters(preset.filters),
        }));
      setPresets(sanitized);
    } catch (error) {
      console.warn('Failed to load log viewer presets', error);
    }
  }, []);

  const persistPresets = useCallback((next: FilterPreset[]) => {
    setPresets(next);
    try {
      safeLocalStorage?.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Failed to persist log viewer presets', error);
    }
  }, []);

  const availableSources = useMemo(
    () => Array.from(new Set(LOG_DATA.map((log) => log.source))).sort(),
    []
  );

  const toggleLevel = useCallback((level: LogLevel) => {
    setFilters((prev) => {
      const exists = prev.levels.includes(level);
      const nextLevels = exists ? prev.levels.filter((value) => value !== level) : [...prev.levels, level];
      return { ...prev, levels: nextLevels };
    });
    setSelectedPresetId('');
  }, []);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setSelectedPresetId('');
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(createInitialFilters());
    setSelectedPresetId('');
  }, []);

  const filteredLogs = useMemo(() => {
    return LOG_DATA.filter((log) => {
      if (filters.levels.length > 0 && !filters.levels.includes(log.level)) {
        return false;
      }
      if (filters.source && !log.source.toLowerCase().includes(filters.source.toLowerCase())) {
        return false;
      }
      if (filters.message && !log.message.toLowerCase().includes(filters.message.toLowerCase())) {
        return false;
      }
      if (filters.tag && !log.tags.some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase()))) {
        return false;
      }
      const logTime = new Date(log.timestamp).getTime();
      if (filters.start) {
        const startTime = new Date(filters.start).getTime();
        if (!Number.isNaN(startTime) && logTime < startTime) {
          return false;
        }
      }
      if (filters.end) {
        const endTime = new Date(filters.end).getTime();
        if (!Number.isNaN(endTime) && logTime > endTime) {
          return false;
        }
      }
      return true;
    });
  }, [filters]);

  const activeChips = useMemo(() => {
    const chips: string[] = [];
    if (filters.levels.length) {
      chips.push(`Levels: ${filters.levels.join(', ')}`);
    }
    if (filters.source.trim()) {
      chips.push(`Source contains "${filters.source.trim()}"`);
    }
    if (filters.message.trim()) {
      chips.push(`Message contains "${filters.message.trim()}"`);
    }
    if (filters.tag.trim()) {
      chips.push(`Tag contains "${filters.tag.trim()}"`);
    }
    if (filters.start) {
      chips.push(`From ${formatDateTime(new Date(filters.start).toISOString())}`);
    }
    if (filters.end) {
      chips.push(`To ${formatDateTime(new Date(filters.end).toISOString())}`);
    }
    return chips;
  }, [filters]);

  const handleSavePreset = useCallback(() => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      filters: cloneFilters(filters),
    };
    const next = [...presets, newPreset];
    persistPresets(next);
    setPresetName('');
    setSelectedPresetId(newPreset.id);
  }, [filters, persistPresets, presetName, presets]);

  const handleApplyPreset = useCallback(
    (id: string) => {
      const preset = presets.find((entry) => entry.id === id);
      if (!preset) return;
      setFilters(cloneFilters(preset.filters));
      setSelectedPresetId(id);
    },
    [presets]
  );

  const handleDeletePreset = useCallback(() => {
    if (!selectedPresetId) return;
    const next = presets.filter((preset) => preset.id !== selectedPresetId);
    persistPresets(next);
    setSelectedPresetId('');
  }, [persistPresets, presets, selectedPresetId]);

  const handleExport = useCallback(() => {
    if (typeof window === 'undefined') return;
    const presetNameSelected = presets.find((preset) => preset.id === selectedPresetId)?.name ?? null;
    const payload = {
      exportedAt: new Date().toISOString(),
      appliedFilters: {
        ...filters,
        presetName: presetNameSelected,
      },
      total: filteredLogs.length,
      available: LOG_DATA.length,
      logs: filteredLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log-viewer-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportFeedback(`Exported ${filteredLogs.length} entries`);
    setTimeout(() => setExportFeedback(''), 2000);
  }, [filteredLogs, filters, presets, selectedPresetId]);

  const presetOptions = useMemo(
    () =>
      presets
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [presets]
  );

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <HelpPanel appId="log-viewer" />
      <div className="border-b border-white/10 bg-black/40">
        <div className="flex flex-col gap-6 p-4">
          <div>
            <h1 className="text-lg font-semibold">Structured Log Viewer</h1>
            <p className="text-sm text-slate-300">
              Filter, explore, and export simulated operational logs without touching real infrastructure.
            </p>
          </div>

          <section aria-label="Filters" className="space-y-4 rounded-lg border border-white/10 bg-black/30 p-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Level</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {LOG_LEVELS.map((level) => {
                  const active = filters.levels.includes(level);
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleLevel(level)}
                      className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-black ${
                        active
                          ? LEVEL_STYLES[level]
                          : 'border border-white/20 bg-transparent text-slate-300 hover:border-white/40'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
                Source
                <input
                  list="log-viewer-sources"
                  value={filters.source}
                  onChange={(event) => updateFilter('source', event.target.value)}
                  className="rounded border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  placeholder="e.g. payments-api"
                />
                <datalist id="log-viewer-sources">
                  {availableSources.map((source) => (
                    <option key={source} value={source} />
                  ))}
                </datalist>
              </label>

              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
                Message
                <input
                  value={filters.message}
                  onChange={(event) => updateFilter('message', event.target.value)}
                  className="rounded border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  placeholder="contains..."
                />
              </label>

              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
                Tag
                <input
                  value={filters.tag}
                  onChange={(event) => updateFilter('tag', event.target.value)}
                  className="rounded border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  placeholder="e.g. security"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
                Start Time
                <input
                  type="datetime-local"
                  value={filters.start}
                  onChange={(event) => updateFilter('start', event.target.value)}
                  className="rounded border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
                End Time
                <input
                  type="datetime-local"
                  value={filters.end}
                  onChange={(event) => updateFilter('end', event.target.value)}
                  className="rounded border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
              <div className="flex flex-wrap gap-2">
                {activeChips.length > 0 ? (
                  activeChips.map((chip) => (
                    <span key={chip} className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[0.65rem] uppercase">
                      {chip}
                    </span>
                  ))
                ) : (
                  <span className="text-[0.75rem] text-slate-400">No filters applied. Showing full history.</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded border border-white/20 px-3 py-1 text-[0.7rem] uppercase tracking-wide text-slate-200 transition hover:border-white/40"
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded bg-sky-600 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white transition hover:bg-sky-500"
                >
                  Export view
                </button>
                {exportFeedback && <span className="text-[0.7rem] text-slate-400">{exportFeedback}</span>}
              </div>
            </div>
          </section>

          <section aria-label="Presets" className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Saved presets</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
                Preset
                <select
                  value={selectedPresetId}
                  onChange={(event) => handleApplyPreset(event.target.value)}
                  className="min-w-[14rem] rounded border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="">Select a preset</option>
                  {presetOptions.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleDeletePreset}
                disabled={!selectedPresetId}
                className="rounded border border-white/20 px-3 py-1 text-[0.7rem] uppercase tracking-wide text-slate-200 transition enabled:hover:border-white/40 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-300">
                Save current filters as
                <input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  className="min-w-[14rem] rounded border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  placeholder="e.g. Errors last hour"
                />
              </label>
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="rounded bg-emerald-600 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white transition enabled:hover:bg-emerald-500 disabled:opacity-50"
              >
                Save preset
              </button>
            </div>
            <p className="text-[0.7rem] text-slate-400">
              Presets are stored locally in your browser using a storage-safe helper. They never leave this demo environment.
            </p>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
            <span>
              Showing {filteredLogs.length.toLocaleString()} of {LOG_DATA.length.toLocaleString()} simulated log entries
            </span>
            {selectedPresetId && (
              <span className="text-[0.75rem] text-slate-400">
                Applied preset: {presets.find((preset) => preset.id === selectedPresetId)?.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            No log entries match the selected filters.
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={filteredLogs.length}
                itemSize={120}
                itemData={filteredLogs}
                itemKey={(index, data) => data[index].id}
              >
                {MemoLogRow}
              </List>
            )}
          </AutoSizer>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
