import { setAccent, getAccent, resetSettings } from '../utils/settingsStore';

describe('settingsStore accent sync', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await resetSettings();
  });

  test('setAccent stores value in localStorage', async () => {
    await setAccent('#ff0000');
    expect(window.localStorage.getItem('accent')).toBe('#ff0000');
    expect(await getAccent()).toBe('#ff0000');
  });

  test('resetSettings clears accent from localStorage', async () => {
    await setAccent('#00ff00');
    await resetSettings();
    expect(window.localStorage.getItem('accent')).toBeNull();
  });
});
