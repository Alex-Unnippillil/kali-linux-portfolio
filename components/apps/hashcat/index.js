import React, { useState, useEffect } from 'react';

const hashTypes = [
  { id: '0', name: 'MD5' },
  { id: '100', name: 'SHA1' },
  { id: '1400', name: 'SHA256' },
  { id: '3200', name: 'bcrypt' },
];

const Gauge = ({ value }) => (
  <div className="w-48">
    <div className="text-sm mb-1">GPU Usage: {value}%</div>
    <div className="w-full h-4 bg-gray-700 rounded">
      <div
        className="h-4 bg-green-500 rounded"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

function HashcatApp() {
  const [hashType, setHashType] = useState(hashTypes[0].id);
  const [gpuUsage, setGpuUsage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const usageInterval = setInterval(() => {
      setGpuUsage(Math.floor(Math.random() * 100));
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress((p) => (p < 100 ? p + 5 : 100));
    }, 2000);

    return () => {
      clearInterval(usageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('hashcatState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.hashType) setHashType(parsed.hashType);
        if (typeof parsed.progress === 'number') setProgress(parsed.progress);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const saveState = () => {
    localStorage.setItem(
      'hashcatState',
      JSON.stringify({ hashType, progress })
    );
  };

  useEffect(() => {
    return () => {
      saveState();
    };
  }, [hashType, progress]);

  const selectedHash = hashTypes.find((h) => h.id === hashType)?.name;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-ub-cool-grey text-white">
      <div>
        <label className="mr-2" htmlFor="hash-type">
          Hash Type:
        </label>
        <select
          id="hash-type"
          className="text-black px-2 py-1"
          value={hashType}
          onChange={(e) => setHashType(e.target.value)}
        >
          {hashTypes.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>
      <div>Selected: {selectedHash}</div>
      <Gauge value={gpuUsage} />
      <div className="w-48">
        <div className="text-sm mb-1">Progress: {progress}%</div>
        <div className="w-full h-4 bg-gray-700 rounded">
          <div
            className="h-4 bg-blue-500 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <button
        className="px-2 py-1 bg-green-500 text-black rounded"
        onClick={saveState}
      >
        Save State
      </button>
    </div>
  );
}

export default HashcatApp;

export const displayHashcat = () => <HashcatApp />;

