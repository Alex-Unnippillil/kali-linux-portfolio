import React, { useCallback, useMemo, useState } from 'react';

import sampleFindings from '../../../data/nikto/sample-findings.json';
import sampleTarget from '../../../data/nikto/sample-target.json';
import buildNiktoCommand from '../../../utils/nikto/buildCommand';

const suggestions = {
  '/admin': 'Restrict access to the admin portal or remove it from public view.',
  '/cgi-bin/test':
    'Remove or secure unnecessary CGI scripts and ensure they are up to date.',
  '/': 'Disable or standardize ETag headers to avoid disclosing inodes.',
};

const pluginOptions = [
  { value: 'apache_expect_xss', label: 'Apache expect XSS' },
  { value: 'dir_traversal', label: 'Directory traversal' },
  { value: 'http_methods', label: 'HTTP methods audit' },
];

const tuningOptions = [
  { value: '', label: 'Default (all tests)' },
  { value: '123', label: '1-3: Server and CGI checks' },
  { value: '4', label: '4: Injection tests' },
  { value: '6', label: '6: File upload tests' },
  { value: '9', label: '9: SQL/database tests' },
];

const formatOptions = [
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'xml', label: 'XML' },
];

const NiktoApp = () => {
  const [host, setHost] = useState(sampleTarget.host || '');
  const [port, setPort] = useState(sampleTarget.port || '');
  const [ssl, setSsl] = useState(Boolean(sampleTarget.ssl));
  const [findings] = useState(sampleFindings);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [filterHost, setFilterHost] = useState('');
  const [filterPath, setFilterPath] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [error, setError] = useState('');
  const [useInputFile, setUseInputFile] = useState(false);
  const [inputFile, setInputFile] = useState('targets.txt');
  const [tuningProfile, setTuningProfile] = useState('');
  const [selectedPlugins, setSelectedPlugins] = useState([]);
  const [userAgent, setUserAgent] = useState('Nikto/2.5.0 (Lab Simulation)');
  const [randomizeUserAgent, setRandomizeUserAgent] = useState(false);
  const [outputFormat, setOutputFormat] = useState('html');
  const [outputFile, setOutputFile] = useState('nikto-report.html');

  const sanitizedOutputFile = useMemo(() => {
    const trimmed = outputFile.trim();
    return trimmed || `nikto-report.${outputFormat}`;
  }, [outputFile, outputFormat]);

  const command = useMemo(
    () =>
      buildNiktoCommand({
        host,
        port,
        useSsl: ssl,
        tuning: tuningProfile,
        plugins: selectedPlugins,
        randomizeUserAgent,
        userAgent,
        outputFormat,
        outputFile: sanitizedOutputFile,
        useInputFile,
        inputFile,
        labSimulation: true,
      }),
    [
      host,
      port,
      ssl,
      tuningProfile,
      selectedPlugins,
      randomizeUserAgent,
      userAgent,
      outputFormat,
      sanitizedOutputFile,
      useInputFile,
      inputFile,
    ]
  );

  const togglePlugin = (value) => {
    setSelectedPlugins((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

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
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-4">
      <h1 className="text-2xl mb-4">Nikto Scanner</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Build a nikto command without running any scans. Data and reports are
        static and for learning only.
      </p>
      <div className="bg-yellow-900 border border-yellow-700 text-yellow-100 p-3 rounded mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-xs uppercase tracking-wide font-semibold">
          Lab Mode
        </div>
        <p className="text-sm md:flex-1 md:ml-4">
          Simulation sandbox enforced. Command builder output never triggers a live scan.
        </p>
        <label className="inline-flex items-center text-xs font-semibold">
          <input
            type="checkbox"
            checked
            readOnly
            className="mr-2 accent-yellow-500"
            aria-label="Lab mode enforced"
          />
          Lab mode enforced
        </label>
      </div>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <div>
          <label htmlFor="nikto-host" className="block text-sm mb-1">
            Host
          </label>
          <input
            id="nikto-host"
            className="w-full p-2 rounded text-black"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            disabled={useInputFile}
            aria-disabled={useInputFile}
            placeholder="target.example.com"
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
        <div className="flex items-center mt-2">
          <input
            id="nikto-target-file"
            type="checkbox"
            className="mr-2"
            checked={useInputFile}
            onChange={(e) => setUseInputFile(e.target.checked)}
          />
          <label htmlFor="nikto-target-file" className="text-sm">
            Use targets file
          </label>
        </div>
        {useInputFile && (
          <div>
            <label htmlFor="nikto-input-file" className="block text-sm mb-1">
              Targets file name
            </label>
            <input
              id="nikto-input-file"
              className="w-full p-2 rounded text-black"
              value={inputFile}
              onChange={(e) => setInputFile(e.target.value)}
            />
          </div>
        )}
        <div>
          <label htmlFor="nikto-tuning" className="block text-sm mb-1">
            Tuning profile
          </label>
          <select
            id="nikto-tuning"
            value={tuningProfile}
            onChange={(e) => setTuningProfile(e.target.value)}
            className="w-full p-2 rounded text-black"
          >
            {tuningOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nikto-output-format" className="block text-sm mb-1">
            Output format
          </label>
          <select
            id="nikto-output-format"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="w-full p-2 rounded text-black"
          >
            {formatOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nikto-output-file" className="block text-sm mb-1">
            Output file
          </label>
          <input
            id="nikto-output-file"
            className="w-full p-2 rounded text-black"
            value={outputFile}
            onChange={(e) => setOutputFile(e.target.value)}
            placeholder={`nikto-report.${outputFormat}`}
          />
          <p className="text-xs text-gray-300 mt-1">
            Saved command will use <span className="font-mono">{sanitizedOutputFile}</span> if left blank.
          </p>
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <span className="block text-sm mb-1 font-medium">Plugin modules</span>
          <div className="flex flex-wrap gap-2">
            {pluginOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center bg-gray-800 rounded px-2 py-1 text-xs"
              >
                <input
                  type="checkbox"
                  className="mr-1"
                  checked={selectedPlugins.includes(option.value)}
                  onChange={() => togglePlugin(option.value)}
                  aria-label={`Toggle ${option.label}`}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <label htmlFor="nikto-user-agent" className="block text-sm mb-1">
            User agent
          </label>
          <input
            id="nikto-user-agent"
            className="w-full p-2 rounded text-black"
            value={userAgent}
            onChange={(e) => setUserAgent(e.target.value)}
          />
          <label className="flex items-center text-xs mt-2">
            <input
              type="checkbox"
              className="mr-2"
              checked={randomizeUserAgent}
              onChange={(e) => setRandomizeUserAgent(e.target.checked)}
            />
            Randomize user agent per request
          </label>
        </div>
      </form>
      <div>
        <h2 className="text-lg mb-2">Command Preview</h2>
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-300">
          <button
            type="button"
            disabled
            className="px-3 py-1 rounded bg-gray-700 uppercase tracking-wide cursor-not-allowed"
            title="Lab mode disables live scans"
          >
            Run scan (disabled)
          </button>
          <span>Use this string in an authorized lab environment only.</span>
        </div>
        <pre
          className="bg-black text-green-400 p-2 rounded overflow-auto"
          data-testid="nikto-command-preview"
        >
          {command}
        </pre>
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
      <div>
        <h2 className="text-lg mb-2">Parse Report</h2>
        <div
          data-testid="drop-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
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
                {filtered.map((r, i) => (
                  <tr key={i} className="odd:bg-gray-900">
                    <td className="p-2">{r.host}</td>
                    <td className="p-2">{r.path}</td>
                    <td className="p-2">{r.severity}</td>
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

