import React, { useState, useEffect, useRef } from 'react';
import chartData from './chart-data.json';
import TaskOverview from './task-overview';

// Simple helper for notifications that falls back to alert()
const notify = (title, body) => {
  if (typeof window === 'undefined') return;
  if ('Notification' in window && Notification.permission === 'granted') {
    // eslint-disable-next-line no-new
    new Notification(title, { body });
  } else {
    // eslint-disable-next-line no-alert
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

const DonutChart = ({ data }) => {
  const levels = ['low', 'medium', 'high', 'critical'];
  const total = levels.reduce((sum, l) => sum + (data[l] || 0), 0) || 1;
  let cumulative = 0;
  const severityHex = {
    low: '#15803d',
    medium: '#a16207',
    high: '#c2410c',
    critical: '#b91c1c',
  };
  return (
    <svg
      viewBox="0 0 36 36"
      role="img"
      aria-label="OpenVAS findings severity chart"
      className="w-full h-32 mb-4"
    >
      {levels.map((level) => {
        const value = data[level] || 0;
        const dashArray = `${(value / total) * 100} ${100 -
          (value / total) * 100}`;
        const dashOffset = (cumulative / total) * 100;
        cumulative += value;
        return (
          <circle
            key={level}
            cx="18"
            cy="18"
            r="15.915"
            fill="transparent"
            stroke={severityHex[level]}
            strokeWidth="3.8"
            strokeDasharray={dashArray}
            strokeDashoffset={-dashOffset}
          />
        );
      })}
      <circle cx="18" cy="18" r="12" fill="#1f2937" />
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

const OpenVASApp = () => {
  const [target, setTarget] = useState('');
  const [group, setGroup] = useState('');
  const [profile, setProfile] = useState('quick');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryUrl, setSummaryUrl] = useState(null);
  const [htmlUrl, setHtmlUrl] = useState(null);
  const [findings, setFindings] = useState([]);
  const [filter, setFilter] = useState(null);
  const [severity, setSeverity] = useState('All');
  const [announce, setAnnounce] = useState('');
  const [progress, setProgress] = useState(0);
  const workerRef = useRef(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      reduceMotion.current = media.matches;
      if (typeof window.Worker === 'function') {
        workerRef.current = new Worker(new URL('./openvas.worker.js', import.meta.url));
        workerRef.current.onmessage = (e) => {
          const { type, data } = e.data || {};
          if (type === 'progress') setProgress(data);
          if (type === 'result') setFindings(data);
        };
      }
    }
    return () => workerRef.current?.terminate();
  }, []);

  const generateSummary = (data) => {
    const summary = `# OpenVAS Scan Summary\n\n- Target: ${target}\n- Group: ${group}\n\n## Output\n\n${data}`;
    const blob = new Blob([summary], { type: 'text/markdown' });
    setSummaryUrl(URL.createObjectURL(blob));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>OpenVAS Scan Summary</title></head><body><h1>OpenVAS Scan Summary</h1><p>Target: ${escapeHtml(target)}</p><p>Group: ${escapeHtml(group)}</p><h2>Output</h2><pre>${escapeHtml(data)}</pre></body></html>`;
    const htmlBlob = new Blob([html], { type: 'text/html' });
    setHtmlUrl(URL.createObjectURL(htmlBlob));
  };

  const runScan = async () => {
    if (!target) return;
    setLoading(true);
    setProgress(0);
    setOutput('');
    setSummaryUrl(null);
    setHtmlUrl(null);
    try {
      const res = await fetch(
        `/api/openvas?target=${encodeURIComponent(target)}&group=${encodeURIComponent(group)}&profile=${encodeURIComponent(profile)}`
      );
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const data = await res.text();
      setOutput(data);
      workerRef.current?.postMessage({ text: data });
      generateSummary(data);
      notify('OpenVAS Scan Complete', `Target ${target} finished`);
    } catch (e) {
      setOutput(e.message);
      notify('OpenVAS Scan Failed', e.message);
    } finally {
      setLoading(false);
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
        <select
          className="p-2 rounded text-black"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
        >
          <option value="quick">Quick</option>
          <option value="full">Full</option>
        </select>
        <button
          type="button"
          onClick={runScan}
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
      <DonutChart data={chartData} />
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
              role="alert"
              className={`p-2 rounded ${severityColors[f.severity]} text-white`}
            >
              <span
                dangerouslySetInnerHTML={{ __html: escapeHtml(f.description) }}
              />
            </li>
          ))}
        </ul>
      )}
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      {output && (
        <pre className="bg-black text-green-400 p-2 rounded whitespace-pre-wrap">
          {output}
        </pre>
      )}
      {(summaryUrl || htmlUrl) && (
        <div className="mt-2 space-x-2">
          {summaryUrl && (
            <a
              href={summaryUrl}
              download="openvas-summary.md"
              className="inline-block px-4 py-2 bg-blue-600 rounded"
            >
              Download Summary
            </a>
          )}
          {htmlUrl && (
            <a
              href={htmlUrl}
              download="openvas-report.html"
              className="inline-block px-4 py-2 bg-blue-600 rounded"
            >
              Download HTML
            </a>
          )}
        </div>
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

