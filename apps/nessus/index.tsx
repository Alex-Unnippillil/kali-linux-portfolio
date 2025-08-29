'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import TrendChart from './components/TrendChart';

interface Plugin {
  id: number;
  name: string;
  severity: Severity;
}

interface Finding {
  plugin: number;
  severity: Severity;
}

interface Scan {
  findings: Finding[];
}

const severities = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;
type Severity = (typeof severities)[number];

const Nessus: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [filters, setFilters] = useState<Record<Severity, boolean>>({
    Critical: true,
    High: true,
    Medium: true,
    Low: true,
    Info: true,
  });
  const [diff, setDiff] = useState({
    added: [] as Finding[],
    removed: [] as Finding[],
    changed: [] as { plugin: number; from: Severity; to: Severity }[],
  });
  const [summary, setSummary] = useState<Record<Severity, number>>({
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
    Info: 0,
  });
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nessus/plugins.json');
        const json = await res.json();
        setPlugins(json);
      } catch {
        // ignore fetch errors
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadScans = async () => {
      try {
        const [a, b] = await Promise.all([
          fetch('/demo-data/nessus/scanA.json').then((r) => r.json()),
          fetch('/demo-data/nessus/scanB.json').then((r) => r.json()),
        ]);
        compareScans(a, b);
      } catch {
        // ignore
      }
    };
    loadScans();
  }, []);

  const compareScans = (a: Scan, b: Scan) => {
    const mapA = new Map(a.findings.map((f) => [f.plugin, f.severity] as const));
    const mapB = new Map(b.findings.map((f) => [f.plugin, f.severity] as const));
    const added: Finding[] = [];
    const removed: Finding[] = [];
    const changed: { plugin: number; from: Severity; to: Severity }[] = [];

    for (const [plugin, sevA] of mapA) {
      const sevB = mapB.get(plugin);
      if (!sevB) {
        removed.push({ plugin, severity: sevA });
      } else if (sevB !== sevA) {
        changed.push({ plugin, from: sevA, to: sevB });
      }
    }
    for (const [plugin, sevB] of mapB) {
      if (!mapA.has(plugin)) {
        added.push({ plugin, severity: sevB });
      }
    }
    setDiff({ added, removed, changed });

    const counts: Record<Severity, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Info: 0,
    };
    for (const sev of mapB.values()) {
      counts[sev] += 1;
    }
    setSummary(counts);
  };

  const toggle = (sev: Severity) =>
    setFilters((f) => ({ ...f, [sev]: !f[sev] }));

  const filtered = plugins.filter((p) => filters[p.severity]);

  const exportChart = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current);
      const link = document.createElement('a');
      link.download = 'nessus-summary.png';
      link.href = dataUrl;
      link.click();
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-6">
      <h1 className="text-2xl">Nessus Demo</h1>

      <section>
        <h2 className="text-xl mb-2">Plugin Feed</h2>
        <div className="mb-4 flex gap-2 flex-wrap">
          {severities.map((sev) => (
            <label key={sev} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters[sev]}
                onChange={() => toggle(sev)}
              />
              {sev}
            </label>
          ))}
        </div>
        <ul className="space-y-1">
          {filtered.map((p) => (
            <li key={p.id} className="border-b border-gray-700 pb-1">
              <span className="font-mono">{p.id}</span>: {p.name} - {p.severity}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl mb-2">Scan Comparison</h2>
        <div className="mb-2">
          {diff.changed.map((c) => (
            <div key={c.plugin}>
              Plugin {c.plugin} severity changed from {c.from} to {c.to}
            </div>
          ))}
          {diff.added.map((f) => (
            <div key={f.plugin}>Plugin {f.plugin} new ({f.severity})</div>
          ))}
          {diff.removed.map((f) => (
            <div key={f.plugin}>Plugin {f.plugin} resolved</div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-2">Executive Summary</h2>
        <div ref={chartRef} className="space-y-2">
          {severities.map((sev) => (
            <div key={sev} className="flex items-center gap-2">
              <span className="w-24">{sev}</span>
              <div className="flex-1 bg-gray-700 h-4">
                <div
                  className="bg-blue-500 h-4"
                  style={{ width: `${summary[sev] * 30}px` }}
                />
              </div>
              <span className="w-6 text-right">{summary[sev]}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={exportChart}
          className="mt-4 px-4 py-2 bg-blue-700 rounded"
        >
          Export
        </button>
      </section>
      <section>
        <h2 className="text-xl mb-2">Trends</h2>
        <TrendChart />
      </section>
    </div>
  );
};

export default Nessus;
