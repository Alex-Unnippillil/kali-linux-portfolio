"use client";

import { useState } from 'react';
import usePanelSettings, { PanelSettings } from '../../../hooks/usePanelSettings';

function SandboxPanel({ settings }: { settings: PanelSettings }) {
  return (
    <div
      className={`w-full flex items-center ${settings.mode === 'top' ? '' : 'mt-4'}`}
      style={{ height: settings.size, background: settings.background }}
    >
      {[1,2,3].map(n => (
        <div key={n} className="w-5 h-5 bg-white rounded mx-1" />
      ))}
    </div>
  );
}

export default function PanelSettingsPage() {
  const [settings, setSettings] = usePanelSettings();
  const [preview, setPreview] = useState<PanelSettings>(settings);

  const handleChange = (field: keyof PanelSettings, value: any) => {
    setPreview(prev => ({ ...prev, [field]: value }));
  };

  const apply = () => setSettings(preview);

  return (
    <div className="flex h-full">
      <nav className="w-48 p-4 border-r border-ubt-cool-grey text-sm">
        <ul className="space-y-1.5">
          <li>
            <a className="flex items-center gap-2 p-2 rounded-l-md border-l-2 border-ubt-blue bg-ub-cool-grey">
              <span className="w-6 h-6 bg-ubt-grey rounded"></span>
              <span>Panel</span>
            </a>
          </li>
        </ul>
      </nav>
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="text-xl mb-4">Panel</h1>

        <div className="mb-4">
          <label className="block mb-1">Size</label>
          <input
            type="range"
            min={24}
            max={80}
            value={preview.size}
            onChange={e => handleChange('size', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Mode</label>
          <select
            value={preview.mode}
            onChange={e => handleChange('mode', e.target.value as PanelSettings['mode'])}
            className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
          </select>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <label>Autohide</label>
          <input
            type="checkbox"
            checked={preview.autohide}
            onChange={e => handleChange('autohide', e.target.checked)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Background</label>
          <input
            type="color"
            value={preview.background.slice(0,7)}
            onChange={e => handleChange('background', e.target.value + '80')}
          />
        </div>

        <SandboxPanel settings={preview} />

        <button
          onClick={apply}
          className="mt-4 px-4 py-2 rounded bg-ub-orange text-white"
        >
          Apply
        </button>

        <h2 className="text-lg mt-6 mb-2">Current Config</h2>
        <pre className="bg-ub-cool-grey p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </div>
    </div>
  );
}
