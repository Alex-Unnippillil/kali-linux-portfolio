import React, { useEffect, useState } from 'react';
import reportData from './mock-report.json';

// helpers for persistent storage of jobs and false positives
export const loadJobDefinitions = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('nessusJobs') || '[]');
  } catch {
    return [];
  }
};

export const saveJobDefinition = (job) => {
  if (typeof window === 'undefined') return [];
  const jobs = loadJobDefinitions();
  const updated = [...jobs, job];
  localStorage.setItem('nessusJobs', JSON.stringify(updated));
  return updated;
};

export const loadFalsePositives = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('nessusFalsePositives') || '[]');
  } catch {
    return [];
  }
};

export const recordFalsePositive = (scanId, reason) => {
  if (typeof window === 'undefined') return [];
  const fps = loadFalsePositives();
  const updated = [...fps, { scanId, reason }];
  localStorage.setItem('nessusFalsePositives', JSON.stringify(updated));
  return updated;
};

const Nessus = () => {
  const [report, setReport] = useState(null);

  useEffect(() => {
    setReport(reportData);
  }, []);

  if (!report) {
    return <div className="h-full w-full p-4 bg-gray-900 text-white">Loading...</div>;
  }

  const severities = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <p className="mb-4 text-sm text-yellow-400">
        This interface is a simulation using mock data and does not perform real Nessus scans.
      </p>
      {severities.map((level) => {
        const vulns = report.vulnerabilities.filter((v) => v.severity === level);
        if (!vulns.length) return null;
        return (
          <div key={level} className="mb-6">
            <h3 className="text-lg capitalize">{level} Severity</h3>
            <ul className="space-y-4 mt-2">
              {vulns.map((v) => (
                <li key={v.id} className="border border-gray-700 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="font-bold">{v.name}</span>
                    <span className="text-sm">CVSS {v.cvss}</span>
                  </div>
                  <div className="text-xs text-gray-400">Vector: {v.vector}</div>
                  <h4 className="mt-2 text-sm">Remediation Checklist</h4>
                  <ul className="list-disc list-inside text-xs">
                    {v.remediation.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default Nessus;

export const displayNessus = () => {
  return <Nessus />;
};

