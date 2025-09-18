import React, { useState, useEffect, useRef } from 'react';
import TaskOverview from './task-overview';
import PolicySettings from './policy-settings';
import pciProfile from './templates/pci.json';
import hipaaProfile from './templates/hipaa.json';

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

const SeverityChart = ({ data, selected, onSelect }) => {
  const levels = ['low', 'medium', 'high', 'critical'];
  const max = Math.max(...levels.map((l) => data[l] || 0), 1);
  return (
    <svg
      viewBox="0 0 100 60"
      role="img"
      aria-label="OpenVAS findings severity chart"
      className="w-full h-32 mb-4"
    >
      {levels.map((level, i) => {
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
              className={`${severityColors[level]} ${onSelect ? 'cursor-pointer' : ''} ${
                isSelected ? 'stroke-white stroke-2' : ''
              }`}
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
const severityColors = {
  low: 'bg-green-700',
  medium: 'bg-yellow-700',
  high: 'bg-orange-700',
  critical: 'bg-red-700',
};

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
            setFindings(data.map((f) => ({ ...f, remediation: remediationMap[f.severity] })));
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

  const generateSummary = (data) => {
    const summary = `# OpenVAS Scan Summary\n\n- Target: ${target}\n- Group: ${group}\n- Profile: ${profile}\n\n## Output\n\n${data}`;
    const blob = new Blob([summary], { type: 'text/markdown' });
    setSummaryUrl(URL.createObjectURL(blob));
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

  const color = (i, j) => {
    const idx = Math.max(i, j);
    return ['bg-green-700', 'bg-yellow-700', 'bg-orange-700', 'bg-red-700'][idx];
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <TaskOverview />
      <PolicySettings policy={templates[profile]} />
      {hostReports.length > 0 && (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 mb-4">
          {hostReports.map((h) => (
            <button
              key={h.host}
              type="button"
              onClick={() => setActiveHost(h)}
              className="p-4 bg-gray-800 rounded text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="font-bold mb-1">{h.host}</div>
              <div className="mb-1">
                <span
                  className={`px-2 py-1 rounded text-xs ${severityColors[h.risk.toLowerCase()]}`}
                >
                  {h.risk}
                </span>
              </div>
              <div className="text-xs">
                {Object.entries(h.summary).map(([sev, count]) => (
                  <span key={sev} className="mr-2 capitalize">
                    {sev}: {count}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
      <h2 className="text-lg mb-2">OpenVAS Scanner</h2>
      <div className="flex mb-4 space-x-2">
        <input
          className="flex-1 p-2 rounded text-black"
          placeholder="Target (e.g. 192.168.1.1)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <input
          className="flex-1 p-2 rounded text-black"
          placeholder="Group (e.g. Servers)"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        />
        <div className="flex items-center space-x-2" role="tablist" aria-label="Scan profile">
          {profileTabs.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={profile === p.id}
              aria-label={p.label}
              onClick={() => setProfile(p.id)}
              className={`w-6 h-6 flex items-center justify-center rounded ${
                profile === p.id ? 'bg-gray-700' : 'bg-gray-600'
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
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>
      {loading && (
        <div className="w-full bg-gray-700 h-2 mb-4">
          <div
            style={{ width: `${progress}%` }}
            className="h-2 bg-green-500 transition-all"
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
                  return (
                    <button
                      key={`${likelihood}-${impact}`}
                      type="button"
                      onClick={() => handleCellClick(likelihood, impact)}
                      disabled={count === 0}
                      className={`p-2 ${color(i, j)} text-white focus:outline-none w-full ${
                        reduceMotion.current ? '' : 'transition-transform hover:scale-105'
                      } ${
                        filter &&
                        filter.likelihood === likelihood &&
                        filter.impact === impact
                          ? 'ring-2 ring-white'
                          : ''
                      } disabled:opacity-50`}
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
                className={`px-3 py-1 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  severity === level
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-white'
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
                    className={`w-3 h-3 mr-1 ${severityColors[level.toLowerCase()]}`}
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
              key={idx}
              role="listitem"
              className={`p-2 rounded ${severityColors[f.severity]} text-white`}
            >
              <button
                type="button"
                onClick={() => setSelected(f)}
                className="w-full text-left focus:outline-none"
              >
                <div className="flex items-center justify-between">
                  <span
                    dangerouslySetInnerHTML={{ __html: escapeHtml(f.description) }}
                  />
                  <div className="flex gap-1 ml-2">
                    <span className="px-1 py-0.5 bg-red-700 rounded text-xs">
                      CVSS {f.cvss}
                    </span>
                    <span className="px-1 py-0.5 bg-blue-700 rounded text-xs">
                      EPSS {(f.epss * 100).toFixed(1)}%
                    </span>
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
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-gray-800 p-4 rounded max-w-md w-full">
            <h3 className="text-lg mb-2">Host {activeHost.host} Findings</h3>
            <ul className="space-y-2 max-h-60 overflow-auto">
              {activeHost.vulns.map((v, i) => (
                <li key={i} className="p-2 bg-gray-700 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{v.title}</span>
                    <div className="flex gap-1 ml-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-red-700">
                        CVSS {v.cvss}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-700">
                        EPSS {(v.epss * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1">
                    {v.remediation.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block mr-1 mb-1 px-2 py-0.5 bg-gray-600 rounded text-xs"
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
              className="mt-4 px-3 py-1 bg-blue-600 rounded"
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
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
        >
          <div className="bg-gray-800 p-4 rounded max-w-md w-full">
            <h3 className="text-lg mb-2">Issue Detail</h3>
            <p
              className="mb-2"
              dangerouslySetInnerHTML={{ __html: escapeHtml(selected.description) }}
            />
            <div className="flex gap-2 mb-2">
              {selected.cvss !== undefined && (
                <span className="px-2 py-0.5 bg-red-700 rounded text-xs">
                  CVSS {selected.cvss}
                </span>
              )}
              {selected.epss !== undefined && (
                <span className="px-2 py-0.5 bg-blue-700 rounded text-xs">
                  EPSS {(selected.epss * 100).toFixed(1)}%
                </span>
              )}
            </div>
            {selected.remediation && (
              <p className="text-sm mb-4">
                <span className="font-bold">Remediation:</span> {selected.remediation}
              </p>
            )}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="px-3 py-1 bg-blue-600 rounded"
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
        <div className="bg-black text-white text-xs font-mono rounded overflow-auto">
          {output.split('\n').map((line, i) => (
            <div key={i} className={`px-2 ${i % 2 ? 'bg-gray-900' : 'bg-gray-800'}`}>
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
          className="inline-flex items-center mt-2 p-2 bg-blue-600 rounded"
        >
          <img src="/icons/48/status/download.svg" alt="" className="w-4 h-4" />
        </a>
      )}
      <footer className="mt-4 text-xs text-gray-400">
        <a
          href="https://www.openvas.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
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

