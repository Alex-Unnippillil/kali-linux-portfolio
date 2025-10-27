import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../components/apps/settings';
import { SettingsProvider } from '../hooks/useSettings';
import { defaults, resetSettings } from '../utils/settingsStore';

describe('Settings reset flow', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await resetSettings();
  });

  test('Reset Desktop restores toggles and slider to defaults', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <Settings />
      </SettingsProvider>
    );

    await screen.findByRole('button', { name: 'Reset Desktop' });

    const [themeSelect, densitySelect] = screen.getAllByRole('combobox');
    const fontSlider = screen.getByRole('slider');
    const defaultAccentRadio = screen.getByRole('radio', {
      name: `select-accent-${defaults.accent}`,
    });
    const alternateAccentRadio = screen.getByRole('radio', {
      name: 'select-accent-#e53e3e',
    });

    const kaliWallpaperToggle = screen.getByLabelText('Kali Gradient Wallpaper');
    const reducedMotionToggle = screen.getByLabelText('Reduced Motion');
    const largeHitAreasToggle = screen.getByLabelText('Large Hit Areas');
    const highContrastToggle = screen.getByLabelText('High Contrast');
    const allowNetworkToggle = screen.getByLabelText('Allow Network Requests');
    const telemetryToggle = screen.getByLabelText('Allow Replay & Performance Telemetry');
    const hapticsToggle = screen.getByLabelText('Haptics');
    const pongSpinToggle = screen.getByLabelText('Pong Spin');

    await waitFor(() => expect(hapticsToggle).toBeChecked());
    await waitFor(() => expect(pongSpinToggle).toBeChecked());
    await waitFor(() => expect(telemetryToggle).toBeChecked());

    await user.selectOptions(themeSelect, 'dark');
    await user.click(alternateAccentRadio);
    await user.selectOptions(densitySelect, 'compact');
    fireEvent.change(fontSlider, { target: { value: '1.5' } });
    await user.click(kaliWallpaperToggle);
    await user.click(reducedMotionToggle);
    await user.click(largeHitAreasToggle);
    await user.click(highContrastToggle);
    await user.click(allowNetworkToggle);
    await user.click(telemetryToggle);
    await user.click(hapticsToggle);
    await user.click(pongSpinToggle);

    expect(themeSelect).toHaveValue('dark');
    expect(alternateAccentRadio).toHaveAttribute('aria-checked', 'true');
    expect(densitySelect).toHaveValue('compact');
    expect(fontSlider).toHaveValue('1.5');
    expect(kaliWallpaperToggle).toBeChecked();
    expect(reducedMotionToggle).toBeChecked();
    expect(largeHitAreasToggle).toBeChecked();
    expect(highContrastToggle).toBeChecked();
    expect(allowNetworkToggle).toBeChecked();
    expect(telemetryToggle).not.toBeChecked();
    expect(hapticsToggle).not.toBeChecked();
    expect(pongSpinToggle).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Reset Desktop' }));

    await waitFor(() => expect(themeSelect).toHaveValue('default'));
    expect(defaultAccentRadio).toHaveAttribute('aria-checked', 'true');
    expect(densitySelect).toHaveValue(defaults.density);
    expect(fontSlider).toHaveValue(String(defaults.fontScale));
    expect(kaliWallpaperToggle.checked).toBe(defaults.useKaliWallpaper);
    expect(reducedMotionToggle.checked).toBe(defaults.reducedMotion);
    expect(largeHitAreasToggle.checked).toBe(defaults.largeHitAreas);
    expect(highContrastToggle.checked).toBe(defaults.highContrast);
    expect(allowNetworkToggle.checked).toBe(defaults.allowNetwork);
    expect(telemetryToggle.checked).toBe(defaults.allowTelemetry);
    expect(hapticsToggle.checked).toBe(defaults.haptics);
    expect(pongSpinToggle.checked).toBe(defaults.pongSpin);
  });
});

