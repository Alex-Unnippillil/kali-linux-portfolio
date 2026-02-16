import React, { useState, useEffect, useRef } from 'react';
import TaskOverview from './task-overview';
import PolicySettings from './policy-settings';
import pciProfile from './templates/pci.json';
import hipaaProfile from './templates/hipaa.json';
import demoReport from './fixtures/demo-report.json';

const templates = { PCI: pciProfile, HIPAA: hipaaProfile };

const CardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <rect x="4" y="8" width="16" height="2" />
  </svg>
);

const HealthIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 2h2v8h8v2h-8v8h-2v-8H3v-2h8z" />
  </svg>
);

const profileTabs = [
  { id: 'PCI', label: 'PCI', icon: <CardIcon /> },
  { id: 'HIPAA', label: 'HIPAA', icon: <HealthIcon /> },
];

// Simple helper for notifications that falls back to alert()
const notify = (title, body) => {
  if (typeof window === 'undefined') return;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  } else {
    alert(`${title}: ${body}`);
  }
};

const escapeHtml = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const severityKeys = ['low', 'medium', 'high', 'critical'];

const severityStyles = {
  low: {
    surface: 'bg-kali-severity-low',
    chart: 'fill-kali-severity-low',
    text: 'text-white',
  },
  medium: {
    surface: 'bg-kali-severity-medium',
    chart: 'fill-kali-severity-medium',
    text: 'text-kali-inverse',
  },
  high: {
    surface: 'bg-kali-severity-high',
    chart: 'fill-kali-severity-high',
    text: 'text-white',
  },
  critical: {
    surface: 'bg-kali-severity-critical',
    chart: 'fill-kali-severity-critical',
    text: 'text-white',
  },
};

const SeverityChart = ({ data, selected, onSelect }) => {
  const max = Math.max(...severityKeys.map((l) => data[l] || 0), 1);
  return (
    <svg
      viewBox="0 0 100 60"
      role="img"
      aria-label="OpenVAS findings severity chart"
      className="mb-4 h-32 w-full"
    >
      {severityKeys.map((level, i) => {
        const value = data[level] || 0;
        const height = (value / max) * 50;
        const x = i * 24 + 5;
        const y = 55 - height;
        const isSelected = selected === level;
        const handle = () => onSelect && onSelect(level);
        const handleKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handle();
          }
        };
        return (
          <g key={level}>
            <rect
              x={x}
              y={y}
              width="20"
              height={height}
              className={`${severityStyles[level]?.chart ?? ''} ${
                onSelect ? 'cursor-pointer transition-transform' : ''
              } ${isSelected ? 'stroke-white stroke-2' : ''}`}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={`${value} ${level} findings`}
              onClick={handle}
              onKeyDown={handleKeyDown}
            />
            <text
              x={x + 10}
              y="58"
              textAnchor="middle"
              className="fill-white text-[8px] capitalize"
            >
              {level}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const severityLevels = ['All', 'Low', 'Medium', 'High', 'Critical'];

const remediationMap = {
  low: 'Review configuration and apply best practices.',
  medium: 'Update affected software to the latest version.',
  high: 'Apply vendor patches and restrict network access.',
  critical: 'Isolate system and patch immediately.',
};

const sampleFindings = [
  {
    severity: 'low',
    impact: 'low',
    likelihood: 'low',
    description: 'Outdated banner exposes software version',
    remediation: remediationMap.low,
    cvss: 5.0,
    epss: 0.05,
  },
  {
    severity: 'high',
    impact: 'high',
    likelihood: 'medium',
    description: 'Remote code execution vulnerability detected',
    remediation: remediationMap.high,
    cvss: 8.2,
    epss: 0.6,
  },
];

const hostReports = [
  {
    host: '192.168.1.10',
    risk: 'High',
    summary: { critical: 1, high: 2, medium: 2, low: 1 },
    vulns: [
      {
        title: 'Apache 2.4.49 Path Traversal',
        cvss: 9.8,
        epss: 0.76,
        remediation: ['Patch', 'WAF'],
      },
      {
        title: 'OpenSSH 7.2p2',
        cvss: 7.5,
        epss: 0.22,
        remediation: ['Update'],
      },
    ],
  },
  {
    host: '10.0.0.5',
    risk: 'Medium',
    summary: { critical: 0, high: 1, medium: 3, low: 2 },
    vulns: [
      {
        title: 'SMBv1 Enabled',
        cvss: 6.5,
        epss: 0.17,
        remediation: ['Disable SMBv1', 'Patch'],
      },
    ],
  },
];

// Persist in-progress scans so they can resume after reload
const loadSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('openvas/session') || 'null');
  } catch {
    return null;
  }
};

const saveSession = (session) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('openvas/session', JSON.stringify(session));
};

const clearSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('openvas/session');
};

export const normalizeFinding = (finding = {}) => ({
  ...finding,
  ...(typeof finding.cvss === 'number' ? { cvss: finding.cvss } : {}),
  ...(typeof finding.epss === 'number' ? { epss: finding.epss } : {}),
});

const OpenVASApp = () => {
  const [target, setTarget] = useState('');
  const [group, setGroup] = useState('');
  const [profile, setProfile] = useState('PCI');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryUrl, setSummaryUrl] = useState(null);
  const [findings, setFindings] = useState(sampleFindings);
  const [filter, setFilter] = useState(null);
  const [severity, setSeverity] = useState('All');
  const [announce, setAnnounce] = useState('');
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState(null);
  const [activeHost, setActiveHost] = useState(null);
  const workerRef = useRef(null);
  const reduceMotion = useRef(false);
  const sessionRef = useRef({});

  useEffect(() => {
    if (!summaryUrl || typeof URL.revokeObjectURL !== 'function') return undefined;
    return () => URL.revokeObjectURL(summaryUrl);
  }, [summaryUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      reduceMotion.current = media.matches;
      if (typeof Worker === 'function') {
        workerRef.current = new Worker(new URL('./openvas.worker.js', import.meta.url));
        workerRef.current.onmessage = (e) => {
          const { type, data } = e.data || {};
          if (type === 'progress') {
            setProgress(data);
            saveSession({ ...sessionRef.current, progress: data });
          }
          if (type === 'result')
            setFindings(
              data.map((f) =>
                normalizeFinding({ ...f, remediation: remediationMap[f.severity] })
              )
            );
        };
      }

      const session = loadSession();
      if (session) {
        sessionRef.current = session;
        setTarget(session.target || '');
        setGroup(session.group || '');
        setProfile(session.profile || 'PCI');
        setProgress(session.progress || 0);
        if (session.target && session.progress < 1) {
          runScan(session.target, session.group || '', session.profile || 'PCI');
        }
      }
    }
    return () => workerRef.current?.terminate();
    // runScan is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateSummary = (data, metadata = {}) => {
    const scanTarget = metadata.target ?? target;
    const scanGroup = metadata.group ?? group;
    const scanProfile = metadata.profile ?? profile;
    const summary = `# OpenVAS Scan Summary\n\n- Target: ${scanTarget}\n- Group: ${scanGroup}\n- Profile: ${scanProfile}\n\n## Output\n\n${data}`;
    const blob = new Blob([summary], { type: 'text/markdown' });
    setSummaryUrl(URL.createObjectURL(blob));
  };

  const parseReportText = (text, metadata = {}) => {
    setLoading(false);
    setProgress(0);
    setSelected(null);
    setActiveHost(null);
    setOutput(text);
    workerRef.current?.postMessage({ text });
    generateSummary(text, metadata);
  };

  const handleLoadDemoReport = () => {
    const { target: demoTarget, group: demoGroup, profile: demoProfile, reportText } = demoReport;
    setTarget(demoTarget);
    setGroup(demoGroup);
    setProfile(demoProfile);
    parseReportText(reportText, {
      target: demoTarget,
      group: demoGroup,
      profile: demoProfile,
    });
  };

  const handleImportReport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    if (!text.trim()) {
      setOutput('Unable to import report: file is empty.');
      setSelected(null);
      setActiveHost(null);
      setLoading(false);
      setProgress(0);
      return;
    }
    parseReportText(text);
  };

  const runScan = async (
    t = target,
    g = group,
    p = profile,
  ) => {
    if (!t) return;
    sessionRef.current = { target: t, group: g, profile: p };
    saveSession({ ...sessionRef.current, progress: 0 });
    setTarget(t);
    setGroup(g);
    setProfile(p);
    setLoading(true);
    setProgress(0);
    setOutput('');
    setSummaryUrl(null);
    try {
      const res = await fetch(
        `/api/openvas?target=${encodeURIComponent(t)}&group=${encodeURIComponent(g)}&profile=${encodeURIComponent(p)}`
      );
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const data = await res.text();
      setOutput(data);
      workerRef.current?.postMessage({ text: data });
      generateSummary(data);
      notify('OpenVAS Scan Complete', `Target ${t} finished`);
    } catch (e) {
      setOutput(e.message);
      notify('OpenVAS Scan Failed', e.message);
    } finally {
      setLoading(false);
      clearSession();
      sessionRef.current = {};
    }
  };

  const handleCellClick = (likelihood, impact) => {
    const run = () => {
      if (
        filter &&
        filter.likelihood === likelihood &&
        filter.impact === impact
      ) {
        setFilter(null);
        setAnnounce('Showing all findings');
      } else {
        setFilter({ likelihood, impact });
        setAnnounce(
          `Showing ${likelihood} likelihood and ${impact} impact findings`
        );
      }
    };
    if (reduceMotion.current) run();
    else requestAnimationFrame(run);
  };

  const handleSeverityChange = (level) => {
    const run = () => {
      setSeverity(level);
      setAnnounce(`Showing ${level} severity alerts`);
    };
    if (reduceMotion.current) run();
    else requestAnimationFrame(run);
  };

  const filteredFindings = filter
    ? findings.filter(
        (f) => f.likelihood === filter.likelihood && f.impact === filter.impact
      )
    : findings;

  const displayFindings =
    severity === 'All'
      ? filteredFindings
      : filteredFindings.filter((f) => f.severity === severity.toLowerCase());

  const severityCounts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});

  const matrix = ['low', 'medium', 'high', 'critical'].map((likelihood) =>
    ['low', 'medium', 'high', 'critical'].map((impact) =>
      findings.filter(
        (f) => f.likelihood === likelihood && f.impact === impact
      )
    )
  );

  const matrixSeverity = (i, j) => {
    const idx = Math.max(i, j);
    return severityKeys[Math.min(idx, severityKeys.length - 1)];
  };

  return (
    <div className="h-full w-full overflow-auto bg-kali-surface/95 p-4 text-white">
      <TaskOverview />
      <PolicySettings policy={templates[profile]} />
      {hostReports.length > 0 && (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 mb-4">
          {hostReports.map((h) => {
            const riskTheme = severityStyles[h.risk.toLowerCase()] ?? {};
            return (
              <button
                key={h.host}
                type="button"
                onClick={() => setActiveHost(h)}
                className="rounded-lg border border-white/10 bg-kali-surface p-4 text-left transition hover:bg-kali-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              >
                <div className="font-bold mb-1">{h.host}</div>
                <div className="mb-1">
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      riskTheme.surface ?? ''
                    } ${riskTheme.text ?? 'text-white'}`}
                  >
                    {h.risk}
                  </span>
                </div>
                <div className="text-xs text-white/70">
                  {Object.entries(h.summary).map(([sev, count]) => (
                    <span key={sev} className="mr-2 capitalize">
                      {sev}: {count}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <h2 className="mb-2 text-lg font-semibold">OpenVAS Scanner</h2>
      <div className="mb-4 flex flex-wrap gap-2">
          <input
            className="flex-1 min-w-[12rem] rounded-lg bg-kali-surface-muted px-3 py-2 text-sm text-white placeholder-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            placeholder="Target (e.g. 192.168.1.1)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Scan target"
          />
          <input
            className="flex-1 min-w-[10rem] rounded-lg bg-kali-surface-muted px-3 py-2 text-sm text-white placeholder-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            placeholder="Group (e.g. Servers)"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            aria-label="Asset group"
          />
        <div className="flex items-center gap-2" role="tablist" aria-label="Scan profile">
          {profileTabs.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={profile === p.id}
              aria-label={p.label}
              onClick={() => setProfile(p.id)}
              className={`flex h-8 w-8 items-center justify-center rounded-md border border-white/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                profile === p.id
                  ? 'bg-kali-surface-raised text-kali-control shadow-[0_0_0_1px_rgba(255,255,255,0.12)]'
                  : 'bg-kali-surface-muted text-white/70 hover:text-white'
              }`}
            >
              {p.icon}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => runScan()}
          disabled={loading}
          className="rounded-lg bg-kali-severity-low px-4 py-2 text-sm font-semibold text-white transition hover:bg-kali-severity-low/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>
        <button
          type="button"
          onClick={handleLoadDemoReport}
          className="rounded-lg bg-kali-surface-raised px-4 py-2 text-sm font-semibold text-white transition hover:bg-kali-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        >
          Load demo report
        </button>
        <label className="cursor-pointer rounded-lg bg-kali-surface-raised px-4 py-2 text-sm font-semibold text-white transition hover:bg-kali-surface-muted focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kali-focus">
          Import report
          <input
            type="file"
            accept=".txt,.log"
            aria-label="Import OpenVAS report"
            onChange={handleImportReport}
            className="sr-only"
          />
        </label>
      </div>
      {loading && (
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-kali-surface-muted">
          <div
            style={{ width: `${progress}%` }}
            className={`h-full transition-all ${severityStyles.low?.surface ?? ''}`}
          />
        </div>
      )}
      <SeverityChart
        data={severityCounts}
        selected={severity === 'All' ? null : severity.toLowerCase()}
        onSelect={(level) =>
          handleSeverityChange(
            severity.toLowerCase() === level
              ? 'All'
              : level.charAt(0).toUpperCase() + level.slice(1)
          )
        }
      />
      {findings.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-5 gap-1 text-center">
            <div />
            {['low', 'medium', 'high', 'critical'].map((impact) => (
              <div key={impact} className="font-bold capitalize">
                {impact}
              </div>
            ))}
            {['low', 'medium', 'high', 'critical'].map((likelihood, i) => (
              <React.Fragment key={likelihood}>
                <div className="font-bold capitalize flex items-center justify-center">
                  {likelihood}
                </div>
                {['low', 'medium', 'high', 'critical'].map((impact, j) => {
                  const cell = matrix[i][j];
                  const count = cell.length;
                  const severityKey = matrixSeverity(i, j);
                  const severityTheme = severityStyles[severityKey] ?? {};
                  const bgClass = severityTheme.surface ?? '';
                  const textClass = severityTheme.text ?? 'text-white';
                  return (
                    <button
                      key={`${likelihood}-${impact}`}
                      type="button"
                      onClick={() => handleCellClick(likelihood, impact)}
                      disabled={count === 0}
                      className={`w-full rounded-md p-2 font-semibold ${bgClass} ${textClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                        reduceMotion.current ? '' : 'transition-transform hover:scale-105'
                      } ${
                        filter &&
                        filter.likelihood === likelihood &&
                        filter.impact === impact
                          ? 'ring-2 ring-white/80'
                          : ''
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                      aria-label={`${count} findings with ${likelihood} likelihood and ${impact} impact`}
                    >
                      {count}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div
            role="radiogroup"
            aria-label="Filter alerts by severity"
            className="flex flex-wrap gap-2 mt-4"
          >
            {severityLevels.map((level) => (
              <button
                key={level}
                onClick={() => handleSeverityChange(level)}
                aria-pressed={severity === level}
                className={`rounded-full border border-white/10 px-3 py-1 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                  severity === level
                    ? 'bg-kali-control text-black shadow-[0_0_0_1px_rgba(255,255,255,0.25)]'
                    : 'bg-kali-surface-muted text-white/80 hover:text-white'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-sm" aria-label="Severity legend">
            {severityLevels
              .filter((l) => l !== 'All')
              .map((level) => (
                <div key={level} className="flex items-center">
                  <span
                    className={`mr-1 h-3 w-3 rounded-sm ${
                      severityStyles[level.toLowerCase()]?.surface ?? ''
                    }`}
                  />
                  {level}
                </div>
              ))}
          </div>
        </div>
      )}
      {displayFindings.length > 0 && (
        <ul className="mb-4 space-y-2">
          {displayFindings.map((f, idx) => (
            <li
              key={f.id ?? idx}
              role="listitem"
              className={`rounded-lg p-2 shadow-sm ${
                severityStyles[f.severity]?.surface ?? ''
              } ${severityStyles[f.severity]?.text ?? 'text-white'}`}
            >
              <button
                type="button"
                onClick={() => setSelected(f)}
                aria-label={`View finding details for ${f.description}`}
                className="w-full text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              >
                <div className="flex items-center justify-between">
                  <span
                    dangerouslySetInnerHTML={{ __html: escapeHtml(f.description) }}
                  />
                  <div className="ml-2 flex gap-1">
                    {typeof f.cvss === 'number' && (
                      <span className="rounded bg-kali-severity-critical px-1 py-0.5 text-xs font-semibold text-white">
                        CVSS {f.cvss}
                      </span>
                    )}
                    {typeof f.epss === 'number' && (
                      <span className="rounded bg-kali-info px-1 py-0.5 text-xs font-semibold text-kali-inverse">
                        EPSS {(f.epss * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {activeHost && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-kali-overlay/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-kali-surface-raised p-4 shadow-lg sm:p-5">
            <h3 className="mb-3 text-lg font-semibold">Host {activeHost.host} Findings</h3>
            <ul className="max-h-60 space-y-2 overflow-auto pr-1">
              {activeHost.vulns.map((v, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-white/10 bg-kali-surface-muted/90 p-3 shadow-inner"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{v.title}</span>
                    <div className="flex gap-1 ml-2">
                      <span className="rounded-full bg-kali-severity-critical px-2 py-0.5 text-xs font-semibold text-white">
                        CVSS {v.cvss}
                      </span>
                      <span className="rounded-full bg-kali-info px-2 py-0.5 text-xs font-semibold text-kali-inverse">
                        EPSS {(v.epss * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1">
                    {v.remediation.map((tag) => (
                      <span
                        key={tag}
                        className="mr-1 mb-1 inline-block rounded-full border border-white/10 bg-kali-surface-raised/70 px-2 py-0.5 text-xs text-white/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setActiveHost(null)}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-kali-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-kali-overlay/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-kali-surface-raised p-4 shadow-lg sm:p-5">
            <h3 className="mb-3 text-lg font-semibold">Issue Detail</h3>
            <p
              className="mb-3 text-sm text-white/90"
              dangerouslySetInnerHTML={{ __html: escapeHtml(selected.description) }}
            />
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              {selected.cvss !== undefined && (
                <span className="rounded-full bg-kali-severity-critical px-2 py-0.5 text-xs font-semibold text-white">
                  CVSS {selected.cvss}
                </span>
              )}
              {selected.epss !== undefined && (
                <span className="rounded-full bg-kali-info px-2 py-0.5 text-xs font-semibold text-kali-inverse">
                  EPSS {(selected.epss * 100).toFixed(1)}%
                </span>
              )}
            </div>
            {selected.remediation && (
              <p className="mb-4 text-sm text-white/80">
                <span className="font-bold">Remediation:</span> {selected.remediation}
              </p>
            )}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="inline-flex items-center justify-center rounded-md bg-kali-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      {output && (
        <div className="overflow-auto rounded-lg border border-white/10 bg-kali-surface-muted text-xs font-mono text-white">
          {output.split('\n').map((line, i) => (
            <div
              key={i}
              className={`px-2 py-1 ${
                i % 2 ? 'bg-kali-surface' : 'bg-kali-surface-muted/80'
              }`}
            >
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      )}
      {summaryUrl && (
        <a
          href={summaryUrl}
          download="openvas-summary.md"
          aria-label="Download summary"
          className="mt-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-kali-primary text-white transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        >
          <img src="/themes/Yaru/status/download.svg" alt="" className="w-4 h-4" />
        </a>
      )}
      <footer className="mt-4 text-xs text-white/60">
        <a
          href="https://www.openvas.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-kali-info underline hover:text-kali-info/80"
        >
          Official OpenVAS documentation
        </a>
        . Use responsibly and only on systems you own or have permission to
        test. All data shown here is canned for demonstration.
      </footer>
    </div>
  );
};

export default OpenVASApp;

export const displayOpenVAS = () => <OpenVASApp />;
