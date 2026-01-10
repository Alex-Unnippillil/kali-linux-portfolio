'use client';

import React, { useEffect, useMemo, useState } from 'react';
import LabMode from '../../components/LabMode';
import ResultDiff from './components/ResultDiff';

type FindingType = 'Network' | 'Application' | 'Configuration';

interface TimelineEvent {
  date: string;
  event: string;
}

interface Vulnerability {
  id: string;
  name: string;
  cvss: number;
  epss: number;
  description: string;
  remediation: string;
  severity: HostReport['risk'];
  type: FindingType;
  timeline: TimelineEvent[];
}

interface HostReport {
  host: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  vulns: Vulnerability[];
}

const severityOrder: HostReport['risk'][] = ['Critical', 'High', 'Medium', 'Low'];

const severityPalette: Record<HostReport['risk'], string> = {
  Low: 'var(--color-severity-low)',
  Medium: 'var(--color-severity-medium)',
  High: 'var(--color-severity-high)',
  Critical: 'var(--color-severity-critical)',
};

const sampleData: HostReport[] = [
  {
    host: '192.168.56.10',
    risk: 'High',
    vulns: [
      {
        id: 'CVE-2023-0001',
        name: 'OpenSSL Buffer Overflow',
        cvss: 9.8,
        epss: 0.97,
        description: 'Remote code execution via crafted packet.',
        remediation: 'Update OpenSSL to the latest version',
        severity: 'Critical',
        type: 'Network',
        timeline: [
          { date: '2023-06-10', event: 'Detected during weekly scan.' },
          { date: '2023-06-12', event: 'Ticket assigned to infrastructure team.' },
          { date: '2023-06-15', event: 'Patch scheduled for maintenance window.' },
        ],
      },
      {
        id: 'CVE-2022-1234',
        name: 'Apache Path Traversal',
        cvss: 7.5,
        epss: 0.32,
        description: 'Improper input validation allows directory traversal.',
        remediation: 'Apply vendor patch for Apache',
        severity: 'High',
        type: 'Application',
        timeline: [
          { date: '2023-05-02', event: 'Flagged in authenticated web scan.' },
          { date: '2023-05-05', event: 'Mitigation deployed on staging.' },
          { date: '2023-05-08', event: 'Production rollout approved.' },
        ],
      },
    ],
  },
  {
    host: '192.168.56.20',
    risk: 'Medium',
    vulns: [
      {
        id: 'CVE-2021-9999',
        name: 'SSH Weak Cipher',
        cvss: 5.0,
        epss: 0.04,
        description: 'Server supports deprecated SSH ciphers.',
        remediation: 'Disable weak ciphers in SSH config',
        severity: 'Medium',
        type: 'Configuration',
        timeline: [
          { date: '2023-04-18', event: 'Initial detection on jump host.' },
          { date: '2023-04-20', event: 'Configuration change drafted.' },
          { date: '2023-04-22', event: 'Remediation pending reboot approval.' },
        ],
      },
    ],
  },
];

const cvssColor = (score: number) => {
  if (score >= 9) return severityPalette.Critical;
  if (score >= 7) return severityPalette.High;
  if (score >= 4) return severityPalette.Medium;
  return severityPalette.Low;
};

const severityBadgeStyle = (severity: HostReport['risk']) => ({
  background: `color-mix(in srgb, ${severityPalette[severity]} 32%, var(--kali-panel))`,
  borderColor: `color-mix(in srgb, ${severityPalette[severity]} 55%, transparent)`,
  color: 'var(--kali-terminal-text)',
});

