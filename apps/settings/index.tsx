import React, { useState, useEffect, ChangeEvent } from 'react';

interface Settings {
  theme: string;
  dataSaving: boolean;
  locale: string;
}

const defaultSettings: Settings = {
  theme: 'light',
  dataSaving: false,
  locale: 'en-US',
};

const SettingsApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings({ ...defaultSettings, ...data }))
      .catch(() => setSettings(defaultSettings));
  }, []);

  const save = async () => {
    setStatus('');
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setStatus('Saved!');
    } catch {
      setStatus('Save failed');
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        const newSettings = { ...defaultSettings, ...imported };
        setSettings(newSettings);
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        });
      } catch {
        // ignore invalid JSON
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <label className="flex items-center space-x-2">
        <span>Theme</span>
        <select
          value={settings.theme}
          onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
          className="text-black p-1"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
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

      <label className="flex items-center space-x-2">
        <span>Locale</span>
        <select
          value={settings.locale}
          onChange={(e) => setSettings({ ...settings, locale: e.target.value })}
          className="text-black p-1"
        >
          <option value="en-US">English</option>
          <option value="es-ES">Español</option>
          <option value="fr-FR">Français</option>
        </select>
      </label>

      <div className="flex space-x-2">
        <button onClick={save} className="px-3 py-1 bg-blue-600 rounded">
          Save
        </button>
        <button onClick={exportJson} className="px-3 py-1 bg-green-600 rounded">
          Export
        </button>
        <label className="px-3 py-1 bg-gray-700 rounded cursor-pointer">
          Import
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={importJson}
          />
        </label>
      </div>
      {status && <div>{status}</div>}
    </div>
  );
};

export default SettingsApp;
