import { useRef, useState, type ChangeEvent } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import FormError from './ui/FormError';
import useNotifications from '../hooks/useNotifications';
import {
  defaults,
  exportSettings as exportSettingsData,
  importSettings as importSettingsData,
  resetSettings as resetSettingsData,
} from '../utils/settingsStore';

type Preferences = {
  accent?: string;
  wallpaper?: string;
  useKaliWallpaper?: boolean;
  density?: string;
  reducedMotion?: boolean;
  fontScale?: number;
  highContrast?: boolean;
  largeHitAreas?: boolean;
  pongSpin?: boolean;
  allowNetwork?: boolean;
  haptics?: boolean;
  theme?: string;
};

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const unlocked = getUnlockedThemes(highScore);
  const {
    accent,
    setAccent,
    theme,
    setTheme,
    setWallpaper,
    setUseKaliWallpaper,
    setDensity,
    setReducedMotion,
    setFontScale,
    setHighContrast,
    setLargeHitAreas,
    setPongSpin,
    setAllowNetwork,
    setHaptics,
  } = useSettings();
  const { pushNotification } = useNotifications();

  const applyPreferencesToContext = (preferences: Preferences) => {
    if (typeof preferences.accent === 'string') setAccent(preferences.accent);
    if (typeof preferences.wallpaper === 'string') setWallpaper(preferences.wallpaper);
    if (typeof preferences.useKaliWallpaper === 'boolean') {
      setUseKaliWallpaper(preferences.useKaliWallpaper);
    }
    if (typeof preferences.density === 'string') {
      setDensity(preferences.density as 'regular' | 'compact');
    }
    if (typeof preferences.reducedMotion === 'boolean') {
      setReducedMotion(preferences.reducedMotion);
    }
    if (typeof preferences.fontScale === 'number') setFontScale(preferences.fontScale);
    if (typeof preferences.highContrast === 'boolean') {
      setHighContrast(preferences.highContrast);
    }
    if (typeof preferences.largeHitAreas === 'boolean') {
      setLargeHitAreas(preferences.largeHitAreas);
    }
    if (typeof preferences.pongSpin === 'boolean') setPongSpin(preferences.pongSpin);
    if (typeof preferences.allowNetwork === 'boolean') {
      setAllowNetwork(preferences.allowNetwork);
    }
    if (typeof preferences.haptics === 'boolean') setHaptics(preferences.haptics);
    if (typeof preferences.theme === 'string') setTheme(preferences.theme);
  };

  const handleExport = async () => {
    setImportError(null);
    const data = await exportSettingsData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'settings.json';
    anchor.click();
    URL.revokeObjectURL(url);
    pushNotification({
      appId: 'settings',
      title: 'Settings exported',
      body: 'Saved settings.json with your layout and preferences.',
    });
  };

  const handleImportChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (isImporting) {
      event.target.value = '';
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      setImportError('Please choose a settings JSON file.');
      return;
    }
    setImportError(null);
    if (
      !window.confirm(
        'Import settings from the selected file? This will overwrite your current layout, shortcuts, and preferences.',
      )
    ) {
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const result = await importSettingsData(text);
      if (!result?.success) {
        setImportError(result?.error || 'Unable to import settings.');
        return;
      }
      applyPreferencesToContext(result.data?.preferences ?? {});
      setImportError(null);
      pushNotification({
        appId: 'settings',
        title: 'Settings imported',
        body: 'Desktop layout, shortcuts, and preferences restored.',
      });
    } catch (error) {
      console.error('Failed to import settings', error);
      setImportError('Unable to read the selected file.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleReset = async () => {
    setImportError(null);
    const confirmed = window.confirm(
      'Reset all desktop settings to their defaults? This clears layout, shortcuts, and saved preferences.',
    );
    if (!confirmed) return;

    await resetSettingsData();
    applyPreferencesToContext({
      accent: defaults.accent,
      wallpaper: defaults.wallpaper,
      useKaliWallpaper: defaults.useKaliWallpaper,
      density: defaults.density,
      reducedMotion: defaults.reducedMotion,
      fontScale: defaults.fontScale,
      highContrast: defaults.highContrast,
      largeHitAreas: defaults.largeHitAreas,
      pongSpin: defaults.pongSpin,
      allowNetwork: defaults.allowNetwork,
      haptics: defaults.haptics,
      theme: 'default',
    });
    pushNotification({
      appId: 'settings',
      title: 'Settings reset',
      body: 'Restored default appearance and layout.',
    });
  };

  const handleToggle = () => {
    setOpen((prev) => {
      if (prev) {
        setImportError(null);
      }
      return !prev;
    });
  };

  return (
    <div>
      <button aria-label="settings" onClick={handleToggle}>
        Settings
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="mt-3 space-y-4 rounded-md bg-black/70 p-4 text-sm text-white"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Theme
            </label>
            <select
              aria-label="theme-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="mt-1 w-full rounded border border-white/20 bg-black/60 px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
            >
              {unlocked.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Accent
            </span>
            <div
              aria-label="accent-color-picker"
              role="radiogroup"
              className="mt-2 flex flex-wrap gap-2"
            >
              {ACCENT_OPTIONS.map((c) => (
                <button
                  key={c}
                  aria-label={`select-accent-${c}`}
                  role="radio"
                  aria-checked={accent === c}
                  onClick={() => setAccent(c)}
                  className={`h-6 w-6 rounded-full border-2 transition ${
                    accent === c ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded bg-ub-orange px-3 py-2 text-sm font-medium text-black shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
            >
              Export settings
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`rounded px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                importError
                  ? 'border border-red-500 text-red-100 focus-visible:outline-red-500'
                  : 'bg-ub-orange text-black shadow focus-visible:outline-ub-orange'
              } ${isImporting ? 'opacity-70' : ''}`}
              disabled={isImporting}
              aria-describedby={importError ? 'settings-import-error' : undefined}
            >
              {isImporting ? 'Importing…' : 'Import settings'}
              <span className="ml-1 text-red-200">*</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded border border-white/30 px-3 py-2 text-sm font-medium transition hover:border-ub-orange hover:text-ub-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
            >
              Reset to defaults
            </button>
            <input
              ref={fileInputRef}
              id="settings-import"
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportChange}
              required
              aria-required="true"
              aria-invalid={importError ? 'true' : 'false'}
              aria-label="Import settings file"
            />
          </div>
          {importError && (
            <FormError id="settings-import-error" className="mt-0">
              {importError}
            </FormError>
          )}
          <p className="text-xs text-white/60">
            Export bundles layout, theme, shortcuts, and accessibility preferences into a single
            JSON file.
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
