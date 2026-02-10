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

const expectSwitchState = (element: HTMLElement, value: boolean) => {
  expect(element).toHaveAttribute('aria-checked', value ? 'true' : 'false');
};

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

    await screen.findByRole('button', { name: 'Appearance' });

    const volumeSlider = screen.getByLabelText('System volume');
    const kaliWallpaperToggle = screen.getByRole('switch', {
      name: 'Use Kali gradient overlay',
    });
    const alternateAccentButton = screen.getByRole('button', {
      name: 'Set accent color to #e53e3e',
    });

    fireEvent.change(volumeSlider, { target: { value: '55' } });
    await user.click(kaliWallpaperToggle);
    await user.click(alternateAccentButton);

    fireEvent.click(screen.getByRole('button', { name: 'Accessibility' }));

    const densitySelect = screen.getByLabelText('Interface density');
    const fontSlider = screen.getByLabelText('Interface zoom');
    const reducedMotionToggle = screen.getByRole('switch', { name: 'Reduced Motion' });
    const largeHitAreasToggle = screen.getByRole('switch', { name: 'Large Hit Areas' });
    const highContrastToggle = screen.getByRole('switch', { name: 'High Contrast' });
    const hapticsToggle = screen.getByRole('switch', { name: 'Haptic Feedback' });

    await user.selectOptions(densitySelect, 'compact');
    fireEvent.change(fontSlider, { target: { value: '1.5' } });
    await user.click(reducedMotionToggle);
    await user.click(largeHitAreasToggle);
    await user.click(highContrastToggle);
    await user.click(hapticsToggle);

    fireEvent.click(screen.getByRole('button', { name: 'System' }));
    const pongSpinToggle = screen.getByRole('switch', { name: 'Pong spin effect' });
    await user.click(pongSpinToggle);

    fireEvent.click(screen.getByRole('button', { name: 'Privacy' }));
    const allowNetworkToggle = screen.getByRole('switch', {
      name: 'Allow network requests',
    });
    await user.click(allowNetworkToggle);

    await user.click(screen.getByRole('button', { name: 'Reset all settings to default' }));

    await waitFor(() => expectSwitchState(allowNetworkToggle, defaults.allowNetwork));

    fireEvent.click(screen.getByRole('button', { name: 'Accessibility' }));
    await screen.findByText('Display & Legibility');
    const densitySelectAfter = screen.getByLabelText('Interface density');
    const fontSliderAfter = screen.getByLabelText('Interface zoom');
    const reducedMotionAfter = screen.getByRole('switch', { name: 'Reduced Motion' });
    const largeHitAreasAfter = screen.getByRole('switch', { name: 'Large Hit Areas' });
    const highContrastAfter = screen.getByRole('switch', { name: 'High Contrast' });
    const hapticsAfter = screen.getByRole('switch', { name: 'Haptic Feedback' });

    expect(densitySelectAfter).toHaveValue(defaults.density);
    expect(fontSliderAfter).toHaveValue(String(defaults.fontScale));
    expectSwitchState(reducedMotionAfter, defaults.reducedMotion);
    expectSwitchState(largeHitAreasAfter, defaults.largeHitAreas);
    expectSwitchState(highContrastAfter, defaults.highContrast);
    expectSwitchState(hapticsAfter, defaults.haptics);

    fireEvent.click(screen.getByRole('button', { name: 'System' }));
    await screen.findByText('Games & Simulations');
    const pongSpinAfter = screen.getByRole('switch', { name: 'Pong spin effect' });
    expectSwitchState(pongSpinAfter, defaults.pongSpin);

    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    await screen.findByText('Wallpaper & Background');
    const kaliWallpaperAfter = screen.getByRole('switch', {
      name: 'Use Kali gradient overlay',
    });
    const volumeAfter = screen.getByLabelText('System volume');
    expectSwitchState(kaliWallpaperAfter, defaults.useKaliWallpaper);
    expect(volumeAfter).toHaveValue(String(defaults.volume));
  });
});

