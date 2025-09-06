'use client';

import { useEffect, useState } from 'react';
import WarningBanner from '../../../components/WarningBanner';
import usePersistentState from '../../../hooks/usePersistentState';
import { AUTO_SAVE_KEY } from '../../../utils/sessionSettings';

interface Entry {
  name: string;
  exec: string;
  enabled: boolean;
}

const STORAGE_KEY = 'autostart-user';

export default function AutostartSettings() {
  const [userEntries, setUserEntries] = useState<Entry[]>([]);
  const [systemEntries, setSystemEntries] = useState<Entry[]>([]);
  const [autoRestore] = usePersistentState<boolean>(
    AUTO_SAVE_KEY,
    false,
    (v): v is boolean => typeof v === 'boolean',
  );

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
      {autoRestore && (
        <WarningBanner>
          Autostart entries are ignored when Restore session on login is enabled.
        </WarningBanner>
      )}
      <div>
        <h2 className="font-bold mb-2">User Autostart</h2>
        <ul className="space-y-2">
          {userEntries.map((e, i) => (
            <li
              key={i}
              data-testid="autostart-user-entry"
              className="flex items-center gap-2"
            >
              <input
                type="checkbox"
                checked={e.enabled}
                onChange={(ev) => updateUser(i, { enabled: ev.target.checked })}
                aria-label="Enable entry"
              />
              <input
                value={e.name}
                onChange={(ev) => updateUser(i, { name: ev.target.value })}
                className="bg-ub-cool-grey text-white px-1 py-0.5 rounded w-1/4"
                aria-label="Entry name"
              />
              <input
                value={e.exec}
                onChange={(ev) => updateUser(i, { exec: ev.target.value })}
                className="bg-ub-cool-grey text-white px-1 py-0.5 rounded flex-grow"
                aria-label="Entry command"
              />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-bold mb-2">System Autostart</h2>
        <ul className="space-y-2">
          {systemEntries.map((e, i) => (
            <li
              key={i}
              data-testid="autostart-system-entry"
              className="flex items-center gap-2 italic opacity-75"
            >
              <input
                type="checkbox"
                checked={e.enabled}
                disabled
                aria-label="Enabled"
              />
              <span className="w-1/4">{e.name}</span>
              <span className="flex-grow">{e.exec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

