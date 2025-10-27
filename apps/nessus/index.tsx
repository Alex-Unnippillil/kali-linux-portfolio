'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { toPng } from 'html-to-image';
import TrendChart from './components/TrendChart';
import SummaryDashboard from './components/SummaryDashboard';
import FindingCard from './components/FindingCard';
import FiltersDrawer from './components/FiltersDrawer';
import { Plugin, Severity, Scan, Finding, severities } from './types';

const Nessus: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [severityFilters, setSeverityFilters] = useState<Record<Severity, boolean>>({
    Critical: true,
    High: true,
    Medium: true,
    Low: true,
    Info: true,
  });
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const [trend, setTrend] = useState<number[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nessus/plugins.json');
        const json: Plugin[] = await res.json();
        setPlugins(json);
        const tagSet = new Set<string>();
        for (const p of json) {
          p.tags?.forEach((t) => tagSet.add(t));
        }
        setTags(Array.from(tagSet));
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

    const countsA: Record<Severity, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Info: 0,
    };
    for (const sev of mapA.values()) {
      countsA[sev] += 1;
    }
    const countsB: Record<Severity, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Info: 0,
    };
    for (const sev of mapB.values()) {
      countsB[sev] += 1;
    }
    setSummary(countsB);
    setTrend([
      Object.values(countsA).reduce((a, b) => a + b, 0),
      Object.values(countsB).reduce((a, b) => a + b, 0),
    ]);
  };

  const toggleSeverity = (sev: Severity) =>
    setSeverityFilters((f) => ({ ...f, [sev]: !f[sev] }));

  const toggleTag = (tag: string) =>
    setTagFilters((t) =>
      t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag],
    );

  const filtered = useMemo(
    () =>
      plugins.filter(
        (p) =>
          severityFilters[p.severity] &&
          (tagFilters.length === 0 ||
            p.tags?.some((t) => tagFilters.includes(t))),
      ),
    [plugins, severityFilters, tagFilters],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filtered]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
    }
  };

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
    <main className="min-h-screen bg-[color:color-mix(in_srgb,var(--kali-bg)_70%,var(--kali-panel)_30%)] px-4 py-6 text-[color:var(--color-text)] sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--color-accent)]">
            Simulated vulnerability scanner
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--color-text)] sm:text-4xl">
            Nessus Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)]">
            Explore curated scan data, triage actions, and remediation guidance in a focused analyst workspace.
          </p>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-text)]">Plugin feed</h2>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--kali-panel-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_92%,transparent)] transition hover:border-[color:var(--color-accent)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,var(--color-accent)_18%)] hover:text-[color:var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[color:color-mix(in_srgb,var(--color-accent)_85%,transparent)]" aria-hidden />
              Filters
            </button>
          </div>
          <div className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
            <ul
              ref={listRef}
              onScroll={handleScroll}
              className="max-h-[32rem] space-y-3 overflow-y-auto p-4 pr-2 sm:p-6"
              aria-label="Filtered plugin results"
            >
              {filtered.slice(0, visibleCount).map((p) => (
                <li key={p.id}>
                  <FindingCard plugin={p} />
                </li>
              ))}
            </ul>
            {visibleCount < filtered.length && (
              <div className="border-t border-[color:var(--kali-panel-border)] px-6 py-3 text-center text-xs uppercase tracking-wider text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                Scroll to load more findings
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-6 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-text)]">Scan comparison</h2>
            <p className="text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
              Latest import vs. baseline
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {diff.changed.length > 0 && (
              <div
                style={{ '--severity-color': 'var(--color-severity-medium)' } as React.CSSProperties}
                className="rounded-xl border border-[color:color-mix(in_srgb,var(--severity-color)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--severity-color)_12%)] p-4 shadow-[0_25px_60px_rgba(2,6,23,0.45)]"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--severity-color)_68%,var(--color-text)_32%)]">
                  Severity shifts
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-[color:color-mix(in_srgb,var(--severity-color)_55%,var(--color-text)_45%)]">
                  {diff.changed.map((c) => (
                    <li
                      key={c.plugin}
                      className="flex items-center justify-between gap-3 rounded-lg bg-[color:color-mix(in_srgb,var(--severity-color)_24%,var(--kali-panel))] px-3 py-2"
                    >
                      <span className="font-mono text-xs text-[color:color-mix(in_srgb,var(--severity-color)_72%,var(--color-text)_28%)]">#{c.plugin}</span>
                      <span className="text-right text-xs text-[color:color-mix(in_srgb,var(--color-text)_85%,transparent)]">
                        {c.from} →{' '}
                        <span className="font-semibold text-[color:color-mix(in_srgb,var(--severity-color)_65%,var(--color-text)_35%)]">{c.to}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.added.length > 0 && (
              <div
                style={{ '--severity-color': 'var(--color-severity-high)' } as React.CSSProperties}
                className="rounded-xl border border-[color:color-mix(in_srgb,var(--severity-color)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--severity-color)_12%)] p-4 shadow-[0_25px_60px_rgba(2,6,23,0.45)]"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--severity-color)_70%,var(--color-text)_30%)]">
                  Newly detected
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-[color:color-mix(in_srgb,var(--severity-color)_55%,var(--color-text)_45%)]">
                  {diff.added.map((f) => (
                    <li
                      key={f.plugin}
                      className="flex items-center justify-between gap-3 rounded-lg bg-[color:color-mix(in_srgb,var(--severity-color)_24%,var(--kali-panel))] px-3 py-2"
                    >
                      <span className="font-mono text-xs text-[color:color-mix(in_srgb,var(--severity-color)_72%,var(--color-text)_28%)]">#{f.plugin}</span>
                      <span className="text-right text-xs font-semibold text-[color:color-mix(in_srgb,var(--severity-color)_68%,var(--color-text)_32%)]">{f.severity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.removed.length > 0 && (
              <div
                style={{ '--severity-color': 'var(--color-severity-low)' } as React.CSSProperties}
                className="rounded-xl border border-[color:color-mix(in_srgb,var(--severity-color)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--severity-color)_12%)] p-4 shadow-[0_25px_60px_rgba(2,6,23,0.45)]"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--severity-color)_68%,var(--color-text)_32%)]">
                  Resolved findings
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-[color:color-mix(in_srgb,var(--severity-color)_55%,var(--color-text)_45%)]">
                  {diff.removed.map((f) => (
                    <li
                      key={f.plugin}
                      className="flex items-center justify-between gap-3 rounded-lg bg-[color:color-mix(in_srgb,var(--severity-color)_20%,var(--kali-panel))] px-3 py-2"
                    >
                      <span className="font-mono text-xs text-[color:color-mix(in_srgb,var(--severity-color)_72%,var(--color-text)_28%)]">#{f.plugin}</span>
                      <span className="text-right text-xs font-semibold text-[color:color-mix(in_srgb,var(--severity-color)_60%,var(--color-text)_40%)]">Cleared</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.changed.length === 0 && diff.added.length === 0 && diff.removed.length === 0 && (
              <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                No differences detected between the two reference scans.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-text)]">Executive summary</h2>
            <button
              type="button"
              onClick={exportChart}
              className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--color-accent)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,var(--color-accent)_18%)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_90%,transparent)] transition hover:border-[color:var(--color-accent)] hover:bg-[color:color-mix(in_srgb,var(--color-accent)_65%,var(--kali-panel)_35%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-accent)]" aria-hidden />
              Export dashboard
            </button>
          </div>
          <div ref={chartRef} className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-6 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
            <SummaryDashboard summary={summary} trend={trend} />
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-6 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
          <h2 className="text-xl font-semibold text-[color:var(--color-text)]">Trends</h2>
          <p className="mt-1 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
            Upload custom history exports to extend the dataset
          </p>
          <div className="mt-4">
            <TrendChart />
          </div>
        </section>

        <FiltersDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          severityFilters={severityFilters}
          toggleSeverity={toggleSeverity}
          tags={tags}
          tagFilters={tagFilters}
          toggleTag={toggleTag}
        />
      </div>
    </main>
  );
};

export default Nessus;
