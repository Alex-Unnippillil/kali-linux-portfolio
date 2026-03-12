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

const severityPalette: Record<Severity, string> = {
  Critical: 'var(--color-severity-critical)',
  High: 'var(--color-severity-high)',
  Medium: 'var(--color-severity-medium)',
  Low: 'var(--color-severity-low)',
  Info: 'color-mix(in srgb, var(--color-text) 35%, transparent)',
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
            stroke={severityPalette[sev]}
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
          className="block w-full max-w-xs cursor-pointer rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent)] px-3 py-2 text-sm text-[color:color-mix(in_srgb,var(--color-text)_90%,transparent)] file:mr-3 file:rounded-md file:border-0 file:bg-[color:color-mix(in_srgb,var(--color-accent)_90%,transparent)] file:px-3 file:py-1 file:text-sm file:font-semibold file:text-kali-inverse hover:border-[color:var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
        />
        {hasHistory && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,var(--color-severity-critical)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,var(--color-severity-critical)_15%)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_92%,transparent)] transition hover:border-[color:var(--color-severity-critical)] hover:text-[color:var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-severity-critical)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
          >
            Clear history
          </button>
        )}
      </div>

      {!hasHistory && (
        <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
          Import previous scan JSON exports to visualise how severity counts evolve between assessments.
        </p>
      )}

      {hasHistory && (
        <div className="space-y-6 rounded-xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-4 shadow-inner shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_80%,transparent)]">
                Severity trendlines
              </h3>
              <p className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                Overlay of findings per severity across imported reports.
              </p>
            </div>
            <ul className="flex flex-wrap items-center gap-3 text-xs text-[color:color-mix(in_srgb,var(--color-text)_80%,transparent)]">
              {severities.map((sev) => (
                <li key={sev} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: severityPalette[sev] }}
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
              className="min-w-[20rem] rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,transparent)]"
              role="img"
              aria-label="Trend lines showing findings per severity"
            >
              {lines}
            </svg>
          </div>

          {latest && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                <span>Most recent import</span>
                <span className="font-semibold text-[color:color-mix(in_srgb,var(--color-text)_90%,transparent)]">{latest.label}</span>
              </div>
              <div className="overflow-x-auto">
                <svg
                  width={width}
                  height={height}
                  className="min-w-[20rem] rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,transparent)]"
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
                          fill={severityPalette[sev]}
                          rx={4}
                        />
                        <text
                          x={x + barWidth / 2}
                          y={height - 6}
                          textAnchor="middle"
                          className="fill-[color:color-mix(in_srgb,var(--color-text)_85%,transparent)] text-[11px] font-medium"
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
