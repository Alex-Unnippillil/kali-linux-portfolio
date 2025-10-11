import React, { useState, useEffect, useMemo, useRef } from 'react';
import TaskOverview from './task-overview';
import PolicySettings from './policy-settings';
import pciProfile from './templates/pci.json';
import hipaaProfile from './templates/hipaa.json';
import LabMode from '../../LabMode';

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

const fallbackReport = {
  metadata: {
    scanName: 'Quarterly PCI Internal',
    profile: 'PCI DSS Full and Fast',
    target: '10.10.20.0/24',
    startTime: '2024-05-22T09:00:00Z',
    endTime: '2024-05-22T10:32:00Z',
    engine: 'OpenVAS 22.4',
    notes:
      'Offline fixture providing a safe training experience. No network calls are made.',
  },
  summary: { critical: 2, high: 5, medium: 9, low: 14 },
  timeline: [
    { label: 'Task created', time: '2024-05-21T17:15:00Z' },
    { label: 'Feed check completed', time: '2024-05-22T08:45:00Z' },
    { label: 'Target discovery', time: '2024-05-22T09:05:00Z' },
    { label: 'Vulnerability scan', time: '2024-05-22T09:20:00Z' },
    { label: 'Report generated', time: '2024-05-22T10:32:00Z' },
  ],
  hosts: [
    {
      host: '192.168.1.10',
      asset: 'Web Frontend',
      risk: 'High',
      summary: { critical: 1, high: 2, medium: 3, low: 2 },
      services: [
        { name: 'Apache', product: 'Apache HTTP Server 2.4.49', port: '443/tcp' },
        { name: 'OpenSSL', product: 'OpenSSL 1.1.1l', port: '443/tcp' },
        { name: 'PostgreSQL', product: 'PostgreSQL 12', port: '5432/tcp' },
      ],
      vulns: [
        {
          id: 'CVE-2021-41773',
          title: 'Apache 2.4.49 Path Traversal',
          severity: 'critical',
          cvss: 9.8,
          epss: 0.76,
          likelihood: 'high',
          impact: 'high',
          remediation: ['Patch', 'WAF'],
          description:
            'A flaw in path normalisation allows attackers to map URLs to files outside the expected document root.',
        },
        {
          id: 'CVE-2023-0464',
          title: 'OpenSSL ASN.1 Parsing DoS',
          severity: 'high',
          cvss: 7.5,
          epss: 0.35,
          likelihood: 'medium',
          impact: 'high',
          remediation: ['Update'],
          description:
            'Malformed ASN.1 data can trigger excessive resource consumption leading to denial of service.',
        },
      ],
    },
    {
      host: '192.168.1.20',
      asset: 'Jump Server',
      risk: 'Medium',
      summary: { critical: 0, high: 1, medium: 4, low: 3 },
      services: [
        { name: 'OpenSSH', product: 'OpenSSH 8.2p1', port: '22/tcp' },
        { name: 'Samba', product: 'Samba 4.11', port: '445/tcp' },
      ],
      vulns: [
        {
          id: 'CVE-2020-14145',
          title: 'OpenSSH User Enumeration',
          severity: 'medium',
          cvss: 5.3,
          epss: 0.05,
          likelihood: 'medium',
          impact: 'medium',
          remediation: ['Harden SSH'],
          description:
            'Timing differences in public-key authentication make valid accounts discoverable.',
        },
        {
          id: 'CVE-2017-0144',
          title: 'SMBv1 Remote Code Execution',
          severity: 'high',
          cvss: 8.1,
          epss: 0.91,
          likelihood: 'high',
          impact: 'high',
          remediation: ['Disable SMBv1', 'Patch'],
          description:
            'Legacy SMBv1 protocol enables remote code execution via crafted packets (EternalBlue).',
        },
      ],
    },
    {
      host: '192.168.1.30',
      asset: 'Database Server',
      risk: 'Low',
      summary: { critical: 0, high: 0, medium: 2, low: 5 },
      services: [
        { name: 'MySQL', product: 'MySQL 8.0.28', port: '3306/tcp' },
        { name: 'NTP', product: 'ntpd 4.2.8p15', port: '123/udp' },
      ],
      vulns: [
        {
          id: 'CVE-2022-0981',
          title: 'MySQL Information Disclosure',
          severity: 'medium',
          cvss: 6.4,
          epss: 0.12,
          likelihood: 'low',
          impact: 'medium',
          remediation: ['Update'],
          description:
            'Improper privilege separation could allow authenticated users to view restricted schema metadata.',
        },
        {
          id: 'NVT-2024-0001',
          title: 'NTP Mode 6 Amplification',
          severity: 'low',
          cvss: 3.7,
          epss: 0.02,
          likelihood: 'medium',
          impact: 'low',
          remediation: ['Rate limit', 'Monitor'],
          description:
            'Exposed Mode 6 queries may be abused for reflected amplification attacks.',
        },
      ],
    },
  ],
};

