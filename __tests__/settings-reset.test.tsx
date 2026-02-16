import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../components/apps/settings';
import { SettingsProvider } from '../hooks/useSettings';
jest.mock('../utils/settingsStore', () => ({
  __esModule: true,
  ...jest.requireActual('../utils/settingsStore'),
  resetSettings: jest.fn().mockResolvedValue(undefined),
}));

import { defaults, resetSettings } from '../utils/settingsStore';

describe('Settings reset flow', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    // Mock window.confirm since jsdom doesn't implement it
    window.confirm = jest.fn(() => true);
    (resetSettings as jest.Mock).mockClear();
  });

  test('Reset Desktop restores toggles and slider to defaults', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <Settings />
      </SettingsProvider>
    );

    const expectSwitchState = (toggle: HTMLElement, expected: boolean) => {
      expect(toggle).toHaveAttribute('aria-checked', expected ? 'true' : 'false');
    };

    const kaliWallpaperToggle = screen.getByRole('switch', { name: 'Toggle Gradient' });
    await user.click(kaliWallpaperToggle);
    expectSwitchState(kaliWallpaperToggle, !defaults.useKaliWallpaper);

    await user.click(screen.getByRole('button', { name: 'Accessibility' }));
    const fontSlider = screen.getByRole('slider');
    const reducedMotionToggle = screen.getByRole('switch', { name: 'Reduced Motion' });
    const highContrastToggle = screen.getByRole('switch', { name: 'High Contrast' });
    const largeHitAreasToggle = screen.getByRole('switch', { name: 'Large Hit Areas' });
    const hapticsToggle = screen.getByRole('switch', { name: 'Haptics' });

    fireEvent.change(fontSlider, { target: { value: '1.5' } });
    await user.click(reducedMotionToggle);
    await user.click(highContrastToggle);
    await user.click(largeHitAreasToggle);
    await user.click(hapticsToggle);

    expectSwitchState(reducedMotionToggle, !defaults.reducedMotion);
    expectSwitchState(highContrastToggle, !defaults.highContrast);
    expectSwitchState(largeHitAreasToggle, !defaults.largeHitAreas);
    expectSwitchState(hapticsToggle, !defaults.haptics);

    await user.click(screen.getByRole('button', { name: 'Privacy' }));
    const allowNetworkToggle = screen.getByRole('switch', { name: 'Network' });
    await user.click(allowNetworkToggle);
    expectSwitchState(allowNetworkToggle, !defaults.allowNetwork);

    await user.click(screen.getByRole('button', { name: 'Reset all settings to default' }));

    await user.click(screen.getByRole('button', { name: 'Appearance' }));
    const resetWallpaperToggle = screen.getByRole('switch', { name: 'Toggle Gradient' });
    await waitFor(() => expectSwitchState(resetWallpaperToggle, defaults.useKaliWallpaper));

    await user.click(screen.getByRole('button', { name: 'Accessibility' }));
    const resetFontSlider = screen.getByRole('slider');
    const resetReducedMotionToggle = screen.getByRole('switch', { name: 'Reduced Motion' });
    const resetHighContrastToggle = screen.getByRole('switch', { name: 'High Contrast' });
    const resetLargeHitAreasToggle = screen.getByRole('switch', { name: 'Large Hit Areas' });
    const resetHapticsToggle = screen.getByRole('switch', { name: 'Haptics' });
    await waitFor(() => expect(resetFontSlider).toHaveValue(String(defaults.fontScale)));
    expectSwitchState(resetReducedMotionToggle, defaults.reducedMotion);
    expectSwitchState(resetHighContrastToggle, defaults.highContrast);
    expectSwitchState(resetLargeHitAreasToggle, defaults.largeHitAreas);
    expectSwitchState(resetHapticsToggle, defaults.haptics);

    await user.click(screen.getByRole('button', { name: 'Privacy' }));
    const resetAllowNetworkToggle = screen.getByRole('switch', { name: 'Network' });
    expectSwitchState(resetAllowNetworkToggle, defaults.allowNetwork);
  });
});

