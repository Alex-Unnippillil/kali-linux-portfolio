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

const riskColors: Record<HostReport['risk'], string> = {
  Low: 'bg-green-700',
  Medium: 'bg-yellow-700',
  High: 'bg-orange-700',
  Critical: 'bg-red-700',
};

const severityOrder: HostReport['risk'][] = ['Critical', 'High', 'Medium', 'Low'];

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
  if (score >= 9) return 'bg-red-700';
  if (score >= 7) return 'bg-orange-700';
  if (score >= 4) return 'bg-yellow-700';
  return 'bg-green-700';
};

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
    <div className="min-h-screen bg-gray-900 text-white p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">OpenVAS Report</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJSON}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      <section>
        <h2 className="text-xl mb-2">Scan Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {Object.entries(riskSummary).map(([risk, count]) => (
            <div
              key={risk}
              className={`p-4 rounded ${riskColors[risk as keyof typeof riskColors]}`}
            >
              <p className="text-sm">{risk}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
        <svg
          width={trendWidth}
          height={trendHeight}
          className="bg-gray-800 rounded"
        >
          <path d={trendPath} stroke="#0ea5e9" strokeWidth={2} fill="none" />
        </svg>
      </section>

      <section>
        <h2 className="text-xl mb-2">Findings</h2>
        <div className="mb-4 space-y-3 rounded border border-gray-700 bg-gray-800 p-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Severity
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {severityOrder.map((severity) => (
                <button
                  key={severity}
                  type="button"
                  aria-pressed={severityFilters[severity]}
                  aria-label={`${severity} severity filter (${severityCounts[severity]} findings)`}
                  onClick={() => toggleSeverity(severity)}
                  className={`flex items-center gap-2 rounded border px-3 py-1 text-sm transition ${
                    severityFilters[severity]
                      ? 'border-sky-400 bg-sky-700/40 text-white'
                      : 'border-gray-700 bg-gray-900 text-gray-400'
                  }`}
                >
                  <span className="font-medium">{severity}</span>
                  <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-200">
                    {severityCounts[severity] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Type</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.keys(typeCounts).map((type) => {
                const isActive = typeFilters[type] ?? true;
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`${type} type filter (${typeCounts[type]} findings)`}
                    onClick={() => toggleType(type)}
                    className={`flex items-center gap-2 rounded border px-3 py-1 text-sm transition ${
                      isActive
                        ? 'border-emerald-400 bg-emerald-700/40 text-white'
                        : 'border-gray-700 bg-gray-900 text-gray-400'
                    }`}
                  >
                    <span className="font-medium">{type}</span>
                    <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-200">
                      {typeCounts[type] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">Host</th>
              <th className="p-2">Vulnerability</th>
              <th className="p-2">CVSS</th>
            </tr>
          </thead>
          <tbody>
            {filteredFindings.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-400">
                  No findings match the current filters.
                </td>
              </tr>
            )}
            {filteredFindings.map((f) => {
              const key = `${f.host}-${f.id}`;
              return (
                <React.Fragment key={key}>
                  <tr
                    className="cursor-pointer hover:bg-gray-800"
                    onClick={() => toggleRow(key)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleRow(key);
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={!!expanded[key]}
                    aria-label={`Toggle details for ${f.name} on ${f.host}`}
                  >
                    <td className="p-2">{f.host}</td>
                    <td className="p-2">
                      <div className="font-medium">{f.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 ${riskColors[f.severity]}`}
                        >
                          {f.severity}
                        </span>
                        <span className="rounded-full bg-gray-700 px-2 py-0.5">
                          {f.type}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="w-full bg-gray-700 rounded h-3">
                        <div
                          className={`${cvssColor(f.cvss)} h-3 rounded`}
                          style={{ width: `${(f.cvss / 10) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                  {expanded[key] && (
                    <tr>
                      <td colSpan={3} className="p-2 bg-gray-800">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Description
                            </p>
                            <p className="text-sm text-gray-200">{f.description}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Remediation
                            </p>
                            <p className="text-sm text-yellow-300">{f.remediation}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Timeline
                            </p>
                            <ul className="space-y-1 text-xs text-gray-300">
                              {f.timeline.map((event) => (
                                <li
                                  key={`${f.id}-${event.date}-${event.event}`}
                                  className="flex gap-3"
                                >
                                  <span className="w-24 text-gray-400">
                                    {event.date}
                                  </span>
                                  <span className="flex-1">{event.event}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </section>

      <h2 className="text-xl">Remediation Summary</h2>
      <div className="flex flex-wrap gap-2" role="list">
        {remediationTags.map((tag) => (
          <span
            key={tag}
            role="listitem"
            className="px-2 py-1 bg-green-700 rounded text-sm"
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
