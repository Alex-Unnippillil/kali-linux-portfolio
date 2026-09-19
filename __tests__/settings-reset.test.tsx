import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../components/apps/settings';
import { SettingsProvider } from '../hooks/useSettings';
import { defaults, resetSettings } from '../utils/settingsStore';

// This test exercises the reset UI. Storage and network preference persistence
// are covered separately; give every asynchronous preference a stable value.
jest.mock('../utils/settingsStore', () => {
  const actual = jest.requireActual('../utils/settingsStore');
  return {
    __esModule: true,
    ...actual,
    getAccent: async () => actual.defaults.accent,
    getWallpaper: async () => actual.defaults.wallpaper,
    getUseKaliWallpaper: async () => actual.defaults.useKaliWallpaper,
    getDensity: async () => actual.defaults.density,
    getReducedMotion: async () => actual.defaults.reducedMotion,
    getFontScale: async () => actual.defaults.fontScale,
    getHighContrast: async () => actual.defaults.highContrast,
    getLargeHitAreas: async () => actual.defaults.largeHitAreas,
    getPongSpin: async () => actual.defaults.pongSpin,
    getHaptics: async () => actual.defaults.haptics,
    getVolume: async () => actual.defaults.volume,
    resetSettings: jest.fn().mockResolvedValue(undefined),
  };
});

describe('Settings reset flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.confirm = jest.fn(() => true);
    (resetSettings as jest.Mock).mockClear();
  });

  test('Reset Desktop restores toggles and slider to defaults', async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider>
        <Settings />
      </SettingsProvider>,
    );
    // Drain the provider's asynchronous preference chain before user changes.
    // render already handles synchronous effects; no Testing Library utility
    // is wrapped in act here.
    await act(async () => {});

    const densitySelect = screen.getByRole('combobox');
    const fontSlider = screen.getByLabelText('Adjust font scale');
    const alternateAccentRadio = screen.getByRole('radio', {
      name: 'select-accent-#e53e3e',
    });
    const kaliWallpaperToggle = screen.getByLabelText('Enable Kali gradient wallpaper');
    const reducedMotionToggle = screen.getByLabelText('Enable reduced motion');
    const largeHitAreasToggle = screen.getByLabelText('Enable large hit areas');
    const highContrastToggle = screen.getByLabelText('Enable high contrast mode');
    const allowNetworkToggle = screen.getByLabelText('Allow simulated network requests');
    const hapticsToggle = screen.getByLabelText('Enable haptics');
    const pongSpinToggle = screen.getByLabelText('Enable pong spin');

    await waitFor(() => expect(allowNetworkToggle).toBeChecked());
    expect(hapticsToggle).toBeChecked();
    expect(pongSpinToggle).toBeChecked();

    await user.click(alternateAccentRadio);
    await user.selectOptions(densitySelect, 'compact');
    fireEvent.change(fontSlider, { target: { value: '1.5' } });
    await user.click(kaliWallpaperToggle);
    await user.click(reducedMotionToggle);
    await user.click(largeHitAreasToggle);
    await user.click(highContrastToggle);
    await user.click(allowNetworkToggle);
    await user.click(hapticsToggle);
    await user.click(pongSpinToggle);

    expect(alternateAccentRadio).toHaveAttribute('aria-checked', 'true');
    expect(densitySelect).toHaveValue('compact');
    expect(fontSlider).toHaveValue('1.5');
    expect(kaliWallpaperToggle).toBeChecked();
    expect(reducedMotionToggle).toBeChecked();
    expect(largeHitAreasToggle).toBeChecked();
    expect(highContrastToggle).toBeChecked();
    expect(allowNetworkToggle).not.toBeChecked();
    expect(hapticsToggle).not.toBeChecked();
    expect(pongSpinToggle).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Reset', exact: true }));
    await waitFor(() => expect(resetSettings).toHaveBeenCalledTimes(1));
    expect(densitySelect).toHaveValue(defaults.density);
    expect(fontSlider).toHaveValue(String(defaults.fontScale));
    expect(kaliWallpaperToggle.checked).toBe(defaults.useKaliWallpaper);
    expect(reducedMotionToggle.checked).toBe(defaults.reducedMotion);
    expect(largeHitAreasToggle.checked).toBe(defaults.largeHitAreas);
    expect(highContrastToggle.checked).toBe(defaults.highContrast);
    expect(allowNetworkToggle.checked).toBe(defaults.allowNetwork);
    expect(hapticsToggle.checked).toBe(defaults.haptics);
    expect(pongSpinToggle.checked).toBe(defaults.pongSpin);
  });
});
