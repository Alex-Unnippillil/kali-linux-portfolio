import React, { useCallback, useEffect, useMemo, useState } from 'react';

const suggestions = {
  '/admin': 'Restrict access to the admin portal or remove it from public view.',
  '/cgi-bin/test':
    'Remove or secure unnecessary CGI scripts and ensure they are up to date.',
  '/': 'Disable or standardize ETag headers to avoid disclosing inodes.',
};

const severityTokens = {
  info: 'bg-kali-info text-kali-inverse',
  low: 'bg-kali-severity-low text-white',
  medium: 'bg-kali-severity-medium text-white',
  high: 'bg-kali-severity-high text-white',
  critical: 'bg-kali-severity-critical text-white',
};

const severityGroupStyles = {
  info: {
    row: 'bg-kali-info/10 text-kali-info',
    border: 'border-kali-info/60',
  },
  low: {
    row: 'bg-kali-severity-low/10 text-kali-severity-low',
    border: 'border-kali-severity-low/60',
  },
  medium: {
    row: 'bg-kali-severity-medium/10 text-kali-severity-medium',
    border: 'border-kali-severity-medium/60',
  },
  high: {
    row: 'bg-kali-severity-high/12 text-kali-severity-high',
    border: 'border-kali-severity-high/60',
  },
  critical: {
    row: 'bg-kali-severity-critical/15 text-kali-severity-critical',
    border: 'border-kali-severity-critical/60',
  },
};

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
      <p className="mb-4 text-sm text-kali-primary">
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
            className="w-full rounded border border-kali-border/60 bg-kali-dark p-2 text-kali-text focus:border-kali-primary focus:outline-none focus:ring-2 focus:ring-kali-primary/40"
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
            aria-label="Port"
            type="number"
            className="w-full rounded border border-kali-border/60 bg-kali-dark p-2 text-kali-text focus:border-kali-primary focus:outline-none focus:ring-2 focus:ring-kali-primary/40"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
        <div className="flex items-center mt-2">
          <input
            id="nikto-ssl"
            aria-label="Enable SSL"
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
        <pre className="overflow-auto rounded border border-kali-border/60 bg-kali-dark p-2 text-kali-primary">
          {command}
        </pre>
      </div>
      <div>
        <h2 className="text-lg mb-2">Findings</h2>
        <table className="w-full overflow-hidden rounded-lg border border-white/10 text-sm">
          <thead>
            <tr className="bg-kali-surface-muted/90 text-left text-xs font-semibold uppercase tracking-wide text-kali-muted">
              <th className="p-3">Path</th>
              <th className="p-3">Finding</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([sev, list]) => (
              <React.Fragment key={sev}>
                  <tr
                    className={`text-xs uppercase tracking-wide ${
                      severityGroupStyles[sev.toLowerCase()]?.row || 'bg-kali-surface-muted/60 text-kali-muted'
                    }`}
                  >
                    <td
                      colSpan={2}
                      className={`border-l-4 px-3 py-2 font-semibold ${
                        severityGroupStyles[sev.toLowerCase()]?.border || 'border-transparent'
                      }`}
                    >
                      {sev}
                    </td>
                  </tr>
                {list.map((f) => (
                  <tr key={f.path} className="odd:bg-kali-surface/80 even:bg-kali-surface/60">
                    <td colSpan={2} className="p-0">
                      <button
                        type="button"
                        onClick={() => setSelected(f)}
                        className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-start gap-3 px-3 py-2 text-left text-sm transition hover:bg-kali-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-kali-primary"
                        aria-label="View finding details"
                      >
                        <span className="font-medium text-white/90">{f.path}</span>
                        <span className="text-white/80">{f.finding}</span>
                        <span
                          className={`justify-self-end rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
                            severityTokens[f.severity.toLowerCase()] || 'bg-kali-secondary text-kali-inverse'
                          }`}
                        >
                          {f.severity}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-kali-overlay/70 backdrop-blur-sm">
          <aside className="flex h-full w-80 flex-col border-l border-white/10 bg-kali-surface-raised/95 p-4 text-sm shadow-kali-panel">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mb-3 inline-flex w-max items-center rounded-md bg-kali-error px-3 py-1 text-xs font-semibold text-white transition hover:bg-kali-error/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              Close
            </button>
            <h3 className="text-xl font-semibold text-white">{selected.path}</h3>
            <p className="mt-2 text-white/80">{selected.finding}</p>
            <p className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-kali-muted">
              Severity
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
                  severityTokens[selected.severity.toLowerCase()] || 'bg-kali-secondary text-kali-inverse'
                }`}
              >
                {selected.severity}
              </span>
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-kali-muted">References</p>
            <p className="text-sm text-white/90">{selected.references.join(', ')}</p>
            <p className="mt-3 text-sm text-white/80">{selected.details}</p>
            <p className="mt-4 rounded-lg border border-kali-primary/40 bg-kali-primary/10 p-3 text-xs text-kali-primary">
              {suggestions[selected.path] || 'No suggestion available.'}
            </p>
          </aside>
        </div>
      )}
      <div>
        <h2 className="text-lg mb-2">HTML Report Preview</h2>
        <div className="flex space-x-2 mb-2">
          <button
            type="button"
            onClick={copyReport}
            className="rounded-md bg-kali-primary px-3 py-1 text-sm font-semibold text-kali-inverse transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          >
            Copy HTML
          </button>
          <button
            type="button"
            onClick={exportReport}
            className="rounded-md bg-kali-secondary px-3 py-1 text-sm font-semibold text-kali-text transition hover:bg-kali-secondary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
          className="mb-4 border-2 border-dashed border-kali-primary/50 bg-kali-surface/70 p-4 text-center text-kali-primary"
        >
          Drop Nikto text or XML report here
        </div>
        {error && <p className="mb-2 text-kali-error">{error}</p>}
        {entries.length > 0 && (
          <div>
            <div className="flex space-x-2 mb-2">
              <input
                aria-label="Filter host"
                placeholder="Filter host"
                value={filterHost}
                onChange={(e) => setFilterHost(e.target.value)}
                className="flex-1 rounded border border-kali-border/60 bg-kali-dark p-1 text-sm text-kali-text focus:border-kali-primary focus:outline-none focus:ring-2 focus:ring-kali-primary/40"
              />
              <input
                aria-label="Filter path"
                placeholder="Filter path"
                value={filterPath}
                onChange={(e) => setFilterPath(e.target.value)}
                className="flex-1 rounded border border-kali-border/60 bg-kali-dark p-1 text-sm text-kali-text focus:border-kali-primary focus:outline-none focus:ring-2 focus:ring-kali-primary/40"
              />
              <select
                aria-label="Filter severity"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="rounded border border-kali-border/60 bg-kali-dark p-1 text-sm text-kali-text focus:border-kali-primary focus:outline-none focus:ring-2 focus:ring-kali-primary/40"
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
                className="rounded-md bg-kali-primary px-3 py-1 text-sm font-semibold text-kali-inverse transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              >
                Export CSV
              </button>
            </div>
            <table className="w-full overflow-hidden rounded-lg border border-white/10 text-sm">
              <thead>
                <tr className="bg-kali-surface-muted/90 text-left text-xs font-semibold uppercase tracking-wide text-kali-muted">
                  <th className="p-3">Host</th>
                  <th className="p-3">Path</th>
                  <th className="p-3">Severity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="odd:bg-kali-surface/80 even:bg-kali-surface/60">
                    <td className="px-3 py-2">{r.host}</td>
                    <td className="px-3 py-2">{r.path}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
                          severityTokens[r.severity.toLowerCase()] || 'bg-kali-secondary text-kali-inverse'
                        }`}
                      >
                        {r.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NiktoApp;
export const displayNikto = () => <NiktoApp />;

