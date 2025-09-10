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
  const width = 300;
  const height = 120;
  const step = history.length > 1 ? width / (history.length - 1) : width;

  const lines = severities.map((sev) => {
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
        strokeWidth={2}
      />
    );
  });

  const latest = history[history.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input type="file" accept="application/json" onChange={handleFile} />
        {history.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            Clear
          </button>
        )}
      </div>
      {history.length > 0 && (
        <>
          <svg
            width={width}
            height={height}
            className="bg-gray-800 rounded"
          >
            {lines}
          </svg>
          {latest && (
            <svg
              width={width}
              height={height}
              className="bg-gray-800 rounded"
            >
              {severities.map((sev, i) => {
                const barWidth = width / severities.length - 4;
                const x = i * (barWidth + 4);
                const barHeight = ((latest?.counts[sev] ?? 0) / max) * height;
                const y = height - barHeight;
                return (
                  <rect
                    key={sev}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={colors[sev]}
                  />
                );
              })}
            </svg>
          )}
        </>
      )}
    </div>
  );
}

