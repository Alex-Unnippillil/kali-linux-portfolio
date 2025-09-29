'use client';

import React, { useState } from 'react';
import ErrorFixSuggestions from '@/components/ui/ErrorFixSuggestions';
import { detectErrorCodes } from '@/utils/errorFixes';

export interface LogEntry {
  id: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const levelColors: Record<LogEntry['level'], string> = {
  info: 'bg-blue-600',
  warn: 'bg-yellow-600',
  error: 'bg-red-600',
};

export default function LogPane({ logs }: { logs: LogEntry[] }) {
  const [collapsed, setCollapsed] = useState(false);

  const copyAll = () => {
    const text = logs
      .map((log) => `[${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  const runCommand = (command: string) => {
    try {
      navigator.clipboard.writeText(command);
    } catch {
      // ignore clipboard errors
    }
  };

  const downloadAll = () => {
    const text = logs
      .map((log) => `[${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4 border rounded bg-gray-900 text-white text-sm">
      <div className="flex items-center justify-between px-2 py-1 bg-gray-800">
        <span className="font-bold">Logs</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs underline"
            onClick={copyAll}
          >
            Copy all
          </button>
          <button
            type="button"
            className="text-xs underline"
            onClick={downloadAll}
          >
            Download
          </button>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>
      {!collapsed && (
        <ul className="max-h-40 overflow-auto">
          {logs.map((log) => {
            const codes = detectErrorCodes(log.message);
            return (
              <li
                key={log.id}
                className="flex flex-col gap-2 px-2 py-1 border-b border-gray-700 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`${levelColors[log.level]} text-white px-1 rounded text-[10px] font-bold`}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <span className="flex-1 break-all whitespace-pre-wrap">{log.message}</span>
                  <button
                    type="button"
                    aria-label="Copy log line"
                    className="text-xs underline"
                    onClick={() => navigator.clipboard.writeText(log.message)}
                  >
                    Copy
                  </button>
                </div>
                {codes.length > 0 && (
                  <ErrorFixSuggestions
                    codes={codes}
                    onRunCommand={runCommand}
                    source="ettercap-logs"
                    size="compact"
                    className="ml-6"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

