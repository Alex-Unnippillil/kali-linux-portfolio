import { useContext, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clear, get, set } from 'idb-keyval';
import { Settings } from '../components/apps/settings';
import { SettingsContext } from '../hooks/useSettings';
import * as settingsStore from '../utils/settingsStore';

const { defaults } = settingsStore;

// Exercise the real reset control and storage implementation against explicit
// React state. Provider hydration is covered separately by allowNetwork.test.ts.
// Persisted outcomes, not mock function identities, are the reset contract.
function ResetHarness() {
  const initial = useContext(SettingsContext);
  const [value, setValue] = useState({
    ...initial,
    accent: '#e53e3e',
    wallpaper: 'wall-3',
    useKaliWallpaper: !defaults.useKaliWallpaper,
    density: 'compact' as typeof initial.density,
    reducedMotion: !defaults.reducedMotion,
    fontScale: 1.5,
    highContrast: !defaults.highContrast,
    largeHitAreas: !defaults.largeHitAreas,
    pongSpin: !defaults.pongSpin,
    allowNetwork: !defaults.allowNetwork,
    haptics: !defaults.haptics,
    volume: 25,
    theme: 'dark',
  });
  return (
    <SettingsContext.Provider value={{
      ...value,
      setAccent: (accent) => setValue((current) => ({ ...current, accent })),
      setWallpaper: (wallpaper) => setValue((current) => ({ ...current, wallpaper })),
      setUseKaliWallpaper: (useKaliWallpaper) => setValue((current) => ({ ...current, useKaliWallpaper })),
      setDensity: (density) => setValue((current) => ({ ...current, density })),
      setReducedMotion: (reducedMotion) => setValue((current) => ({ ...current, reducedMotion })),
      setFontScale: (fontScale) => setValue((current) => ({ ...current, fontScale })),
      setHighContrast: (highContrast) => setValue((current) => ({ ...current, highContrast })),
      setLargeHitAreas: (largeHitAreas) => setValue((current) => ({ ...current, largeHitAreas })),
      setPongSpin: (pongSpin) => setValue((current) => ({ ...current, pongSpin })),
      setAllowNetwork: (allowNetwork) => setValue((current) => ({ ...current, allowNetwork })),
      setHaptics: (haptics) => setValue((current) => ({ ...current, haptics })),
      setVolume: (volume) => setValue((current) => ({ ...current, volume })),
      setTheme: (theme) => setValue((current) => ({ ...current, theme })),
    }}>
      <Settings />
    </SettingsContext.Provider>
  );
}

const toggles = [
  ['Enable Kali gradient wallpaper', 'useKaliWallpaper'],
  ['Enable reduced motion', 'reducedMotion'],
  ['Enable large hit areas', 'largeHitAreas'],
  ['Enable high contrast mode', 'highContrast'],
  ['Allow simulated network requests', 'allowNetwork'],
  ['Enable haptics', 'haptics'],
  ['Enable pong spin', 'pongSpin'],
] as const;

const persisted = {
  density: 'compact',
  'reduced-motion': String(!defaults.reducedMotion),
  'font-scale': '1.5',
  'high-contrast': String(!defaults.highContrast),
  'large-hit-areas': String(!defaults.largeHitAreas),
  'pong-spin': String(!defaults.pongSpin),
  'allow-network': 'false',
  haptics: String(!defaults.haptics),
  'use-kali-wallpaper': String(!defaults.useKaliWallpaper),
  volume: '25',
};

describe('Settings reset persistence', () => {
  beforeEach(async () => {
    await clear();
    window.localStorage.clear();
    window.confirm = jest.fn(() => true);
    for (const [key, value] of Object.entries(persisted)) {
      window.localStorage.setItem(key, value);
    }
    window.localStorage.setItem('youtube:watch-later', '["saved-video"]');
    await set('accent', '#e53e3e');
    await set('bg-image', 'wall-3');
  });

  afterEach(async () => {
    await clear();
    window.localStorage.clear();
  });

  test('Reset clears persisted settings and restores controls including enabled networking', async () => {
    const user = userEvent.setup();
    render(<ResetHarness />);
    expect(screen.getByRole('combobox')).toHaveValue('compact');
    expect(screen.getByLabelText('Adjust font scale')).toHaveValue('1.5');
    await expect(settingsStore.getAllowNetwork()).resolves.toBe(false);
    for (const [label, key] of toggles) {
      expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(!defaults[key]);
    }

    await user.click(screen.getByRole('button', { name: 'Reset', exact: true }));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue(defaults.density));
    expect(window.confirm).toHaveBeenCalledWith('Reset desktop personalization and settings?');
    expect(screen.getByLabelText('Adjust font scale')).toHaveValue(String(defaults.fontScale));
    expect(screen.getByRole('radio', { name: `select-accent-${defaults.accent}` })).toHaveAttribute('aria-checked', 'true');
    for (const [label, key] of toggles) {
      expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(defaults[key]);
    }
    for (const key of Object.keys(persisted)) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
    await expect(get('accent')).resolves.toBeUndefined();
    await expect(get('bg-image')).resolves.toBeUndefined();
    await expect(settingsStore.getAllowNetwork()).resolves.toBe(defaults.allowNetwork);
    expect(window.localStorage.getItem('allow-network')).toBeNull();
    expect(window.localStorage.getItem('youtube:watch-later')).toBe('["saved-video"]');
  });

  test('Cancel preserves controls and both localStorage and IndexedDB preferences', async () => {
    window.confirm = jest.fn(() => false);
    const user = userEvent.setup();
    render(<ResetHarness />);
    await user.click(screen.getByRole('button', { name: 'Reset', exact: true }));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledWith('Reset desktop personalization and settings?');
    expect(screen.getByRole('combobox')).toHaveValue('compact');
    expect(screen.getByLabelText('Adjust font scale')).toHaveValue('1.5');
    expect(screen.getByRole('radio', { name: 'select-accent-#e53e3e' })).toHaveAttribute('aria-checked', 'true');
    for (const [label, key] of toggles) {
      expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(!defaults[key]);
    }
    for (const [key, value] of Object.entries(persisted)) {
      expect(window.localStorage.getItem(key)).toBe(value);
    }
    await expect(get('accent')).resolves.toBe('#e53e3e');
    await expect(get('bg-image')).resolves.toBe('wall-3');
    await expect(settingsStore.getAllowNetwork()).resolves.toBe(false);
    expect(window.localStorage.getItem('allow-network')).toBe('false');
    expect(window.localStorage.getItem('youtube:watch-later')).toBe('["saved-video"]');
  });
});