const flattenFindings = (report = fallbackReport) =>
  report.hosts.flatMap((host) =>
    host.vulns.map((vuln) => ({
      host: host.host,
      asset: host.asset,
      severity: vuln.severity,
      likelihood: vuln.likelihood,
      impact: vuln.impact,
      description: vuln.title,
      remediation: Array.isArray(vuln.remediation)
        ? vuln.remediation.join(', ')
        : vuln.remediation,
      cvss: vuln.cvss,
      epss: vuln.epss,
      id: vuln.id,
      references: vuln.references || [],
    }))
  );

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

const viewTabs = [
  { id: 'summary', label: 'Summary' },
  { id: 'detail', label: 'Host detail' },
];

const formatDate = (value) => {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const OpenVASApp = () => {
  const [target, setTarget] = useState('');
  const [group, setGroup] = useState('');
  const [profile, setProfile] = useState('PCI');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryUrl, setSummaryUrl] = useState(null);
  const [report, setReport] = useState(fallbackReport);
  const [findings, setFindings] = useState(() => flattenFindings(fallbackReport));
  const [hostReports, setHostReports] = useState(fallbackReport.hosts);
  const [selectedHost, setSelectedHost] = useState(
    fallbackReport.hosts[0] || null,
  );
  const [filter, setFilter] = useState(null);
  const [severity, setSeverity] = useState('All');
  const [announce, setAnnounce] = useState('');
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState(null);
  const [fixtureStatus, setFixtureStatus] = useState('loading');
  const [fixtureError, setFixtureError] = useState('');
  const [activeView, setActiveView] = useState('summary');
  const workerRef = useRef(null);
  const reduceMotion = useRef(false);
  const sessionRef = useRef({});

  const metadataEntries = useMemo(
    () => [
      { label: 'Scan name', value: report?.metadata?.scanName || 'Not provided' },
      { label: 'Profile', value: report?.metadata?.profile || 'Not provided' },
      { label: 'Target', value: report?.metadata?.target || 'Not provided' },
      { label: 'Engine', value: report?.metadata?.engine || 'Not provided' },
      {
        label: 'Started',
        value: formatDate(report?.metadata?.startTime),
      },
      {
        label: 'Finished',
        value: formatDate(report?.metadata?.endTime),
      },
      { label: 'Notes', value: report?.metadata?.notes || 'No notes provided.' },
    ],
    [report],
  );

  const severitySummary = useMemo(() => report?.summary || {}, [report]);
  const timelineEvents = useMemo(() => report?.timeline || [], [report]);

  useEffect(() => {
    let cancelled = false;
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
          if (type === 'result') {
            setFindings(
              data.map((f) => ({ ...f, remediation: remediationMap[f.severity] })),
            );
          }
        };
      }

      const loadFixture = async () => {
        setFixtureStatus('loading');
        try {
          const res = await fetch('/fixtures/openvas-report.json');
          if (!res.ok) throw new Error(`Fixture request failed with ${res.status}`);
          const data = await res.json();
          if (cancelled) return;
          setReport(data);
          setHostReports(data.hosts || []);
          setFindings(flattenFindings(data));
          setSelectedHost((prev) => {
            if (prev && (data.hosts || []).some((host) => host.host === prev.host)) {
              return prev;
            }
            return data.hosts?.[0] || null;
          });
          setFixtureStatus('ready');
          setFixtureError('');
        } catch (err) {
          if (cancelled) return;
          setFixtureStatus('error');
          setFixtureError('Falling back to bundled offline data.');
          setReport(fallbackReport);
          setHostReports(fallbackReport.hosts);
          setFindings(flattenFindings(fallbackReport));
          setSelectedHost(fallbackReport.hosts[0] || null);
        }
      };

      loadFixture();

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
    return () => {
      cancelled = true;
      workerRef.current?.terminate();
    };
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

  const summaryView = (
    <div className="space-y-4">
      {Object.keys(severitySummary).length > 0 && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Object.entries(severitySummary).map(([level, count]) => {
            const key = level.toLowerCase();
            return (
              <div
                key={level}
                className={`rounded p-3 text-sm ${severityColors[key] || 'bg-gray-700'}`}
              >
                <p className="text-xs uppercase tracking-wide">{level}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      )}
      {hostReports.length > 0 && (
        <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
          {hostReports.map((host) => (
            <button
              key={host.host}
              type="button"
              onClick={() => {
                setSelectedHost(host);
                setActiveView('detail');
              }}
              className="p-4 bg-gray-800 rounded text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{host.host}</div>
                  <div className="text-xs text-gray-300">{host.asset || 'Lab asset'}</div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    severityColors[(host.risk || '').toLowerCase()] || 'bg-gray-700'
                  }`}
                >
                  {host.risk}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-200">
                {Object.entries(host.summary || {}).map(([sev, count]) => (
                  <span key={sev} className="mr-2 capitalize">
                    {sev}: {count}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
      <section className="rounded bg-gray-800 p-4">
        <h3 className="text-md font-bold mb-3">Severity overview</h3>
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
        {findings.length > 0 ? (
          <>
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
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm" aria-label="Severity legend">
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
          </>
        ) : (
          <p className="text-sm text-gray-300">No findings available in the current filter.</p>
        )}
      </section>
      <section className="rounded bg-gray-800 p-4">
        <h3 className="text-md font-bold mb-3">Findings</h3>
        {displayFindings.length > 0 ? (
          <ul className="space-y-2">
            {displayFindings.map((f, idx) => (
              <li
                key={f.id || idx}
                role="listitem"
                className={`p-3 rounded ${severityColors[f.severity] || 'bg-gray-700'} text-white`}
              >
                <button
                  type="button"
                  onClick={() => setSelected(f)}
                  className="w-full text-left focus:outline-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{f.description}</p>
                      <p className="text-xs text-gray-100">
                        {f.host || 'Ad-hoc scan'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {f.cvss !== undefined && (
                        <span className="px-2 py-0.5 bg-red-700 rounded text-xs">
                          CVSS {f.cvss}
                        </span>
                      )}
                      {f.epss !== undefined && (
                        <span className="px-2 py-0.5 bg-blue-700 rounded text-xs">
                          EPSS {(f.epss * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-300">No findings match the selected filters.</p>
        )}
      </section>
      {timelineEvents.length > 0 && (
        <section className="rounded bg-gray-800 p-4">
          <h3 className="text-md font-bold mb-3">Execution timeline</h3>
          <ol className="space-y-2 text-xs text-gray-200">
            {timelineEvents.map((event, idx) => (
              <li key={`${event.label}-${idx}`} className="flex justify-between gap-4">
                <span>{event.label}</span>
                <time className="text-gray-300">{formatDate(event.time)}</time>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );

  const detailView = (
    <div className="grid gap-4 md:grid-cols-3">
      <aside className="rounded bg-gray-800 p-4">
        <h3 className="text-md font-bold mb-3">Hosts</h3>
        {hostReports.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {hostReports.map((host) => {
              const isActive = selectedHost?.host === host.host;
              return (
                <li key={host.host}>
                  <button
                    type="button"
                    onClick={() => setSelectedHost(host)}
                    className={`w-full rounded p-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isActive ? 'bg-gray-700' : 'bg-gray-900'
                    }`}
                    aria-pressed={isActive}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{host.host}</p>
                        <p className="text-[11px] text-gray-300">{host.asset || 'Lab asset'}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          severityColors[(host.risk || '').toLowerCase()] || 'bg-gray-700'
                        }`}
                      >
                        {host.risk}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-300">No host data available in this fixture.</p>
        )}
      </aside>
      <section className="md:col-span-2 space-y-3">
        {selectedHost ? (
          <div className="space-y-3 rounded bg-gray-800 p-4">
            <header>
              <h3 className="text-lg font-semibold">{selectedHost.host}</h3>
              <p className="text-sm text-gray-300">{selectedHost.asset}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {Object.entries(selectedHost.summary || {}).map(([sev, count]) => {
                  const sevKey = (sev || '').toLowerCase();
                  return (
                    <span
                      key={sev}
                      className={`rounded px-2 py-0.5 ${
                        severityColors[sevKey] || 'bg-gray-700'
                      }`}
                    >
                      {sev}: {count}
                    </span>
                  );
                })}
              </div>
            </header>
            {selectedHost.services?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold mb-1">Observed services</h4>
                <ul className="space-y-1 text-xs text-gray-200">
                  {selectedHost.services.map((svc) => (
                    <li key={`${svc.port}-${svc.name}`} className="flex justify-between gap-2">
                      <span>{svc.name}</span>
                      <span className="text-right">
                        {svc.product} • {svc.port}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h4 className="text-sm font-bold mb-2">Host findings</h4>
              {selectedHost.vulns?.length > 0 ? (
                <div className="space-y-2">
                  {selectedHost.vulns.map((vuln) => (
                    <article key={vuln.id} className="space-y-2 rounded bg-gray-700 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{vuln.title}</p>
                          <p className="text-xs text-gray-200">{vuln.description}</p>
                        </div>
                        <div className="flex gap-1 text-xs">
                          <span className="rounded bg-red-700 px-2 py-0.5">CVSS {vuln.cvss}</span>
                          <span className="rounded bg-blue-700 px-2 py-0.5">
                            EPSS {(vuln.epss * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-gray-100">
                        {vuln.remediation?.map((tag) => (
                          <span key={tag} className="rounded bg-gray-600 px-2 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelected({
                            ...vuln,
                            host: selectedHost.host,
                            remediation: Array.isArray(vuln.remediation)
                              ? vuln.remediation.join(', ')
                              : vuln.remediation,
                          })
                        }
                        className="text-xs text-blue-300 underline"
                      >
                        View in detail panel
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-300">No vulnerabilities recorded for this host.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded bg-gray-800 p-4 text-sm text-gray-300">
            Select a host to see its services and findings.
          </div>
        )}
      </section>
    </div>
  );

  return (
    <LabMode>
      <div className="h-full w-full overflow-auto bg-ub-cool-grey p-4 text-white">
        <TaskOverview />
        <PolicySettings policy={templates[profile]} />
        <section className="mb-4 rounded bg-gray-800 p-4">
          <h2 className="text-md font-bold mb-2">Scan metadata</h2>
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            {metadataEntries.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-gray-300">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <nav role="tablist" aria-label="Report view" className="flex gap-2">
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeView === tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  activeView === tab.id ? 'bg-blue-600' : 'bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <span className="text-xs text-gray-300">
            {fixtureStatus === 'loading'
              ? 'Loading scan report fixture…'
              : fixtureStatus === 'error'
              ? fixtureError
              : 'Lab fixture ready'}
          </span>
        </div>
        <div aria-live="polite" className="sr-only">
          {fixtureStatus === 'loading'
            ? 'Loading OpenVAS lab fixture'
            : fixtureStatus === 'error'
            ? fixtureError
            : 'OpenVAS lab fixture ready'}
        </div>
        {fixtureStatus === 'error' && (
          <div
            role="alert"
            className="mb-4 rounded bg-ub-yellow p-3 text-xs text-black"
          >
            Offline fallback active. {fixtureError}
          </div>
        )}
        <div className="space-y-4">
          {activeView === 'summary' ? summaryView : detailView}
        </div>
        <h2 className="mt-6 text-lg mb-2">OpenVAS Scanner</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            className="flex-1 min-w-[180px] rounded p-2 text-black"
            placeholder="Target (e.g. 192.168.1.1)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <input
            className="flex-1 min-w-[160px] rounded p-2 text-black"
            placeholder="Group (e.g. Servers)"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          />
          <div
            className="flex items-center space-x-2"
            role="tablist"
            aria-label="Scan profile"
          >
            {profileTabs.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={profile === p.id}
                aria-label={p.label}
                onClick={() => setProfile(p.id)}
                className={`flex h-7 w-7 items-center justify-center rounded ${
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
            className="rounded bg-green-600 px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Scanning…' : 'Scan'}
          </button>
        </div>
        {loading && (
          <div className="mb-4 h-2 w-full bg-gray-700">
            <div
              style={{ width: `${progress}%` }}
              className="h-2 bg-green-500 transition-all"
            />
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
              <p className="mb-2">{selected.description}</p>
              {selected.host && (
                <p className="mb-2 text-sm text-gray-300">
                  <span className="font-semibold text-white">Host:</span> {selected.host}
                </p>
              )}
              <div className="mb-2 flex gap-2">
                {selected.cvss !== undefined && (
                  <span className="rounded bg-red-700 px-2 py-0.5 text-xs">
                    CVSS {selected.cvss}
                  </span>
                )}
                {selected.epss !== undefined && (
                  <span className="rounded bg-blue-700 px-2 py-0.5 text-xs">
                    EPSS {(selected.epss * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              {selected.remediation && (
                <p className="mb-4 text-sm">
                  <span className="font-bold">Remediation:</span> {selected.remediation}
                </p>
              )}
              {selected.references?.length > 0 && (
                <div className="mb-4 text-xs">
                  <h4 className="mb-1 text-sm font-semibold">References</h4>
                  <ul className="list-inside list-disc space-y-1 text-blue-300">
                    {selected.references.map((ref) => (
                      <li key={ref}>
                        <a href={ref} target="_blank" rel="noopener noreferrer" className="underline">
                          {ref}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded bg-blue-600 px-3 py-1"
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
          <div className="overflow-auto rounded bg-black text-xs font-mono text-white">
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
            className="mt-2 inline-flex items-center rounded bg-blue-600 p-2"
          >
            <img src="/themes/Yaru/status/download.svg" alt="" className="h-4 w-4" />
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
    </LabMode>
  );
};

export default OpenVASApp;

export const displayOpenVAS = () => <OpenVASApp />;

