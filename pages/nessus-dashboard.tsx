import React, { useMemo } from 'react';
import data from '../components/apps/nessus/sample-report.json';

const severityColors: Record<string, string> = {
  Critical: '#b91c1c',
  High: '#c2410c',
  Medium: '#b45309',
  Low: '#1d4ed8',
};
const NessusDashboard: React.FC = () => {
  const findings = data as { severity: keyof typeof severityColors }[];

  const counts = useMemo(() => {
    return findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {});
  }, [findings]);

  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl mb-4">Nessus Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {Object.entries(counts).map(([sev, count]) => (
          <div
            key={sev}
            className="bg-gray-800 p-4 rounded flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded-full ring-2 ring-white"
                style={{ backgroundColor: severityColors[sev] }}
              />
              <span className="text-sm">{sev}</span>
            </div>
            <span className="text-xl font-semibold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NessusDashboard;
