import React, { useEffect, useMemo, useState } from 'react';
import useDownloads from '../../hooks/useDownloads';

const statusLabels: Record<string, string> = {
  downloading: 'Downloading',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
};

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const DownloadPanel: React.FC = () => {
  const { downloads, pauseDownload, resumeDownload, retryDownload, removeDownload } = useDownloads();
  const [isOpen, setIsOpen] = useState(false);

  const totalCount = downloads.length;
  const activeCount = useMemo(
    () =>
      downloads.filter(item => item.status === 'downloading' || item.status === 'paused').length,
    [downloads]
  );
  const failedCount = useMemo(
    () => downloads.filter(item => item.status === 'failed').length,
    [downloads]
  );

  useEffect(() => {
    if (downloads.length > 0) {
      setIsOpen(true);
    }
  }, [downloads.length]);

  const toggle = () => setIsOpen(prev => !prev);

  if (!totalCount) {
    return (
      <aside className="fixed top-20 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto flex items-start">
          <button
            type="button"
            onClick={toggle}
            className="mr-2 rounded-l bg-slate-800/80 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-700"
            aria-expanded={isOpen}
            aria-controls="download-panel"
          >
            Downloads
          </button>
          {isOpen && (
            <div
              id="download-panel"
              className="w-80 max-w-sm rounded-l bg-slate-900/95 text-slate-100 shadow-lg ring-1 ring-slate-700"
            >
              <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide">Downloads</h2>
                <button
                  type="button"
                  onClick={toggle}
                  className="rounded bg-slate-800 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-300 hover:bg-slate-700"
                >
                  Close
                </button>
              </header>
              <div className="px-4 py-6 text-sm text-slate-400">No downloads yet.</div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed top-20 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto flex items-start">
        <button
          type="button"
          onClick={toggle}
          className="mr-2 rounded-l bg-slate-800/80 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-700"
          aria-expanded={isOpen}
          aria-controls="download-panel"
        >
          Downloads
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-slate-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            {totalCount}
          </span>
        </button>
        <div
          id="download-panel"
          className={`w-80 max-w-sm transform rounded-l bg-slate-900/95 text-slate-100 shadow-lg ring-1 ring-slate-700 transition-transform duration-200 ease-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide">Downloads</h2>
              <p className="text-xs text-slate-400">
                {activeCount > 0 ? `${activeCount} active` : 'Idle'}
                {failedCount > 0 ? ` • ${failedCount} failed` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="rounded bg-slate-800 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>
          </header>
          <ul className="max-h-[70vh] space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
            {downloads.map(download => {
              const percent = Math.round(download.progress * 100);
              const statusLabel = statusLabels[download.status] ?? download.status;
              const progressColor =
                download.status === 'failed'
                  ? 'bg-red-500'
                  : download.status === 'completed'
                  ? 'bg-emerald-500'
                  : 'bg-sky-500';

              return (
                <li key={download.id} className="rounded border border-slate-800 bg-slate-900/70 p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100" title={download.label}>
                        {download.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {statusLabel}
                        {download.status !== 'completed' && ` • ${percent}%`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatBytes(download.bytesDownloaded)} / {formatBytes(download.totalBytes)}
                      </p>
                      {download.error && (
                        <p className="mt-2 text-xs text-red-400" role="alert">
                          {download.error}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {download.status === 'downloading' && (
                        <button
                          type="button"
                          onClick={() => pauseDownload(download.id)}
                          className="rounded bg-slate-800 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-700"
                        >
                          Pause
                        </button>
                      )}
                      {download.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => resumeDownload(download.id)}
                          className="rounded bg-slate-800 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-700"
                        >
                          Resume
                        </button>
                      )}
                      {download.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => retryDownload(download.id)}
                          className="rounded bg-red-500/80 px-2 py-1 text-xs font-medium uppercase tracking-wide text-white hover:bg-red-500"
                        >
                          Retry
                        </button>
                      )}
                      {(download.status === 'completed' || download.status === 'failed') && (
                        <button
                          type="button"
                          onClick={() => removeDownload(download.id)}
                          className="rounded bg-slate-800 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full rounded bg-slate-800" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded ${progressColor}`} style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default DownloadPanel;
