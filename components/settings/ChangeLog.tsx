'use client';

import React, { useEffect, useState } from 'react';
import settingsBus, { SettingsMessage } from '../../utils/settingsBus';

const ChangeLog: React.FC = () => {
  const [events, setEvents] = useState<SettingsMessage[]>([]);

  useEffect(() => {
    const unsub = settingsBus.subscribe((evt) => {
      setEvents((prev) => [...prev, evt]);
    });
    return unsub;
  }, []);

  if (events.length === 0) return null;

  const formatValue = (value: unknown) =>
    typeof value === 'string' ? value : JSON.stringify(value);

  return (
    <div
      className="fixed bottom-0 right-0 z-50 max-h-40 w-64 overflow-auto bg-black/80 p-2 text-xs text-white"
      role="log"
    >
      <h2 className="mb-1 font-bold">Settings Change Log</h2>
      <ul className="space-y-1">
        {events.map((e, i) => (
          <li key={i} className="font-mono">
            [{e.channel}] {e.property}: {formatValue(e.value)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChangeLog;
