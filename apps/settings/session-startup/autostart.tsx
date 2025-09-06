'use client';

import { useEffect, useState } from 'react';

interface Entry {
  name: string;
  exec: string;
  enabled: boolean;
}

const STORAGE_KEY = 'autostart-user';

export default function AutostartSettings() {
  const [userEntries, setUserEntries] = useState<Entry[]>([]);
  const [systemEntries, setSystemEntries] = useState<Entry[]>([]);

  useEffect(() => {
    async function load() {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setUserEntries(JSON.parse(stored));
          } catch {
            // ignore
          }
        } else {
          const res = await fetch('/fixtures/autostart-user.json');
          setUserEntries(await res.json());
        }
      }
      const sysRes = await fetch('/fixtures/autostart-system.json');
      setSystemEntries(await sysRes.json());
    }
    load();
  }, []);

  const updateUser = (idx: number, changes: Partial<Entry>) => {
    setUserEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...changes };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  return (
    <div className="p-4 text-white text-sm space-y-4">
      <div>
        <h2 className="font-bold mb-2">User Autostart</h2>
        <ul className="space-y-2">
          {userEntries.map((e, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={e.enabled}
                onChange={(ev) => updateUser(i, { enabled: ev.target.checked })}
              />
              <input
                value={e.name}
                onChange={(ev) => updateUser(i, { name: ev.target.value })}
                className="bg-ub-cool-grey text-white px-1 py-0.5 rounded w-1/4"
              />
              <input
                value={e.exec}
                onChange={(ev) => updateUser(i, { exec: ev.target.value })}
                className="bg-ub-cool-grey text-white px-1 py-0.5 rounded flex-grow"
              />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-bold mb-2">System Autostart</h2>
        <ul className="space-y-2">
          {systemEntries.map((e, i) => (
            <li key={i} className="flex items-center gap-2 italic opacity-75">
              <input type="checkbox" checked={e.enabled} disabled />
              <span className="w-1/4">{e.name}</span>
              <span className="flex-grow">{e.exec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

