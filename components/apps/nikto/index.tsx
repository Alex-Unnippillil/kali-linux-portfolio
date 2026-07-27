import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  generateNiktoHtmlReport,
  generateNiktoJsonReport,
  type NiktoFinding,
  type NiktoReportMetadata,
} from './report';

interface ParsedNiktoEntry {
  host: string;
  path: string;
  severity: string;
}

const suggestions: Record<string, string> = {
  '/admin': 'Restrict access to the admin portal or remove it from public view.',
  '/cgi-bin/test':
    'Remove or secure unnecessary CGI scripts and ensure they are up to date.',
  '/': 'Disable or standardize ETag headers to avoid disclosing inodes.',
};

const sanitizeForFilename = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const timestampSlug = (value: string): string =>
  sanitizeForFilename(value.replace(/[:.]/g, '-'));

const NiktoApp: React.FC = () => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [ssl, setSsl] = useState(false);
  const [findings, setFindings] = useState<NiktoFinding[]>([]);
  const [selected, setSelected] = useState<NiktoFinding | null>(null);
  const [entries, setEntries] = useState<ParsedNiktoEntry[]>([]);
  const [filterHost, setFilterHost] = useState('');
  const [filterPath, setFilterPath] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nikto/report.json');
        const data = (await res.json()) as NiktoFinding[];
        setFindings(data);
      } catch {
        // ignore errors from demo fetch
      }
    };
    void load();
  }, []);

  const command = useMemo(() => {
    const base = `nikto -h ${host || 'TARGET'}`;
    const portSegment = port ? ` -p ${port}` : '';
    const sslSegment = ssl ? ' -ssl' : '';
    return `${base}${portSegment}${sslSegment}`;
  }, [host, port, ssl]);

  const targetUrl = useMemo(() => {
    const proto = ssl ? 'https://' : 'http://';
    if (!host) {
      return `${proto}target`;
    }
    return `${proto}${host}${port ? `:${port}` : ''}`;
  }, [host, port, ssl]);

  const buildMetadata = useCallback(
    (timestamp?: string): NiktoReportMetadata => ({
      target: {
        host: host || 'TARGET',
        port: port || undefined,
        ssl,
        url: targetUrl,
      },
      command,
      generatedAt: timestamp ?? new Date().toISOString(),
    }),
    [command, host, port, ssl, targetUrl]
  );

  const previewMetadata = useMemo(() => buildMetadata(), [buildMetadata]);

  const htmlReport = useMemo(
    () => generateNiktoHtmlReport(findings, previewMetadata),
    [findings, previewMetadata]
  );

  const jsonReport = useMemo(
    () => generateNiktoJsonReport(findings, previewMetadata),
    [findings, previewMetadata]
  );

  const grouped = useMemo(() => {
    return findings.reduce<Record<string, NiktoFinding[]>>((acc, finding) => {
      const list = acc[finding.severity] ?? [];
      list.push(finding);
      acc[finding.severity] = list;
      return acc;
    }, {});
  }, [findings]);

  const copyToClipboard = useCallback(async (value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      // ignore clipboard errors
    }
  }, []);

  const triggerDownload = useCallback(
    (contents: string, filename: string, mimeType: string) => {
      const blob = new Blob([contents], { type: mimeType });
      const urlObject = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = urlObject;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(urlObject);
    },
    []
  );

  const buildFilename = useCallback(
    (extension: string, generatedAt: string) => {
      const safeHost = sanitizeForFilename(host || 'target') || 'target';
      const slug = timestampSlug(generatedAt) || 'timestamp';
      return `nikto-${safeHost}-${slug}.${extension}`;
    },
    [host]
  );

  const handleCopyHtml = useCallback(() => {
    void copyToClipboard(htmlReport);
  }, [copyToClipboard, htmlReport]);

  const handleCopyJson = useCallback(() => {
    void copyToClipboard(jsonReport);
  }, [copyToClipboard, jsonReport]);

  const exportHtml = useCallback(() => {
    const metadata = buildMetadata(new Date().toISOString());
    const report = generateNiktoHtmlReport(findings, metadata);
    triggerDownload(report, buildFilename('html', metadata.generatedAt), 'text/html');
  }, [buildFilename, buildMetadata, findings, triggerDownload]);

  const exportJson = useCallback(() => {
    const metadata = buildMetadata(new Date().toISOString());
    const report = generateNiktoJsonReport(findings, metadata);
    triggerDownload(
      report,
      buildFilename('json', metadata.generatedAt),
      'application/json'
    );
  }, [buildFilename, buildMetadata, findings, triggerDownload]);

  const parseText = useCallback((text: string): ParsedNiktoEntry[] => {
    const lines = text.split(/\r?\n/);
    const data: ParsedNiktoEntry[] = [];
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
  }, []);

  const parseXml = useCallback((text: string): ParsedNiktoEntry[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
    const hostName = doc.querySelector('target > hostname')?.textContent?.trim() ?? '';
    const data: ParsedNiktoEntry[] = [];
    doc.querySelectorAll('item').forEach((item) => {
      const path = item.querySelector('uri, url')?.textContent?.trim() ?? '';
      const severity = item.querySelector('severity')?.textContent?.trim() ?? '';
      if (hostName && path) {
        data.push({ host: hostName, path, severity });
      }
    });
    return data;
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let data: ParsedNiktoEntry[] = [];
        if (file.name.endsWith('.xml')) {
          data = parseXml(text);
        } else if (file.name.endsWith('.txt')) {
          data = parseText(text);
        } else {
          throw new Error('Unsupported file type');
        }
        if (!data.length) {
          throw new Error('No valid findings');
        }
        setEntries(data);
        setError('');
      } catch (err) {
        setEntries([]);
        const message = err instanceof Error ? err.message : 'Failed to parse file';
        setError(message);
      }
    },
    [parseText, parseXml]
  );

  const filtered = useMemo(() => {
    return entries.filter(
      (entry) =>
        entry.host.toLowerCase().includes(filterHost.toLowerCase()) &&
        entry.path.toLowerCase().startsWith(filterPath.toLowerCase()) &&
        (filterSeverity === 'All' ||
          entry.severity.toLowerCase() === filterSeverity.toLowerCase())
    );
  }, [entries, filterHost, filterPath, filterSeverity]);

  const exportCsv = useCallback(() => {
    const rows = [
      ['Host', 'Path', 'Severity'],
      ...filtered.map((row) => [row.host, row.path, row.severity]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const generatedAt = new Date().toISOString();
    triggerDownload(csv, buildFilename('csv', generatedAt), 'text/csv');
  }, [buildFilename, filtered, triggerDownload]);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-4">
      <h1 className="text-2xl mb-4">Nikto Scanner</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Build a nikto command without running any scans. Data and reports are static and for
        learning only.
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
            {(Object.entries(grouped) as Array<[string, NiktoFinding[]]>).map(([severity, list]) => (
              <React.Fragment key={severity}>
                <tr className="bg-gray-800">
                  <td colSpan={2} className="p-2 font-bold">
                    {severity}
                  </td>
                </tr>
                {list.map((finding) => (
                  <tr
                    key={finding.path}
                    className="odd:bg-gray-900 cursor-pointer hover:bg-gray-700"
                    onClick={() => setSelected(finding)}
                  >
                    <td className="p-2">{finding.path}</td>
                    <td className="p-2">{finding.finding}</td>
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
            <span className="font-bold">References:</span>{' '}
            {selected.references.length ? selected.references.join(', ') : 'None'}
          </p>
          <p className="mb-4">{selected.details}</p>
          <p className="text-sm text-green-300">
            {suggestions[selected.path] || 'No suggestion available.'}
          </p>
        </div>
      )}
      <div>
        <h2 className="text-lg mb-2">Report Exports</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={handleCopyHtml}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Copy HTML
          </button>
          <button
            type="button"
            onClick={exportHtml}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Download HTML
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Copy JSON
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="px-2 py-1 bg-blue-600 rounded text-sm"
          >
            Download JSON
          </button>
        </div>
        <p className="text-xs text-gray-300 mb-3">
          Preview generated for <span className="font-mono">{previewMetadata.target.url}</span> at{' '}
          <time dateTime={previewMetadata.generatedAt}>{previewMetadata.generatedAt}</time>
        </p>
        <iframe title="Nikto HTML Report" srcDoc={htmlReport} className="w-full h-64 bg-white" />
      </div>
      <div>
        <h2 className="text-lg mb-2">Parse Report</h2>
        <div
          data-testid="drop-zone"
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          className="border-2 border-dashed border-gray-600 p-4 text-center mb-4"
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
              />
              <input
                placeholder="Filter path"
                value={filterPath}
                onChange={(e) => setFilterPath(e.target.value)}
                className="p-1 rounded text-black flex-1"
              />
              <select
                aria-label="Filter severity"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="p-1 rounded text-black"
              >
                {['All', 'Info', 'Low', 'Medium', 'High', 'Critical'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={exportCsv}
                className="px-2 py-1 bg-blue-600 rounded text-sm"
              >
                Export CSV
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-2 text-left">Host</th>
                  <th className="p-2 text-left">Path</th>
                  <th className="p-2 text-left">Severity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <tr key={`${row.host}-${row.path}-${index}`} className="odd:bg-gray-900">
                    <td className="p-2">{row.host}</td>
                    <td className="p-2">{row.path}</td>
                    <td className="p-2">{row.severity}</td>
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
