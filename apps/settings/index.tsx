'use client';

import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import {
  resetSettings,
  defaults,
  exportSettings as exportSettingsData,
  importSettings as importSettingsData,
} from '../../utils/settingsStore';
import { getTheme, setTheme } from '../../utils/theme';
import {
  getShortcuts,
  subscribe,
  updateShortcut,
  Shortcut,
} from '../../utils/shortcutRegistry';
import ThemeLab from './components/ThemeLab';

export default function Settings() {
  const {
    accent,
    setAccent,
    wallpaper,
    setWallpaper,
    density,
    setDensity,
    reducedMotion,
    setReducedMotion,
    fontScale,
    setFontScale,
    highContrast,
    setHighContrast,
  } = useSettings();
  const [theme, setThemeState] = useState<string>(getTheme());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wallpapers = [
    'wall-1',
    'wall-2',
    'wall-3',
    'wall-4',
    'wall-5',
    'wall-6',
    'wall-7',
    'wall-8',
  ];

  const changeBackground = (name: string) => setWallpaper(name);

  const handleExport = async () => {
    const data = await exportSettingsData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    await importSettingsData(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed.accent !== undefined) setAccent(parsed.accent);
      if (parsed.wallpaper !== undefined) setWallpaper(parsed.wallpaper);
      if (parsed.density !== undefined) setDensity(parsed.density);
      if (parsed.reducedMotion !== undefined)
        setReducedMotion(parsed.reducedMotion);
      if (parsed.fontScale !== undefined) setFontScale(parsed.fontScale);
      if (parsed.highContrast !== undefined)
        setHighContrast(parsed.highContrast);
      if (parsed.theme !== undefined) {
        setThemeState(parsed.theme);
        setTheme(parsed.theme);
      }
    } catch (err) {
      console.error('Invalid settings', err);
    }
  };

  const handleReset = async () => {
    await resetSettings();
    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setDensity(defaults.density as any);
    setReducedMotion(defaults.reducedMotion);
    setFontScale(defaults.fontScale);
    setHighContrast(defaults.highContrast);
    setThemeState('default');
    setTheme('default');
  };

  // Keyboard shortcuts
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(getShortcuts());
  const [rebinding, setRebinding] = useState<string | null>(null);
  useEffect(() => {
    const unsub = subscribe(setShortcuts);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = [
        e.ctrlKey ? 'Ctrl' : '',
        e.altKey ? 'Alt' : '',
        e.shiftKey ? 'Shift' : '',
        e.metaKey ? 'Meta' : '',
        e.key.length === 1 ? e.key.toUpperCase() : e.key,
      ]
        .filter(Boolean)
        .join('+');
      updateShortcut(rebinding, combo);
      setRebinding(null);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding]);

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div
        className="md:w-2/5 w-2/3 h-1/3 m-auto my-4"
        style={{
          backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
        }}
      ></div>
      <ThemeLab />
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey">Theme:</label>
        <select
          value={theme}
          onChange={(e) => {
            setThemeState(e.target.value);
            setTheme(e.target.value);
          }}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="default">Default</option>
          <option value="dark">Dark</option>
          <option value="neon">Neon</option>
          <option value="matrix">Matrix</option>
        </select>
      </div>
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey">Accent:</label>
        <input
          type="color"
          aria-label="Accent color picker"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          className="w-10 h-10 border border-ubt-cool-grey bg-ub-cool-grey"
        />
      </div>
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey">Wallpaper:</label>
        <input
          type="range"
          min="0"
          max={wallpapers.length - 1}
          step="1"
          value={wallpapers.indexOf(wallpaper)}
          onChange={(e) =>
            changeBackground(wallpapers[parseInt(e.target.value, 10)])
          }
          className="ubuntu-slider"
        />
      </div>
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey">Icon Size:</label>
        <input
          type="range"
          min="0.75"
          max="1.5"
          step="0.05"
          value={fontScale}
          onChange={(e) => setFontScale(parseFloat(e.target.value))}
          className="ubuntu-slider"
        />
      </div>
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey">Density:</label>
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as any)}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="regular">Regular</option>
          <option value="compact">Compact</option>
        </select>
      </div>
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey flex items-center">
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
            className="mr-2"
          />
          Reduced Motion
        </label>
      </div>
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey flex items-center">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
            className="mr-2"
          />
          High Contrast
        </label>
      </div>
      <div className="flex flex-wrap justify-center items-center border-t border-gray-900">
        {wallpapers.map((name) => (
          <div
            key={name}
            role="button"
            aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`}
            aria-pressed={name === wallpaper}
            tabIndex={0}
            onClick={() => changeBackground(name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                changeBackground(name);
              }
            }}
            className={
              (name === wallpaper ? ' border-yellow-700 ' : ' border-transparent ') +
              ' md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80'
            }
            style={{
              backgroundImage: `url(/wallpapers/${name}.webp)`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center center',
            }}
          ></div>
        ))}
      </div>
      <div className="flex justify-center my-4 border-t border-gray-900 pt-4 space-x-4">
        <button onClick={handleExport} className="px-4 py-2 rounded bg-ub-orange text-white">
          Export Settings
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded bg-ub-orange text-white"
        >
          Import Settings
        </button>
        <button onClick={handleReset} className="px-4 py-2 rounded bg-ub-orange text-white">
          Reset Desktop
        </button>
      </div>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file) handleImport(file);
          e.target.value = '';
        }}
        className="hidden"
      />
      <div className="border-t border-gray-900 mt-4 pt-4 px-4">
        <h2 className="text-center mb-2 text-ubt-grey">Keyboard Shortcuts</h2>
        <ul className="space-y-2">
          {shortcuts.map((s) => (
            <li key={s.description} className="flex justify-between items-center">
              <span className="flex-1">{s.description}</span>
              <span className="font-mono mr-2">{s.keys}</span>
              <button
                className="px-2 py-1 bg-ub-orange text-white rounded text-sm"
                onClick={() => setRebinding(s.description)}
              >
                {rebinding === s.description ? 'Press keys...' : 'Rebind'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

