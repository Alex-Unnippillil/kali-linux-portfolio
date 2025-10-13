describe('sync broadcast helpers', () => {
  const originalWindow = (global as any).window;
  const originalDocument = (global as any).document;
  const originalSelf = (global as any).self;
  const originalBroadcast = (global as any).BroadcastChannel;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (global as any).window;
    } else {
      (global as any).window = originalWindow;
    }

    if (originalDocument === undefined) {
      delete (global as any).document;
    } else {
      (global as any).document = originalDocument;
    }

    if (originalSelf === undefined) {
      delete (global as any).self;
    } else {
      (global as any).self = originalSelf;
    }

    if (originalBroadcast === undefined) {
      delete (global as any).BroadcastChannel;
    } else {
      (global as any).BroadcastChannel = originalBroadcast;
    }
  });

  it('returns no-op handlers when BroadcastChannel is unavailable', async () => {
    jest.resetModules();
    jest.doMock('@/utils/isBrowser', () => ({
      isBrowser: false,
      hasIndexedDB: false,
    }));

    const sync = await import('@/utils/sync');
    expect(() => sync.broadcastState({})).not.toThrow();
    expect(() => sync.broadcastLeaderboard({})).not.toThrow();

    const dispose = sync.subscribe({ onState: jest.fn(), onLeaderboard: jest.fn() });
    expect(typeof dispose).toBe('function');
    expect(() => dispose()).not.toThrow();
    jest.dontMock('@/utils/isBrowser');
  });

  it('broadcasts state changes to registered handlers', async () => {
    type Listener = (event: MessageEvent<{ type: string; [key: string]: unknown }>) => void;
    class MockBroadcastChannel {
      public static instance: MockBroadcastChannel | null = null;

      public readonly name: string;
      private listeners = new Set<Listener>();
      public postMessage = jest.fn((message: { type: string }) => {
        this.listeners.forEach((listener) => listener({ data: message } as MessageEvent<typeof message>));
      });
      public addEventListener = jest.fn((type: string, listener: Listener) => {
        if (type === 'message') {
          this.listeners.add(listener);
        }
      });
      public removeEventListener = jest.fn((type: string, listener: Listener) => {
        if (type === 'message') {
          this.listeners.delete(listener);
        }
      });

      constructor(name: string) {
        this.name = name;
        MockBroadcastChannel.instance = this;
      }
    }

    (global as any).window = {};
    (global as any).document = {};
    (global as any).self = global;
    (global as any).BroadcastChannel = MockBroadcastChannel;

    jest.resetModules();
    const { broadcastState, broadcastLeaderboard, subscribe } = await import('@/utils/sync');

    expect(MockBroadcastChannel.instance).toBeInstanceOf(MockBroadcastChannel);
    const onState = jest.fn();
    const onLeaderboard = jest.fn();
    const unsubscribe = subscribe({ onState, onLeaderboard });

    expect(MockBroadcastChannel.instance?.addEventListener).toHaveBeenCalledTimes(1);

    broadcastState('state-data');
    broadcastLeaderboard('leaderboard-data');

    expect(MockBroadcastChannel.instance?.postMessage).toHaveBeenNthCalledWith(1, { type: 'state', state: 'state-data' });
    expect(MockBroadcastChannel.instance?.postMessage).toHaveBeenNthCalledWith(2, {
      type: 'leaderboard',
      leaderboard: 'leaderboard-data',
    });

    expect(onState).toHaveBeenCalledWith('state-data');
    expect(onLeaderboard).toHaveBeenCalledWith('leaderboard-data');

    unsubscribe();

    broadcastState('ignored');
    expect(onState).toHaveBeenCalledTimes(1);
    expect(MockBroadcastChannel.instance?.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
