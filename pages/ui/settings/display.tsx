"use client";

import { useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

const WALLPAPERS = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

type PanelPosition = 'top' | 'bottom';

interface DisplayProfile {
  name: string;
  wallpapers: string[];
  panel: { display: number; position: PanelPosition };
}

export default function DisplaySettings() {
  const [wallpapers, setWallpapers] = useState<string[]>(['wall-1', 'wall-2']);
  const [panel, setPanel] = useState<{ display: number; position: PanelPosition }>({ display: 0, position: 'top' });
  const [profiles, setProfiles] = usePersistentState<DisplayProfile[]>('display-profiles', []);
  const [name, setName] = useState('');

  const handleWallpaperChange = (idx: number, value: string) => {
    const next = [...wallpapers];
    next[idx] = value;
    setWallpapers(next);
  };

  const saveProfile = () => {
    if (!name.trim()) return;
    const profile: DisplayProfile = {
      name: name.trim(),
      wallpapers: [...wallpapers],
      panel: { ...panel },
    };
    setProfiles([...(profiles.filter(p => p.name !== profile.name)), profile]);
    setName('');
  };

  const applyProfile = (p: DisplayProfile) => {
    setWallpapers([...p.wallpapers]);
    setPanel({ ...p.panel });
  };

  const deleteProfile = (profileName: string) => {
    setProfiles(profiles.filter(p => p.name !== profileName));
  };

  return (
    <div className="flex h-full">
      <nav className="w-48 p-4 border-r border-ubt-cool-grey text-sm">
        <ul className="space-y-1.5">
          <li>
            <a className="flex items-center gap-2 p-2 rounded-l-md border-l-2 border-ubt-blue bg-ub-cool-grey">
              <span className="w-6 h-6 bg-ubt-grey rounded"></span>
              <span>Display</span>
            </a>
          </li>
        </ul>
      </nav>
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="text-xl mb-4">Display</h1>
        <div className="flex gap-4 justify-center mb-6">
          {wallpapers.map((w, idx) => (
            <div key={idx} className="relative w-40 h-24 border border-gray-700">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(/wallpapers/${w}.webp)` }}
              />
              {panel.display === idx && (
                <div
                  className={`absolute left-0 right-0 h-3 bg-ub-orange ${
                    panel.position === 'top' ? 'top-0' : 'bottom-0'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="space-y-4 mb-6">
          {wallpapers.map((w, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <label className="text-sm">Display {idx + 1} Wallpaper:</label>
              <select
                value={w}
                onChange={(e) => handleWallpaperChange(idx, e.target.value)}
                className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
              >
                {WALLPAPERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <label className="text-sm">Panel Display:</label>
            <select
              value={panel.display}
              onChange={(e) => setPanel({ ...panel, display: parseInt(e.target.value, 10) })}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              {wallpapers.map((_, idx) => (
                <option key={idx} value={idx}>
                  Display {idx + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Panel Position:</label>
            <select
              value={panel.position}
              onChange={(e) => setPanel({ ...panel, position: e.target.value as PanelPosition })}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        </div>
        <div className="border-t border-gray-900 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Profile name"
              aria-label="Profile name"
              list="profile-presets"
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey flex-1"
            />
            <datalist id="profile-presets">
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Projector">Projector</option>
            </datalist>
            <button
              onClick={saveProfile}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              Save
            </button>
          </div>
          {profiles.length > 0 && (
            <ul className="divide-y divide-gray-700">
              {profiles.map((p) => (
                <li key={p.name} className="py-2 flex items-center justify-between">
                  <span>{p.name}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => applyProfile(p)}
                      className="px-2 py-1 rounded bg-ub-orange text-white"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => deleteProfile(p.name)}
                      className="px-2 py-1 rounded bg-ubt-grey text-white"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

