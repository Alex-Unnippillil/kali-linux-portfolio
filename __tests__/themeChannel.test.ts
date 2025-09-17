import type { ThemeChannel } from '@/src/theming/channel';

describe('theme channel', () => {
  const originalBroadcastChannel = (global as typeof globalThis & {
    BroadcastChannel?: typeof BroadcastChannel;
  }).BroadcastChannel;

  afterEach(() => {
    jest.resetModules();
    if (originalBroadcastChannel) {
      (global as typeof globalThis & { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel =
        originalBroadcastChannel;
    } else {
      delete (global as typeof globalThis & { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    }
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('uses BroadcastChannel when available', () => {
    const postMessageMock = jest.fn();
    const addEventListenerMock = jest.fn();
    const removeEventListenerMock = jest.fn();
    const closeMock = jest.fn();
    let onmessageHandler: ((event: MessageEvent) => void) | null = null;

    class MockBroadcastChannel {
      constructor(public name: string) {}

      postMessage = postMessageMock;

      addEventListener = addEventListenerMock;

      removeEventListener = removeEventListenerMock;

      close = closeMock;

      set onmessage(handler: ((event: MessageEvent) => void) | null) {
        onmessageHandler = handler;
      }

      get onmessage() {
        return onmessageHandler;
      }
    }

    (global as typeof globalThis & { BroadcastChannel: typeof BroadcastChannel }).BroadcastChannel =
      MockBroadcastChannel as unknown as typeof BroadcastChannel;

    jest.isolateModules(() => {
      const { createThemeChannel } = require('../src/theming/channel') as {
        createThemeChannel: (name?: string) => ThemeChannel;
      };
      const channel = createThemeChannel('test');
      expect(channel.mode).toBe('broadcast');

      const handler = jest.fn();
      channel.addEventListener('message', handler);
      expect(addEventListenerMock).toHaveBeenCalledWith('message', handler, undefined);

      channel.postMessage('dark');
      expect(postMessageMock).toHaveBeenCalledWith('dark');

      const onmessage = jest.fn();
      channel.onmessage = onmessage;
      expect(onmessageHandler).toBe(onmessage);

      channel.close();
      expect(closeMock).toHaveBeenCalled();
    });
  });

  it('falls back to storage events when BroadcastChannel is unavailable', () => {
    delete (global as typeof globalThis & { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    window.localStorage.clear();

    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    jest.isolateModules(() => {
      const { createThemeChannel } = require('../src/theming/channel') as {
        createThemeChannel: (name?: string) => ThemeChannel;
      };
      const channel = createThemeChannel('test');
      expect(channel.mode).toBe('storage');
      expect(channel.storageKey).toBeDefined();

      const handler = jest.fn();
      channel.addEventListener('message', handler);
      channel.postMessage('neon');
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: 'neon' }));

      expect(addSpy).toHaveBeenCalledWith('storage', expect.any(Function));

      const storageKey = channel.storageKey!;
      const payload = JSON.stringify({ data: 'matrix', timestamp: Date.now() });
      window.dispatchEvent(new StorageEvent('storage', { key: storageKey, newValue: payload }));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: 'matrix' }));

      channel.close();
      expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
