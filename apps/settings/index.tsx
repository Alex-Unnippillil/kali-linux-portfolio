import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import {
  defaultPreferences,
  exportPreferences,
  importPreferences,
  loadPreferences,
  resetPreferences,
  savePreferences,
  subscribe,
  type Preferences,
} from '../../lib/preferences';

const SettingsApp: React.FC = () => {
  const [settings, setSettings] = useState<Preferences>(defaultPreferences);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(loadPreferences());
    const unsub = subscribe(setSettings);
    return unsub;
  }, []);

  const handleSave = () => {
    savePreferences(settings);
    setStatus('Saved!');
  };

  const handleExport = () => {
    const blob = new Blob([exportPreferences()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const newSettings = importPreferences(ev.target?.result as string);
        setSettings(newSettings);
      } catch {
        setStatus('Invalid file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    const defaults = resetPreferences();
    setSettings(defaults);
    setStatus('Reset to defaults');
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <label className="flex items-center space-x-2">
        <span>Theme</span>
        <select
          value={settings.theme}
          onChange={(e) =>
            setSettings({ ...settings, theme: e.target.value as Preferences['theme'] })
          }
          className="text-black p-1"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label className="flex items-center space-x-2">
        <span>Language</span>
        <select
          value={settings.language}
          onChange={(e) =>
            setSettings({ ...settings, language: e.target.value })
          }
          className="text-black p-1"
        >
          <option value="en-US">English</option>
          <option value="es-ES">Español</option>
          <option value="fr-FR">Français</option>
        </select>
      </label>

      <label className="flex items-center space-x-2">
        <span>Units</span>
        <select
          value={settings.units}
          onChange={(e) =>
            setSettings({ ...settings, units: e.target.value as Preferences['units'] })
          }
          className="text-black p-1"
        >
          <option value="metric">Metric</option>
          <option value="imperial">Imperial</option>
        </select>
      </label>

      <label className="flex items-center space-x-2">
        <span>Data Saving</span>
        <input
          type="checkbox"
          checked={settings.dataSaving}
          onChange={(e) =>
            setSettings({ ...settings, dataSaving: e.target.checked })
          }
        />
      </label>

      <div className="flex space-x-2">
        <button onClick={handleSave} className="px-3 py-1 bg-blue-600 rounded">
          Save
        </button>
        <button onClick={handleExport} className="px-3 py-1 bg-green-600 rounded">
          Export
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          Import
        </button>
        <button onClick={handleReset} className="px-3 py-1 bg-red-700 rounded">
          Reset
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
      {status && <div>{status}</div>}
    </div>
  );
};

export default SettingsApp;
