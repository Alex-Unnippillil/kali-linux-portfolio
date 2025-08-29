'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface NiktoFinding {
  path: string;
  finding: string;
  references: string[];
  severity: string;
  details: string;
}

const suggestions: Record<string, string> = {
  '/admin': 'Restrict access to the admin portal or remove it from public view.',
  '/cgi-bin/test': 'Remove or secure unnecessary CGI scripts and ensure they are up to date.',
  '/': 'Disable or standardize ETag headers to avoid disclosing inodes.',
};

const NiktoPage: React.FC = () => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [ssl, setSsl] = useState(false);
  const [findings, setFindings] = useState<NiktoFinding[]>([]);
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

  const command = `nikto -h ${host || 'TARGET'}${port ? ` -p ${port}` : ''}${ssl ? ' -ssl' : ''}`;

  const grouped = useMemo(() => {
    return findings.reduce<Record<string, NiktoFinding[]>>((acc, f) => {
      acc[f.severity] = acc[f.severity] || [];
      acc[f.severity].push(f);
      return acc;
    }, {});
  }, [findings]);

  const htmlReport = useMemo(() => {
    const rows = findings
      .map(
        (f) =>
          `<tr><td>${f.path}</td><td>${f.finding}</td><td>${f.severity}</td></tr>`
      )
      .join('');
    return `<!DOCTYPE html><html><body><h1>Nikto Report</h1><table border="1"><tr><th>Path</th><th>Finding</th><th>Severity</th></tr>${rows}</table></body></html>`;
  }, [findings]);

  const copyReport = async () => {
    try {
      await navigator.clipboard?.writeText(htmlReport);
    } catch {
      // ignore
    }
  };

  const exportReport = () => {
    const blob = new Blob([htmlReport], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nikto-report.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-4">
      <h1 className="text-2xl mb-4">Nikto Scanner</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Build a nikto command without running any scans. Data and reports are static and for learning only.
      </p>
      <form onSubmit={(e) => e.preventDefault()} className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="nikto-host" className="block text-sm mb-1">
            Host
          </label>
          <input
            id="nikto-host"
            className="w-full p-2 rounded text-black"
            value={host}
            onChange={(e) => setHost(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="nikto-port" className="block text-sm mb-1">
            Port
          </label>
          <input
            id="nikto-port"
            type="number"
            className="w-full p-2 rounded text-black"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
        <div className="flex items-center mt-2">
          <input
            id="nikto-ssl"
            type="checkbox"
            className="mr-2"
            checked={ssl}
            onChange={(e) => setSsl(e.target.checked)}
          />
          <label htmlFor="nikto-ssl" className="text-sm">
            SSL
          </label>
        </div>
      </form>
      <div>
        <h2 className="text-lg mb-2">Command Preview</h2>
        <pre className="bg-black text-green-400 p-2 rounded overflow-auto">{command}</pre>
      </div>
      <div>
        <h2 className="text-lg mb-2">Findings</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-700">
              <th className="p-2 text-left">Path</th>
              <th className="p-2 text-left">Finding</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([sev, list]) => (
              <React.Fragment key={sev}>
                <tr className="bg-gray-800">
                  <td colSpan={2} className="p-2 font-bold">
                    {sev}
                  </td>
                </tr>
                {list.map((f) => (
                  <tr
                    key={f.path}
                    className="odd:bg-gray-900 cursor-pointer hover:bg-gray-700"
                    onClick={() => setSelected(f)}
                  >
                    <td className="p-2">{f.path}</td>
                    <td className="p-2">{f.finding}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="fixed top-0 right-0 w-80 h-full bg-gray-800 p-4 overflow-auto shadow-lg">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-2 bg-red-600 px-2 py-1 rounded text-sm"
          >
            Close
          </button>
          <h3 className="text-xl mb-2">{selected.path}</h3>
          <p className="mb-2">{selected.finding}</p>
          <p className="mb-2">
            <span className="font-bold">Severity:</span> {selected.severity}
          </p>
          <p className="mb-2">
            <span className="font-bold">References:</span> {selected.references.join(', ')}
          </p>
          <p className="mb-4">{selected.details}</p>
          <p className="text-sm text-green-300">
            {suggestions[selected.path] || 'No suggestion available.'}
          </p>
        </div>
      )}
      <div>
        <h2 className="text-lg mb-2">HTML Report Preview</h2>
        <div className="flex space-x-2 mb-2">
          <button
            type="button"
            onClick={copyReport}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Copy HTML
          </button>
          <button
            type="button"
            onClick={exportReport}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Export HTML
          </button>
        </div>
        <iframe
          title="Nikto HTML Report"
          srcDoc={htmlReport}
          className="w-full h-64 bg-white"
        />
      </div>
    </div>
  );
};

export default NiktoPage;
