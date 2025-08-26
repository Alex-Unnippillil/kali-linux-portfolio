import React, { useState } from 'react';

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
  const [report, setReport] = useState(null);

  const generateSummary = (data) => {
    const summary = `# OpenVAS Scan Summary\n\n- Target: ${target}\n- Group: ${group}\n\n## Output\n\n${data}`;
    const blob = new Blob([summary], { type: 'text/markdown' });
    setSummaryUrl(URL.createObjectURL(blob));
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
      notify('OpenVAS Scan Complete', `Target ${target} finished`);
    } catch (e) {
      setOutput(e.message);
      notify('OpenVAS Scan Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleReport = async () => {
    try {
      const res = await fetch('/apps/openvas/sample-report.json');
      const data = await res.json();
      setReport(data);
    } catch (e) {
      notify('Failed to load report', e.message);
    }
  };

  const severityCounts =
    report?.results.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {}) || {};

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
      <div className="mt-4">
        <button
          type="button"
          onClick={loadSampleReport}
          className="px-4 py-2 bg-purple-600 rounded"
        >
          Load Sample Report
        </button>
        {report && (
          <div className="mt-4">
            <h3 className="text-md mb-2">Tasks & Targets</h3>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr>
                  <th className="text-left pr-4">Task</th>
                  <th className="text-left">Target</th>
                </tr>
              </thead>
              <tbody>
                {report.tasks.map((t) => (
                  <tr key={t.id} className="border-t border-gray-700">
                    <td className="py-1 pr-4">{t.name}</td>
                    <td className="py-1">{t.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="text-md mb-2">Vulnerability Summary</h3>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr>
                  <th className="text-left pr-4">Severity</th>
                  <th className="text-left">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(severityCounts).map(([sev, count]) => (
                  <tr key={sev} className="border-t border-gray-700">
                    <td className="py-1 pr-4">{sev}</td>
                    <td className="py-1">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a
              href="/apps/openvas/sample-report.pdf"
              download
              className="inline-block mt-2 px-4 py-2 bg-blue-600 rounded"
            >
              Download Sample PDF
            </a>
            <p className="mt-4 text-sm text-gray-300">
              Tasks link scan configurations to specific targets. The resulting
              report highlights vulnerabilities that feed remediation in a
              typical vulnerability management workflow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenVASApp;

export const displayOpenVAS = () => <OpenVASApp />;

