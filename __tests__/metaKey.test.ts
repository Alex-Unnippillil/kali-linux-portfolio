import { getMetaKeyLabel, isMetaKey } from '../utils/metaKey';

describe('meta key detection', () => {
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

  test('mac meta key label', () => {
    setPlatform('MacIntel');
    expect(getMetaKeyLabel()).toBe('Meta');
    const e = new KeyboardEvent('keydown', { metaKey: true });
    expect(isMetaKey(e)).toBe(true);
  });

  test('windows meta key label', () => {
    setPlatform('Win32');
    expect(getMetaKeyLabel()).toBe('Win');
    const e = new KeyboardEvent('keydown', { metaKey: true });
    expect(isMetaKey(e)).toBe(true);
  });
});