const OpenVASReport: React.FC = () => {
  const findings = useMemo(
    () =>
      sampleData.flatMap((host) =>
        host.vulns.map((v) => ({ ...v, host: host.host }))
      ),
    [],
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [severityFilters, setSeverityFilters] = useState<
    Record<HostReport['risk'], boolean>
  >(() =>
    severityOrder.reduce(
      (acc, level) => ({
        ...acc,
        [level]: true,
      }),
      {} as Record<HostReport['risk'], boolean>,
    ),
  );
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    findings.forEach((f) => {
      base[f.type] = true;
    });
    return base;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsLoading(false), 480);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return () => undefined;
    const updateOfflineState = () => {
      setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    };
    updateOfflineState();
    window.addEventListener('online', updateOfflineState);
    window.addEventListener('offline', updateOfflineState);
    return () => {
      window.removeEventListener('online', updateOfflineState);
      window.removeEventListener('offline', updateOfflineState);
    };
  }, []);

  const remediationTags = useMemo(() => {
    const tags = new Set<string>();
    sampleData.forEach((h) => h.vulns.forEach((v) => tags.add(v.remediation)));
    return Array.from(tags);
  }, []);

  const riskSummary = useMemo(() => {
    const summary: Record<HostReport['risk'], number> = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };
    sampleData.forEach((h) => {
      summary[h.risk] += 1;
    });
    return summary;
  }, []);

  const prioritizedRisks = useMemo(
    () =>
      severityOrder
        .map((severity) => ({
          severity,
          count: riskSummary[severity],
        }))
        .filter(({ count }) => count > 0),
    [riskSummary],
  );

  const severityCounts = useMemo(() => {
    const counts: Record<HostReport['risk'], number> = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };
    findings.forEach((finding) => {
      counts[finding.severity] += 1;
    });
    return counts;
  }, [findings]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    findings.forEach((finding) => {
      counts[finding.type] = (counts[finding.type] ?? 0) + 1;
    });
    return counts;
  }, [findings]);

  const filteredFindings = useMemo(
    () =>
      findings.filter(
        (finding) =>
          (severityFilters[finding.severity] ?? true) &&
          (typeFilters[finding.type] ?? true),
      ),
    [findings, severityFilters, typeFilters],
  );

  const trendData = [5, 7, 6, 9, 4];
  const maxTrend = Math.max(...trendData, 1);
  const trendWidth = 300;
  const trendHeight = 80;
  const trendStep =
    trendData.length > 1 ? trendWidth / (trendData.length - 1) : trendWidth;
  const trendPath = trendData
    .map((v, i) => {
      const x = i * trendStep;
      const y = trendHeight - (v / maxTrend) * trendHeight;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
  const trendPoints = trendData.map((v, i) => {
    const x = i * trendStep;
    const y = trendHeight - (v / maxTrend) * trendHeight;
    return { x, y, value: v };
  });

  const severityMax = Math.max(
    ...severityOrder.map((severity) => severityCounts[severity] ?? 0),
    1,
  );
  const severityChartWidth = 260;
  const severityChartHeight = 180;
  const severityBarGap = 14;
  const severityBarWidth =
    (severityChartWidth - severityBarGap * (severityOrder.length + 1)) /
    severityOrder.length;

  const totalFindings = findings.length;
  const filteredCount = filteredFindings.length;
  const totalHosts = sampleData.length;
  const activeSeverityCount = severityOrder.filter(
    (severity) => severityFilters[severity],
  ).length;
  const activeTypeCount = Object.keys(typeCounts).filter((type) =>
    typeFilters[type] ?? true,
  ).length;

  const remediationPlaybook = useMemo(
    () => {
      const criticalFindings = findings.filter(
        (finding) => finding.severity === 'Critical',
      );
      const highFindings = findings.filter(
        (finding) => finding.severity === 'High',
      );
      const mediumFindings = findings.filter(
        (finding) => finding.severity === 'Medium',
      );
      return [
        {
          title: 'Stabilize critical CVEs',
          severity: 'Critical' as const,
          summary: criticalFindings.length
            ? `Patch ${criticalFindings.length} critical exposure${
                criticalFindings.length > 1 ? 's' : ''
              } including ${criticalFindings[0].name}.`
            : 'No critical exposures detected in this snapshot.',
          actions: [
            'Coordinate an emergency maintenance window with infrastructure owners.',
            'Capture post-patch evidence and attach it to the change record.',
          ],
        },
        {
          title: 'Harden exposed services',
          severity: 'High' as const,
          summary: highFindings.length
            ? `Review ${highFindings.length} high severity finding${
                highFindings.length > 1 ? 's' : ''
              } with application owners.`
            : 'High severity backlog is clear in this dataset.',
          actions: [
            'Validate mitigations in staging before production rollout.',
            'Document compensating controls for leadership status updates.',
          ],
        },
        {
          title: 'Close configuration gaps',
          severity: 'Medium' as const,
          summary: mediumFindings.length
            ? `Normalize SSH configuration across ${mediumFindings.length} host${
                mediumFindings.length > 1 ? 's' : ''
              }.`
            : 'Configuration posture is stable in this run.',
          actions: [
            'Ship hardened baselines via automation and plan coordinated reboots.',
            'Add regression checks to the next authenticated scan template.',
          ],
        },
      ];
    },
    [findings],
  );

  const toggleRow = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const toggleSeverity = (severity: HostReport['risk']) =>
    setSeverityFilters((current) => ({
      ...current,
      [severity]: !current[severity],
    }));

  const toggleType = (type: string) =>
    setTypeFilters((current) => ({
      ...current,
      [type]: !(current[type] ?? true),
    }));

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(findings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openvas-findings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const header = 'Host,ID,Name,CVSS,EPSS,Description,Remediation,Severity,Type';
    const rows = findings.map(
      (f) =>
        `${f.host},${f.id},"${f.name}",${f.cvss},${f.epss},"${f.description}","${f.remediation}",${f.severity},${f.type}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openvas-findings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="min-h-screen bg-[color:var(--kali-bg-solid)] p-4 sm:p-6 text-[color:var(--kali-terminal-text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)]/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--kali-terminal-green)]">
                Simulation dashboard
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-100">
                OpenVAS Vulnerability Workspace
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Review the curated scan snapshot, filter simulated findings, and rehearse remediation playbooks without touching live infrastructure.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/50 bg-emerald-900/20 p-4 text-emerald-100 shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                Sanitized fixtures
              </p>
              <p className="mt-1 leading-relaxed">
                Data originates from <code className="font-mono">openvasSample.json</code> and remains static so the console works offline.
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/60 bg-amber-900/25 p-4 text-amber-100 shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                Lab mode required
              </p>
              <p className="mt-1 leading-relaxed">
                Enable Lab Mode below to unlock interactive filters, exports, and drill-down panels. Without it you only see this orientation banner.
              </p>
            </div>
            <div
              className={`rounded-xl border p-4 shadow transition ${
                isOffline
                  ? 'border-sky-400/70 bg-sky-900/30 text-sky-100'
                  : 'border-slate-500/50 bg-slate-900/40 text-slate-200'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide">
                {isOffline ? 'Offline session' : 'Connected'}
              </p>
              <p className="mt-1 leading-relaxed">
                {isOffline
                  ? 'You appear offline—export and review data locally without losing context.'
                  : 'Offline-first design keeps the console responsive even without a network connection.'}
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)]/70 p-4 sm:p-6 shadow-inner">
          <LabMode>
            {isLoading ? (
              <div
                className="space-y-8 animate-pulse motion-reduce:animate-none"
                aria-busy="true"
                aria-live="polite"
              >
                <div className="h-6 w-48 rounded bg-[color:var(--kali-panel-highlight)]/40" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`openvas-skeleton-card-${idx}`}
                      className="h-24 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/40"
                    />
                  ))}
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/30 p-4">
                    <div className="h-4 w-32 rounded bg-[color:var(--kali-panel-highlight)]/40" />
                    <div className="h-20 rounded bg-[color:var(--kali-panel-highlight)]/30" />
                  </div>
                  <div className="space-y-3 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/30 p-4">
                    <div className="h-4 w-40 rounded bg-[color:var(--kali-panel-highlight)]/40" />
                    <div className="h-32 rounded bg-[color:var(--kali-panel-highlight)]/30" />
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/30 p-4">
                  <div className="h-4 w-44 rounded bg-[color:var(--kali-panel-highlight)]/40" />
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={`openvas-skeleton-row-${idx}`}
                        className="h-12 rounded-lg bg-[color:var(--kali-panel-highlight)]/30"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2
                      id="openvas-overview-heading"
                      className="text-2xl font-semibold text-slate-100"
                    >
                      Scan overview
                    </h2>
                    <p className="text-sm text-slate-300">
                      Tracking {totalFindings} findings across {totalHosts} host{totalHosts > 1 ? 's' : ''}. Tune filters to rehearse remediation priorities safely.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={exportJSON}
                      className="rounded-full border border-sky-500/70 bg-sky-600/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-100 transition hover:bg-sky-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      Export JSON
                    </button>
                    <button
                      type="button"
                      onClick={exportCSV}
                      className="rounded-full border border-sky-500/70 bg-sky-600/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-100 transition hover:bg-sky-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                      {prioritizedRisks.map(({ severity, count }) => {
                        const highlight = severity === prioritizedRisks[0]?.severity;
                        const severityColor = severityPalette[severity];
                        const panelStyle: React.CSSProperties = highlight
                          ? {
                              background: `color-mix(in srgb, ${severityColor} 18%, var(--kali-panel))`,
                              borderColor: `color-mix(in srgb, ${severityColor} 45%, transparent)`,
                              boxShadow: `0 18px 50px color-mix(in srgb, ${severityColor} 15%, transparent)`,
                            }
                          : {
                              background: 'var(--kali-panel)',
                              borderColor: 'var(--kali-panel-border)',
                            };
                        return (
                          <div
                            key={severity}
                            className="flex flex-col gap-1 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-sky-500"
                            style={panelStyle}
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                              {severity}
                            </p>
                            <p className="text-3xl font-bold text-slate-100">{count}</p>
                            <p className="text-xs text-slate-400">hosts impacted</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-200">
                            Filter summary
                          </h3>
                          <p className="text-xs text-slate-400">
                            Showing {filteredCount} of {totalFindings} findings in this lab session.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                          <span className="rounded-full border border-slate-500/40 bg-slate-900/40 px-3 py-1">
                            Severity: {activeSeverityCount}/{severityOrder.length}
                          </span>
                          <span className="rounded-full border border-slate-500/40 bg-slate-900/40 px-3 py-1">
                            Types: {activeTypeCount}/{Object.keys(typeCounts).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/25 p-4">
                      <h3 className="text-sm font-semibold text-slate-200">
                        Severity distribution
                      </h3>
                      <p className="text-xs text-slate-400">
                        Bar height scales to the most numerous severity bucket.
                      </p>
                      <svg
                        width={severityChartWidth}
                        height={severityChartHeight}
                        role="img"
                        aria-labelledby="openvas-severity-chart-title"
                        className="mt-3"
                      >
                        <title id="openvas-severity-chart-title">
                          Severity distribution for {totalFindings} findings
                        </title>
                        <desc>
                          {severityOrder
                            .map((severity) => `${severityCounts[severity]} ${severity} findings`)
                            .join(', ')}
                        </desc>
                        <line
                          x1="0"
                          y1={severityChartHeight - 24}
                          x2={severityChartWidth}
                          y2={severityChartHeight - 24}
                          stroke="color-mix(in srgb, var(--kali-terminal-text) 25%, transparent)"
                          strokeWidth={1}
                        />
                        {severityOrder.map((severity, index) => {
                          const value = severityCounts[severity] ?? 0;
                          const height =
                            severityMax > 0
                              ? ((value / severityMax) * (severityChartHeight - 40)) || 0
                              : 0;
                          const x = severityBarGap + index * (severityBarWidth + severityBarGap);
                          const y = severityChartHeight - 24 - height;
                          return (
                            <g key={severity}>
                              <rect
                                x={x}
                                y={y}
                                width={severityBarWidth}
                                height={height}
                                rx={6}
                                ry={6}
                                fill={`color-mix(in srgb, ${severityPalette[severity]} 55%, var(--kali-panel))`}
                                stroke={`color-mix(in srgb, ${severityPalette[severity]} 75%, transparent)`}
                                strokeWidth={1.2}
                              />
                              <text
                                x={x + severityBarWidth / 2}
                                y={severityChartHeight - 10}
                                textAnchor="middle"
                                fontSize={11}
                                fill="var(--kali-terminal-text)"
                              >
                                {severity}
                              </text>
                              <text
                                x={x + severityBarWidth / 2}
                                y={y - 6}
                                textAnchor="middle"
                                fontSize={12}
                                fill="var(--kali-terminal-text)"
                              >
                                {value}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/25 p-4">
                      <h3 className="text-sm font-semibold text-slate-200">
                        Weekly exposure trend
                      </h3>
                      <p className="text-xs text-slate-400">
                        Snapshot of finding counts over the past five simulated weeks.
                      </p>
                      <svg
                        width={trendWidth}
                        height={trendHeight}
                        className="mt-3 rounded bg-[color:var(--kali-panel)]"
                        role="img"
                        aria-labelledby="openvas-trend-title"
                      >
                        <title id="openvas-trend-title">
                          Weekly finding counts: {trendData.join(', ')}
                        </title>
                        <path
                          d={trendPath}
                          stroke="color-mix(in srgb, var(--kali-terminal-green) 70%, transparent)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                        {trendPoints.map((point, index) => (
                          <g key={`trend-point-${index}`}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={4}
                              fill="color-mix(in srgb, var(--kali-terminal-green) 80%, transparent)"
                            />
                            <text
                              x={point.x}
                              y={point.y - 10}
                              textAnchor="middle"
                              fontSize={11}
                              fill="var(--kali-terminal-text)"
                            >
                              {point.value}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                </div>

                <section aria-labelledby="openvas-findings-heading" className="space-y-4">
                  <div>
                    <h3
                      id="openvas-findings-heading"
                      className="text-xl font-semibold text-slate-100"
                    >
                      Findings
                    </h3>
                    <p className="text-sm text-slate-300">
                      Toggle severity and finding type filters to reprioritize the simulated remediation queue.
                    </p>
                  </div>
                  <div className="space-y-4 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/25 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Severity
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {severityOrder.map((severity) => {
                          const isActive = severityFilters[severity];
                          const severityColor = severityPalette[severity];
                          const buttonStyle: React.CSSProperties = isActive
                            ? {
                                background: `color-mix(in srgb, ${severityColor} 24%, var(--kali-panel))`,
                                borderColor: `color-mix(in srgb, ${severityColor} 40%, transparent)`,
                                color: 'var(--kali-terminal-text)',
                                boxShadow: `0 0 0 1px color-mix(in srgb, ${severityColor} 30%, transparent)`,
                              }
                            : {
                                background: 'var(--kali-panel)',
                                borderColor: 'var(--kali-panel-border)',
                                color: 'color-mix(in srgb, var(--kali-terminal-text) 45%, transparent)'
                              };
                          return (
                            <button
                              key={severity}
                              type="button"
                              aria-pressed={isActive}
                              aria-label={`${severity} severity filter (${severityCounts[severity]} findings)`}
                              onClick={() => toggleSeverity(severity)}
                              className="flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-blue)]"
                              style={buttonStyle}
                            >
                              <span>{severity}</span>
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px]"
                                style={{
                                  background: 'color-mix(in srgb, var(--kali-panel-highlight) 70%, transparent)',
                                  color: 'var(--kali-terminal-text)',
                                }}
                              >
                                {severityCounts[severity] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Type
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.keys(typeCounts).map((type) => {
                          const isActive = typeFilters[type] ?? true;
                          const buttonStyle: React.CSSProperties = isActive
                            ? {
                                background: 'color-mix(in srgb, var(--kali-terminal-green) 20%, var(--kali-panel))',
                                borderColor: 'color-mix(in srgb, var(--kali-terminal-green) 40%, transparent)',
                                color: 'var(--kali-terminal-text)',
                                boxShadow: '0 0 0 1px color-mix(in srgb, var(--kali-terminal-green) 25%, transparent)',
                              }
                            : {
                                background: 'var(--kali-panel)',
                                borderColor: 'var(--kali-panel-border)',
                                color: 'color-mix(in srgb, var(--kali-terminal-text) 45%, transparent)',
                              };
                          return (
                            <button
                              key={type}
                              type="button"
                              aria-pressed={isActive}
                              aria-label={`${type} type filter (${typeCounts[type]} findings)`}
                              onClick={() => toggleType(type)}
                              className="flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-blue)]"
                              style={buttonStyle}
                            >
                              <span className="font-medium">{type}</span>
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px]"
                                style={{
                                  background: 'color-mix(in srgb, var(--kali-panel-highlight) 70%, transparent)',
                                  color: 'var(--kali-terminal-text)',
                                }}
                              >
                                {typeCounts[type] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] shadow-inner">
                    <div role="table" aria-label="OpenVAS findings" className="divide-y divide-[color:var(--kali-panel-border)] text-sm text-slate-200">
                      <div
                        role="row"
                        className="grid grid-cols-[minmax(140px,1fr)_minmax(0,2fr)_minmax(120px,1fr)] gap-4 bg-[color:var(--kali-panel)] px-4 py-3 text-xs uppercase tracking-wide text-slate-400"
                      >
                        <span role="columnheader">Host</span>
                        <span role="columnheader">Vulnerability</span>
                        <span role="columnheader">CVSS</span>
                      </div>
                      {filteredFindings.map((f) => {
                        const key = `${f.host}-${f.id}`;
                        const severityColor = severityPalette[f.severity];
                        const rowStyle: React.CSSProperties = {
                          background: `color-mix(in srgb, ${severityColor} 14%, var(--kali-panel))`,
                          borderLeft: `4px solid color-mix(in srgb, ${severityColor} 55%, transparent)`,
                        };
                        return (
                          <div
                            key={key}
                            role="rowgroup"
                            className="bg-[color:var(--kali-panel)]"
                          >
                            <button
                              type="button"
                              onClick={() => toggleRow(key)}
                              className="grid w-full grid-cols-[minmax(140px,1fr)_minmax(0,2fr)_minmax(120px,1fr)] items-stretch gap-4 border-b border-[color:var(--kali-panel-border)] px-4 py-4 text-left transition hover:bg-[color:var(--kali-panel-highlight)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-blue)]"
                              aria-expanded={!!expanded[key]}
                              aria-label="Toggle vulnerability details"
                              style={rowStyle}
                            >
                              <span className="flex flex-col gap-1 text-sm">
                                <span className="font-mono text-xs text-slate-400">{f.host}</span>
                                <span
                                  className="w-fit rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide"
                                  style={{
                                    background: 'color-mix(in srgb, var(--kali-panel-highlight) 75%, transparent)',
                                    color: 'var(--kali-terminal-text)',
                                  }}
                                >
                                  {f.type}
                                </span>
                              </span>
                              <span className="flex flex-col gap-2 text-sm">
                                <span className="font-semibold text-slate-100">{f.name}</span>
                                <span className="text-xs text-slate-400">{f.id}</span>
                                <span className="flex flex-wrap items-center gap-2 text-[11px]">
                                  <span
                                    className="rounded-full border px-3 py-0.5 font-semibold uppercase tracking-wide"
                                    style={severityBadgeStyle(f.severity)}
                                  >
                                    {f.severity}
                                  </span>
                                  <span
                                    className="rounded-full px-2 py-0.5"
                                    style={{
                                      background: 'color-mix(in srgb, var(--kali-panel-highlight) 65%, transparent)',
                                      color: 'var(--kali-terminal-text)',
                                    }}
                                  >
                                    EPSS {(f.epss * 100).toFixed(0)}%
                                  </span>
                                </span>
                              </span>
                              <span className="flex flex-col justify-center gap-2 text-xs text-slate-400">
                                <span className="flex items-center justify-between">
                                  <span>{f.cvss.toFixed(1)}</span>
                                  <span>of 10</span>
                                </span>
                                <span className="relative block h-2.5 w-full rounded-full bg-[color:var(--kali-panel-highlight)]">
                                  <span
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                      width: `${(f.cvss / 10) * 100}%`,
                                      background: `color-mix(in srgb, ${cvssColor(f.cvss)} 70%, transparent)`,
                                      boxShadow: `0 0 0 1px color-mix(in srgb, ${cvssColor(f.cvss)} 35%, transparent) inset`,
                                    }}
                                  />
                                </span>
                              </span>
                            </button>
                            {expanded[key] && (
                              <div className="space-y-4 bg-[color:var(--kali-panel)] px-6 py-4 text-sm text-slate-200">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-400">
                                    Description
                                  </p>
                                  <p>{f.description}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-400">
                                    Remediation
                                  </p>
                                  <p className="text-sm text-amber-200">{f.remediation}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-400">
                                    Timeline
                                  </p>
                                  <ul className="space-y-2 text-xs text-slate-300">
                                    {f.timeline.map((event) => (
                                      <li
                                        key={`${f.id}-${event.date}-${event.event}`}
                                        className="flex gap-3 rounded-lg px-3 py-2"
                                        style={{
                                          background: 'color-mix(in srgb, var(--kali-panel-highlight) 85%, transparent)',
                                        }}
                                      >
                                        <span className="w-24 text-slate-400">{event.date}</span>
                                        <span className="flex-1">{event.event}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section aria-labelledby="openvas-remediation-heading" className="space-y-4">
                  <div>
                    <h3
                      id="openvas-remediation-heading"
                      className="text-xl font-semibold text-slate-100"
                    >
                      Remediation guidance
                    </h3>
                    <p className="text-sm text-slate-300">
                      Structured playbooks translate findings into prioritized actions.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {remediationPlaybook.map((item) => (
                      <article
                        key={item.title}
                        className="flex flex-col gap-3 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/20 p-4 shadow"
                        style={{
                          boxShadow: `0 12px 30px color-mix(in srgb, ${severityPalette[item.severity]} 18%, transparent)`,
                        }}
                      >
                        <p
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{
                            color: severityPalette[item.severity],
                          }}
                        >
                          {item.title}
                        </p>
                        <p className="text-sm text-slate-200">{item.summary}</p>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {item.actions.map((action) => (
                            <li
                              key={action}
                              className="flex items-start gap-2"
                            >
                              <span className="mt-0.5 h-2 w-2 rounded-full"
                                style={{
                                  background: `color-mix(in srgb, ${severityPalette[item.severity]} 70%, transparent)`,
                                }}
                              />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2" role="list">
                    {remediationTags.map((tag) => (
                      <span
                        key={tag}
                        role="listitem"
                        className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--kali-terminal-green) 45%, transparent)',
                          background: 'color-mix(in srgb, var(--kali-terminal-green) 18%, var(--kali-panel))',
                          color: 'var(--kali-terminal-text)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="openvas-diff-heading" className="space-y-3">
                  <div>
                    <h3
                      id="openvas-diff-heading"
                      className="text-xl font-semibold text-slate-100"
                    >
                      Compare reports
                    </h3>
                    <p className="text-sm text-slate-300">
                      Upload two JSON exports to visualize findings added or removed between scans.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/25 p-4">
                    <ResultDiff />
                  </div>
                </section>

                <p className="mt-6 text-xs text-slate-400">
                  All data is static and for demonstration only. Use OpenVAS responsibly and only on systems you are authorized to test.
                </p>
              </div>
            )}
          </LabMode>
        </section>
      </div>
    </div>
  );
};

export default OpenVASReport;
