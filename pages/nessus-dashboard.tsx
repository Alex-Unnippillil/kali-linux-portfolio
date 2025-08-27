import React, { useMemo } from 'react';
import data from '../components/apps/nessus/sample-report.json';

const severityColors: Record<string, string> = {
  Critical: 'bg-red-700',
  High: 'bg-orange-600',
  Medium: 'bg-yellow-600',
  Low: 'bg-blue-700',
};

const severities = ['Critical', 'High', 'Medium', 'Low'];

const NessusDashboard: React.FC = () => {
  const counts = useMemo(() => {
    return (data as any[]).reduce<Record<string, number>>((acc, item) => {
      const sev = item.severity as string;
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
    }, {});
  }, []);

  const max = Math.max(...severities.map((s) => counts[s] || 0), 1);

  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl mb-4">Nessus Dashboard</h1>
      <div
        className="flex items-end space-x-4 h-48"
        role="img"
        aria-label="Vulnerability counts by severity"
      >
        {severities.map((sev) => (
          <div
            key={sev}
            className={`${severityColors[sev]} w-24 text-center flex flex-col justify-end`}
            style={{ height: `${((counts[sev] || 0) / max) * 100}%` }}
            tabIndex={0}
            aria-label={`${sev} findings ${counts[sev] || 0}`}
          >
            <span className="pb-2 text-sm">
              {sev} {counts[sev] || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NessusDashboard;

