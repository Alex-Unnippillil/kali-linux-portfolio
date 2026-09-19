import { useContext, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../components/apps/settings';
import { SettingsContext } from '../hooks/useSettings';
import { defaults, resetSettings } from '../utils/settingsStore';

jest.mock('../utils/settingsStore', () => ({
  __esModule: true,
  ...jest.requireActual('../utils/settingsStore'),
  resetSettings: jest.fn().mockResolvedValue(undefined),
}));

// Exercise the reset control against explicit React state, independently of
// asynchronous IDB startup. Provider and persistence have separate regressions.
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

describe('Settings reset flow', () => {
  beforeEach(() => {
    window.confirm = jest.fn(() => true);
    (resetSettings as jest.Mock).mockClear();
  });

  test('Reset restores non-default controls, including enabled networking', async () => {
    const user = userEvent.setup();
    render(<ResetHarness />);
    expect(screen.getByRole('combobox')).toHaveValue('compact');
    expect(screen.getByLabelText('Adjust font scale')).toHaveValue('1.5');
    expect(screen.getByLabelText('Adjust master volume')).toHaveValue('25');
    for (const [label, key] of toggles) {
      expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(!defaults[key]);
    }
    await user.click(screen.getByRole('button', { name: 'Reset', exact: true }));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue(defaults.density));
    expect(resetSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Adjust font scale')).toHaveValue(String(defaults.fontScale));
    expect(screen.getByLabelText('Adjust master volume')).toHaveValue(String(defaults.volume));
    expect(screen.getByRole('radio', { name: `select-accent-${defaults.accent}` })).toHaveAttribute('aria-checked', 'true');
    for (const [label, key] of toggles) {
      expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(defaults[key]);
    }
    expect(screen.getByText('All settings restored to defaults')).toBeVisible();
  });

  test('canceling reset preserves existing values and does not clear storage', async () => {
    window.confirm = jest.fn(() => false);
    const user = userEvent.setup();
    render(<ResetHarness />);
    await user.click(screen.getByRole('button', { name: 'Reset', exact: true }));
    expect(resetSettings).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveValue('compact');
    for (const [label, key] of toggles) {
      expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(!defaults[key]);
    }
  });
});
