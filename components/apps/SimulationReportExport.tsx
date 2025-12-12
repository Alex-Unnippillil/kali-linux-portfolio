import React, { useEffect, useMemo, useState } from 'react';
import { clearSimulationLog, getSimulationLog } from '../../utils/simulationLog';
import type { SimulationLogEntry } from '../../types/simulationLog';

interface SimulationReportExportProps {
  dense?: boolean;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
};

const SimulationReportExport: React.FC<SimulationReportExportProps> = ({ dense = false }) => {
  const [entries, setEntries] = useState<SimulationLogEntry[]>([]);

  useEffect(() => {
    setEntries(getSimulationLog());
    const handler = () => setEntries(getSimulationLog());
    if (typeof window !== 'undefined') {
      window.addEventListener('simulation-log-updated', handler);
      return () => window.removeEventListener('simulation-log-updated', handler);
    }
    return () => {};
  }, []);

  const summary = useMemo(() => {
    const byTool = entries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.tool] = (acc[entry.tool] || 0) + 1;
      return acc;
    }, {});
    return byTool;
  }, [entries]);

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulation-report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPrintable = () => {
    const rows = entries
      .map(
        (entry) =>
          `<tr><td>${entry.tool}</td><td>${formatDate(entry.timestamp)}</td><td>${entry.title}</td><td>${entry.summary}</td></tr>`
      )
      .join('');
    const printable = `<!doctype html><html><head><title>Simulation Report</title><style>body{font-family:Inter,system-ui,sans-serif;background:#111;color:#eee;padding:16px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #333;padding:6px;font-size:13px;}</style></head><body><h1>Simulation Report (Deterministic)</h1><p>Save or print this page as a PDF to attach to demos.</p><table><thead><tr><th>Tool</th><th>Timestamp</th><th>Title</th><th>Summary</th></tr></thead><tbody>${rows ||
      '<tr><td colspan="4">No entries recorded yet.</td></tr>'}</tbody></table></body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(printable);
    win.document.close();
    win.focus();
    win.print();
  };

  const reset = () => {
    clearSimulationLog();
    setEntries([]);
  };

  return (
    <div
      className={`mt-4 rounded-md border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,var(--kali-overlay)_10%)] ${
        dense ? 'p-2 text-xs' : 'p-3 text-sm'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold text-[color:var(--color-text)]">Export simulation report</p>
          <p className="text-[color:var(--color-muted)]">
            {entries.length ? `${entries.length} entries captured across tools.` : 'Logs remain local until you export them.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadJson}
            className="rounded border border-kali-border/70 bg-[color:var(--kali-panel)] px-3 py-1 font-semibold text-[color:var(--color-text)] shadow-sm transition hover:border-kali-accent/60 hover:text-kali-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={openPrintable}
            className="rounded border border-kali-accent/70 bg-kali-accent/20 px-3 py-1 font-semibold text-white shadow-sm transition hover:bg-kali-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
          >
            Print/PDF
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded border border-kali-border/70 bg-[color:var(--kali-panel)] px-3 py-1 font-semibold text-[color:var(--color-text)] shadow-sm transition hover:border-red-400 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
          >
            Clear
          </button>
        </div>
      </div>
      {!dense && entries.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--color-muted)] sm:grid-cols-3 md:grid-cols-4">
          {Object.entries(summary).map(([tool, count]) => (
            <div key={tool} className="rounded bg-[color:color-mix(in_srgb,var(--kali-overlay)_65%,transparent)] px-2 py-1">
              <span className="font-semibold text-[color:var(--color-text)]">{tool}</span>: {count} entr{count === 1 ? 'y' : 'ies'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SimulationReportExport;
