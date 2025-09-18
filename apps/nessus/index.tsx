'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import TrendChart from './components/TrendChart';
import SummaryDashboard from './components/SummaryDashboard';
import FindingCard from './components/FindingCard';
import FiltersDrawer from './components/FiltersDrawer';
import { Plugin, Severity, Scan, Finding, severities } from './types';

const makeEmptySummary = () =>
  severities.reduce(
    (acc, sev) => ({ ...acc, [sev]: 0 }),
    {} as Record<Severity, number>,
  );

const DEFAULT_REQUEST_TARGET = 120;
const REQUEST_INCREMENT = 8;
const DEFAULT_ETA_SECONDS = 180;
const ETA_DECREMENT = 5;
const isSimEnvironment = process.env.NODE_ENV !== 'production';

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
  const [requestsSent, setRequestsSent] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(
    isSimEnvironment ? DEFAULT_ETA_SECONDS : null,
  );
  const [simSummary, setSimSummary] = useState<Record<Severity, number>>(makeEmptySummary);
  const [simulationActive, setSimulationActive] = useState(isSimEnvironment);
  const summaryTargetRef = useRef<Record<Severity, number>>(makeEmptySummary());
  const requestsTargetRef = useRef(DEFAULT_REQUEST_TARGET);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simSummaryRef = useRef(simSummary);
  const requestsRef = useRef(requestsSent);
  const etaRef = useRef(etaSeconds);
  const userPausedRef = useRef(false);

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

  useEffect(() => {
    summaryTargetRef.current = summary;
    const total = Object.values(summary).reduce((acc, val) => acc + val, 0);
    requestsTargetRef.current = Math.max(DEFAULT_REQUEST_TARGET, total * 4);
    if (isSimEnvironment && !userPausedRef.current) {
      setSimSummary(makeEmptySummary());
      setRequestsSent(0);
      setEtaSeconds(DEFAULT_ETA_SECONDS);
      setSimulationActive(true);
    }
  }, [summary]);

  useEffect(() => {
    simSummaryRef.current = simSummary;
  }, [simSummary]);

  useEffect(() => {
    requestsRef.current = requestsSent;
  }, [requestsSent]);

  useEffect(() => {
    etaRef.current = etaSeconds;
  }, [etaSeconds]);

  useEffect(() => {
    if (!isSimEnvironment || !simulationActive) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    tickRef.current = setInterval(() => {
      let updatedSummary = simSummaryRef.current;
      setSimSummary((prev) => {
        const target = summaryTargetRef.current;
        const next = { ...prev };
        let changed = false;
        for (const sev of severities) {
          const current = prev[sev] ?? 0;
          const goal = target[sev] ?? 0;
          if (current < goal) {
            next[sev] = Math.min(goal, current + 1);
            changed = true;
            break;
          }
        }
        updatedSummary = changed ? next : prev;
        return changed ? next : prev;
      });

      let updatedRequests = requestsRef.current;
      setRequestsSent((prev) => {
        const next = Math.min(requestsTargetRef.current, prev + REQUEST_INCREMENT);
        updatedRequests = next;
        return next;
      });

      let updatedEta = etaRef.current;
      setEtaSeconds((prev) => {
        if (prev == null) return null;
        const next = prev > 0 ? Math.max(0, prev - ETA_DECREMENT) : 0;
        updatedEta = next;
        return next;
      });

      const target = summaryTargetRef.current;
      const summaryReached = severities.every(
        (sev) => (updatedSummary[sev] ?? 0) >= (target[sev] ?? 0),
      );
      const requestsReached = updatedRequests >= requestsTargetRef.current;
      const etaElapsed = updatedEta !== null && updatedEta <= 0;

      if (summaryReached && requestsReached && etaElapsed) {
        userPausedRef.current = true;
        setSimulationActive(false);
      }
    }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [simulationActive]);

  useEffect(() => () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const pauseSimulation = () => {
    userPausedRef.current = true;
    setSimulationActive(false);
  };

  const resumeSimulation = () => {
    const target = summaryTargetRef.current;
    const summaryReached = severities.every(
      (sev) => (simSummaryRef.current[sev] ?? 0) >= (target[sev] ?? 0),
    );
    const requestsReached = requestsRef.current >= requestsTargetRef.current;
    const etaElapsed = etaRef.current !== null && etaRef.current <= 0;

    if (summaryReached && requestsReached && etaElapsed) {
      setSimSummary(makeEmptySummary());
      setRequestsSent(0);
      setEtaSeconds(DEFAULT_ETA_SECONDS);
    } else if (etaRef.current == null) {
      setEtaSeconds(DEFAULT_ETA_SECONDS);
    }

    userPausedRef.current = false;
    setSimulationActive(true);
  };

  const formatEta = (seconds: number | null) => {
    if (seconds == null) return '—';
    if (seconds <= 0) return 'Complete';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayedSummary = isSimEnvironment ? simSummary : summary;

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
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-6">
      <h1 className="text-2xl">Nessus Demo</h1>

      <section className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">
              Requests Sent
            </div>
            <div
              data-testid="nessus-requests-value"
              className="text-3xl font-mono"
            >
              {isSimEnvironment ? requestsSent : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">ETA</div>
            <div className="text-3xl font-mono">{formatEta(etaSeconds)}</div>
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">
              Findings by Severity
            </div>
            <div className="flex flex-wrap gap-2">
              {severities.map((sev) => (
                <span
                  key={sev}
                  className="px-3 py-1 rounded-full bg-gray-700 text-sm font-mono"
                >
                  {sev}: {displayedSummary[sev]}
                </span>
              ))}
            </div>
          </div>
          {isSimEnvironment && (
            <div className="flex gap-2 ml-auto">
              {simulationActive ? (
                <button
                  type="button"
                  data-testid="nessus-pause"
                  onClick={pauseSimulation}
                  className="px-3 py-1 rounded bg-yellow-500 text-black"
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="nessus-resume"
                  onClick={resumeSimulation}
                  className="px-3 py-1 rounded bg-green-500 text-black"
                >
                  Resume
                </button>
              )}
            </div>
          )}
        </div>
      </section>

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
          {filtered.slice(0, visibleCount).map((p) => (
            <li key={p.id}>
              <FindingCard plugin={p} />
            </li>
          ))}
        </ul>
        {visibleCount < filtered.length && (
          <div className="mt-2 text-center text-sm text-gray-400">
            Scroll to load more...
          </div>
        )}
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
        <div ref={chartRef}>
          <SummaryDashboard summary={summary} trend={trend} />
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
