"use client";

import { ChangeEvent } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

interface Durations {
  standby: number;
  suspend: number;
  off: number;
}

const defaults: Durations = {
  standby: 5,
  suspend: 10,
  off: 30,
};

export default function DisplaySettings() {
  const [durations, setDurations] = usePersistentState<Durations>(
    'dpms-durations',
    defaults,
    (v): v is Durations =>
      typeof v === 'object' && v !== null &&
      typeof (v as any).standby === 'number' &&
      typeof (v as any).suspend === 'number' &&
      typeof (v as any).off === 'number',
  );

  const update = (key: keyof Durations) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    setDurations({ ...durations, [key]: value });
  };

  return (
    <div className="flex h-full">
      <nav className="w-48 p-4 border-r border-ubt-cool-grey text-sm">
        <ul className="space-y-1.5">
          <li>
            <a
              href="/ui/settings/theme"
              className="flex items-center gap-2 p-2 rounded-l-md hover:bg-ub-cool-grey"
            >
              <span className="w-6 h-6 bg-ubt-grey rounded" />
              <span>Theme</span>
            </a>
          </li>
          <li>
            <a
              className="flex items-center gap-2 p-2 rounded-l-md border-l-2 border-ubt-blue bg-ub-cool-grey"
            >
              <span className="w-6 h-6 bg-ubt-grey rounded" />
              <span>Display</span>
            </a>
          </li>
        </ul>
      </nav>
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="text-xl mb-4">Display</h1>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <span className="w-32">Standby (min)</span>
            <input
              type="number"
              min={0}
              value={durations.standby}
              onChange={update('standby')}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-32">Suspend (min)</span>
            <input
              type="number"
              min={0}
              value={durations.suspend}
              onChange={update('suspend')}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-32">Off (min)</span>
            <input
              type="number"
              min={0}
              value={durations.off}
              onChange={update('off')}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
