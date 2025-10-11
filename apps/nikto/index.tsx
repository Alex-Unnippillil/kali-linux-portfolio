'use client';

import React, { useMemo, useState } from 'react';
import sampleFindings from '../../data/nikto/sample-findings.json';
import sampleLog from '../../data/nikto/sample-log.json';
import sampleTarget from '../../data/nikto/sample-target.json';
import buildNiktoCommand from '../../utils/nikto/buildCommand';
import HeaderLab from './components/HeaderLab';

interface NiktoFinding {
  path: string;
  finding: string;
  references: string[];
  severity: string;
  details: string;
}

const pluginOptions = [
  { value: 'apache_expect_xss', label: 'Apache expect XSS' },
  { value: 'dir_traversal', label: 'Directory traversal' },
  { value: 'http_methods', label: 'HTTP methods audit' },
] as const;

const tuningOptions = [
  { value: '', label: 'Default (all tests)' },
  { value: '123', label: '1-3: Server and CGI checks' },
  { value: '4', label: '4: Injection tests' },
  { value: '6', label: '6: File upload tests' },
  { value: '9', label: '9: SQL/database tests' },
] as const;

const formatOptions = [
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'xml', label: 'XML' },
] as const;

const NiktoPage: React.FC = () => {
  const targetFixture = sampleTarget as { host?: string; port?: string; ssl?: boolean };
  const logLines = (sampleLog as { lines?: string[] }).lines ?? [];
  const [host, setHost] = useState(targetFixture.host ?? '');
  const [port, setPort] = useState(targetFixture.port ?? '');
  const [ssl, setSsl] = useState(Boolean(targetFixture.ssl));
  const [findings] = useState<NiktoFinding[]>(sampleFindings as NiktoFinding[]);
  const [rawLog] = useState(() => logLines.join('\n'));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [useInputFile, setUseInputFile] = useState(false);
  const [inputFile, setInputFile] = useState('targets.txt');
  const [tuningProfile, setTuningProfile] = useState('');
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([]);
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

  const togglePlugin = (value: string) => {
    setSelectedPlugins((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const grouped = useMemo(() => {
    return findings.reduce<Record<string, NiktoFinding[]>>((acc, f) => {
      acc[f.severity] = acc[f.severity] || [];
      acc[f.severity].push(f);
      return acc;
    }, {});
  }, [findings]);

  const headers = useMemo(() => {
    return rawLog
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^\+\s*/, ''))
      .filter((l) => /^[A-Za-z-]+:/.test(l))
      .map((line) => {
        const idx = line.indexOf(':');
        return { name: line.slice(0, idx), value: line.slice(idx + 1).trim() };
      });
  }, [rawLog]);

  const url = useMemo(() => {
    if (useInputFile) {
      return `Targets file: ${inputFile.trim() || 'targets.txt'}`;
    }
    if (!host) return 'http://target';
    const proto = ssl ? 'https://' : 'http://';
    return `${proto}${host}${port ? `:${port}` : ''}`;
  }, [host, port, ssl, useInputFile, inputFile]);

  const copySection = async (list: NiktoFinding[]) => {
    try {
      await navigator.clipboard?.writeText(JSON.stringify(list, null, 2));
    } catch {
      // ignore
    }
  };

  const exportSection = (list: NiktoFinding[], sev: string) => {
    const blob = new Blob([JSON.stringify(list, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nikto-${sev.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const colorMap: Record<string, string> = {
    High: 'bg-red-700',
    Medium: 'bg-yellow-700',
    Info: 'bg-blue-700',
  };

  const summary = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0 };
    rawLog
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        if (/vulnerability/i.test(line)) {
          counts.critical += 1;
        } else if (/not defined/i.test(line)) {
          counts.warning += 1;
        } else {
          counts.info += 1;
        }
      });
    return counts;
  }, [rawLog]);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-4">
      <h1 className="text-2xl mb-4">Nikto Scanner</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Build a nikto command without running any scans. Data and reports are static and for learning only.
      </p>
      <div className="bg-yellow-900 border border-yellow-700 text-yellow-100 p-3 rounded mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-xs uppercase tracking-wide font-semibold">Lab Mode</div>
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
          <label
            htmlFor="nikto-host"
            className="block text-sm mb-1"
            id="nikto-host-label"
          >
            Host
          </label>
          <input
            id="nikto-host"
            className="w-full p-2 rounded text-black"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            aria-labelledby="nikto-host-label"
            disabled={useInputFile}
            aria-disabled={useInputFile}
            placeholder="target.example.com"
          />
        </div>
        <div>
          <label
            htmlFor="nikto-port"
            className="block text-sm mb-1"
            id="nikto-port-label"
          >
            Port
          </label>
          <input
            id="nikto-port"
            type="number"
            className="w-full p-2 rounded text-black"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            aria-labelledby="nikto-port-label"
          />
        </div>
        <div className="flex items-center mt-2">
          <input
            id="nikto-ssl"
            type="checkbox"
            className="mr-2"
            checked={ssl}
            onChange={(e) => setSsl(e.target.checked)}
            aria-labelledby="nikto-ssl-label"
          />
          <label htmlFor="nikto-ssl" className="text-sm" id="nikto-ssl-label">
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
            aria-labelledby="nikto-target-file-label"
          />
          <label htmlFor="nikto-target-file" className="text-sm" id="nikto-target-file-label">
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
        <pre className="bg-black text-green-400 p-2 rounded overflow-auto" data-testid="nikto-command-preview">
          {command}
        </pre>
      </div>
      <div className="relative bg-gray-800 p-4 rounded shadow space-y-4">
        <div className="absolute top-2 right-2 bg-gray-700 text-xs px-2 py-1 rounded-full">
          Phase 3 • {findings.length} results
        </div>
        <div>
          <h2 className="text-lg mb-2">Target</h2>
          <p className="mb-2">
            <span className="font-bold">URL:</span> {url}
          </p>
          {headers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md mb-1">Headers</h3>
              <ul className="text-sm space-y-1 font-mono">
                {headers.map((h) => (
                  <li key={h.name}>
                    <span className="font-bold">{h.name}:</span> {h.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-lg mb-2">Vulnerabilities</h2>
          {Object.entries(grouped).map(([sev, list]) => {
            const open = openSections[sev];
            return (
              <div key={sev} className="mb-2 border border-gray-700 rounded">
                <div
                  className="flex justify-between items-center p-2 bg-gray-800 cursor-pointer"
                  onClick={() => setOpenSections((s) => ({ ...s, [sev]: !open }))}
                >
                  <span className="font-bold">{sev}</span>
                  <div className="flex items-center space-x-2">
                    <span className="bg-gray-600 rounded-full px-2 text-xs">{list.length}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copySection(list);
                      }}
                      className="text-xs bg-blue-600 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSection(list, sev);
                      }}
                      className="text-xs bg-blue-600 px-2 py-1 rounded"
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
                {open && (
                  <ul className="p-2 space-y-1">
                    {list.map((f) => (
                      <li
                        key={f.path}
                        className={`p-2 rounded ${colorMap[f.severity] || 'bg-gray-700'}`}
                      >
                        <span className="font-mono">{f.path}</span>: {f.finding}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {rawLog && (
        <div>
          <h2 className="text-lg mb-2">Summary</h2>
          <div className="flex space-x-2 mb-4 text-sm">
            <div className="bg-red-700 px-2 py-1 rounded">Critical: {summary.critical}</div>
            <div className="bg-yellow-600 px-2 py-1 rounded">Warning: {summary.warning}</div>
            <div className="bg-blue-600 px-2 py-1 rounded">Info: {summary.info}</div>
          </div>
          <h2 className="text-lg mb-2">Raw Log</h2>
          <pre className="bg-black text-green-400 p-2 rounded overflow-auto">{rawLog}</pre>
        </div>
      )}
      <HeaderLab />
    </div>
  );
};

export default NiktoPage;

