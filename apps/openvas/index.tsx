'use client';

import React, { useMemo } from 'react';
import TaskTemplates from './components/TaskTemplates';

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

const OpenVASReport: React.FC = () => {
  const remediationTags = useMemo(() => {
    const tags = new Set<string>();
    sampleData.forEach((h) =>
      h.vulns.forEach((v) => tags.add(v.remediation))
    );
    return Array.from(tags);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl mb-4">OpenVAS Report</h1>
      <div className="grid gap-4 md:grid-cols-2" role="list">
        {sampleData.map((host) => (
          <div
            key={host.host}
            className="bg-gray-800 p-4 rounded"
            role="listitem"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl">{host.host}</h2>
              <span
                className={`px-2 py-1 rounded text-sm ${riskColors[host.risk]}`}
              >
                {host.risk}
              </span>
            </div>
            <ul className="space-y-2">
              {host.vulns.map((v) => (
                <li key={v.id} className="bg-gray-900 p-2 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{v.name}</p>
                    <div className="flex gap-1">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs bg-blue-700"
                        aria-label={`CVSS score ${v.cvss}`}
                      >
                        CVSS {v.cvss}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-xs bg-purple-700"
                        aria-label={`EPSS probability ${v.epss}`}
                      >
                        EPSS {Math.round(v.epss * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mb-1">{v.description}</p>
                  <p className="text-xs text-yellow-300">{v.remediation}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <h2 className="text-xl mt-6 mb-2">Remediation Summary</h2>
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
      <TaskTemplates />
      <p className="mt-4 text-xs text-gray-400">
        All data is static and for demonstration only. Use OpenVAS responsibly
        and only on systems you are authorized to test.
      </p>
    </div>
  );
};

export default OpenVASReport;

