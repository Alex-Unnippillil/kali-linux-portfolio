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
  host: string;
  pluginFamily: string;
  description: string;
}

const radius = 60;
const circumference = 2 * Math.PI * radius;

const NessusReport: React.FC = () => {
  const [selected, setSelected] = useState<Finding | null>(null);
  const [severity, setSeverity] = useState<string>('All');
  const [host, setHost] = useState<string>('All');
  const [family, setFamily] = useState<string>('All');
  const [findings, setFindings] = useState<Finding[]>(data as Finding[]);

  const hosts = useMemo(
    () => Array.from(new Set(findings.map((f) => f.host))).sort(),
    [findings]
  );
  const families = useMemo(
    () => Array.from(new Set(findings.map((f) => f.pluginFamily))).sort(),
    [findings]
  );

  const counts = useMemo(() => {
    return findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {});
  }, [findings]);

  const filtered = useMemo(
    () =>
      findings.filter(
        (f) =>
          (severity === 'All' || f.severity === severity) &&
          (host === 'All' || f.host === host) &&
          (family === 'All' || f.pluginFamily === family)
      ),
    [findings, severity, host, family]
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name !== 'sample-report.json') {
      alert('Only sample-report.json is supported in this demo.');
      return;
    }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setFindings(json);
      setSeverity('All');
      setHost('All');
      setFamily('All');
    } catch {
      alert('Invalid JSON file.');
    }
  };

  const exportCSV = () => {
    const rows = filtered.map((f) => [
      f.id,
      f.name,
      f.cvss,
      f.severity,
      f.host,
      f.pluginFamily,
      f.description,
    ]);
    const header = [
      'ID',
      'Finding',
      'CVSS',
      'Severity',
      'Host',
      'Plugin Family',
      'Description',
    ];
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nessus_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      <div className="flex items-center space-x-2 mb-4 flex-wrap">
        <label htmlFor="report-file" className="text-sm">
          Import report
        </label>
        <input
          id="report-file"
          type="file"
          accept=".json"
          className="text-black p-1 rounded"
          onChange={handleFile}
        />
        <label htmlFor="severity-filter" className="text-sm">
          Filter severity
        </label>
        <select
          id="severity-filter"
          className="text-black p-1 rounded"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label htmlFor="host-filter" className="text-sm">
          Filter host
        </label>
        <select
          id="host-filter"
          className="text-black p-1 rounded"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        >
          {['All', ...hosts].map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <label htmlFor="family-filter" className="text-sm">
          Filter family
        </label>
        <select
          id="family-filter"
          className="text-black p-1 rounded"
          value={family}
          onChange={(e) => setFamily(e.target.value)}
        >
          {['All', ...families].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportCSV}
          className="px-2 py-1 bg-blue-600 rounded text-sm"
        >
          Export CSV
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-2">
        Only the bundled sample-report.json is supported. Files are processed locally and never uploaded.
      </p>
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
            <th className="py-1" scope="col">ID</th>
            <th className="py-1" scope="col">Finding</th>
            <th className="py-1" scope="col">CVSS</th>
            <th className="py-1" scope="col">Severity</th>
            <th className="py-1" scope="col">Host</th>
            <th className="py-1" scope="col">Plugin Family</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((f) => (
            <tr
              key={f.id}
              className="border-b border-gray-800 cursor-pointer hover:bg-gray-800"
              onClick={() => setSelected(f)}
            >
              <td className="py-1">{f.id}</td>
              <td className="py-1">{f.name}</td>
              <td className="py-1">{f.cvss}</td>
              <td className="py-1">
                <span
                  className="px-2 py-0.5 rounded-full text-xs text-white"
                  style={{ backgroundColor: severityColors[f.severity] }}
                >
                  {f.severity}
                </span>
              </td>
              <td className="py-1">{f.host}</td>
              <td className="py-1">{f.pluginFamily}</td>
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
