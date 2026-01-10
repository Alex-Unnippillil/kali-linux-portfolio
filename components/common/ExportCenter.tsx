import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import ExportPipeline, {
  ExportJobRequest,
  ExportSnapshot,
  ExportTask,
  ExportTaskView,
} from '../../utils/exports/pipeline';

const isExportHistory = (value: unknown): value is ExportTask[] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      entry &&
      typeof entry.id === 'string' &&
      typeof entry.label === 'string' &&
      typeof entry.source === 'string' &&
      typeof entry.status === 'string' &&
      Array.isArray(entry.redactions) &&
      Array.isArray(entry.tempFiles),
  );

export type ExportStatusFilter =
  | 'all'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'running';

interface ExportCenterContextValue {
  snapshot: ExportSnapshot;
  enqueueExport: (request: ExportJobRequest) => string;
  cancelExport: (id: string) => Promise<boolean>;
  resumeExport: (id: string) => Promise<boolean>;
  retryExport: (id: string) => boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: ExportStatusFilter;
  setStatusFilter: (value: ExportStatusFilter) => void;
}

const ExportCenterContext = createContext<ExportCenterContextValue | null>(null);

export const useExportCenterContext = () => {
  const ctx = useContext(ExportCenterContext);
  if (!ctx) {
    throw new Error('useExportCenterContext must be used within ExportCenterProvider');
  }
  return ctx;
};

interface ExportCenterProviderProps {
  children?: React.ReactNode;
}

export const ExportCenterProvider: React.FC<ExportCenterProviderProps> = ({ children }) => {
  const [persistedHistory, setPersistedHistory] = usePersistentState<ExportTask[]>(
    'export-history',
    [],
    isExportHistory,
  );

  const pipelineRef = useRef<ExportPipeline | null>(null);
  if (!pipelineRef.current) {
    pipelineRef.current = new ExportPipeline({
      history: persistedHistory,
      onHistoryChange: setPersistedHistory,
    });
  }
  const pipeline = pipelineRef.current;

  const [snapshot, setSnapshot] = useState<ExportSnapshot>(() => pipeline.getSnapshot());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExportStatusFilter>('all');

  useEffect(() => {
    const unsubscribe = pipeline.subscribe(setSnapshot);
    return unsubscribe;
  }, [pipeline]);

  const enqueueExport = useCallback(
    (request: ExportJobRequest) => pipeline.queueExport(request),
    [pipeline],
  );
  const cancelExport = useCallback(
    (id: string) => pipeline.cancelExport(id),
    [pipeline],
  );
  const resumeExport = useCallback(
    (id: string) => pipeline.resumeExport(id),
    [pipeline],
  );
  const retryExport = useCallback((id: string) => pipeline.retryExport(id), [pipeline]);

  const value = useMemo<ExportCenterContextValue>(
    () => ({
      snapshot,
      enqueueExport,
      cancelExport,
      resumeExport,
      retryExport,
      searchTerm,
      setSearchTerm,
      statusFilter,
      setStatusFilter,
    }),
    [
      snapshot,
      enqueueExport,
      cancelExport,
      resumeExport,
      retryExport,
      searchTerm,
      setSearchTerm,
      statusFilter,
      setStatusFilter,
    ],
  );

  return (
    <ExportCenterContext.Provider value={value}>{children}</ExportCenterContext.Provider>
  );
};

export interface ExportCenterProps {
  className?: string;
}

