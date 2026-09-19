import {
  defaults,
  getAllowNetwork,
  setAllowNetwork,
  resetSettings,
} from '../utils/settingsStore';

describe('network preference storage', () => {
  beforeEach(() => window.localStorage.clear());

  test('defaults to enabled without persisting a synthetic preference', async () => {
    expect(defaults.allowNetwork).toBe(true);
    await expect(getAllowNetwork()).resolves.toBe(true);
    expect(window.localStorage.getItem('allow-network')).toBeNull();
  });

  test.each([true, false])('preserves an explicitly saved %s preference', async (value) => {
    await setAllowNetwork(value);
    await expect(getAllowNetwork()).resolves.toBe(value);
    expect(window.localStorage.getItem('allow-network')).toBe(String(value));
  });

  test('resetting settings restores the enabled default', async () => {
    await setAllowNetwork(false);
    await resetSettings();
    await expect(getAllowNetwork()).resolves.toBe(true);
    expect(window.localStorage.getItem('allow-network')).toBeNull();
  });
});
