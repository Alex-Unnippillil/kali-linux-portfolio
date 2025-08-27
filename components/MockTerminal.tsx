import React, { useEffect, useRef, useState } from 'react';

interface LogEntry {
  annotation: string;
  message: string;
}

const initialLogs: LogEntry[] = [
  { annotation: 'INFO', message: 'Initializing demo environment...' },
  { annotation: 'WARN', message: 'This terminal is for demonstration purposes only.' },
  { annotation: 'SUCCESS', message: 'Simulation ready.' },
];

const MockTerminal: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setLogs((prev) => [...prev, initialLogs[i]]);
      i += 1;
      if (i >= initialLogs.length) clearInterval(interval);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="bg-black text-green-400 font-mono p-4 h-48 overflow-y-auto outline-none focus:ring-2 focus:ring-green-500"
      aria-label="Mock terminal"
    >
      {logs.map((log, idx) => (
        <div key={idx}>
          [{log.annotation}] {log.message}
        </div>
      ))}
    </div>
  );
};

export default MockTerminal;
