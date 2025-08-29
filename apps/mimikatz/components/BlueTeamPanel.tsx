'use client';

import React, { useState } from 'react';

interface LogEntry {
  step: string;
  log: string;
  mitigation: string;
  resource?: string;
}

interface Props {
  logs: LogEntry[];
}

const BlueTeamPanel: React.FC<Props> = ({ logs }) => {
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const toggle = (idx: number) =>
    setOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <div className="space-y-2">
      {logs.map((entry, idx) => (
        <div key={idx} className="border border-blue-600 rounded">
          <button
            className="w-full text-left p-2 bg-blue-700 hover:bg-blue-600 font-semibold"
            onClick={() => toggle(idx)}
          >
            Step {idx + 1}: {entry.step}
          </button>
          {open[idx] && (
            <div className="p-2 bg-blue-600 text-sm">
              <p className="mb-1">{entry.log}</p>
              <p className="mb-1">
                <span className="font-semibold">Mitigation:</span> {entry.mitigation}
              </p>
              {entry.resource && (
                <a
                  href={entry.resource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-200"
                >
                  Learn more
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BlueTeamPanel;

