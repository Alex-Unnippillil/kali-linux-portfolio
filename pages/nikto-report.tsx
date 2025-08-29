import React, { useEffect, useMemo, useState } from 'react';

interface NiktoFinding {
  path: string;
  finding: string;
  references: string[];
  severity: string;
  details: string;
}

const NiktoReport: React.FC = () => {
  const [findings, setFindings] = useState<NiktoFinding[]>([]);
  const [severity, setSeverity] = useState('All');
  const [pathFilter, setPathFilter] = useState('');
  const [selected, setSelected] = useState<NiktoFinding | null>(null);

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
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
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
              className="odd:bg-gray-800 cursor-pointer hover:bg-gray-700"
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
