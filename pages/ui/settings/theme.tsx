"use client";

import { ChangeEvent } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings } from '../../../hooks/useSettings';

/** Simple Adwaita-like toggle switch */
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-kali-primary-300' : 'bg-kali-neutral-50'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : ''
        }`}
      ></span>
    </button>
  );
}

export default function ThemeSettings() {
  const { theme, setTheme } = useSettings();
  const [panelSize, setPanelSize] = usePersistentState('app:panel-icons', 16);
  const [gridSize, setGridSize] = usePersistentState('app:grid-icons', 64);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value);
  };

  return (
    <div className="flex h-full">
      <nav className="w-48 p-4 border-r border-kali-neutral-600 text-sm">
        <ul className="space-y-1.5">
          <li>
            <a className="flex items-center gap-2 p-2 rounded-l-md border-l-2 border-kali-primary bg-kali-surface">
              <span className="w-6 h-6 bg-kali-neutral-50 rounded"></span>
              <span>Theme</span>
            </a>
          </li>
        </ul>
      </nav>
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="text-xl mb-4">Theme</h1>
        <select
          value={theme}
          onChange={handleChange}
          className="bg-kali-surface text-kali-text px-2 py-1 rounded border border-kali-neutral-600"
        >
          <option value="default">Default</option>
          <option value="dark">Dark</option>
          <option value="neon">Neon</option>
          <option value="matrix">Matrix</option>
        </select>

        <div className="mt-6">
          <h2 className="text-lg mb-2">Panel Icons</h2>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-kali-neutral-50 rounded"></span>
            <Toggle
              checked={panelSize === 32}
              onChange={(val) => setPanelSize(val ? 32 : 16)}
            />
            <span className="w-6 h-6 bg-kali-neutral-50 rounded"></span>
          </div>
          <div className="flex gap-2 p-2 bg-kali-surface rounded">
            <div
              className="bg-kali-neutral-50 rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
            <div
              className="bg-kali-neutral-50 rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
            <div
              className="bg-kali-neutral-50 rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg mb-2">Grid Icons</h2>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-kali-neutral-50 rounded"></span>
            <Toggle
              checked={gridSize === 96}
              onChange={(val) => setGridSize(val ? 96 : 64)}
            />
            <span className="w-6 h-6 bg-kali-neutral-50 rounded"></span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2 bg-kali-surface rounded">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-kali-neutral-50 rounded"
                style={{ width: gridSize, height: gridSize }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

