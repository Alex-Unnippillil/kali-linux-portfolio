import React, { useEffect, useState } from 'react';

// Tiny sample dataset of captured packets
const sampleLogs = [
  { protocol: 'HTTP', host: 'example.com', path: '/index.html' },
  { protocol: 'HTTPS', host: 'test.com', path: '/login' },
];

interface Log {
  id: number;
  protocol: string;
  host: string;
  path: string;
}

const StressSandbox: React.FC = () => {
  const [size, setSize] = useState(100);
  const [logs, setLogs] = useState<Log[]>([]);
  const [captureMs, setCaptureMs] = useState(0);
  const [replayMs, setReplayMs] = useState(0);

  useEffect(() => {
    // Simulate capture: repeat the sample logs
    const captureStart = performance.now();
    const newLogs: Log[] = Array.from({ length: size }, (_, i) => ({
      ...sampleLogs[i % sampleLogs.length]!,
      id: i,
    }));
    setLogs(newLogs);
    setCaptureMs(performance.now() - captureStart);

    // Simulate replay: iterate over all logs
    const replayStart = performance.now();
    newLogs.forEach(() => {});
    setReplayMs(performance.now() - replayStart);
  }, [size]);

  return (
    <div className="mt-4 p-2 bg-ub-dark text-white rounded">
      <h2 className="text-lg mb-2">Capture/Replay Stress Sandbox</h2>
      <p className="text-xs mb-2 italic">
        Demonstration uses sample data; no real network traffic.
      </p>
      <label htmlFor="listSize" className="block text-sm mb-1">
        List size: {size}
      </label>
      <input
        id="listSize"
        aria-label="List size"
        type="range"
        min={1}
        max={5000}
        value={size}
        onChange={(e) => setSize(Number(e.target.value))}
        className="w-full mb-2"
      />
      <p className="text-sm mb-2">
        Capture: {captureMs.toFixed(2)} ms | Replay: {replayMs.toFixed(2)} ms
      </p>
      <ul className="h-40 overflow-auto text-xs bg-black p-1">
        {logs.slice(0, 100).map((log, i) => (
          <li key={`${log.protocol}-${log.host}-${log.path}-${i}`}>
            <span className="text-green-400">{log.protocol}</span> {log.host} {log.path}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StressSandbox;

