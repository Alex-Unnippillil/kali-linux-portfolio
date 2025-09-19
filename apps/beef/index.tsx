'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import KillSwitchGate from '../../components/common/KillSwitchGate';
import BeefApp from '../../components/apps/beef';
import { KILL_SWITCH_IDS } from '../../lib/flags';

type Severity = 'Low' | 'Medium' | 'High';

interface LogEntry {
  time: string;
  severity: Severity;
  message: string;
}

const severityStyles: Record<Severity, { icon: string; color: string }> = {
  Low: { icon: '🟢', color: 'bg-green-700' },
  Medium: { icon: '🟡', color: 'bg-yellow-700' },
  High: { icon: '🔴', color: 'bg-red-700' },
};

const BeefPageContent: React.FC = () => {
  const [logs] = useState<LogEntry[]>([
    { time: '10:00:00', severity: 'Low', message: 'Hook initialized' },
    { time: '10:00:02', severity: 'Medium', message: 'Payload delivered' },
    { time: '10:00:03', severity: 'High', message: 'Sensitive data exfil attempt' },
  ]);

  return (
    <div className="bg-ub-cool-grey text-white h-full w-full flex flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/themes/Yaru/apps/beef.svg"
            alt="BeEF badge"
            width={48}
            height={48}
          />
          <h1 className="text-xl">BeEF Demo</h1>
        </div>
        <div className="flex gap-2">
          <img
            src="/themes/Yaru/window/window-minimize-symbolic.svg"
            alt="minimize"
            className="w-6 h-6"
          />
          <img
            src="/themes/Yaru/window/window-close-symbolic.svg"
            alt="close"
            className="w-6 h-6"
          />
        </div>
      </header>

      <div className="p-4 flex-1 overflow-auto">
        <BeefApp />
      </div>

      <div className="border-t border-gray-700 font-mono text-sm">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-center gap-2 px-2 py-1.5">
            <span
              className={`flex items-center px-2 py-0.5 rounded-full text-xs ${severityStyles[log.severity].color}`}
            >
              <span className="mr-1">{severityStyles[log.severity].icon}</span>
              {log.severity}
            </span>
            <span className="text-gray-400">{log.time}</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BeefPage: React.FC = () => (
  <KillSwitchGate
    appId="beef"
    appTitle="BeEF"
    killSwitchId={KILL_SWITCH_IDS.beef}
  >
    {() => <BeefPageContent />}
  </KillSwitchGate>
);

export default BeefPage;
