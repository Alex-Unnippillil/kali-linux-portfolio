import React, { useCallback } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

const severities = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;
type Severity = (typeof severities)[number];

interface Finding {
  severity: Severity;
}

interface Scan {
  findings: Finding[];
}

interface Entry {
  label: string;
  counts: Record<Severity, number>;
}

const colors: Record<Severity, string> = {
  Critical: '#dc2626',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#16a34a',
  Info: '#6b7280',
};

export default function TrendChart() {
  const [history, setHistory, , clear] = usePersistentState<Entry[]>(
    'nessus:history',
    [],
  );

  const importReport = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json: Scan = JSON.parse(reader.result as string);
          const counts: Record<Severity, number> = {
            Critical: 0,
            High: 0,
            Medium: 0,
            Low: 0,
            Info: 0,
          };
          for (const f of json.findings) {
            counts[f.severity] += 1;
          }
          setHistory((h) => [...h, { label: file.name, counts }]);
        } catch {
          // ignore parse errors
        }
      };
      reader.readAsText(file);
    },
    [setHistory],
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importReport(file);
    e.target.value = '';
  };

  const max = Math.max(
    1,
    ...history.flatMap((h) => Object.values(h.counts)),
  );
  const width = 360;
  const height = 160;
  const step = history.length > 1 ? width / (history.length - 1) : width;

  const lines = history.length
    ? severities.map((sev) => {
        const d = history
          .map((h, i) => {
            const x = i * step;
            const y = height - (h.counts[sev] / max) * height;
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
          })
          .join(' ');
        return (
          <path
            key={sev}
            d={d}
            fill="none"
            stroke={colors[sev]}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })
    : null;

  const latest = history[history.length - 1];
  const hasHistory = history.length > 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="nessus-trend-upload"
          className="sr-only"
          id="nessus-trend-upload-label"
        >
          Upload history JSON
        </label>
        <input
          id="nessus-trend-upload"
          type="file"
          accept="application/json"
          onChange={handleFile}
          aria-labelledby="nessus-trend-upload-label"
          className="block w-full max-w-xs cursor-pointer rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-sky-500/90 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-slate-900 hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        />
        {hasHistory && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-800/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-red-400/70 hover:text-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Clear history
          </button>
        )}
      </div>

      {!hasHistory && (
        <p className="text-sm text-slate-400">
          Import previous scan JSON exports to visualise how severity counts evolve between assessments.
        </p>
      )}

      {hasHistory && (
        <div className="space-y-6 rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-inner shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Severity trendlines
              </h3>
              <p className="text-xs text-slate-500">
                Overlay of findings per severity across imported reports.
              </p>
            </div>
            <ul className="flex flex-wrap items-center gap-3 text-xs">
              {severities.map((sev) => (
                <li key={sev} className="flex items-center gap-1 text-slate-300">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colors[sev] }}
                  />
                  <span className="uppercase tracking-wide">{sev}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-x-auto">
            <svg
              width={width}
              height={height}
              className="min-w-[20rem] rounded-lg bg-slate-950/60"
              role="img"
              aria-label="Trend lines showing findings per severity"
            >
              {lines}
            </svg>
          </div>

          {latest && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>Most recent import</span>
                <span className="font-semibold text-slate-200">{latest.label}</span>
              </div>
              <div className="overflow-x-auto">
                <svg
                  width={width}
                  height={height}
                  className="min-w-[20rem] rounded-lg bg-slate-950/60"
                  role="img"
                  aria-label="Bar chart of latest severity distribution"
                >
                  {severities.map((sev, i) => {
                    const barWidth = width / severities.length - 12;
                    const x = i * (barWidth + 12);
                    const barHeight = (latest.counts[sev] / max) * height;
                    const y = height - barHeight;
                    return (
                      <g key={sev}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight || 2}
                          fill={colors[sev]}
                          rx={4}
                        />
                        <text
                          x={x + barWidth / 2}
                          y={height - 6}
                          textAnchor="middle"
                          className="fill-slate-300 text-[11px] font-medium"
                        >
                          {latest.counts[sev]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
