import { act, renderHook } from '@testing-library/react';

jest.mock('../utils/settingsStore', () => {
  const defaults = {
    accent: '#1793d1',
    wallpaper: 'wall-2',
    density: 'regular',
    reducedMotion: false,
    fontScale: 1,
    highContrast: false,
    largeHitAreas: false,
    pongSpin: true,
    allowNetwork: false,
    haptics: true,
  } as const;

  return {
    defaults,
    getAccent: jest.fn(async () => defaults.accent),
    setAccent: jest.fn(async () => {}),
    getWallpaper: jest.fn(async () => defaults.wallpaper),
    setWallpaper: jest.fn(async () => {}),
    getDensity: jest.fn(async () => defaults.density),
    setDensity: jest.fn(async () => {}),
    getReducedMotion: jest.fn(async () => defaults.reducedMotion),
    setReducedMotion: jest.fn(async () => {}),
    getFontScale: jest.fn(async () => defaults.fontScale),
    setFontScale: jest.fn(async () => {}),
    getHighContrast: jest.fn(async () => defaults.highContrast),
    setHighContrast: jest.fn(async () => {}),
    getLargeHitAreas: jest.fn(async () => defaults.largeHitAreas),
    setLargeHitAreas: jest.fn(async () => {}),
    getPongSpin: jest.fn(async () => defaults.pongSpin),
    setPongSpin: jest.fn(async () => {}),
    getAllowNetwork: jest.fn(async () => defaults.allowNetwork),
    setAllowNetwork: jest.fn(async () => {}),
    getHaptics: jest.fn(async () => defaults.haptics),
    setHaptics: jest.fn(async () => {}),
  };
});

import { SettingsProvider, useSettings } from '../hooks/useSettings';

type SettingsSnapshot = Pick<
  ReturnType<typeof useSettings>,
  | 'accent'
  | 'wallpaper'
  | 'density'
  | 'reducedMotion'
  | 'fontScale'
  | 'highContrast'
  | 'largeHitAreas'
  | 'pongSpin'
  | 'allowNetwork'
  | 'haptics'
  | 'theme'
>;

type SettingsMessage = {
  sourceId: string;
  payload: SettingsSnapshot;
};

const snapshotFromSettings = (settings: ReturnType<typeof useSettings>): SettingsSnapshot => ({
  accent: settings.accent,
  wallpaper: settings.wallpaper,
  density: settings.density,
  reducedMotion: settings.reducedMotion,
  fontScale: settings.fontScale,
  highContrast: settings.highContrast,
  largeHitAreas: settings.largeHitAreas,
  pongSpin: settings.pongSpin,
  allowNetwork: settings.allowNetwork,
  haptics: settings.haptics,
  theme: settings.theme,
});

describe('SettingsProvider broadcast sync', () => {
  let broadcastSpy: jest.SpyInstance<BroadcastChannel, [string]>;
  let channelMock: {
    postMessage: jest.Mock;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    close: jest.Mock;
  };
  let listeners: Record<string, ((event: MessageEvent<SettingsMessage>) => void) | undefined>;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';

    listeners = {};
    channelMock = {
      postMessage: jest.fn(),
      addEventListener: jest.fn((event: string, handler: (evt: MessageEvent<SettingsMessage>) => void) => {
        listeners[event] = handler;
      }),
      removeEventListener: jest.fn((event: string) => {
        delete listeners[event];
      }),
      close: jest.fn(),
    };

    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true,
      writable: true,
      value: function BroadcastChannel() {
        return {} as BroadcastChannel;
      } as unknown as typeof BroadcastChannel,
    });

    broadcastSpy = jest.spyOn(window, 'BroadcastChannel');
    broadcastSpy.mockImplementation(() => channelMock as unknown as BroadcastChannel);
  });

  afterEach(() => {
    broadcastSpy.mockRestore();
    delete (window as unknown as Record<string, unknown>).BroadcastChannel;
    jest.clearAllMocks();
  });

  const renderSettings = () =>
    renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

  test('instantiates a broadcast channel and posts updates on change', async () => {
    const { result } = renderSettings();
    await act(async () => {});

    expect(broadcastSpy).toHaveBeenCalledWith('settings');
    expect(listeners.message).toBeDefined();

    act(() => {
      result.current.setHighContrast(true);
    });

    const lastCall = channelMock.postMessage.mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual(
      expect.objectContaining({
        sourceId: expect.any(String),
        payload: expect.objectContaining({ highContrast: true }),
      })
    );
  });

  test('applies remote updates without rebroadcasting them', async () => {
    const { result } = renderSettings();
    await act(async () => {});
    const snapshot = snapshotFromSettings(result.current);
    const initialPostCount = channelMock.postMessage.mock.calls.length;

    act(() => {
      listeners.message?.({
        data: {
          sourceId: 'remote-tab',
          payload: { ...snapshot, highContrast: true, theme: 'dark' },
        },
      } as MessageEvent<SettingsMessage>);
    });

    expect(result.current.highContrast).toBe(true);
    expect(result.current.theme).toBe('dark');
    expect(channelMock.postMessage).toHaveBeenCalledTimes(initialPostCount);
  });

  test('ignores messages that originate from the same tab', async () => {
    const { result } = renderSettings();
    await act(async () => {});

    act(() => {
      result.current.setTheme('dark');
    });

    const initialSnapshot = snapshotFromSettings(result.current);
    const lastCall = channelMock.postMessage.mock.calls.at(-1)?.[0];
    const callCount = channelMock.postMessage.mock.calls.length;

    expect(lastCall?.sourceId).toBeDefined();

    act(() => {
      listeners.message?.({
        data: {
          sourceId: lastCall?.sourceId as string,
          payload: { ...initialSnapshot, theme: 'neon' },
        },
      } as MessageEvent<SettingsMessage>);
    });

    expect(result.current.theme).toBe('dark');
    expect(channelMock.postMessage).toHaveBeenCalledTimes(callCount);
  });
});

