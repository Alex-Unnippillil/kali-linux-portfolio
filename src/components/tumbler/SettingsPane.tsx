'use client';
import React from 'react';

interface TumblerSettings {
  maxSize: number;
  disabledPlugins: Record<string, boolean>;
}

interface SettingsPaneProps {
  availablePlugins: string[];
  settings: TumblerSettings;
  onChange: (settings: TumblerSettings) => void;
}

export default function SettingsPane({
  availablePlugins,
  settings,
  onChange,
}: SettingsPaneProps) {
  const togglePlugin = (id: string) => {
    const disabled = { ...settings.disabledPlugins, [id]: !settings.disabledPlugins[id] };
    onChange({ ...settings, disabledPlugins: disabled });
  };

  const updateMaxSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value) || 0;
    onChange({ ...settings, maxSize: value });
  };

  return (
    <div className="space-y-4 text-white">
      <div>
        <label htmlFor="tumbler-max-size" className="block text-sm mb-1">
          Max thumbnail size (px)
        </label>
        <input
          id="tumbler-max-size"
          type="number"
          className="w-full rounded p-1 text-black"
          value={settings.maxSize}
          onChange={updateMaxSize}
          min={0}
          aria-label="Max thumbnail size"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Plugins</h3>
        <ul className="space-y-1">
          {availablePlugins.map((id) => (
            <li key={id}>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={!settings.disabledPlugins[id]}
                  onChange={() => togglePlugin(id)}
                  aria-label={`${id} plugin toggle`}
                />
                <span className="text-sm">{id}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

