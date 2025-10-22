import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import sampleReport from '../../components/apps/nessus/sample-report.json';

const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Info'];

const severityStyles = {
  Critical:
    'border border-rose-500/40 bg-rose-500/10 text-rose-200 shadow-[0_10px_30px_rgba(225,29,72,0.15)]',
  High: 'border border-amber-500/40 bg-amber-500/10 text-amber-200 shadow-[0_10px_30px_rgba(245,158,11,0.12)]',
  Medium:
    'border border-sky-500/40 bg-sky-500/10 text-sky-200 shadow-[0_10px_30px_rgba(14,165,233,0.10)]',
  Low: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 shadow-[0_10px_30px_rgba(16,185,129,0.08)]',
  Info: 'border border-slate-400/20 bg-slate-500/10 text-slate-200 shadow-[0_10px_30px_rgba(148,163,184,0.06)]',
};

const severityAccent = {
  Critical: '#fb7185',
  High: '#fbbf24',
  Medium: '#38bdf8',
  Low: '#34d399',
  Info: '#cbd5f5',
};

const remediationPlaybook = {
  1001: 'Renew the expiring TLS certificate and configure proactive expiry monitoring.',
  1002: 'Restrict SSH cipher suites to modern algorithms and rotate host keys.',
  1003: 'Disable default credentials, enable MFA, and validate access control policies.',
  1004: 'Schedule a patch window for the web server stack and enable auto-update checks.',
  1005: 'Review banner disclosures and limit them to non-sensitive metadata.',
};

const skeletonSlots = ['summary-a', 'summary-b', 'summary-c', 'summary-d'];

const LoadingSkeleton = () => (
  <div className="space-y-4" role="status" aria-live="polite">
    <div className="grid gap-3 sm:grid-cols-2">
      {skeletonSlots.map((slot) => (
        <div
          key={slot}
          className="h-28 rounded-2xl border border-slate-800/60 bg-slate-900/60 motion-safe:animate-pulse"
        />
      ))}
    </div>
    <div className="h-64 rounded-2xl border border-slate-800/60 bg-slate-900/60 motion-safe:animate-pulse" />
  </div>
);

