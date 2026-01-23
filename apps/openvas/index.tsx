'use client';

import React, { useMemo, useState } from 'react';
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
    <div className="min-h-screen bg-[color:var(--kali-bg-solid)] p-4 text-[color:var(--kali-terminal-text)] space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">OpenVAS Report</h1>
          <p className="text-sm text-gray-400">
            Focus on the most critical exposure and work down the queue.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJSON}
            className="rounded border border-sky-600/60 bg-sky-700/40 px-3 py-1 text-sm font-medium text-sky-100 transition hover:bg-sky-600/70"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="rounded border border-sky-600/60 bg-sky-700/40 px-3 py-1 text-sm font-medium text-sky-100 transition hover:bg-sky-600/70"
          >
            Export CSV
          </button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Scan Overview</h2>
        <div className="rounded-xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] p-4 shadow-inner">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {prioritizedRisks.map(({ severity, count }) => {
              const highlight = severity === prioritizedRisks[0]?.severity;
              const severityColor = severityPalette[severity];
              const panelStyle: React.CSSProperties = highlight
                ? {
                    background: `color-mix(in srgb, ${severityColor} 18%, var(--kali-panel))`,
                    borderColor: `color-mix(in srgb, ${severityColor} 45%, transparent)`,
                    boxShadow: `0 12px 35px color-mix(in srgb, ${severityColor} 15%, transparent)`,
                  }
                : {
                    background: 'var(--kali-panel)',
                    borderColor: 'var(--kali-panel-border)',
                  };
              return (
                <div
                  key={severity}
                  className="flex flex-col gap-1 rounded-lg border p-4 transition"
                  style={panelStyle}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                    {severity}
                  </p>
                  <p className="text-3xl font-bold">{count}</p>
                  <p className="text-xs text-gray-400">hosts impacted</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">Exposure trend</p>
              <p className="text-xs text-gray-500">
                Weekly findings volume for the monitored scope.
              </p>
            </div>
            <svg
              width={trendWidth}
              height={trendHeight}
              className="rounded bg-[color:var(--kali-panel-highlight)]"
            >
              <path d={trendPath} stroke="var(--kali-terminal-green)" strokeWidth={2} fill="none" />
            </svg>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Findings</h2>
        <div className="mb-4 space-y-4 rounded-xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
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
                      color: 'color-mix(in srgb, var(--kali-terminal-text) 45%, transparent)',
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
            <p className="text-xs uppercase tracking-wide text-gray-400">Type</p>
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
        <div className="overflow-hidden rounded-xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] shadow-inner">
          <div role="table" aria-label="OpenVAS findings" className="divide-y divide-[color:var(--kali-panel-border)] text-sm text-gray-200">
            <div
              role="row"
              className="grid grid-cols-[minmax(140px,1fr)_minmax(0,2fr)_minmax(120px,1fr)] gap-4 bg-[color:var(--kali-panel)] px-4 py-3 text-xs uppercase tracking-wide text-gray-400"
            >
              <span role="columnheader">Host</span>
              <span role="columnheader">Vulnerability</span>
              <span role="columnheader">CVSS</span>
            </div>
            {filteredFindings.length === 0 && (
              <div role="row" className="px-6 py-8 text-center text-gray-500">
                No findings match the current filters.
              </div>
            )}
            {filteredFindings.map((f) => {
              const key = `${f.host}-${f.id}`;
              const severityColor = severityPalette[f.severity];
              const rowStyle: React.CSSProperties =
                f.severity === 'Critical'
                  ? {
                      boxShadow: `0 0 0 1px color-mix(in srgb, ${severityColor} 32%, transparent), 0 0 18px color-mix(in srgb, ${severityColor} 22%, transparent)`,
                    }
                  : f.severity === 'High'
                  ? {
                      boxShadow: `0 0 0 1px color-mix(in srgb, ${severityColor} 28%, transparent)`,
                    }
                  : {};
              return (
                <div key={key} role="rowgroup" className="divide-y divide-[color:var(--kali-panel-border)]">
                  <button
                    type="button"
                    onClick={() => toggleRow(key)}
                    className="grid w-full grid-cols-[minmax(140px,1fr)_minmax(0,2fr)_minmax(120px,1fr)] items-stretch gap-4 bg-[color:var(--kali-panel)] px-4 py-4 text-left transition hover:bg-[color:var(--kali-panel-highlight)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-blue)]"
                    aria-expanded={!!expanded[key]}
                    aria-label="Toggle vulnerability details"
                    style={rowStyle}
                  >
                    <span className="flex flex-col gap-1 text-sm">
                      <span className="font-mono text-xs text-gray-400">{f.host}</span>
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
                      <span className="font-semibold text-gray-100">{f.name}</span>
                      <span className="text-xs text-gray-400">{f.id}</span>
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
                    <span className="flex flex-col justify-center gap-2 text-xs text-gray-400">
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
                    <div className="bg-[color:var(--kali-panel)] px-6 py-4 text-sm">
                      <table className="w-full">
                        <tbody>
                          <tr>
                            <td className="space-y-4">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400">Description</p>
                                <p className="text-sm text-gray-200">{f.description}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400">Remediation</p>
                                <p className="text-sm text-amber-300">{f.remediation}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400">Timeline</p>
                                <ul className="space-y-2 text-xs text-gray-300">
                                  {f.timeline.map((event) => (
                                    <li
                                      key={`${f.id}-${event.date}-${event.event}`}
                                      className="flex gap-3 rounded-lg px-3 py-2"
                                      style={{
                                        background: 'color-mix(in srgb, var(--kali-panel-highlight) 85%, transparent)',
                                      }}
                                    >
                                      <span className="w-24 text-gray-400">{event.date}</span>
                                      <span className="flex-1">{event.event}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <h2 className="text-xl font-semibold">Remediation Summary</h2>
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

      <h2 className="text-xl mt-6 mb-2">Compare Reports</h2>
      <ResultDiff />
      <p className="mt-4 text-xs text-gray-400">
        All data is static and for demonstration only. Use OpenVAS responsibly
        and only on systems you are authorized to test.
      </p>
    </div>
  );
};

export default OpenVASReport;
