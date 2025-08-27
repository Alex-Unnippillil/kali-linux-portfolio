import React, { useMemo, useState } from 'react';
import data from '../components/apps/nessus/sample-report.json';

const severityColors: Record<string, string> = {
  Critical: '#b91c1c',
  High: '#c2410c',
  Medium: '#b45309',
  Low: '#1d4ed8',
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
      <div className="flex flex-col md:flex-row gap-4">
        <ul className="md:w-1/2 space-y-2">
          {findings.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => setSelected(f)}
                className="w-full text-left p-2 rounded bg-gray-800 hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-sm">{f.cvss}</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span
                    aria-hidden="true"
                    className="w-3 h-3 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: severityColors[f.severity] }}
                  />
                  <span className="text-xs">{f.severity}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="md:flex-1">
          {selected ? (
            <section className="bg-gray-800 p-4 rounded h-full">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mb-2 text-sm bg-red-600 px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-400"
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
            </section>
          ) : (
            <p className="text-sm text-gray-400">Select a finding to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NessusReport;