const TrendChart = ({ labels, series }) => {
  if (!series?.length || !labels?.length) {
    return (
      <p className="text-sm text-slate-400">Trend data is not available.</p>
    );
  }

  const valueMax = Math.max(
    1,
    ...series.flatMap((item) => item.values),
  );
  const height = 140;
  const width = 440;
  const paddingY = 18;

  return (
    <figure className="space-y-3" aria-labelledby="nessus-trend-heading">
      <div className="flex items-center justify-between">
        <h3 id="nessus-trend-heading" className="text-lg font-semibold text-white">
          Severity trend
        </h3>
        <div className="flex gap-3 text-xs text-slate-400">
          {series.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <svg
        className="w-full"
        role="img"
        aria-label={`Severity history for ${labels.join(' to ')}`}
        viewBox={`0 0 ${width} ${height}`}
      >
        <desc>
          {series
            .map((s) => `${s.label}: ${s.values.join(' → ')}`)
            .join(' | ')}
        </desc>
        <g>
          {labels.map((label, index) => {
            const x = (index / (labels.length - 1 || 1)) * (width - 24) + 12;
            return (
              <g key={label}>
                <line
                  x1={x}
                  y1={height - paddingY}
                  x2={x}
                  y2={12}
                  className="stroke-slate-700/40"
                />
                <text
                  x={x}
                  y={height - paddingY + 18}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px]"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
        {series.map((item) => {
          const points = item.values
            .map((value, index) => {
              const x = (index / (item.values.length - 1 || 1)) * (width - 24) + 12;
              const scaled =
                height - paddingY - (value / valueMax) * (height - paddingY - 12);
              return `${x},${scaled}`;
            })
            .join(' ');
          return (
            <polyline
              key={item.label}
              fill="none"
              stroke={item.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              className="drop-shadow-[0_6px_18px_rgba(14,165,233,0.15)]"
            />
          );
        })}
      </svg>
    </figure>
  );
};

const buildFallbackFindings = () =>
  sampleReport.map((item) => ({
    plugin: Number(item.id),
    name: item.name,
    severity: item.severity,
    host: item.host,
    description: item.description,
    pluginFamily: item.pluginFamily,
    cvss: item.cvss,
  }));

const countBySeverity = (findings) => {
  const initial = severityOrder.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  for (const finding of findings) {
    if (finding?.severity && initial[finding.severity] !== undefined) {
      initial[finding.severity] += 1;
    }
  }
  return initial;
};

const formatDelta = (current, previous) => {
  if (!previous) return 'New finding';
  if (current === previous) return 'Severity unchanged';
  const direction = severityOrder.indexOf(current) < severityOrder.indexOf(previous)
    ? 'Severity increased'
    : 'Severity reduced';
  return `${direction}: ${previous} → ${current}`;
};

const NessusPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plugins, setPlugins] = useState([]);
  const [scans, setScans] = useState([]);
  const [search, setSearch] = useState('');
  const [severityFilters, setSeverityFilters] = useState(() =>
    severityOrder.reduce((acc, sev) => ({ ...acc, [sev]: true }), {}),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await Promise.all([
          fetch('/demo-data/nessus/plugins.json'),
          fetch('/demo-data/nessus/scanA.json'),
          fetch('/demo-data/nessus/scanB.json'),
        ]);
        const [pluginsData, scanA, scanB] = await Promise.all(
          response.map((res) => {
            if (!res.ok) throw new Error('Network error');
            return res.json();
          }),
        );
        if (cancelled) return;
        setPlugins(pluginsData);
        setScans([
          { id: 'baseline', label: 'Baseline', findings: scanA?.findings ?? [] },
          { id: 'current', label: 'Current', findings: scanB?.findings ?? [] },
        ]);
        setError('');
      } catch (err) {
        if (cancelled) return;
        setError('Running in offline lab mode — loading static fixtures.');
        setPlugins([]);
        setScans([
          { id: 'baseline', label: 'Baseline', findings: buildFallbackFindings() },
          { id: 'current', label: 'Current', findings: buildFallbackFindings() },
        ]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const pluginIndex = useMemo(() => {
    const map = new Map();
    for (const plugin of plugins) {
      map.set(plugin.id, plugin);
    }
    return map;
  }, [plugins]);

  const latestScan = scans[scans.length - 1];
  const previousScan = scans.length > 1 ? scans[scans.length - 2] : undefined;

  const baselineIndex = useMemo(() => {
    if (!previousScan) return new Map();
    const map = new Map();
    for (const finding of previousScan.findings ?? []) {
      const id = finding.plugin ?? finding.id;
      if (id !== undefined) {
        map.set(id, finding.severity);
      }
    }
    return map;
  }, [previousScan]);

  const enrichedFindings = useMemo(() => {
    if (!latestScan) return [];
    const list = [];
    for (const finding of latestScan.findings ?? []) {
      const id = finding.plugin ?? finding.id;
      const pluginMeta = pluginIndex.get(id) ?? {};
      const severity = finding.severity ?? pluginMeta.severity ?? 'Info';
      const previousSeverity = baselineIndex.get(id);
      list.push({
        id,
        name: finding.name ?? pluginMeta.name ?? `Plugin ${id}`,
        severity,
        host: finding.host ?? 'Multiple assets',
        description:
          finding.description ??
          pluginMeta.description ??
          'Simulated Nessus finding from the offline lab dataset.',
        pluginFamily: finding.pluginFamily ?? pluginMeta.pluginFamily ?? 'General',
        cvss: finding.cvss ?? pluginMeta.cvss ?? '—',
        tags: pluginMeta.tags ?? finding.tags ?? [],
        cve: pluginMeta.cve ?? finding.cve ?? [],
        cwe: pluginMeta.cwe ?? finding.cwe ?? [],
        remediation:
          remediationPlaybook[id] ||
          `Apply standard remediation guidance for ${severity.toLowerCase()} risk items and verify closure.`,
        previousSeverity,
      });
    }
    return list.sort(
      (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
    );
  }, [latestScan, pluginIndex, baselineIndex]);

  const filteredFindings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enrichedFindings.filter((finding) => {
      if (!severityFilters[finding.severity]) return false;
      if (!term) return true;
      const haystack = [
        finding.name,
        finding.host,
        finding.pluginFamily,
        finding.description,
        finding.tags?.join(' '),
        finding.cve?.join(' '),
        finding.cwe?.join(' '),
        String(finding.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [enrichedFindings, severityFilters, search]);

  const severitySummary = useMemo(
    () => countBySeverity(enrichedFindings),
    [enrichedFindings],
  );

  const trendSeries = useMemo(() => {
    if (!scans.length) return [];
    return severityOrder.map((severity) => ({
      label: severity,
      color: severityAccent[severity],
      values: scans.map((scan) =>
        (scan.findings ?? []).filter((finding) => {
          const sev = finding.severity ?? finding?.severity;
          if (sev) {
            return sev === severity;
          }
          return false;
        }).length,
      ),
    }));
  }, [scans]);

  const groupedFindings = useMemo(
    () =>
      severityOrder.map((severity) => ({
        severity,
        items: filteredFindings.filter((finding) => finding.severity === severity),
      })),
    [filteredFindings],
  );

  const exportCsv = () => {
    if (typeof window === 'undefined' || filteredFindings.length === 0) return;
    const header = [
      'Plugin ID',
      'Name',
      'Severity',
      'Host',
      'CVSS',
      'Plugin family',
      'CVE',
      'CWE',
      'Remediation',
    ];
    const rows = filteredFindings.map((finding) => [
      finding.id,
      finding.name,
      finding.severity,
      finding.host,
      finding.cvss,
      finding.pluginFamily,
      (finding.cve ?? []).join(' '),
      (finding.cwe ?? []).join(' '),
      finding.remediation,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nessus-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    if (typeof window === 'undefined' || filteredFindings.length === 0) return;
    const blob = new Blob([JSON.stringify(filteredFindings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nessus-report.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>Nessus scan simulator</title>
      </Head>
      <main className="min-h-screen bg-slate-950 pb-16 text-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-10 sm:px-6 lg:px-8">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-400">
              Lab mode • Simulated data only
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Nessus Scan Reports
            </h1>
            <p className="max-w-2xl text-sm text-slate-400">
              Explore canned Nessus scan exports, triage critical findings, and rehearse
              remediation workflows — all without leaving the secure offline sandbox.
            </p>
          </header>

          <section
            aria-label="Lab status messaging"
            className="rounded-2xl border border-sky-500/20 bg-slate-900/80 p-5 text-sm text-slate-200 shadow-[0_20px_45px_rgba(2,6,23,0.55)]"
          >
            <p className="font-medium text-sky-200">
              This simulator runs entirely in lab mode.
            </p>
            <p className="mt-2 text-slate-400">
              Reports, findings, and remediation playbooks are compiled from static fixtures. No
              live scanners are contacted and network access is never required. Use the controls
              below to practice triage workflows and export sanitized summaries for tabletop
              exercises.
            </p>
            {error && <p className="mt-3 text-amber-300">{error}</p>}
          </section>

          <section className="grid gap-4 lg:grid-cols-[2fr,3fr]" aria-label="Overview">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
                <h2 className="text-lg font-semibold text-white">Current severity mix</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {severityOrder.map((severity) => (
                    <div
                      key={severity}
                      className={`rounded-xl px-4 py-3 text-sm font-medium ${severityStyles[severity]}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{severity}</span>
                        <span className="text-lg font-semibold text-white">
                          {severitySummary[severity] ?? 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
                <h2 className="text-lg font-semibold text-white">Remediation spotlight</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Focus on high-impact findings with ready-to-run corrective actions.
                </p>
                <div className="mt-4 space-y-3">
                  {enrichedFindings
                    .filter((finding) => severityOrder.indexOf(finding.severity) <= 1)
                    .slice(0, 3)
                    .map((finding) => (
                      <article
                        key={finding.id}
                        className={`rounded-xl border border-slate-800/60 bg-slate-950/70 p-4 text-sm shadow-[0_15px_35px_rgba(2,6,23,0.45)] ${severityStyles[finding.severity]}`}
                      >
                        <header className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-slate-300">
                          <span>#{finding.id}</span>
                          <span>{finding.host}</span>
                        </header>
                        <h3 className="mt-2 text-base font-semibold text-white">
                          {finding.name}
                        </h3>
                        <p className="mt-2 text-sm text-slate-200">{finding.remediation}</p>
                        <p className="mt-2 text-xs text-slate-300">{formatDelta(finding.severity, finding.previousSeverity)}</p>
                      </article>
                    ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-[0_30px_70px_rgba(2,6,23,0.55)]">
              <TrendChart
                labels={scans.map((scan) => scan.label)}
                series={trendSeries.filter((serie) => serie.values.some((value) => value > 0))}
              />
            </div>
          </section>

          <section
            aria-label="Controls"
            className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5 shadow-[0_25px_60px_rgba(2,6,23,0.55)]"
          >
            <form className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" role="search">
              <div className="w-full lg:max-w-lg">
                <label htmlFor="nessus-search" className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Search findings
                </label>
                <input
                  id="nessus-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter by plugin, host, CVE, or keyword"
                  aria-label="Search findings"
                  className="mt-2 w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                />
              </div>
              <fieldset className="flex flex-wrap gap-2" aria-label="Filter by severity">
                <legend className="sr-only">Severity filters</legend>
                {severityOrder.map((severity) => (
                  <button
                    key={severity}
                    type="button"
                    onClick={() =>
                      setSeverityFilters((prev) => ({
                        ...prev,
                        [severity]: !prev[severity],
                      }))
                    }
                    aria-pressed={severityFilters[severity]}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                      severityFilters[severity]
                        ? `${severityStyles[severity]} focus-visible:ring-sky-500`
                        : 'border border-slate-700/60 bg-slate-950/70 text-slate-400 hover:text-slate-100 focus-visible:ring-slate-600'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
              </fieldset>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex items-center justify-center rounded-full border border-sky-500/60 bg-sky-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-sky-100 transition hover:bg-sky-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={exportJson}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Export JSON
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4" aria-label="Findings">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              groupedFindings.map(({ severity, items }) => (
                <details
                  key={severity}
                  className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/70 text-sm shadow-[0_25px_60px_rgba(2,6,23,0.55)]"
                  open={severity === 'Critical' || severity === 'High'}
                >
                  <summary
                    className={`flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${severityStyles[severity]}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: severityAccent[severity] }} aria-hidden />
                      {severity}
                    </span>
                    <span className="text-sm font-medium text-white">{items.length} findings</span>
                  </summary>
                  <div className="divide-y divide-slate-800/60">
                    {items.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-slate-400">No findings match the current filters.</p>
                    ) : (
                      items.map((finding) => (
                        <article key={`${severity}-${finding.id}`} className="space-y-3 px-5 py-6">
                          <header className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-400">
                                #{finding.id} • {finding.pluginFamily}
                              </p>
                              <h3 className="text-lg font-semibold text-white">{finding.name}</h3>
                            </div>
                            <div className="text-right text-xs text-slate-400">
                              <p>{finding.host}</p>
                              <p>{formatDelta(finding.severity, finding.previousSeverity)}</p>
                            </div>
                          </header>
                          <p className="text-sm text-slate-300">{finding.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                            <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1">
                              CVSS: {finding.cvss}
                            </span>
                            {finding.cve?.length ? (
                              <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1">
                                CVE: {finding.cve.join(', ')}
                              </span>
                            ) : null}
                            {finding.cwe?.length ? (
                              <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1">
                                CWE: {finding.cwe.join(', ')}
                              </span>
                            ) : null}
                            {finding.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                              Remediation plan
                            </h4>
                            <p className="mt-2 text-sm">{finding.remediation}</p>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </details>
              ))
            )}
          </section>
        </div>
      </main>
    </>
  );
};

export default NessusPage;
