'use client';

import React, { useMemo, useState } from 'react';
import ResultDiff from './components/ResultDiff';

interface Vulnerability {
  id: string;
  name: string;
  cvss: number;
  epss: number;
  description: string;
  remediation: string;
}

interface HostReport {
  host: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  vulns: Vulnerability[];
}

const riskColors: Record<HostReport['risk'], string> = {
  Low: 'var(--severity-low)',
  Medium: 'var(--severity-medium)',
  High: 'var(--severity-high)',
  Critical: 'var(--severity-critical)',
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
      },
      {
        id: 'CVE-2022-1234',
        name: 'Apache Path Traversal',
        cvss: 7.5,
        epss: 0.32,
        description: 'Improper input validation allows directory traversal.',
        remediation: 'Apply vendor patch for Apache',
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
      },
    ],
  },
];

const cvssColor = (score: number) => {
  if (score >= 9) return 'var(--severity-critical)';
  if (score >= 7) return 'var(--severity-high)';
  if (score >= 4) return 'var(--severity-medium)';
  return 'var(--severity-low)';
};

const OpenVASReport: React.FC = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const remediationTags = useMemo(() => {
    const tags = new Set<string>();
    sampleData.forEach((h) => h.vulns.forEach((v) => tags.add(v.remediation)));
    return Array.from(tags);
  }, []);

  const findings = useMemo(
    () =>
      sampleData.flatMap((host) =>
        host.vulns.map((v) => ({ ...v, host: host.host }))
      ),
    [],
  );

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

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

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
    const header = 'Host,ID,Name,CVSS,EPSS,Description,Remediation';
    const rows = findings.map(
      (f) =>
        `${f.host},${f.id},"${f.name}",${f.cvss},${f.epss},"${f.description}","${f.remediation}"`,
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
    <div
      className="min-h-screen p-4 space-y-6"
      style={{
        backgroundColor: 'var(--theme-color-background)',
        color: 'var(--theme-color-text)',
      }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">OpenVAS Report</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJSON}
            className="px-2 py-1 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color-accent)] focus-visible:ring-offset-2"
            style={{
              backgroundColor: 'var(--theme-color-accent)',
              color: 'var(--theme-color-on-accent)',
            }}
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="px-2 py-1 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color-accent)] focus-visible:ring-offset-2"
            style={{
              backgroundColor: 'var(--theme-color-accent)',
              color: 'var(--theme-color-on-accent)',
            }}
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
              className="p-4 rounded"
              style={{
                backgroundColor: riskColors[risk as keyof typeof riskColors],
                color: 'var(--severity-text)',
              }}
            >
              <p className="text-sm">{risk}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
        <svg
          width={trendWidth}
          height={trendHeight}
          style={{
            backgroundColor: 'var(--chart-surface)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <path
            d={trendPath}
            stroke="var(--chart-line)"
            strokeWidth={2}
            fill="none"
          />
        </svg>
      </section>

      <section>
        <h2 className="text-xl mb-2">Findings</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">Host</th>
              <th className="p-2">Vulnerability</th>
              <th className="p-2">CVSS</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const key = `${f.host}-${f.id}`;
              const isExpanded = Boolean(expanded[key]);
              return (
                <React.Fragment key={key}>
                  <tr
                    style={{
                      backgroundColor: isExpanded
                        ? 'var(--table-row-alt)'
                        : 'transparent',
                    }}
                  >
                    <td className="p-2">{f.host}</td>
                    <td className="p-2">{f.name}</td>
                    <td className="p-2 align-middle">
                      <progress
                        value={f.cvss}
                        max={10}
                        aria-label={`CVSS score ${f.cvss}`}
                        className="w-full h-3 rounded"
                        style={{
                          accentColor: cvssColor(f.cvss),
                          backgroundColor: 'var(--chart-grid)',
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className={`${tabButtonBase} ml-0`}
                        style={tabButtonStyle(isExpanded)}
                        aria-expanded={isExpanded}
                        aria-label={`Toggle details for ${f.name} on ${f.host}`}
                      >
                        {isExpanded ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr role="presentation" aria-label={`Details for ${f.name} on ${f.host}`}>
                      <td
                        colSpan={4}
                        className="p-2"
                        style={{
                          backgroundColor: 'var(--chart-surface)',
                          border: `1px solid var(--theme-border-subtle)`,
                        }}
                      >
                        <p className="text-sm mb-1">{f.description}</p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--theme-muted-text)' }}
                        >
                          {f.remediation}
                        </p>
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
            className="px-2 py-1 rounded text-sm"
            style={{
              backgroundColor: 'var(--chart-series-2)',
              color: 'var(--theme-color-on-accent)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <h2 className="text-xl mt-6 mb-2">Compare Reports</h2>
      <ResultDiff />
      <p
        className="mt-4 text-xs"
        style={{ color: 'var(--theme-muted-text)' }}
      >
        All data is static and for demonstration only. Use OpenVAS responsibly
        and only on systems you are authorized to test.
      </p>
    </div>
  );
};

export default OpenVASReport;

