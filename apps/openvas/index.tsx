'use client';

import React, { useMemo, useState } from 'react';
import KillSwitchGate from '../../components/common/KillSwitchGate';
import { KILL_SWITCH_IDS } from '../../lib/flags';
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
  Low: 'bg-green-700',
  Medium: 'bg-yellow-700',
  High: 'bg-orange-700',
  Critical: 'bg-red-700',
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
  if (score >= 9) return 'bg-red-700';
  if (score >= 7) return 'bg-orange-700';
  if (score >= 4) return 'bg-yellow-700';
  return 'bg-green-700';
};

const OpenVASReportContent: React.FC = () => {
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
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2 w-12 text-left">Details</th>
              <th className="p-2">Host</th>
              <th className="p-2">Vulnerability</th>
              <th className="p-2">CVSS</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const key = `${f.host}-${f.id}`;
              return (
                <React.Fragment key={key}>
                  <tr className="hover:bg-gray-800">
                    <td className="p-2 align-middle">
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className="px-2 py-1 rounded bg-gray-700 text-xs"
                        aria-expanded={Boolean(expanded[key])}
                        aria-label={`Toggle details for ${f.name}`}
                      >
                        {expanded[key] ? 'Hide' : 'Show'}
                      </button>
                    </td>
                    <td className="p-2">{f.host}</td>
                    <td className="p-2">{f.name}</td>
                    <td className="p-2">
                      <div
                        className="w-full bg-gray-700 rounded h-3"
                        role="img"
                        aria-label={`CVSS ${f.cvss}`}
                      >
                        <div
                          className={`${cvssColor(f.cvss)} h-3 rounded`}
                          style={{ width: `${(f.cvss / 10) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                    {expanded[key] && (
                      <tr aria-label={`Details for ${f.name}`}>
                        <td colSpan={4} className="p-2 bg-gray-800">
                          <p className="text-sm mb-1">{f.description}</p>
                          <p className="text-xs text-yellow-300">{f.remediation}</p>
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

const OpenVASReport: React.FC = () => (
  <KillSwitchGate
    appId="openvas"
    appTitle="OpenVAS"
    killSwitchId={KILL_SWITCH_IDS.openvas}
  >
    {() => <OpenVASReportContent />}
  </KillSwitchGate>
);

export default OpenVASReport;

