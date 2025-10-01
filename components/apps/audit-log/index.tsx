'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAuditLog,
  exportAuditLog,
  importAuditLog,
  verifyAuditLog,
  AuditLogEntry,
  AuditIntegrityReport,
} from '../../../utils/auditLog';
import { useSettings } from '../../../hooks/useSettings';

const formatTimestamp = (value: string) => {
  try {
    const date = new Date(value);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } catch {
    return value;
  }
};

const AuditLogViewer: React.FC = () => {
  const { auditLogEnabled, setAuditLogEnabled } = useSettings();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AuditIntegrityReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setStatus(null);
    setReport(null);
    const log = await getAuditLog();
    const sorted = [...log].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    setEntries(sorted);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleExport = useCallback(async () => {
    try {
      const data = await exportAuditLog();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus('Audit log exported. Keep the file secure.');
      setError(null);
    } catch (err) {
      setError('Unable to export audit log.');
      console.error(err);
    }
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = await importAuditLog(text);
        if (result.success) {
          setStatus(`Imported ${result.importedCount} entries.`);
          setError(null);
          setReport(result.report);
          await refresh();
        } else {
          setStatus(null);
          setReport(result.report);
          setError(result.error || 'Import failed.');
        }
      } catch (err) {
        setStatus(null);
        setError('Import failed.');
        console.error(err);
      } finally {
        event.target.value = '';
      }
    },
    [refresh],
  );

  const handleVerify = useCallback(async () => {
    const result = await verifyAuditLog();
    setReport(result);
    if (result.valid) {
      setStatus('Integrity check passed.');
      setError(null);
    } else {
      setStatus(null);
      setError('Integrity issues detected. Review the entries below.');
    }
  }, []);

  return (
    <div className="flex h-full flex-col bg-ub-dark text-white">
      <div className="border-b border-black/40 p-4">
        <h1 className="text-lg font-semibold">Audit Log Viewer</h1>
        <p className="mt-1 text-xs text-ubt-grey">
          Audit events remain local to this device. Enable logging to record actions, export for offline backup, and import
          verified bundles when restoring.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setAuditLogEnabled(!auditLogEnabled)}
            className={`rounded px-2 py-1 ${
              auditLogEnabled ? 'bg-ub-green text-black' : 'bg-ub-cool-grey text-white'
            }`}
          >
            {auditLogEnabled ? 'Logging enabled' : 'Enable logging'}
          </button>
          <button onClick={refresh} className="rounded bg-ub-cool-grey px-2 py-1 text-white">
            Refresh
          </button>
          <button onClick={handleVerify} className="rounded bg-ub-orange px-2 py-1 text-black">
            Verify integrity
          </button>
          <button onClick={handleExport} className="rounded bg-ub-orange px-2 py-1 text-black">
            Export
          </button>
          <button onClick={handleImportClick} className="rounded bg-ub-cool-grey px-2 py-1 text-white">
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            aria-label="Import audit log file"
            onChange={handleImport}
          />
        </div>
        <div className="mt-2 space-y-1 text-xs">
          <p className="text-ubt-grey">
            Status: {auditLogEnabled ? 'opt-in active' : 'logging disabled'} · {entries.length} entries recorded
          </p>
          {status && <p className="text-ub-green">{status}</p>}
          {error && <p className="text-red-400">{error}</p>}
          {report && (
            <p className={report.valid ? 'text-ub-green' : 'text-red-400'}>
              {report.valid
                ? 'Log integrity verified.'
                : `Found ${report.issues.length} issue${report.issues.length === 1 ? '' : 's'}.`}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {entries.length === 0 ? (
          <p className="text-sm text-ubt-grey">
            No audit entries yet. Logging begins after you opt in. Actions from utilities and simulations can record context for
            your own lab notes.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded border border-black/30 bg-ub-cool-grey p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ubt-grey">
                  <span>{formatTimestamp(entry.timestamp)}</span>
                  <span className="font-semibold text-white">{entry.actor}</span>
                  <span className="text-ub-yellow">{entry.action}</span>
                  <span className="break-all text-[10px] text-ub-green">
                    hash: {entry.payloadHash}
                  </span>
                </div>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/60 p-2 text-xs text-ubt-grey">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
        {report && !report.valid && report.issues.length > 0 && (
          <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
            <h2 className="mb-2 text-sm font-semibold text-red-300">Integrity issues</h2>
            <ul className="space-y-1">
              {report.issues.map((issue, idx) => (
                <li key={`${issue.index}-${idx}`}>
                  Entry {issue.index + 1}: {issue.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;

