'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toPng } from 'html-to-image';
import TrendChart from './components/TrendChart';
import SummaryDashboard from './components/SummaryDashboard';
import FindingCard from './components/FindingCard';
import FiltersDrawer from './components/FiltersDrawer';
import { Plugin, Severity, Scan, Finding, severities } from './types';

const Nessus: React.FC = () => {
  const router = useRouter();
  const hydratedFromQuery = useRef(false);
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
  const [page, setPage] = useState(1);
  const [pluginsLoaded, setPluginsLoaded] = useState(false);

  const buildSeverityState = (enabled: Severity[]) =>
    severities.reduce(
      (acc, sev) => ({
        ...acc,
        [sev]: enabled.includes(sev),
      }),
      {} as Record<Severity, boolean>,
    );

  const getSingleValue = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) return value[0];
    return value;
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nessus/plugins.json');
        const json: Plugin[] = await res.json();
        if (!active) return;
        setPlugins(json);
        const tagSet = new Set<string>();
        for (const p of json) {
          p.tags?.forEach((t) => tagSet.add(t));
        }
        setTags(Array.from(tagSet));
      } catch {
        // ignore fetch errors
      } finally {
        if (active) {
          setPluginsLoaded(true);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
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

  const toggleSeverity = (sev: Severity) => {
    setSeverityFilters((f) => ({ ...f, [sev]: !f[sev] }));
    setPage(1);
  };

  const toggleTag = (tag: string) => {
    setTagFilters((t) =>
      t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag],
    );
    setPage(1);
  };

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
    if (!router.isReady || hydratedFromQuery.current) return;

    const severityParam = getSingleValue(router.query.sev);
    if (typeof severityParam === 'string') {
      const requested = Array.from(
        new Set(
          severityParam
            .split(',')
            .map((s) => s.trim())
            .filter((s): s is Severity => severities.includes(s as Severity)),
        ),
      );
      if (requested.length > 0 && requested.length <= severities.length) {
        setSeverityFilters(buildSeverityState(requested));
      }
    }

    const tagParam = getSingleValue(router.query.tags);
    if (typeof tagParam === 'string') {
      const parsedTags = Array.from(
        new Set(
          tagParam
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      );
      if (parsedTags.length > 0) {
        setTagFilters(parsedTags);
      }
    }

    const pageParam = getSingleValue(router.query.page);
    if (typeof pageParam === 'string') {
      const parsed = Number.parseInt(pageParam, 10);
      if (!Number.isNaN(parsed) && parsed > 1) {
        setPage(parsed);
      }
    }

    hydratedFromQuery.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    if (!hydratedFromQuery.current) return;
    const params = new URLSearchParams();
    const activeSeverities = severities.filter((sev) => severityFilters[sev]);
    if (activeSeverities.length > 0 && activeSeverities.length < severities.length) {
      params.set('sev', activeSeverities.join(','));
    }
    if (tagFilters.length > 0) {
      const sortedTags = [...new Set(tagFilters)].sort();
      params.set('tags', sortedTags.join(','));
    }
    if (page > 1) {
      params.set('page', String(page));
    }
    const qs = params.toString();
    const url = qs ? `${router.pathname}?${qs}` : router.pathname;
    router.replace(url, undefined, { shallow: true });
  }, [page, router, severityFilters, tagFilters]);

  const visibleCount = page * PAGE_SIZE;

  useEffect(() => {
    if (!pluginsLoaded) return;
    const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE) || 1);
    setPage((current) => Math.min(current, maxPage));
  }, [filtered.length, pluginsLoaded]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (visibleCount < filtered.length && el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      setPage((current) => current + 1);
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
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-400">
            Simulated vulnerability scanner
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Nessus Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Explore curated scan data, triage actions, and remediation guidance in a focused analyst workspace.
          </p>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Plugin feed</h2>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-400/70 hover:bg-slate-900 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400/80" aria-hidden />
              Filters
            </button>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
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
              <div className="border-t border-slate-800/60 px-6 py-3 text-center text-xs uppercase tracking-wider text-slate-500">
                Scroll to load more findings
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Scan comparison</h2>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Latest import vs. baseline
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {diff.changed.length > 0 && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/5 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-200">
                  Severity shifts
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-amber-100">
                  {diff.changed.map((c) => (
                    <li key={c.plugin} className="flex items-center justify-between gap-3 rounded-lg bg-amber-500/10 px-3 py-2">
                      <span className="font-mono text-xs text-amber-200">#{c.plugin}</span>
                      <span className="text-right text-xs">
                        {c.from} → <span className="font-semibold text-amber-100">{c.to}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.added.length > 0 && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-rose-200">
                  Newly detected
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-rose-100">
                  {diff.added.map((f) => (
                    <li key={f.plugin} className="flex items-center justify-between gap-3 rounded-lg bg-rose-500/10 px-3 py-2">
                      <span className="font-mono text-xs text-rose-200">#{f.plugin}</span>
                      <span className="text-right text-xs font-semibold text-rose-100">{f.severity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.removed.length > 0 && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                  Resolved findings
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-emerald-100">
                  {diff.removed.map((f) => (
                    <li key={f.plugin} className="flex items-center justify-between gap-3 rounded-lg bg-emerald-500/10 px-3 py-2">
                      <span className="font-mono text-xs text-emerald-200">#{f.plugin}</span>
                      <span className="text-right text-xs font-semibold text-emerald-100">Cleared</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.changed.length === 0 && diff.added.length === 0 && diff.removed.length === 0 && (
              <p className="text-sm text-slate-400">
                No differences detected between the two reference scans.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Executive summary</h2>
            <button
              type="button"
              onClick={exportChart}
              className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden />
              Export dashboard
            </button>
          </div>
          <div ref={chartRef} className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
            <SummaryDashboard summary={summary} trend={trend} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
          <h2 className="text-xl font-semibold text-white">Trends</h2>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
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
