"use client";

import React, { useEffect, useMemo, useState } from 'react';

import {
  generateNiktoHtmlReport,
  generateNiktoJsonReport,
  type NiktoReportMetadata,
} from '../utils/niktoReportGenerators';

interface NiktoFinding {
  path: string;
  finding: string;
  references: string[];
  severity: string;
  details: string;
}

const severityColors: Record<string, string> = {
  High: '#b45309',
  Medium: '#a16207',
  Low: '#1e40af',
  Info: '#4b5563',
};

const NiktoReport: React.FC = () => {
  const [findings, setFindings] = useState<NiktoFinding[]>([]);
  const [severity, setSeverity] = useState('All');
  const [pathFilter, setPathFilter] = useState('');
  const [selected, setSelected] = useState<NiktoFinding | null>(null);

  const metadata = useMemo<NiktoReportMetadata>(
    () => ({
      target: {
        host: 'example.com',
        port: '443',
        protocol: 'https',
      },
      command: 'nikto -h example.com -ssl',
      notes: 'Static training data packaged with the Kali Linux Portfolio demo.',
    }),
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nikto/report.json');
        const data = await res.json();
        setFindings(data);
      } catch {
        // ignore errors
      }
    };
    load();
  }, []);

  const counts = useMemo(() => {
    return findings.reduce<Record<string, number>>((acc, f) => {
      const sev = f.severity || 'Info';
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
    }, {});
  }, [findings]);

  const filtered = useMemo(
    () =>
      findings.filter(
        (f) =>
          (severity === 'All' || f.severity.toLowerCase() === severity.toLowerCase()) &&
          f.path.toLowerCase().startsWith(pathFilter.toLowerCase())
      ),
    [findings, severity, pathFilter]
  );

  const exportJSON = () => {
    const report = generateNiktoJsonReport(filtered, {
      ...metadata,
      filters: {
        severity,
        pathPrefix: pathFilter,
      },
    });
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nikto-findings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportHTML = () => {
    const html = generateNiktoHtmlReport(filtered, {
      ...metadata,
      filters: {
        severity,
        pathPrefix: pathFilter,
      },
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nikto-findings.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const rows = [
      ['Path', 'Finding', 'Severity', 'References', 'Details'],
      ...filtered.map((f) => [
        f.path,
        f.finding,
        f.severity,
        f.references.join('; '),
        f.details,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nikto-findings.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-xl mb-4">Nikto Report</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {['High', 'Medium', 'Low', 'Info'].map((sev) => (
          <div
            key={sev}
            className="bg-gray-800 p-2 rounded flex items-center justify-between"
          >
            <span
              className="px-2 py-0.5 rounded-full text-xs text-white"
              style={{ backgroundColor: severityColors[sev] }}
            >
              {sev}
            </span>
            <span className="font-mono">{counts[sev] || 0}</span>
          </div>
        ))}
      </div>
      <div className="flex space-x-2 mb-4">
        <input
          placeholder="Filter by path"
          className="p-2 rounded text-black"
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
        />
        <select
          className="p-2 rounded text-black"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          {['All', 'Info', 'Low', 'Medium', 'High'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportHTML}
          className="p-2 bg-blue-600 rounded"
          aria-label="Export HTML"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={24}
            height={24}
          >
            <path d="M12 3v12m0 0l4-4m-4 4-4-4" />
            <path d="M4.5 15.75v3.75A2.25 2.25 0 006.75 21h10.5A2.25 2.25 0 0019.5 19.5v-3.75" />
          </svg>
        </button>
        <button
          type="button"
          onClick={exportJSON}
          className="p-2 bg-blue-600 rounded"
          aria-label="Export JSON"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={24}
            height={24}
          >
            <path d="M12 3v12m0 0l4-4m-4 4-4-4" />
            <path d="M4.5 15.75v3.75A2.25 2.25 0 006.75 21h10.5A2.25 2.25 0 0019.5 19.5v-3.75" />
          </svg>
        </button>
        <button
          type="button"
          onClick={exportCSV}
          className="p-2 bg-blue-600 rounded"
          aria-label="Export CSV"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={24}
            height={24}
          >
            <path d="M12 3v12m0 0l4-4m-4 4-4-4" />
            <path d="M4.5 15.75v3.75A2.25 2.25 0 006.75 21h10.5A2.25 2.25 0 0019.5 19.5v-3.75" />
          </svg>
        </button>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-gray-700">
            <th className="p-2">Path</th>
            <th className="p-2">Finding</th>
            <th className="p-2">References</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((f) => (
            <tr
              key={f.path}
              className="odd:bg-gray-800 cursor-pointer hover:bg-gray-700 border-l-4"
              style={{ borderLeftColor: severityColors[f.severity] || '#4b5563' }}
              onClick={() => setSelected(f)}
            >
              <td className="p-2">{f.path}</td>
              <td className="p-2">{f.finding}</td>
              <td className="p-2">{f.references.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-gray-800 p-4 rounded max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg mb-2">{selected.path}</h2>
            <p className="mb-2">
              <span className="font-bold">Severity:</span> {selected.severity}
            </p>
            <p className="mb-2">{selected.finding}</p>
            <p className="mb-2">
              <span className="font-bold">References:</span>{' '}
              {selected.references.join(', ')}
            </p>
            <p>{selected.details}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 rounded"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NiktoReport;
