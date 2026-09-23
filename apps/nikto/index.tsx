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
      const list = acc[f.severity] ?? [];
      list.push(f);
      acc[f.severity] = list;
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
      accent:
        'border-kali-severity-high/60 shadow-[0_18px_42px_color-mix(in_srgb,var(--color-severity-high)_22%,transparent)]',
      badge: 'bg-kali-severity-high/20 text-kali-severity-high ring-1 ring-kali-severity-high/40',
      recommendation:
        'Prioritize immediate remediation, patch vulnerable services, and restrict public access.',
    },
    {
      key: 'Medium',
      icon: '⚠️',
      accent:
        'border-kali-severity-medium/60 shadow-[0_18px_42px_color-mix(in_srgb,var(--color-severity-medium)_22%,transparent)]',
      badge: 'bg-kali-severity-medium/20 text-kali-severity-medium ring-1 ring-kali-severity-medium/40',
      recommendation:
        'Schedule fixes in the next maintenance cycle and harden exposed configurations.',
    },
    {
      key: 'Info',
      icon: 'ℹ️',
      accent:
        'border-kali-severity-low/60 shadow-[0_18px_42px_color-mix(in_srgb,var(--color-severity-low)_22%,transparent)]',
      badge: 'bg-kali-severity-low/20 text-kali-severity-low ring-1 ring-kali-severity-low/40',
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
    <div className="min-h-screen bg-kali-background text-kali-text">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-sky-100">Nikto Scanner</h1>
          <p className="text-sm text-amber-200/80">
            Build a nikto command without running any scans. Data and reports are static and for learning only.
          </p>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="grid gap-4 rounded-2xl border border-kali-border/70 bg-kali-surface/80 p-4 text-kali-text shadow-kali-panel md:grid-cols-3"
        >
          <div className="space-y-2">
            <label
              id="nikto-host-label"
              htmlFor="nikto-host"
              className="block text-xs font-semibold uppercase tracking-wide text-kali-text/70"
            >
              Host
            </label>
            <input
              id="nikto-host"
              className="w-full rounded-lg border border-kali-border/60 bg-kali-dark px-3 py-2 text-sm text-kali-text shadow-inner shadow-black/40 focus:border-kali-control focus:outline-none focus:ring-1 focus:ring-kali-control"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              aria-labelledby="nikto-host-label"
            />
          </div>
          <div className="space-y-2">
            <label
              id="nikto-port-label"
              htmlFor="nikto-port"
              className="block text-xs font-semibold uppercase tracking-wide text-kali-text/70"
            >
              Port
            </label>
            <input
              id="nikto-port"
              type="number"
              className="w-full rounded-lg border border-kali-border/60 bg-kali-dark px-3 py-2 text-sm text-kali-text shadow-inner shadow-black/40 focus:border-kali-control focus:outline-none focus:ring-1 focus:ring-kali-control"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              aria-labelledby="nikto-port-label"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-kali-border/70 bg-kali-dark/90 px-3 py-2 text-sm">
            <input
              id="nikto-ssl"
              type="checkbox"
              className="h-4 w-4 rounded border border-kali-border/70 bg-kali-surface/80 text-kali-control focus:ring-kali-control"
              checked={ssl}
              onChange={(e) => setSsl(e.target.checked)}
              aria-labelledby="nikto-ssl-label"
            />
            <label
              htmlFor="nikto-ssl"
              className="text-xs font-semibold uppercase tracking-wide text-kali-text/70"
              id="nikto-ssl-label"
            >
              SSL
            </label>
          </div>
        </form>
        <div className="overflow-hidden rounded-2xl border border-kali-border/70 bg-kali-surface/85 shadow-kali-panel">
          <div className="flex flex-col gap-2 border-b border-kali-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-kali-text">Command Preview</h2>
              <p className="text-xs text-kali-text/60">Copy the simulated command string for your notes.</p>
            </div>
            <button
              type="button"
              onClick={copyCommand}
              className="inline-flex items-center justify-center rounded-full border border-kali-control/60 bg-kali-control/80 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-kali-text transition-colors hover:bg-kali-control"
            >
              {copiedCommand ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-48 overflow-auto bg-kali-dark/80 px-5 py-4 font-mono text-sm text-kali-terminal">{command}</pre>
        </div>
        <section className="relative space-y-6 rounded-3xl border border-kali-border/70 bg-kali-surface/85 p-6 shadow-kali-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-kali-text">Target Overview</h2>
              <p className="text-sm text-kali-text/70">Snapshot of the simulated host and captured response headers.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-kali-control/40 bg-[color:var(--kali-control-surface)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-kali-text shadow-[0_12px_28px_color-mix(in_srgb,var(--color-control)_22%,transparent)]">
              Phase 3 • {findings.length} results
            </span>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.15fr_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-kali-border/70 bg-kali-surface/90 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-kali-text/70">Target Summary</h3>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-kali-text/60">URL</dt>
                    <dd className="break-all font-mono text-base text-kali-control">{url}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-kali-text/60">Host</dt>
                    <dd className="break-all font-mono text-base text-kali-control">{host || 'Not specified'}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-kali-text/60">Port</dt>
                    <dd className="font-mono text-base text-kali-control">{port || 'Default'}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-kali-text/60">Headers Parsed</dt>
                    <dd className="font-mono text-base text-kali-control">{headers.length}</dd>
                  </div>
                </dl>
              </div>
              {headers.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-kali-terminal/40 bg-kali-dark/80">
                  <header className="border-b border-kali-terminal/30 bg-kali-dark/70 px-5 py-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-kali-terminal">Captured Headers</h3>
                  </header>
                  <div className="max-h-60 overflow-auto">
                    <table className="min-w-full divide-y divide-kali-terminal/20 text-sm text-kali-terminal">
                      <thead className="bg-kali-dark/70 text-xs uppercase tracking-wide text-kali-terminal/80">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left">Header</th>
                          <th scope="col" className="px-4 py-2 text-left">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-kali-terminal/15 font-mono">
                        {headers.map((h) => (
                          <tr key={h.name} className="odd:bg-kali-dark/60">
                            <td className="px-4 py-2 text-kali-terminal">{h.name}</td>
                            <td className="px-4 py-2 break-all text-kali-terminal/80">{h.value}</td>
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
                <h3 className="text-sm font-semibold uppercase tracking-wide text-kali-text/70">Plugin Findings</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-kali-severity-high/50 bg-kali-severity-high/15 px-3 py-1 text-kali-severity-high">
                    High
                  </span>
                  <span className="rounded-full border border-kali-severity-medium/50 bg-kali-severity-medium/15 px-3 py-1 text-kali-severity-medium">
                    Medium
                  </span>
                  <span className="rounded-full border border-kali-severity-low/50 bg-kali-severity-low/15 px-3 py-1 text-kali-severity-low">
                    Info
                  </span>
                </div>
              </div>
              <p className="text-xs text-kali-text/60">
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
                      className={`space-y-3 rounded-2xl border ${sev.accent} bg-kali-dark/80 p-4 backdrop-blur`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                          <span aria-hidden className="text-2xl">
                            {sev.icon}
                          </span>
                          <div>
                            <p className="text-lg font-semibold text-kali-text">{sev.key} Findings</p>
                            <p className="text-xs text-kali-text/70">{sev.recommendation}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${sev.badge}`}>
                            {list.length} {list.length === 1 ? 'item' : 'items'}
                          </span>
                          <button
                            type="button"
                            onClick={() => copySection(list)}
                            className="rounded-full border border-kali-control/60 bg-kali-control/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-kali-text transition-colors hover:bg-kali-control/30"
                          >
                            Copy JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => exportSection(list, sev.key)}
                            className="rounded-full border border-kali-control/60 bg-kali-control/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-kali-text transition-colors hover:bg-kali-control/30"
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
                            className="rounded-full border border-kali-border/70 bg-kali-surface/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-kali-text/80 transition-colors hover:bg-kali-surface"
                          >
                            {open ? 'Hide' : 'Show'} details
                          </button>
                        </div>
                      </div>
                      {open && (
                        <div id={panelId} className="space-y-3 rounded-2xl border border-kali-border/60 bg-kali-surface/80 p-4">
                          <header className="flex flex-col gap-1 border-b border-kali-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-kali-text/70">Detail View</h4>
                            <p className="text-xs text-kali-text/60">Includes remediation hints tailored to each plugin.</p>
                          </header>
                          <ul className="space-y-3">
                            {list.map((f) => (
                              <li
                                key={`${f.path}-${f.finding}`}
                                className="space-y-3 rounded-2xl border border-kali-border/60 bg-kali-dark/80 p-4 text-sm shadow-inner shadow-black/30"
                              >
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-kali-text/60">Path</span>
                                  <span className="break-all font-mono text-kali-control">{f.path}</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-base font-semibold text-kali-text">{f.finding}</p>
                                  {f.details && <p className="leading-relaxed text-kali-text/80">{f.details}</p>}
                                </div>
                                {f.references?.length ? (
                                  <div className="space-y-1">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-kali-text/60">References</span>
                                    <p className="text-xs text-kali-text/70">{f.references.join(', ')}</p>
                                  </div>
                                ) : null}
                                <div className="rounded-2xl border border-kali-severity-low/40 bg-kali-severity-low/15 px-4 py-3 text-xs text-kali-text">
                                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-kali-severity-low">
                                    Recommended remediation
                                  </span>
                                  <p className="mt-1 leading-relaxed text-kali-text/90">{deriveRemediation(f)}</p>
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
          <section className="space-y-4 rounded-3xl border border-kali-border/70 bg-kali-surface/85 p-6 shadow-kali-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-kali-text">Scan Summary</h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-kali-severity-high/50 bg-kali-severity-high/15 px-3 py-1 font-semibold text-kali-severity-high">
                  Critical: {summary.critical}
                </span>
                <span className="rounded-full border border-kali-severity-medium/50 bg-kali-severity-medium/15 px-3 py-1 font-semibold text-kali-severity-medium">
                  Warning: {summary.warning}
                </span>
                <span className="rounded-full border border-kali-severity-low/50 bg-kali-severity-low/15 px-3 py-1 font-semibold text-kali-severity-low">
                  Info: {summary.info}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-kali-text/70">Raw Log</h3>
              <pre className="max-h-72 overflow-auto rounded-2xl border border-kali-terminal/40 bg-kali-dark/85 p-4 text-xs text-kali-terminal">{rawLog}</pre>
            </div>
          </section>
        )}
        <HeaderLab />
      </div>
    </div>
  );
};

export default NiktoPage;
