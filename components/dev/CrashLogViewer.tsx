import { type ChangeEventHandler, useEffect, useMemo, useRef, useState } from 'react';
import {
  CrashLogEntry,
  clearCrashLogs,
  exportCrashLogs,
  getCrashLogs,
  importCrashLogs,
  removeCrashLog
} from '../../utils/crashLog';

interface FilterOption {
  value: string;
  label: string;
}

const ALL_ROUTES = 'all-routes';
const ALL_APPS = 'all-apps';

function buildOptions(values: (string | undefined)[], placeholder: string, allValue: string): FilterOption[] {
  const unique = Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())))).sort();
  return [
    { value: allValue, label: placeholder },
    ...unique.map((value) => ({ value, label: value }))
  ];
}

const CrashLogViewer = () => {
  const [logs, setLogs] = useState<CrashLogEntry[]>([]);
  const [routeFilter, setRouteFilter] = useState<string>(ALL_ROUTES);
  const [appFilter, setAppFilter] = useState<string>(ALL_APPS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshLogs = () => {
    setLogs(getCrashLogs());
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    refreshLogs();
  }, []);

  useEffect(() => {
    if (!logs.length) {
      setRouteFilter(ALL_ROUTES);
      setAppFilter(ALL_APPS);
    }
  }, [logs.length]);

  const routeOptions = useMemo(
    () => buildOptions(logs.map((log) => log.route), 'All routes', ALL_ROUTES),
    [logs]
  );

  const appOptions = useMemo(
    () => buildOptions(logs.map((log) => log.appId), 'All apps', ALL_APPS),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const routeMatch = routeFilter === ALL_ROUTES || log.route === routeFilter;
      const appMatch = appFilter === ALL_APPS || log.appId === appFilter;
      return routeMatch && appMatch;
    });
  }, [logs, routeFilter, appFilter]);

  const handleClear = () => {
    clearCrashLogs();
    refreshLogs();
  };

  const handleExport = async () => {
    const data = exportCrashLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crash-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    try {
      await navigator.clipboard?.writeText(data);
      setExportStatus('Exported and copied to clipboard.');
    } catch (error) {
      setExportStatus('Exported crash logs. Clipboard copy unavailable.');
    }
  };

  const handleImportRequest = () => {
    fileInputRef.current?.click();
  };

  const handleImport: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        setErrorMessage(null);
        importCrashLogs(String(reader.result));
        refreshLogs();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to import crash logs.');
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      setErrorMessage('Unable to read crash log file.');
      event.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleRemove = (id: string) => {
    removeCrashLog(id);
    refreshLogs();
  };

  return (
    <div className="space-y-4 rounded-lg border border-white/20 bg-black/60 p-4 text-white">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Crash log viewer</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshLogs}
            className="rounded border border-white/30 px-3 py-1 text-sm hover:bg-white/10"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded border border-white/30 px-3 py-1 text-sm hover:bg-white/10"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleImportRequest}
            className="rounded border border-white/30 px-3 py-1 text-sm hover:bg-white/10"
          >
            Import
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded border border-red-500 px-3 py-1 text-sm text-red-300 hover:bg-red-500/20"
          >
            Clear all
          </button>
        </div>
      </header>

      <section className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span>Route</span>
          <select
            className="rounded border border-white/20 bg-black/60 px-2 py-1 text-sm"
            value={routeFilter}
            onChange={(event) => setRouteFilter(event.target.value)}
          >
            {routeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span>App</span>
          <select
            className="rounded border border-white/20 bg-black/60 px-2 py-1 text-sm"
            value={appFilter}
            onChange={(event) => setAppFilter(event.target.value)}
          >
            {appOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {errorMessage && (
        <p role="alert" className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      )}

      {exportStatus && (
        <p className="rounded border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {exportStatus}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />

      <div className="max-h-96 overflow-auto rounded border border-white/10">
        {filteredLogs.length === 0 ? (
          <p className="p-4 text-sm text-white/70">No crash logs captured yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 uppercase text-xs text-white/60">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">App</th>
                <th className="px-3 py-2">State hash</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="odd:bg-white/5">
                  <td className="align-top px-3 py-2 font-mono text-xs text-white/80">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="align-top px-3 py-2">
                    <div className="max-w-xs truncate" title={log.route}>
                      {log.route || '—'}
                    </div>
                  </td>
                  <td className="align-top px-3 py-2">{log.appId ?? '—'}</td>
                  <td className="align-top px-3 py-2 font-mono text-xs">{log.stateHash}</td>
                  <td className="align-top px-3 py-2">
                    <details>
                      <summary className="cursor-pointer text-white/80 hover:text-white">{log.message}</summary>
                      {log.stack && (
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/70 p-2 text-xs text-white/70">
                          {log.stack}
                        </pre>
                      )}
                      {log.componentStack && (
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/70 p-2 text-xs text-white/70">
                          {log.componentStack}
                        </pre>
                      )}
                    </details>
                  </td>
                  <td className="align-top px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleRemove(log.id)}
                      className="rounded border border-white/30 px-2 py-1 text-xs hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CrashLogViewer;

