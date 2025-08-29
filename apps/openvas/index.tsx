'use client';

import React from 'react';
import TagRiskFilters, { HostReport } from './components/TagRiskFilters';

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

const OpenVASReport: React.FC = () => (
  <div className="min-h-screen bg-gray-900 text-white p-4">
    <h1 className="text-2xl mb-4">OpenVAS Report</h1>
    <TagRiskFilters reports={sampleData} />
    <p className="mt-4 text-xs text-gray-400">
      All data is static and for demonstration only. Use OpenVAS responsibly
      and only on systems you are authorized to test.
    </p>
  </div>
);

export default OpenVASReport;
