import {
  ThemeBroadcastChannel,
  ThemeChannelMessage,
  ThemeMessageEvent,
  ThemeUpdate,
  createThemeChannel,
} from '../src/theming/channel';

class MockBroadcastChannel implements ThemeBroadcastChannel {
  public messages: ThemeChannelMessage[] = [];

  private listeners = new Set<(event: ThemeMessageEvent) => void>();

  postMessage(message: ThemeChannelMessage): void {
    this.messages.push(message);
    this.listeners.forEach((listener) => listener({ data: message }));
  }

  addEventListener(_type: 'message', listener: (event: ThemeMessageEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: ThemeMessageEvent) => void): void {
    this.listeners.delete(listener);
  }

  close(): void {
    this.listeners.clear();
  }

  dispatch(message: ThemeChannelMessage): void {
    this.listeners.forEach((listener) => listener({ data: message }));
  }
}

describe('theme channel', () => {
  it('ignores self-origin and stale updates to prevent loops', () => {
    const mock = new MockBroadcastChannel();
    let nowValue = 1_000;
    const channel = createThemeChannel(() => mock, () => nowValue);
    const received: ThemeUpdate[] = [];

    channel.subscribe((update) => {
      received.push(update);
    });

    const localUpdate = channel.publish('dark');
    expect(localUpdate).toEqual({ theme: 'dark', timestamp: 1_000 });
    expect(mock.messages).toHaveLength(1);
    expect(received).toHaveLength(0);

    mock.dispatch({
      type: 'theme:update',
      payload: { theme: 'default', timestamp: 900 },
    });

    expect(received).toHaveLength(0);

    mock.dispatch({
      type: 'theme:update',
      payload: { theme: 'dark', timestamp: localUpdate.timestamp },
    });

    expect(received).toHaveLength(0);
  });

  it('applies the newest update when conflicts occur', () => {
    const mock = new MockBroadcastChannel();
    let nowValue = 200;
    const channel = createThemeChannel(() => mock, () => nowValue);
    const received: ThemeUpdate[] = [];

    channel.subscribe((update) => {
      received.push(update);
    });

    const first = channel.publish('default');
    expect(first.timestamp).toBe(200);
    expect(mock.messages).toHaveLength(1);

    mock.dispatch({
      type: 'theme:update',
      payload: { theme: 'neon', timestamp: first.timestamp },
    });

    expect(received).toEqual([{ theme: 'neon', timestamp: first.timestamp }]);
    expect(channel.getLastUpdate()).toEqual({ theme: 'neon', timestamp: first.timestamp });
    expect(mock.messages).toHaveLength(1);

    mock.dispatch({
      type: 'theme:update',
      payload: { theme: 'dark', timestamp: 150 },
    });

    expect(received).toHaveLength(1);

    mock.dispatch({
      type: 'theme:update',
      payload: { theme: 'matrix', timestamp: 400 },
    });

    expect(received).toHaveLength(2);
    expect(received[1]).toEqual({ theme: 'matrix', timestamp: 400 });
    expect(channel.getLastUpdate()).toEqual({ theme: 'matrix', timestamp: 400 });
    expect(mock.messages).toHaveLength(1);
  });
});
