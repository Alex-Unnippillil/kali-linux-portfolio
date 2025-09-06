import { setDefaultApp, getDefaultApp, openWithDefault } from '../utils/mimeDefaults';

describe('mimeDefaults', () => {
  test('openWithDefault uses stored default', () => {
    const openApp = jest.fn();
    const fallback = jest.fn();
    setDefaultApp('text/plain', 'TextEdit');
    const handled = openWithDefault('text/plain', openApp, fallback);
    expect(handled).toBe(true);
    expect(openApp).toHaveBeenCalledWith('TextEdit');
    expect(fallback).not.toHaveBeenCalled();
  });

  test('openWithDefault falls back without default', () => {
    const openApp = jest.fn();
    const fallback = jest.fn();
    const handled = openWithDefault('image/png', openApp, fallback);
    expect(handled).toBe(false);
    expect(openApp).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalled();
  });
});
