const CHANNEL_NAME = 'theme';
const STORAGE_PREFIX = 'app:theme-channel';

type Listener = (event: MessageEvent<unknown>) => void;

type ListenerLike = EventListenerOrEventListenerObject;

type ChannelMode = 'broadcast' | 'storage' | 'none';

const supportsBroadcastChannel = (): boolean =>
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as typeof globalThis & { BroadcastChannel?: unknown }).BroadcastChannel === 'function';

const createMessageEvent = (data: unknown): MessageEvent<unknown> => {
  if (typeof MessageEvent === 'function') {
    return new MessageEvent('message', { data });
  }
  return { data } as MessageEvent<unknown>;
};

const getStorageKey = (name: string): string => `${STORAGE_PREFIX}:${name}`;

class StorageFallbackChannel {
  public onmessage: Listener | null = null;
  public readonly storageKey: string;

  private readonly listeners = new Set<Listener>();
  private listenerMap = new WeakMap<ListenerLike, Listener>();
  private readonly handleStorage: (event: StorageEvent) => void;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
    this.handleStorage = (event: StorageEvent) => {
      if (event.key !== this.storageKey || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue) as { data: unknown };
        this.dispatch(payload.data);
      } catch {
        /* ignore malformed storage payloads */
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorage);
    }
  }

  addEventListener(
    type: 'message',
    listener: ListenerLike,
    _options?: boolean | AddEventListenerOptions,
  ): void {
    if (type !== 'message') return;
    const normalized = this.getListener(listener);
    this.listeners.add(normalized);
  }

  removeEventListener(
    type: 'message',
    listener: ListenerLike,
    _options?: boolean | EventListenerOptions,
  ): void {
    if (type !== 'message') return;
    const normalized = this.listenerMap.get(listener);
    if (!normalized) return;
    this.listeners.delete(normalized);
    this.listenerMap.delete(listener);
  }

  postMessage(message: unknown): void {
    this.dispatch(message);
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({ data: message, timestamp: Date.now() });
      window.localStorage.setItem(this.storageKey, payload);
    } catch {
      /* ignore storage errors */
    }
  }

  close(): void {
    this.listeners.clear();
    this.listenerMap = new WeakMap();
    this.onmessage = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorage);
    }
  }

  private getListener(listener: ListenerLike): Listener {
    let normalized = this.listenerMap.get(listener);
    if (!normalized) {
      if (typeof listener === 'function') {
        normalized = listener as Listener;
      } else {
        normalized = (event: MessageEvent<unknown>) => {
          if ('handleEvent' in listener && listener.handleEvent) {
            listener.handleEvent.call(listener, event);
          }
        };
      }
      this.listenerMap.set(listener, normalized);
    }
    return normalized;
  }

  private dispatch(message: unknown): void {
    const event = createMessageEvent(message);
    this.listeners.forEach((listener) => listener(event));
    this.onmessage?.(event);
  }
}

export interface ThemeChannel {
  postMessage(message: unknown): void;
  addEventListener(
    type: 'message',
    listener: ListenerLike,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: 'message',
    listener: ListenerLike,
    options?: boolean | EventListenerOptions,
  ): void;
  close(): void;
  onmessage: Listener | null;
  readonly mode: ChannelMode;
  readonly storageKey?: string;
}

class ThemeChannelImpl implements ThemeChannel {
  public readonly mode: ChannelMode;
  public readonly storageKey?: string;

  private channel: BroadcastChannel | StorageFallbackChannel | null;

  constructor(name: string = CHANNEL_NAME) {
    if (supportsBroadcastChannel()) {
      const BroadcastChannelCtor = (globalThis as unknown as { BroadcastChannel: typeof BroadcastChannel })
        .BroadcastChannel;
      this.channel = new BroadcastChannelCtor(name);
      this.mode = 'broadcast';
    } else if (typeof window !== 'undefined') {
      this.storageKey = getStorageKey(name);
      this.channel = new StorageFallbackChannel(this.storageKey);
      this.mode = 'storage';
    } else {
      this.channel = null;
      this.mode = 'none';
    }
  }

  postMessage(message: unknown): void {
    if (!this.channel) return;
    if (this.mode === 'broadcast') {
      (this.channel as BroadcastChannel).postMessage(message);
    } else {
      (this.channel as StorageFallbackChannel).postMessage(message);
    }
  }

  addEventListener(
    type: 'message',
    listener: ListenerLike,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (!this.channel) return;
    if (this.mode === 'broadcast') {
      (this.channel as BroadcastChannel).addEventListener(type, listener as EventListener, options);
    } else {
      (this.channel as StorageFallbackChannel).addEventListener(type, listener, options);
    }
  }

  removeEventListener(
    type: 'message',
    listener: ListenerLike,
    options?: boolean | EventListenerOptions,
  ): void {
    if (!this.channel) return;
    if (this.mode === 'broadcast') {
      (this.channel as BroadcastChannel).removeEventListener(type, listener as EventListener, options);
    } else {
      (this.channel as StorageFallbackChannel).removeEventListener(type, listener, options);
    }
  }

  close(): void {
    if (!this.channel) return;
    if (this.mode === 'broadcast') {
      (this.channel as BroadcastChannel).close();
    } else {
      (this.channel as StorageFallbackChannel).close();
    }
    this.channel = null;
  }

  set onmessage(handler: Listener | null) {
    if (!this.channel) return;
    if (this.mode === 'broadcast') {
      (this.channel as BroadcastChannel).onmessage = handler as ((event: MessageEvent) => void) | null;
    } else {
      (this.channel as StorageFallbackChannel).onmessage = handler;
    }
  }

  get onmessage(): Listener | null {
    if (!this.channel) return null;
    if (this.mode === 'broadcast') {
      return (this.channel as BroadcastChannel).onmessage as Listener | null;
    }
    return (this.channel as StorageFallbackChannel).onmessage;
  }
}

export const createThemeChannel = (name: string = CHANNEL_NAME): ThemeChannel =>
  new ThemeChannelImpl(name);

const defaultChannel = createThemeChannel();

export default defaultChannel;
