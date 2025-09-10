'use client';

import React, { useEffect, useMemo, useState } from 'react';
import HeaderLab from './components/HeaderLab';
import CommandChip from '../../components/ui/CommandChip';

interface NiktoFinding {
  path: string;
  finding: string;
  references: string[];
  severity: string;
  details: string;
}

const NiktoPage: React.FC = () => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [ssl, setSsl] = useState(false);
  const [findings, setFindings] = useState<NiktoFinding[]>([]);
  const [rawLog, setRawLog] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nikto/report.json');
        const data = await res.json();
        setFindings(data);
      } catch {
        // ignore errors
      }
      try {
        const logRes = await fetch('/demo/nikto-output.txt');
        setRawLog(await logRes.text());
      } catch {
        // ignore errors
      }
    };
    load();
  }, []);

  const command = `nikto -h ${host || 'TARGET'}${port ? ` -p ${port}` : ''}${ssl ? ' -ssl' : ''}`;

  const grouped = useMemo(() => {
    return findings.reduce<Record<string, NiktoFinding[]>>((acc, f) => {
      const list = acc[f.severity] ?? (acc[f.severity] = []);
      list.push(f);
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
    if (!host) return 'http://target';
    const proto = ssl ? 'https://' : 'http://';
    return `${proto}${host}${port ? `:${port}` : ''}`;
  }, [host, port, ssl]);

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
        <CommandChip command={command} />
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

