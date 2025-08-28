// Simulator: displays sample credential artifacts. For educational use only.
import React, { useState, useEffect } from 'react';

const artifacts = [
  { label: 'SAM Database (sample)', found: true },
  { label: 'LSA Secrets (sample)', found: true },
  { label: 'DPAPI Master Keys (sample)', found: false },
];

const CredentialArtifactLocator = () => {
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!scanning) return;
    if (prefersReducedMotion) {
      setProgress(100);
      setResults(artifacts);
      setScanning(false);
      return;
    }
    let frame;
    const step = () => {
      setProgress((p) => {
        const next = Math.min(p + 1, 100);
        if (next === 100) {
          setResults(artifacts);
          setScanning(false);
        }
        return next;
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [scanning, prefersReducedMotion]);

  const handleScan = () => {
    setResults([]);
    setProgress(0);
    setScanning(true);
  };

  return (
    <div className="mt-4 p-2 bg-ub-dark text-white rounded">
      <h2 className="text-lg mb-2">Credential Artifact Locator</h2>
      <p className="text-xs mb-2 italic">Sample data only; no real credentials.</p>
      <button
        className="bg-green-600 rounded px-2 py-1 mb-2"
        onClick={handleScan}
        disabled={scanning}
      >
        Locate Artifacts
      </button>
      <div className="w-full bg-gray-700 h-4 mb-2">
        <div
          className="bg-blue-500 h-4"
          style={{
            width: `${progress}%`,
              transition: prefersReducedMotion ? 'none' : 'width var(--transition-fast) var(--transition-ease)',
          }}
          role="progressbar"
          aria-label="scan progress"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <ul>
        {results.map((r, idx) => (
          <li
            key={idx}
            className={r.found ? 'text-ubt-green' : 'text-red-500'}
          >
            {r.label} - {r.found ? 'Found' : 'Not Found'}
          </li>
        ))}
      </ul>
      <div aria-live="polite" role="status" className="sr-only">
        {scanning
          ? `Scanning... ${progress}%`
          : results
              .map(
                (r) => `${r.label}: ${r.found ? 'found' : 'not found'}`
              )
              .join(', ')}
      </div>
    </div>
  );
};

export default CredentialArtifactLocator;
