'use client';

import React, { useState } from 'react';
import { parseLogs, redactLine, ParsedLog } from '../../utils/logParser';

export default function LogViewer() {
  const [logs, setLogs] = useState<ParsedLog[]>([]);
  const [redact, setRedact] = useState(false);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setLogs(parseLogs(text));
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 text-white bg-gray-900 min-h-screen">
      <div className="flex items-center gap-2">
        <input type="file" accept="text/*" onChange={handleFile} />
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={redact}
            onChange={() => setRedact((r) => !r)}
          />
          Redact sensitive data
        </label>
      </div>
      <ul className="mt-4 space-y-1 text-sm">
        {logs.map((log, idx) => (
          <li key={idx} className="border-b border-gray-700 pb-1">
            <span className="text-gray-400 mr-2">{log.timestamp}</span>
            {log.marker && (
              <span className="font-bold mr-2">{log.marker}</span>
            )}
            <span>{redact ? redactLine(log.message) : log.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
