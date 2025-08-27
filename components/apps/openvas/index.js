import React, { useState } from 'react';

const DonutChart = ({ label, value, total }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dash = total ? (value / total) * circumference : 0;
  return (
    <div className={`severity-chart severity-${label.toLowerCase()}`}>
      <svg width="80" height="80">
        <circle className="bg" cx="40" cy="40" r={radius} strokeWidth="8" fill="none" />
        <circle
          className="fg"
          cx="40"
          cy="40"
          r={radius}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <span className="severity-label">{`${label.charAt(0).toUpperCase() + label.slice(1)} (${value})`}</span>
    </div>
  );
};

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

const OpenVASApp = () => {
  const [target, setTarget] = useState('');
  const [group, setGroup] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryUrl, setSummaryUrl] = useState(null);
  const [severityCounts, setSeverityCounts] = useState(null);

  const totalSeverity = severityCounts
    ? Object.values(severityCounts).reduce((a, b) => a + b, 0)
    : 0;

  const generateSummary = (data) => {
    const summary = `# OpenVAS Scan Summary\n\n- Target: ${target}\n- Group: ${group}\n\n## Output\n\n${data}`;
    const blob = new Blob([summary], { type: 'text/markdown' });
    setSummaryUrl(URL.createObjectURL(blob));
  };

  const calculateSeverity = (text) => {
    const categories = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };
    Object.keys(categories).forEach((key) => {
      const regex = new RegExp(key, 'ig');
      categories[key] = (text.match(regex) || []).length;
    });
    setSeverityCounts(categories);
  };

  const runScan = async () => {
    if (!target) return;
    setLoading(true);
    setOutput('');
    setSummaryUrl(null);
    try {
      const res = await fetch(
        `/api/openvas?target=${encodeURIComponent(target)}&group=${encodeURIComponent(group)}`
      );
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const data = await res.text();
      setOutput(data);
      generateSummary(data);
      calculateSeverity(data);
      notify('OpenVAS Scan Complete', `Target ${target} finished`);
    } catch (e) {
      setOutput(e.message);
      notify('OpenVAS Scan Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
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
        <button
          type="button"
          onClick={runScan}
          disabled={loading}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>
      {severityCounts && (
        <div className="flex flex-wrap gap-4 mb-4">
          {Object.entries(severityCounts).map(([label, value]) => (
            <DonutChart key={label} label={label} value={value} total={totalSeverity} />
          ))}
        </div>
      )}
      {output && (
        <pre className="bg-black text-green-400 p-2 rounded whitespace-pre-wrap">
          {output}
        </pre>
      )}
      {summaryUrl && (
        <a
          href={summaryUrl}
          download="openvas-summary.md"
          className="inline-block mt-2 px-4 py-2 bg-blue-600 rounded"
        >
          Download Summary
        </a>
      )}
    </div>
  );
};

export default OpenVASApp;

export const displayOpenVAS = () => <OpenVASApp />;

