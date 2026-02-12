import React, { useCallback, useEffect, useMemo, useState } from 'react';

const suggestions = {
  '/admin': 'Restrict access to the admin portal or remove it from public view.',
  '/cgi-bin/test':
    'Remove or secure unnecessary CGI scripts and ensure they are up to date.',
  '/': 'Disable or standardize ETag headers to avoid disclosing inodes.',
};

const severityTone = {
  info: 'text-slate-200',
  low: 'text-emerald-300',
  medium: 'text-amber-300',
  high: 'text-orange-300',
  critical: 'text-red-300',
};

const severityChipClass = (severity) => {
  const tone = severityTone[severity?.toLowerCase()] || 'text-kali-text';
  return `inline-flex items-center rounded-full border border-[var(--kali-panel-border)] bg-kali-muted px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${tone}`;
};

const primaryButtonClasses =
  'inline-flex items-center rounded-md border border-transparent bg-kali-primary px-3 py-1.5 text-sm font-semibold text-kali-inverse shadow transition-colors hover:bg-[var(--kali-blue-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';

const secondaryButtonClasses =
  'inline-flex items-center rounded-md border border-[var(--kali-panel-border)] bg-kali-secondary px-3 py-1.5 text-sm font-semibold text-kali-text transition-colors hover:bg-kali-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';

