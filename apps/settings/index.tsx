'use client';

import { useEffect, useState } from 'react';
import Tabs from '../../components/Tabs';

type Section = 'theme' | 'input' | 'sound' | 'performance' | 'accessibility';

interface SettingsData {
  theme: string;
  keyRepeat: boolean;
  volume: number;
  fps: number;
  highContrast: boolean;
}

const defaultSettings: SettingsData = {
  theme: 'light',
  keyRepeat: true,
  volume: 0.5,
  fps: 60,
  highContrast: false,
};

const STORAGE_KEY = 'standalone-settings';

export default function SettingsApp() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [active, setActive] = useState<Section>('theme');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const tabs = [
    { id: 'theme', label: 'Theme' },
    { id: 'input', label: 'Input' },
    { id: 'sound', label: 'Sound' },
    { id: 'performance', label: 'Performance' },
    { id: 'accessibility', label: 'Accessibility' },
  ] as const;

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white overflow-auto">
      <div className="border-b border-gray-900 flex justify-center">
        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>
      <div className="p-4 space-y-4 flex-grow">
        {active === 'theme' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              Theme
              <select
                className="text-black px-1 rounded"
                value={settings.theme}
                onChange={(e) =>
                  setSettings({ ...settings, theme: e.target.value })
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        )}

        {active === 'input' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.keyRepeat}
                onChange={(e) =>
                  setSettings({ ...settings, keyRepeat: e.target.checked })
                }
              />
              Enable key repeat
            </label>
          </div>
        )}

        {active === 'sound' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              Volume
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.volume}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    volume: parseFloat(e.target.value),
                  })
                }
              />
            </label>
          </div>
        )}

        {active === 'performance' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              FPS limit
              <input
                className="text-black w-20 px-1 rounded"
                type="number"
                value={settings.fps}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fps: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </label>
          </div>
        )}

        {active === 'accessibility' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    highContrast: e.target.checked,
                  })
                }
              />
              High contrast mode
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

