"use client";

import { ChangeEvent, useEffect, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings } from '../../../hooks/useSettings';
import PanelProfilesDialog from '../../../src/components/panel/PanelProfilesDialog';
import {
  DEFAULT_PANEL_LAYOUT,
  PANEL_LAYOUT_KEY,
  PanelLayout,
} from '../../../src/components/panel/types';

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
      aria-label="Toggle setting"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-ubt-blue' : 'bg-ubt-grey'
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
  const { theme, setTheme, highContrast, setHighContrast } = useSettings();
  const [panelSize, setPanelSize] = usePersistentState('app:panel-icons', 16);
  const [gridSize, setGridSize] = usePersistentState('app:grid-icons', 64);
  const [panelLayout, setPanelLayout] = useState<PanelLayout>(
    DEFAULT_PANEL_LAYOUT,
  );
  const [profilesOpen, setProfilesOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PANEL_LAYOUT_KEY);
      if (stored) {
        setPanelLayout(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value);
  };

  return (
    <>
    <div className="flex h-full">
      <nav className="w-48 p-4 border-r border-ubt-cool-grey text-sm">
        <ul className="space-y-1.5">
          <li>
            <a className="flex items-center gap-2 p-2 rounded-l-md border-l-2 border-ubt-blue bg-ub-cool-grey">
              <span className="w-6 h-6 bg-ubt-grey rounded"></span>
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
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="default">Default</option>
          <option value="kali-dark">Kali Dark</option>
          <option value="kali-light">Kali Light</option>
          <option value="dark">Dark</option>
          <option value="neon">Neon</option>
          <option value="matrix">Matrix</option>
        </select>
        <div className="mt-4 flex items-center gap-2">
          <input
            id="theme-high-contrast"
            type="checkbox"
            aria-label="High Contrast"
            checked={highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
          />
          <label htmlFor="theme-high-contrast">High Contrast</label>
        </div>

        <div className="mt-6">
          <h2 className="text-lg mb-2">Panel Icons</h2>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
            <Toggle
              checked={panelSize === 32}
              onChange={(val) => setPanelSize(val ? 32 : 16)}
            />
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
          </div>
          <div className="flex gap-2 p-2 bg-ub-cool-grey rounded">
            <div
              className="bg-ubt-grey rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
            <div
              className="bg-ubt-grey rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
            <div
              className="bg-ubt-grey rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
          </div>
        </div>

          <div className="mt-6">
            <h2 className="text-lg mb-2">Grid Icons</h2>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-ubt-grey rounded"></span>
              <Toggle
                checked={gridSize === 96}
                onChange={(val) => setGridSize(val ? 96 : 64)}
              />
              <span className="w-6 h-6 bg-ubt-grey rounded"></span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-ub-cool-grey rounded">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-ubt-grey rounded"
                  style={{ width: gridSize, height: gridSize }}
                ></div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg mb-2">Panel Profiles</h2>
            <button
              type="button"
              onClick={() => setProfilesOpen(true)}
              className="px-3 py-1 bg-ubt-blue text-white rounded"
            >
              Manage Profiles
            </button>
          </div>
        </div>
      </div>

      <PanelProfilesDialog
        isOpen={profilesOpen}
        onClose={() => setProfilesOpen(false)}
        layout={panelLayout}
        onLayoutChange={setPanelLayout}
        defaultLayout={DEFAULT_PANEL_LAYOUT}
      />
    </>
  );
}

