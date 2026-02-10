import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '../apps/settings';
import { SettingsProvider } from '../hooks/useSettings';
import {
  exportSettings,
  getAllowNetwork,
  getDensity,
  getFontScale,
  getVolume,
  importSettings,
  resetSettings,
  setAllowNetwork,
  setDensity,
  setFontScale,
  setVolume,
} from '../utils/settingsStore';

describe('Settings reset flow', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    // Mock window.confirm since jsdom doesn't implement it
    window.confirm = jest.fn(() => true);
  });

  test('Reset preserves unrelated localStorage keys', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('unrelated-app-key', 'keep-me');

    render(
      <SettingsProvider>
        <Settings />
      </SettingsProvider>
    );

    await screen.findByRole('button', { name: 'Appearance' });
    await user.click(screen.getByRole('button', { name: 'Privacy' }));

    await user.click(
      screen.getByRole('button', { name: 'Reset all settings to default' }),
    );

    await waitFor(() => {
      expect(window.localStorage.getItem('unrelated-app-key')).toBe('keep-me');
    });
  });

  test('Import applies representative settings safely', async () => {
    const user = userEvent.setup();
    const payload = JSON.stringify({
      volume: 150,
      density: 'compact',
      allowNetwork: true,
      fontScale: 2.5,
      reducedMotion: true,
    });
    const file = new File([payload], 'settings.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(payload),
    });

    render(
      <SettingsProvider>
        <Settings />
      </SettingsProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Privacy' }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(window.localStorage.getItem('density')).toBe('compact');
      expect(window.localStorage.getItem('allow-network')).toBe('true');
    });

    await user.click(screen.getByRole('button', { name: 'Accessibility' }));
    const fontSlider = screen.getByLabelText('Interface Zoom');
    await waitFor(() => expect(fontSlider).toHaveValue('1.5'));

    await user.click(screen.getByRole('button', { name: 'Appearance' }));
    const volumeSlider = screen.getByLabelText('System Volume');
    await waitFor(() => expect(volumeSlider).toHaveValue('100'));
  });

  test('Export/import round-trip keeps core settings', async () => {
    await resetSettings();
    await setDensity('compact');
    await setAllowNetwork(true);
    await setFontScale(1.25);
    await setVolume(45);

    const exported = await exportSettings();
    await resetSettings();
    await importSettings(exported);

    await expect(getDensity()).resolves.toBe('compact');
    await expect(getAllowNetwork()).resolves.toBe(true);
    await expect(getFontScale()).resolves.toBe(1.25);
    await expect(getVolume()).resolves.toBe(45);
    expect(JSON.parse(exported).theme).toBeDefined();
  });
});

