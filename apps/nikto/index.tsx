'use client';

import React, { useEffect, useMemo, useState } from 'react';
import HeaderLab from './components/HeaderLab';

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
  const [copiedCommand, setCopiedCommand] = useState(false);

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

  const severityMeta = [
    {
      key: 'High',
      icon: '🚨',
      accent: 'border-red-600/70 shadow-red-900/40',
      badge: 'bg-red-500/20 text-red-200 ring-1 ring-red-400/40',
      recommendation:
        'Prioritize immediate remediation, patch vulnerable services, and restrict public access.',
    },
    {
      key: 'Medium',
      icon: '⚠️',
      accent: 'border-amber-500/60 shadow-amber-900/20',
      badge: 'bg-amber-400/20 text-amber-100 ring-1 ring-amber-400/40',
      recommendation:
        'Schedule fixes in the next maintenance cycle and harden exposed configurations.',
    },
    {
      key: 'Info',
      icon: 'ℹ️',
      accent: 'border-sky-500/60 shadow-sky-900/20',
      badge: 'bg-sky-400/20 text-sky-100 ring-1 ring-sky-400/40',
      recommendation:
        'Improve security hygiene and monitor future scans for drift.',
    },
  ];

  const deriveRemediation = (finding: NiktoFinding) => {
    const text = `${finding.finding} ${finding.details}`.toLowerCase();
    if (text.includes('sql')) {
      return 'Use parameterized queries, sanitize input, and review database permissions.';
    }
    if (text.includes('xss') || text.includes('cross-site')) {
      return 'Sanitize user-controlled content, enable CSP, and audit risky script sinks.';
    }
    if (text.includes('file inclusion') || text.includes('lfi')) {
      return 'Validate file paths, disable remote file includes, and enforce allowlists.';
    }
    if (text.includes('cookie')) {
      return 'Harden cookie attributes with Secure, HttpOnly, and SameSite flags.';
    }
    if (text.includes('header')) {
      return 'Set the recommended security headers and enforce HTTPS where possible.';
    }
    return (
      severityMeta.find((sev) => sev.key === finding.severity)?.recommendation ||
      'Review the finding details and apply the appropriate mitigation.'
    );
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard?.writeText(command);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch {
      // ignore clipboard failures
    }
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
      </form>
      <div className="bg-gray-800/70 border border-gray-700 rounded-lg shadow-lg shadow-black/40">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/80">
          <h2 className="text-lg font-semibold">Command Preview</h2>
          <button
            type="button"
            onClick={copyCommand}
            className="text-xs bg-blue-600 hover:bg-blue-500 transition-colors px-3 py-1 rounded"
          >
            {copiedCommand ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="bg-black/80 text-green-400 px-4 py-3 rounded-b-lg overflow-auto text-sm">{command}</pre>
      </div>
      <div className="relative bg-gray-800 p-4 rounded-xl shadow-lg shadow-black/50 space-y-4 border border-gray-700/60">
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-sky-500 via-blue-500 to-purple-600 text-white shadow-lg shadow-purple-900/40 border border-white/10">
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
          {severityMeta
            .filter((sev) => grouped[sev.key]?.length)
            .map((sev) => {
              const list = grouped[sev.key];
              const open = openSections[sev.key] ?? (sev.key === 'High');
              const panelId = `nikto-severity-${sev.key.toLowerCase()}`;
              return (
                <section
                  key={sev.key}
                  className={`mb-3 rounded-xl border ${sev.accent} bg-gray-900/60 backdrop-blur-sm shadow-lg`}
                >
                  <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="text-2xl">
                        {sev.icon}
                      </span>
                      <div>
                        <p className="text-lg font-semibold">{sev.key} Findings</p>
                        <p className="text-xs text-gray-300">{sev.recommendation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full ${sev.badge}`}>
                        {list.length} {list.length === 1 ? 'item' : 'items'}
                      </span>
                      <button
                        type="button"
                        onClick={() => copySection(list)}
                        className="text-xs bg-blue-600 hover:bg-blue-500 transition-colors px-2 py-1 rounded"
                      >
                        Copy JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => exportSection(list, sev.key)}
                        className="text-xs bg-blue-600 hover:bg-blue-500 transition-colors px-2 py-1 rounded"
                      >
                        Export JSON
                      </button>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() =>
                          setOpenSections((s) => ({
                            ...s,
                            [sev.key]: !open,
                          }))
                        }
                        className="text-xs bg-gray-700 hover:bg-gray-600 transition-colors px-2 py-1 rounded"
                      >
                        {open ? 'Hide' : 'Show'} details
                      </button>
                    </div>
                  </div>
                  {open && (
                    <ul id={panelId} className="space-y-3 border-t border-gray-800/80 px-4 py-3">
                      {list.map((f) => (
                        <li
                          key={`${f.path}-${f.finding}`}
                          className="rounded-lg bg-gray-800/80 p-4 text-sm space-y-2 border border-gray-700/70"
                        >
                          <div className="font-mono text-green-300 break-all">{f.path}</div>
                          <p className="font-semibold text-base">{f.finding}</p>
                          {f.details && <p className="text-gray-200">{f.details}</p>}
                          {f.references?.length ? (
                            <p className="text-xs text-gray-400">
                              References: {f.references.join(', ')}
                            </p>
                          ) : null}
                          <p className="text-xs text-green-300">
                            Recommended remediation: {deriveRemediation(f)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
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

