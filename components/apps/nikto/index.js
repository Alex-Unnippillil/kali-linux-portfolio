import React, { useState, useRef, useEffect } from 'react';

const RadarChart = ({ data }) => {
  const labels = Object.keys(data);
  const counts = labels.map((l) => data[l] || 0);
  const max = Math.max(...counts, 1);
  const points = labels
    .map((label, i) => {
      const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
      const radius = (counts[i] / max) * 40;
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Nikto finding categories radar chart"
      className="w-full h-full"
    >
      <polygon
        points={points}
        fill="rgba(34,197,94,0.4)"
        stroke="#22c55e"
        strokeWidth="2"
      />
      {labels.map((label, i) => {
        const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
        const x = 50 + 45 * Math.cos(angle);
        const y = 50 + 45 * Math.sin(angle);
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white text-[8px]"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
};

const NiktoApp = () => {
  const [target, setTarget] = useState('');
  const [findings, setFindings] = useState([]);
  const [clusters, setClusters] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [animProgress, setAnimProgress] = useState(1);
  const workerRef = useRef(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./nikto.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      setClusters(e.data.clusterCounts);
      setFindings(e.data.findings);
      setStatus('Scan complete');
    };
    prefersReducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!Object.keys(clusters).length) return;
    if (prefersReducedMotion.current) {
      setAnimProgress(1);
      return;
    }
    setAnimProgress(0);
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 500, 1);
      setAnimProgress(progress);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [clusters]);

  const runScan = async () => {
    if (!target) return;
    setLoading(true);
    setStatus('Running scan');
    setFindings([]);
    setClusters({});
    try {
      const res = await fetch(`/api/nikto?target=${encodeURIComponent(target)}`);
      const text = await res.text();
      workerRef.current?.postMessage({ text });
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const scaledClusters = Object.fromEntries(
    Object.entries(clusters).map(([k, v]) => [k, v * animProgress])
  );

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
          className="px-4 bg-ubt-blue rounded-r focus:outline-none focus:ring-2 focus:ring-ubt-blue"
        >
          Scan
        </button>
      </div>
      <div aria-live="polite" className="sr-only">
        {status}
      </div>
      {loading ? (
        <p>Running scan...</p>
      ) : findings.length > 0 ? (
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="md:w-1/2 flex justify-center items-center">
            <RadarChart data={scaledClusters} />
          </div>
          <ul
            className="md:w-1/2 list-disc pl-4 text-sm overflow-auto"
            aria-live="polite"
          >
            {findings.map((f, i) => (
              <li key={i} className="mb-1">
                <span className="font-bold">{f.category}:</span>{' '}
                <span className="text-gray-300">{f.line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No results</p>
      )}
    </div>
  );
};

export default NiktoApp;

export const displayNikto = () => <NiktoApp />;