const ExportCenter: React.FC<ExportCenterProps> = ({ className }) => {
  const {
    snapshot,
    cancelExport,
    resumeExport,
    retryExport,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
  } = useExportCenterContext();

  const filteredActive = useMemo(() => {
    return filterTasks(snapshot.active, searchTerm, statusFilter);
  }, [snapshot.active, searchTerm, statusFilter]);

  const filteredCompleted = useMemo(() => {
    return filterTasks(snapshot.completed, searchTerm, statusFilter);
  }, [snapshot.completed, searchTerm, statusFilter]);

  const handleCancel = useCallback(
    (id: string) => {
      void cancelExport(id);
    },
    [cancelExport],
  );

  const handleResume = useCallback(
    (id: string) => {
      void resumeExport(id);
    },
    [resumeExport],
  );

  const handleRetry = useCallback(
    (id: string) => {
      retryExport(id);
    },
    [retryExport],
  );

  return (
    <div className={className}>
      <div className="rounded-lg border border-gray-800 bg-gray-900 text-gray-100 shadow-lg">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-semibold">Export Center</h2>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search exports"
              aria-label="Search exports"
              className="w-full min-w-[180px] flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1 text-sm text-gray-200 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ExportStatusFilter)}
              aria-label="Filter exports by status"
              className="rounded border border-gray-700 bg-gray-950 px-3 py-1 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </header>
        <div className="grid gap-0 divide-y divide-gray-800 md:grid-cols-2 md:divide-x md:divide-y-0">
          <section className="min-h-[200px]">
            <h3 className="border-b border-gray-800 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Active exports
            </h3>
            {filteredActive.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No active exports</p>
            ) : (
              <ul className="divide-y divide-gray-800">
                {filteredActive.map((task) => (
                  <li key={task.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-100">{task.label}</p>
                        <p className="text-xs text-gray-500">{formatStatus(task)}</p>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        {formatProgress(task)}
                      </div>
                    </div>
                    {task.redactions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {task.redactions.map((redaction) => (
                          <span
                            key={redaction}
                            className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300"
                          >
                            {redaction}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>{formatSizeRange(task.bytesCompleted, task.bytesTotal)}</span>
                      {task.canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(task.id)}
                          className="rounded border border-red-500 px-2 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="min-h-[200px]">
            <h3 className="border-b border-gray-800 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Completed exports
            </h3>
            {filteredCompleted.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No export history</p>
            ) : (
              <ul className="divide-y divide-gray-800">
                {filteredCompleted.map((task) => (
                  <li key={task.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-100">{task.label}</p>
                        <p className="text-xs text-gray-500">{formatStatus(task)}</p>
                        {task.error && (
                          <p className="mt-1 text-xs text-red-400">{task.error}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {task.canResume && (
                          <button
                            type="button"
                            onClick={() => handleResume(task.id)}
                            className="rounded border border-blue-500 px-2 py-1 text-xs font-medium text-blue-300 transition hover:bg-blue-500/10"
                          >
                            Resume
                          </button>
                        )}
                        {task.canRetry && (
                          <button
                            type="button"
                            onClick={() => handleRetry(task.id)}
                            className="rounded border border-yellow-500 px-2 py-1 text-xs font-medium text-yellow-300 transition hover:bg-yellow-500/10"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                    {task.redactions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {task.redactions.map((redaction) => (
                          <span
                            key={redaction}
                            className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300"
                          >
                            {redaction}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                      <span>{formatSize(task)}</span>
                      <span>Retries: {task.retries}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

function filterTasks(
  tasks: ExportTaskView[],
  searchTerm: string,
  filter: ExportStatusFilter,
): ExportTaskView[] {
  const term = searchTerm.trim().toLowerCase();
  return tasks.filter((task) => {
    if (filter !== 'all') {
      if (filter === 'active') {
        if (!(task.status === 'queued' || task.status === 'running')) return false;
      } else if (filter === 'running') {
        if (task.status !== 'running') return false;
      } else if (task.status !== filter) {
        return false;
      }
    }

    if (!term) return true;
    const haystack = [
      task.label,
      task.source,
      task.redactions.join(' '),
      task.result?.downloadUrl ?? '',
      task.error ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });
}

function formatProgress(task: ExportTaskView) {
  if (task.status === 'queued') return 'Queued';
  if (task.bytesTotal && task.bytesTotal > 0) {
    const percent = Math.min(100, Math.round((task.bytesCompleted / task.bytesTotal) * 100));
    return `${percent}%`; 
  }
  if (task.bytesCompleted > 0) {
    return `${formatBytes(task.bytesCompleted)} exported`;
  }
  return 'Starting…';
}

function formatSize(task: ExportTaskView) {
  if (task.result?.bytesWritten) {
    return `Size: ${formatBytes(task.result.bytesWritten)}`;
  }
  if (task.bytesCompleted) {
    return `Size: ${formatBytes(task.bytesCompleted)}`;
  }
  return 'Size unknown';
}

function formatSizeRange(bytesCompleted: number, bytesTotal?: number) {
  if (bytesTotal && bytesTotal > 0) {
    return `${formatBytes(bytesCompleted)} / ${formatBytes(bytesTotal)}`;
  }
  if (bytesCompleted > 0) {
    return `${formatBytes(bytesCompleted)} exported`;
  }
  return 'Pending';
}

function formatBytes(value?: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatStatus(task: ExportTaskView) {
  switch (task.status) {
    case 'queued':
      return 'Queued';
    case 'running':
      return 'Running';
    case 'completed':
      return `Completed ${task.result?.downloadUrl ? '— Ready to download' : ''}`.trim();
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return task.status;
  }
}

export default ExportCenter;
