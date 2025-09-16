import { Desktop } from '../components/screen/desktop';

describe('desktop settings shortcut', () => {
  const originalNavigator = navigator;

  const setPlatform = (platform: string) => {
    Object.defineProperty(window, 'navigator', {
      value: { platform },
      configurable: true,
    });
  };

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  test('Cmd+, opens settings on mac', () => {
    setPlatform('MacIntel');
    const desktop = new Desktop();
    desktop.openApp = jest.fn();
    const event = new KeyboardEvent('keydown', { metaKey: true, key: ',' });
    desktop.handleGlobalShortcut(event);
    expect(desktop.openApp).toHaveBeenCalledWith('settings');
  });

  test('Win+, opens settings on windows', () => {
    setPlatform('Win32');
    const desktop = new Desktop();
    desktop.openApp = jest.fn();
    const event = new KeyboardEvent('keydown', { metaKey: true, key: ',' });
    desktop.handleGlobalShortcut(event);
    expect(desktop.openApp).toHaveBeenCalledWith('settings');
  });
});