const NiktoApp = () => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [ssl, setSsl] = useState(false);
  const [findings, setFindings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [filterHost, setFilterHost] = useState('');
  const [filterPath, setFilterPath] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nikto/report.json');
        const data = await res.json();
        setFindings(data);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const command = `nikto -h ${host || 'TARGET'}${port ? ` -p ${port}` : ''}${
    ssl ? ' -ssl' : ''
  }`;

  const grouped = useMemo(() => {
    return findings.reduce((acc, f) => {
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

  const parseText = (text) => {
    const lines = text.split(/\r?\n/);
    const data = [];
    let currentHost = '';
    lines.forEach((line) => {
      const hostMatch = line.match(/^Host:\s*(.+)$/i);
      if (hostMatch) {
        currentHost = hostMatch[1].trim();
        return;
      }
      const entryMatch = line.match(/^([^\s]+)\s+(Info|Low|Medium|High|Critical)$/i);
      if (entryMatch && currentHost) {
        data.push({ host: currentHost, path: entryMatch[1], severity: entryMatch[2] });
      }
    });
    return data;
  };

  const parseXml = (text) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
    const host = doc.querySelector('target > hostname')?.textContent || '';
    const data = [];
    doc.querySelectorAll('item').forEach((item) => {
      const path = item.querySelector('uri, url')?.textContent || '';
      const severity = item.querySelector('severity')?.textContent || '';
      if (host && path) {
        data.push({ host, path, severity });
      }
    });
    return data;
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      let data = [];
      if (file.name.endsWith('.xml')) {
        data = parseXml(text);
      } else if (file.name.endsWith('.txt')) {
        data = parseText(text);
      } else {
        throw new Error('Unsupported file type');
      }
      if (!data.length) throw new Error('No valid findings');
      setEntries(data);
      setError('');
    } catch (err) {
      setEntries([]);
      setError(err.message || 'Failed to parse file');
    }
  }, []);

  const filtered = useMemo(() => {
    return entries.filter(
      (e) =>
        e.host.toLowerCase().includes(filterHost.toLowerCase()) &&
        e.path.toLowerCase().startsWith(filterPath.toLowerCase()) &&
        (filterSeverity === 'All' ||
          e.severity.toLowerCase() === filterSeverity.toLowerCase())
    );
  }, [entries, filterHost, filterPath, filterSeverity]);

  const exportCsv = () => {
    const rows = [
      ['Host', 'Path', 'Severity'],
      ...filtered.map((r) => [r.host, r.path, r.severity]),
    ];
    const csv = rows
      .map((row) =>
        row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nikto.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen space-y-4 bg-kali-background p-4 text-kali-text">
      <h1 className="text-2xl mb-4">Nikto Scanner</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Build a nikto command without running any scans. Data and reports are
        static and for learning only.
      </p>
      <form onSubmit={(e) => e.preventDefault()} className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="nikto-host" className="block text-sm mb-1">
            Host
          </label>
          <input
            id="nikto-host"
            aria-label="Host"
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
            aria-label="Port"
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
            aria-label="Toggle SSL"
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
        <pre className="overflow-auto rounded bg-kali-dark p-2 text-kali-terminal">
          {command}
        </pre>
      </div>
      <div>
        <h2 className="text-lg mb-2">Findings</h2>
        <div className="overflow-hidden rounded-lg border border-[var(--kali-panel-border)] bg-kali-secondary">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-kali-muted text-left text-xs font-semibold uppercase tracking-wide text-slate-200">
                <th className="p-2">Path</th>
                <th className="p-2">Finding</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([sev, list]) => (
                <React.Fragment key={sev}>
                  <tr aria-hidden="true" className="bg-kali-surface">
                    <td colSpan={2} className="p-2">
                      <span className={severityChipClass(sev)}>{sev}</span>
                    </td>
                  </tr>
                  {list.map((f, index) => {
                    const rowBackground = index % 2 === 0 ? 'bg-kali-muted' : 'bg-kali-secondary';
                    return (
                      <tr key={f.path} className="border-t border-[var(--kali-panel-border)]">
                        <td colSpan={2} className="p-0">
                          <button
                            type="button"
                            onClick={() => setSelected(f)}
                            className={`${rowBackground} grid w-full grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)] gap-3 p-2 text-left transition-colors hover:bg-[var(--kali-panel-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus`}
                            aria-label={`View finding details for ${f.path}`}
                          >
                            <span className="font-mono text-xs text-slate-200/80">{f.path}</span>
                            <span>{f.finding}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div className="fixed top-0 right-0 h-full w-80 overflow-auto border border-[var(--kali-panel-border)] bg-kali-surface p-4 shadow-kali-panel">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`${secondaryButtonClasses} mb-3 justify-center`}
          >
            Close
          </button>
          <h3 className="text-xl mb-2">{selected.path}</h3>
          <p className="mb-2">{selected.finding}</p>
          <p className="mb-2">
            <span className="font-bold">Severity:</span>{' '}
            <span className={severityChipClass(selected.severity)}>
              {selected.severity}
            </span>
          </p>
          <p className="mb-2">
            <span className="font-bold">References:</span> {selected.references.join(', ')}
          </p>
          <p className="mb-4">{selected.details}</p>
          <p className="text-sm text-kali-primary">
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
            className={primaryButtonClasses}
          >
            Copy HTML
          </button>
          <button
            type="button"
            onClick={exportReport}
            className={secondaryButtonClasses}
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
      <div>
        <h2 className="text-lg mb-2">Parse Report</h2>
        <div
          data-testid="drop-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="mb-4 border-2 border-dashed border-[var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] p-4 text-center"
        >
          Drop Nikto text or XML report here
        </div>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        {entries.length > 0 && (
          <div>
            <div className="flex space-x-2 mb-2">
              <input
                placeholder="Filter host"
                value={filterHost}
                onChange={(e) => setFilterHost(e.target.value)}
                className="p-1 rounded text-black flex-1"
                aria-label="Filter host"
              />
              <input
                placeholder="Filter path"
                value={filterPath}
                onChange={(e) => setFilterPath(e.target.value)}
                className="p-1 rounded text-black flex-1"
                aria-label="Filter path"
              />
              <select
                aria-label="Filter severity"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="p-1 rounded text-black"
              >
                {['All', 'Info', 'Low', 'Medium', 'High', 'Critical'].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
              <button
                type="button"
                onClick={exportCsv}
                className={primaryButtonClasses}
              >
                Export CSV
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-[var(--kali-panel-border)] bg-kali-secondary">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-kali-muted text-left text-xs font-semibold uppercase tracking-wide text-slate-200">
                    <th className="p-2">Host</th>
                    <th className="p-2">Path</th>
                    <th className="p-2">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} className="odd:bg-kali-muted even:bg-kali-secondary">
                      <td className="p-2">{r.host}</td>
                      <td className="p-2">{r.path}</td>
                      <td className="p-2">
                        <span className={severityChipClass(r.severity)}>{r.severity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NiktoApp;
export const displayNikto = () => <NiktoApp />;

