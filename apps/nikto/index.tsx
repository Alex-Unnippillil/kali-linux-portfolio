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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-sky-100">Nikto Scanner</h1>
          <p className="text-sm text-amber-200/80">
            Build a nikto command without running any scans. Data and reports are static and for learning only.
          </p>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="grid gap-4 rounded-2xl border border-gray-800 bg-gray-900/60 p-4 shadow-lg shadow-black/40 md:grid-cols-3"
        >
          <div className="space-y-2">
            <label
              id="nikto-host-label"
              htmlFor="nikto-host"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-300"
            >
              Host
            </label>
            <input
              id="nikto-host"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white shadow-inner shadow-black/40 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              aria-labelledby="nikto-host-label"
            />
          </div>
          <div className="space-y-2">
            <label
              id="nikto-port-label"
              htmlFor="nikto-port"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-300"
            >
              Port
            </label>
            <input
              id="nikto-port"
              type="number"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white shadow-inner shadow-black/40 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              aria-labelledby="nikto-port-label"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-800/80 bg-gray-950 px-3 py-2 text-sm">
            <input
              id="nikto-ssl"
              type="checkbox"
              className="h-4 w-4 rounded border border-gray-700 bg-gray-900 text-sky-400 focus:ring-sky-500"
              checked={ssl}
              onChange={(e) => setSsl(e.target.checked)}
              aria-labelledby="nikto-ssl-label"
            />
            <label htmlFor="nikto-ssl" className="text-xs font-semibold uppercase tracking-wide text-gray-300" id="nikto-ssl-label">
              SSL
            </label>
          </div>
        </form>
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70 shadow-lg shadow-black/50">
          <div className="flex flex-col gap-2 border-b border-gray-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Command Preview</h2>
              <p className="text-xs text-gray-400">Copy the simulated command string for your notes.</p>
            </div>
            <button
              type="button"
              onClick={copyCommand}
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-sky-500"
            >
              {copiedCommand ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-48 overflow-auto bg-black/80 px-5 py-4 text-sm text-emerald-300">{command}</pre>
        </div>
        <section className="relative space-y-6 rounded-3xl border border-gray-800/80 bg-gray-900/60 p-6 shadow-xl shadow-black/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Target Overview</h2>
              <p className="text-sm text-gray-300">Snapshot of the simulated host and captured response headers.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-gradient-to-r from-sky-500 via-blue-500 to-purple-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-purple-900/40">
              Phase 3 • {findings.length} results
            </span>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.15fr_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-800 bg-gray-950/80 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Target Summary</h3>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">URL</dt>
                    <dd className="font-mono text-base text-sky-200 break-all">{url}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Host</dt>
                    <dd className="font-mono text-base text-sky-200 break-all">{host || 'Not specified'}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Port</dt>
                    <dd className="font-mono text-base text-sky-200">{port || 'Default'}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-gray-400">Headers Parsed</dt>
                    <dd className="font-mono text-base text-sky-200">{headers.length}</dd>
                  </div>
                </dl>
              </div>
              {headers.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/60">
                  <header className="border-b border-gray-800/80 bg-gray-900/80 px-5 py-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">Captured Headers</h3>
                  </header>
                  <div className="max-h-60 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-800 text-sm">
                      <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left">Header</th>
                          <th scope="col" className="px-4 py-2 text-left">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900/60 font-mono">
                        {headers.map((h) => (
                          <tr key={h.name} className="odd:bg-gray-900/40">
                            <td className="px-4 py-2 text-sky-200">{h.name}</td>
                            <td className="px-4 py-2 break-all text-gray-200">{h.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Plugin Findings</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 text-red-200">High</span>
                  <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-amber-100">Medium</span>
                  <span className="rounded-full border border-sky-400/50 bg-sky-400/10 px-3 py-1 text-sky-100">Info</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Toggle severity panels to explore remediation context and export the JSON payload for offline analysis.
              </p>
              {severityMeta
                .filter((sev) => grouped[sev.key]?.length)
                .map((sev) => {
                  const list = grouped[sev.key];
                  const open = openSections[sev.key] ?? (sev.key === 'High');
                  const panelId = `nikto-severity-${sev.key.toLowerCase()}`;
                  return (
                    <section
                      key={sev.key}
                      className={`space-y-3 rounded-2xl border ${sev.accent} bg-gray-950/70 p-4 shadow-lg backdrop-blur`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                          <span aria-hidden className="text-2xl">
                            {sev.icon}
                          </span>
                          <div>
                            <p className="text-lg font-semibold text-white">{sev.key} Findings</p>
                            <p className="text-xs text-gray-300">{sev.recommendation}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${sev.badge}`}>
                            {list.length} {list.length === 1 ? 'item' : 'items'}
                          </span>
                          <button
                            type="button"
                            onClick={() => copySection(list)}
                            className="rounded-full border border-sky-500/60 bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100 transition-colors hover:bg-sky-500/30"
                          >
                            Copy JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => exportSection(list, sev.key)}
                            className="rounded-full border border-sky-500/60 bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100 transition-colors hover:bg-sky-500/30"
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
                            className="rounded-full border border-gray-700 bg-gray-800/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 transition-colors hover:bg-gray-700"
                          >
                            {open ? 'Hide' : 'Show'} details
                          </button>
                        </div>
                      </div>
                      {open && (
                        <div id={panelId} className="space-y-3 rounded-2xl border border-gray-800/80 bg-gray-900/60 p-4">
                          <header className="flex flex-col gap-1 border-b border-gray-800/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Detail View</h4>
                            <p className="text-xs text-gray-400">Includes remediation hints tailored to each plugin.</p>
                          </header>
                          <ul className="space-y-3">
                            {list.map((f) => (
                              <li
                                key={`${f.path}-${f.finding}`}
                                className="space-y-3 rounded-2xl border border-gray-800 bg-gray-950/70 p-4 text-sm shadow-inner shadow-black/30"
                              >
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Path</span>
                                  <span className="font-mono text-sky-200 break-all">{f.path}</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-base font-semibold text-white">{f.finding}</p>
                                  {f.details && <p className="leading-relaxed text-gray-200">{f.details}</p>}
                                </div>
                                {f.references?.length ? (
                                  <div className="space-y-1">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">References</span>
                                    <p className="text-xs text-gray-300">{f.references.join(', ')}</p>
                                  </div>
                                ) : null}
                                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-300">
                                    Recommended remediation
                                  </span>
                                  <p className="mt-1 leading-relaxed text-emerald-100/90">{deriveRemediation(f)}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  );
                })}
            </div>
          </div>
        </section>
        {rawLog && (
          <section className="space-y-4 rounded-3xl border border-gray-800/80 bg-gray-900/60 p-6 shadow-xl shadow-black/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-white">Scan Summary</h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 font-semibold text-red-200">
                  Critical {summary.critical}
                </span>
                <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 font-semibold text-amber-100">
                  Warning {summary.warning}
                </span>
                <span className="rounded-full border border-sky-400/50 bg-sky-400/10 px-3 py-1 font-semibold text-sky-100">
                  Info {summary.info}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Raw Log</h3>
              <pre className="max-h-72 overflow-auto rounded-2xl border border-gray-800 bg-black/90 p-4 text-xs text-emerald-300">{rawLog}</pre>
            </div>
          </section>
        )}
        <HeaderLab />
      </div>
    </div>
  );
};

export default NiktoPage;

