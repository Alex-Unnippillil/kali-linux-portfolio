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

  useEffect(() => {
    const interval = setInterval(() => {
      setGpuUsage(Math.floor(Math.random() * 100));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    </div>
  );
}

export default HashcatApp;

export const displayHashcat = () => <HashcatApp />;

