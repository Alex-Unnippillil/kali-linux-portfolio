import type { ThemeBroadcastMessage } from '../src/theming/channel';

type ThemeChannelModule = typeof import('../src/theming/channel');

type MessageListener = (event: MessageEvent<ThemeBroadcastMessage>) => void;

class MockBroadcastChannel {
  public static registry = new Map<string, Set<MockBroadcastChannel>>();

  public name: string;
  private listeners = new Set<MessageListener>();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.registry.has(name)) {
      MockBroadcastChannel.registry.set(name, new Set());
    }
    MockBroadcastChannel.registry.get(name)!.add(this);
  }

  static reset() {
    MockBroadcastChannel.registry.clear();
  }

  postMessage(data: ThemeBroadcastMessage) {
    const peers = MockBroadcastChannel.registry.get(this.name);
    if (!peers) return;
    peers.forEach((channel) => {
      channel.dispatch(data);
    });
  }

  private dispatch(data: ThemeBroadcastMessage) {
    this.listeners.forEach((listener) => {
      setTimeout(() => {
        listener({ data } as MessageEvent<ThemeBroadcastMessage>);
      }, 20);
    });
  }

  addEventListener(type: string, listener: EventListener) {
    if (type !== 'message') return;
    this.listeners.add(listener as MessageListener);
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type !== 'message') return;
    this.listeners.delete(listener as MessageListener);
  }

  close() {
    const peers = MockBroadcastChannel.registry.get(this.name);
    peers?.delete(this);
    this.listeners.clear();
  }
}

const loadThemeChannelModule = (): ThemeChannelModule => {
  let mod: ThemeChannelModule | undefined;
  jest.isolateModules(() => {
    mod = jest.requireActual<ThemeChannelModule>('../src/theming/channel');
  });
  if (!mod) {
    throw new Error('Failed to load theme channel module');
  }
  return mod;
};

describe('theme channel broadcasting', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    MockBroadcastChannel.reset();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    delete (window as any).BroadcastChannel;
  });

  it('delivers theme updates across tabs via BroadcastChannel within 100ms', () => {
    (window as any).BroadcastChannel = MockBroadcastChannel;

    const tabA = loadThemeChannelModule();
    const tabB = loadThemeChannelModule();

    const updates: Array<{ theme: string; delta: number }> = [];
    let start = 0;

    const unsubscribe = tabB.subscribeToThemeUpdates((theme) => {
      updates.push({ theme, delta: Date.now() - start });
    });

    start = Date.now();
    tabA.publishThemeChange('matrix');

    expect(updates).toHaveLength(0);

    jest.advanceTimersByTime(40);

    expect(updates).toHaveLength(1);
    expect(updates[0].theme).toBe('matrix');
    expect(updates[0].delta).toBeLessThanOrEqual(100);

    unsubscribe();
    tabA.__resetThemeChannelForTests();
    tabB.__resetThemeChannelForTests();
  });

  it('falls back to storage events when BroadcastChannel is unavailable', () => {
    delete (window as any).BroadcastChannel;

    const tabA = loadThemeChannelModule();
    const tabB = loadThemeChannelModule();

    const fallbackKey = tabA.THEME_BROADCAST_STORAGE_KEY;
    const updates: Array<{ theme: string; delta: number }> = [];
    let start = 0;

    const unsubscribe = tabB.subscribeToThemeUpdates((theme) => {
      updates.push({ theme, delta: Date.now() - start });
    });

    start = Date.now();
    tabA.publishThemeChange('neon');

    const storedValue = window.localStorage.getItem(fallbackKey);
    expect(storedValue).not.toBeNull();

    setTimeout(() => {
      const event = new StorageEvent('storage', {
        key: fallbackKey,
        newValue: storedValue!,
        storageArea: window.localStorage,
      });
      window.dispatchEvent(event);
    }, 30);

    jest.advanceTimersByTime(30);

    expect(updates).toHaveLength(1);
    expect(updates[0].theme).toBe('neon');
    expect(updates[0].delta).toBeLessThanOrEqual(100);

    unsubscribe();
    tabA.__resetThemeChannelForTests();
    tabB.__resetThemeChannelForTests();
  });
});

