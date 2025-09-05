'use client';

import { useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

interface Profile {
  layout: string | null;
  plugins: string | null;
}

const DEFAULT_PROFILES: Record<string, Profile> = {
  'Kali default': { layout: null, plugins: null },
};

export default function PanelProfiles() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = usePersistentState<Record<string, Profile>>(
    'panel:profiles',
    DEFAULT_PROFILES,
  );
  const [selected, setSelected] = useState<string>('Kali default');
  const [name, setName] = useState('');

  const saveProfile = () => {
    if (!name.trim()) return;
    const layout = window.localStorage.getItem('panelLayout');
    const plugins = window.localStorage.getItem('pluginStates');
    setProfiles({ ...profiles, [name]: { layout, plugins } });
    setSelected(name);
    setName('');
  };

  const restoreProfile = () => {
    const p = profiles[selected];
    if (!p) return;
    if (p.layout !== null) window.localStorage.setItem('panelLayout', p.layout);
    if (p.plugins !== null) window.localStorage.setItem('pluginStates', p.plugins);
    window.location.reload();
  };

  const exportProfile = () => {
    const p = profiles[selected];
    if (!p) return;
    const blob = new Blob(
      [JSON.stringify({ name: selected, layout: p.layout, plugins: p.plugins })],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProfiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const imported: Record<string, Profile> = { ...profiles };
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item && item.name) {
              imported[item.name] = {
                layout: item.layout ?? null,
                plugins: item.plugins ?? null,
              };
            }
          });
        } else if (data && data.name) {
          imported[data.name] = {
            layout: data.layout ?? null,
            plugins: data.plugins ?? null,
          };
        }
        setProfiles(imported);
      } catch {
        // ignore invalid files
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const deleteProfile = (key: string) => {
    const { [key]: _, ...rest } = profiles;
    setProfiles(rest);
    if (selected === key) setSelected('Kali default');
  };

  return (
    <div className="p-4 space-y-4 text-white">
      <h1 className="text-xl">Panel Profiles</h1>
      <div className="space-y-2">
        <label htmlFor="profile-select" className="sr-only">
          Profiles
        </label>
        <select
          id="profile-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-ub-cool-grey p-2 rounded w-full"
        >
          {Object.keys(profiles).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            className="bg-ub-green text-black px-2 py-1 rounded"
            onClick={restoreProfile}
          >
            Restore
          </button>
          <button
            className="bg-ubt-blue px-2 py-1 rounded"
            onClick={exportProfile}
          >
            Export
          </button>
          {selected !== 'Kali default' && (
            <button
              className="bg-ubt-red px-2 py-1 rounded"
              onClick={() => deleteProfile(selected)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="New profile name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-ub-cool-grey p-2 rounded w-full"
          aria-label="New profile name"
        />
        <button
          className="bg-ub-orange px-2 py-1 rounded"
          onClick={saveProfile}
        >
          Save Current Layout
        </button>
      </div>
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={importProfiles}
          aria-label="Import profiles"
        />
      </div>
    </div>
  );
}

