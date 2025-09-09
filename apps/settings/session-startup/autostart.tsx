'use client';

import { isBrowser } from '@/utils/env';
import { useEffect, useState } from 'react';

interface Entry {
  name: string;
  exec: string;
  enabled: boolean;
  trigger: 'login' | 'suspend' | 'resume';
}

const STORAGE_KEY = 'autostart-user';

export default function AutostartSettings() {
  const [userEntries, setUserEntries] = useState<Entry[]>([]);
  const [systemEntries, setSystemEntries] = useState<Entry[]>([]);
  const [initialUser, setInitialUser] = useState<Entry[]>([]);

  useEffect(() => {
    async function load() {
      let user: Entry[] = [];
      if (isBrowser()) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            user = JSON.parse(stored);
          } catch {
            // ignore
          }
        } else {
          const res = await fetch('/fixtures/autostart-user.json');
          user = await res.json();
        }
      } else {
        const res = await fetch('/fixtures/autostart-user.json');
        user = await res.json();
      }
      user = user.map((e) => ({ ...e, trigger: 'login' }));
      setUserEntries(user);
      setInitialUser(JSON.parse(JSON.stringify(user)));

      const sysRes = await fetch('/fixtures/autostart-system.json');
      const sys = (await sysRes.json()).map((e: Entry) => ({ ...e, trigger: 'login' }));
      setSystemEntries(sys);
    }
    load();
  }, []);

  const persist = (next: Entry[]) => {
    if (isBrowser()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const updateUser = (idx: number, changes: Partial<Entry>) => {
    setUserEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...changes } as Entry;
      persist(next);
      return next;
    });
  };

  const handleReset = () => {
    const reset = initialUser.map((e) => ({ ...e }));
    setUserEntries(reset);
    persist(reset);
  };

  const chip = (
    value: Entry['trigger'],
    current: Entry['trigger'],
    onClick?: () => void,
  ) => (
    <button
      type="button"
      data-testid={`trigger-chip-${value}`}
      data-active={current === value}
      onClick={onClick}
      disabled={!onClick}
      className={`px-2 py-0.5 rounded border text-xs ${
        current === value
          ? 'bg-ub-orange text-black'
          : 'bg-ub-cool-grey text-white'
      } ${!onClick ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </button>
  );

  return (
    <div className="p-4 text-white text-sm space-y-4">
      <div>
        <h2 className="font-bold mb-2">User Autostart (~/.config/autostart)</h2>
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
                aria-label="Enable autostart entry"
              />
              <div className="flex gap-1">
                {chip('login', e.trigger, () => updateUser(i, { trigger: 'login' }))}
                {chip('suspend', e.trigger, () => updateUser(i, { trigger: 'suspend' }))}
                {chip('resume', e.trigger, () => updateUser(i, { trigger: 'resume' }))}
              </div>
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
                aria-label="Command to execute"
              />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-bold mb-2">System Autostart (/etc/xdg/autostart)</h2>
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
                aria-label="Enable autostart entry"
              />
              <div className="flex gap-1">
                {chip('login', e.trigger)}
                {chip('suspend', e.trigger)}
                {chip('resume', e.trigger)}
              </div>
              <span className="w-1/4">{e.name}</span>
              <span className="flex-grow">{e.exec}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        className="px-2 py-1 border rounded"
        onClick={handleReset}
      >
        Reset Autostart
      </button>
    </div>
  );
}

