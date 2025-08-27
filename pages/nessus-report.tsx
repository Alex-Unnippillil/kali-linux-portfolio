import React, { useMemo, useState } from 'react';
import data from '../components/apps/nessus/sample-report.json';

const severityColors: Record<string, string> = {
  Critical: '#991b1b',
  High: '#b45309',
  Medium: '#a16207',
  Low: '#1e40af',
};

interface Finding {
  id: string;
  name: string;
  cvss: number;
  severity: keyof typeof severityColors;
  description: string;
}

const radius = 60;
const circumference = 2 * Math.PI * radius;

const NessusReport: React.FC = () => {
  const [selected, setSelected] = useState<Finding | null>(null);
  const findings = data as Finding[];

  const counts = useMemo(() => {
    return findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {});
  }, [findings]);

  const segments = useMemo(() => {
    const total = findings.length;
    let offset = 0;
    return Object.entries(counts).map(([sev, count]) => {
      const dash = (count / total) * circumference;
      const segment = (
        <circle
          key={sev}
          r={radius}
          cx={radius + 20}
          cy={radius + 20}
          fill="transparent"
          stroke={severityColors[sev]}
          strokeWidth="30"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${radius + 20} ${radius + 20})`}
        />
      );
      offset += dash;
      return segment;
    });
  }, [counts, findings.length]);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Sample Nessus Report</h1>
      <svg
        width={(radius + 20) * 2}
        height={(radius + 20) * 2}
        aria-label="CVSS severity distribution"
        className="mx-auto mb-4"
      >
        {segments}
      </svg>
      <table className="w-full mb-4 text-sm">
        <thead>
          <tr className="text-left border-b border-gray-700">
            <th className="py-1">ID</th>
            <th className="py-1">Finding</th>
            <th className="py-1">CVSS</th>
            <th className="py-1">Severity</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr
              key={f.id}
              className="border-b border-gray-800 cursor-pointer hover:bg-gray-800"
              onClick={() => setSelected(f)}
            >
              <td className="py-1">{f.id}</td>
              <td className="py-1">{f.name}</td>
              <td className="py-1">{f.cvss}</td>
              <td className="py-1">{f.severity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <div
          role="dialog"
          className="fixed top-0 right-0 h-full w-80 bg-gray-800 p-4 overflow-auto shadow-lg"
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-2 text-sm bg-red-600 px-2 py-1 rounded"
          >
            Close
          </button>
          <h2 className="text-xl mb-2">{selected.name}</h2>
          <p className="text-sm mb-2">
            CVSS {selected.cvss} ({selected.severity})
          </p>
          <p className="mb-4 text-sm whitespace-pre-wrap">
            {selected.description}
          </p>
          <p className="text-xs text-gray-400">
            Disclaimer: This sample report is for demonstration purposes only.
          </p>
        </div>
      )}
    </div>
  );
};

export default NessusReport;
