import React, { useSyncExternalStore } from 'react';
import { getWindows, subscribe, AppWindow } from '@/lib/window-manager';

interface Props {
  index: number;
}

export default function AppSwitcher({ index }: Props) {
  const windows = useSyncExternalStore(subscribe, getWindows, getWindows) as AppWindow[];
  if (!windows.length) return null;
  return (
    <div
      data-testid="app-switcher"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <ul className="bg-ub-grey text-white p-4 rounded">
        {windows.map((w, i) => (
          <li
            key={w.id}
            aria-selected={i === index}
            className={`px-3 py-1 rounded ${i === index ? 'bg-ub-orange text-black' : ''}`}
          >
            {w.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
