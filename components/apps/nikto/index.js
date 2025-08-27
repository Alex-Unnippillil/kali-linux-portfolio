import React, { useState } from 'react';

const NiktoApp = () => {
  const [target, setTarget] = useState('');
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runScan = async () => {
    if (!target) return;
    setLoading(true);
    setFindings([]);
    setError('');
    try {
      const res = await fetch(`/api/nikto?target=${encodeURIComponent(target)}`);
      const data = await res.json();
      const items = data.findings || data;
      setFindings(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const severityGroups = findings.reduce(
    (acc, cur) => {
      const sev = (cur.severity || 'low').toLowerCase();
      if (!acc[sev]) acc[sev] = [];
      acc[sev].push(cur);
      return acc;
    },
    { low: [], medium: [], high: [] }
  );

  const counts = {
    low: severityGroups.low.length,
    medium: severityGroups.medium.length,
    high: severityGroups.high.length,
  };

  const total = counts.low + counts.medium + counts.high;

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 overflow-auto">
      <h1 className="text-lg mb-4 font-bold">Nikto Scanner</h1>
      <div className="flex mb-4">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="http://example.com"
          className="flex-1 p-2 rounded-l text-black"
        />
        <button
          type="button"
          onClick={runScan}
          className="px-4 bg-ubt-blue rounded-r"
          disabled={loading}
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>
      {error && <pre className="whitespace-pre-wrap">{error}</pre>}
      {!error && total > 0 && (
        <div className="mt-4">
          <div className="nikto-chart">
            <div className="low" style={{ width: `${(counts.low / total) * 100}%` }} />
            <div className="medium" style={{ width: `${(counts.medium / total) * 100}%` }} />
            <div className="high" style={{ width: `${(counts.high / total) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>Low ({counts.low})</span>
            <span>Medium ({counts.medium})</span>
            <span>High ({counts.high})</span>
          </div>
          <div className="mt-4 space-y-4 text-sm">
            {Object.entries(severityGroups).map(([sev, items]) =>
              items.length > 0 ? (
                <div key={sev}>
                  <h2 className="font-semibold capitalize mb-1">{sev}</h2>
                  <ul className="list-disc ml-4">
                    {items.map((f, idx) => (
                      <li key={idx}>{f.message || f.desc || JSON.stringify(f)}</li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NiktoApp;

export const displayNikto = () => <NiktoApp />;
