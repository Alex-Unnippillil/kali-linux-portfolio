'use client';

import React, {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { toPng } from 'html-to-image';
import TrendChart from './components/TrendChart';
import SummaryDashboard from './components/SummaryDashboard';
import FindingCard from './components/FindingCard';
import FiltersDrawer from './components/FiltersDrawer';
import { Plugin, Severity, Scan, Finding, severities } from './types';
import SuspenseGate from '../shared/SuspenseGate';
import {
  PluginListSkeleton,
  SummarySkeleton,
  TrendSkeleton,
} from './components/LoadingSkeletons';

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
  const [loadingPlugins, setLoadingPlugins] = useState(true);
  const [loadingScans, setLoadingScans] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    setLoadingPlugins(true);
    startTransition(() => {
      fetch('/demo-data/nessus/plugins.json')
        .then((res) => res.json())
        .then((json: Plugin[]) => {
          if (!active) return;
          setPlugins(json);
          const tagSet = new Set<string>();
          for (const p of json) {
            p.tags?.forEach((t) => tagSet.add(t));
          }
          setTags(Array.from(tagSet));
          setFeedError(null);
        })
        .catch(() => {
          if (!active) return;
          setFeedError(
            'Nessus plugin feed is unavailable offline. Cached results will be used when possible.'
          );
          setPlugins([]);
          setTags([]);
        })
        .finally(() => {
          if (active) {
            setLoadingPlugins(false);
          }
        });
    });
    return () => {
      active = false;
    };
  }, [startTransition]);

  useEffect(() => {
    let active = true;
    setLoadingScans(true);
    startTransition(() => {
      Promise.all([
        fetch('/demo-data/nessus/scanA.json').then((r) => r.json()),
        fetch('/demo-data/nessus/scanB.json').then((r) => r.json()),
      ])
        .then(([a, b]) => {
          if (!active) return;
          compareScans(a, b);
          setScanError(null);
        })
        .catch(() => {
          if (!active) return;
          setScanError(
            'Scan comparison fixtures failed to load offline. Use saved exports or retry when online.'
          );
          setDiff({ added: [], removed: [], changed: [] });
          setSummary({
            Critical: 0,
            High: 0,
            Medium: 0,
            Low: 0,
            Info: 0,
          });
          setTrend([]);
        })
        .finally(() => {
          if (active) {
            setLoadingScans(false);
          }
        });
    });
    return () => {
      active = false;
    };
  }, [startTransition]);

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

  const loadingFeed = loadingPlugins || pending;
  const loadingSummary = loadingScans || pending;
  const activeError = feedError || scanError;

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-6">
      <h1 className="text-2xl">Nessus Demo</h1>
      {activeError && (
        <p className="text-sm text-amber-300" role="status" aria-live="polite">
          {activeError}
        </p>
      )}

      <section>
        <h2 className="text-xl mb-2">Plugin Feed</h2>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mb-4 px-3 py-1 bg-gray-700 rounded"
        >
          Filters
        </button>
        <ul
          ref={listRef}
          onScroll={handleScroll}
          className="space-y-2 max-h-96 overflow-auto"
        >
          <Suspense fallback={<PluginListSkeleton count={visibleCount} />}>
            <SuspenseGate active={loadingFeed}>
              {filtered.slice(0, visibleCount).map((p) => (
                <li key={p.id}>
                  <FindingCard plugin={p} />
                </li>
              ))}
              {filtered.length === 0 && !loadingFeed && (
                <li className="text-sm text-gray-400">No plugins available. Load fixtures when back online.</li>
              )}
            </SuspenseGate>
          </Suspense>
        </ul>
        {visibleCount < filtered.length && (
          <div className="mt-2 text-center text-sm text-gray-400">
            Scroll to load more...
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl mb-2">Scan Comparison</h2>
        <Suspense fallback={<SummarySkeleton />}>
          <SuspenseGate active={loadingSummary}>
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
              {diff.added.length === 0 &&
                diff.removed.length === 0 &&
                diff.changed.length === 0 &&
                !loadingSummary && (
                  <p className="text-sm text-gray-400">No recent changes detected.</p>
                )}
            </div>
          </SuspenseGate>
        </Suspense>
      </section>

      <section>
        <h2 className="text-xl mb-2">Executive Summary</h2>
        <Suspense fallback={<SummarySkeleton />}>
          <SuspenseGate active={loadingSummary}>
            <div ref={chartRef}>
              <SummaryDashboard summary={summary} trend={trend} />
            </div>
          </SuspenseGate>
        </Suspense>
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
        <Suspense fallback={<TrendSkeleton />}>
          <SuspenseGate active={loadingSummary}>
            <TrendChart />
          </SuspenseGate>
        </Suspense>
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
  );
};

export default Nessus;
