const THEME_CHANNEL_NAME = 'kali-theme-theme-channel';
export const THEME_BROADCAST_STORAGE_KEY = 'app:theme:broadcast';
const MAX_TRACKED_MESSAGES = 32;

type MaybeGlobalWindow = typeof globalThis & Partial<Window>;

const getWindow = (): Window | undefined => {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }
  const scope = globalThis as MaybeGlobalWindow;
  if (typeof scope.addEventListener === 'function') {
    return scope as Window;
  }
  return undefined;
};

const getStorage = (): Storage | undefined => {
  const win = getWindow();
  try {
    return win?.localStorage;
  } catch {
    return undefined;
  }
};

const isClient = Boolean(getWindow());

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `theme-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const instanceId = isClient ? generateId() : 'server';

export type ThemeChangeListener = (theme: string) => void;

export interface ThemeBroadcastMessage {
  id: string;
  theme: string;
  timestamp: number;
  senderId: string;
}

let channel: BroadcastChannel | null = null;

const seenMessages = new Set<string>();
const seenQueue: string[] = [];

const rememberMessage = (id: string): boolean => {
  if (seenMessages.has(id)) {
    return true;
  }
  seenMessages.add(id);
  seenQueue.push(id);
  if (seenQueue.length > MAX_TRACKED_MESSAGES) {
    const oldest = seenQueue.shift();
    if (oldest) {
      seenMessages.delete(oldest);
    }
  }
  return false;
};

const ensureChannel = (): BroadcastChannel | null => {
  const win = getWindow();
  if (!win || typeof win.BroadcastChannel === 'undefined') {
    return null;
  }
  if (!channel) {
    try {
      channel = new win.BroadcastChannel(THEME_CHANNEL_NAME);
    } catch {
      channel = null;
    }
  }
  return channel;
};

const normalizeMessage = (payload: unknown): ThemeBroadcastMessage | null => {
  let data = payload;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const candidate = data as Partial<ThemeBroadcastMessage>;
  if (typeof candidate.theme !== 'string') {
    return null;
  }

  if (typeof candidate.id !== 'string') {
    if (typeof candidate.senderId === 'string' && typeof candidate.timestamp === 'number') {
      return {
        id: `${candidate.senderId}:${candidate.timestamp}`,
        theme: candidate.theme,
        timestamp: candidate.timestamp,
        senderId: candidate.senderId,
      };
    }
    return null;
  }

  if (typeof candidate.timestamp !== 'number' || typeof candidate.senderId !== 'string') {
    return null;
  }

  return candidate as ThemeBroadcastMessage;
};

const deliverMessage = (raw: unknown, handler: ThemeChangeListener) => {
  const message = normalizeMessage(raw);
  if (!message) {
    return;
  }

  if (rememberMessage(message.id)) {
    return;
  }

  if (message.senderId === instanceId) {
    return;
  }

  handler(message.theme);
};

const createMessage = (theme: string): ThemeBroadcastMessage => ({
  id: generateId(),
  theme,
  timestamp: Date.now(),
  senderId: instanceId,
});

export const publishThemeChange = (theme: string): void => {
  const message = createMessage(theme);
  const broadcast = ensureChannel();

  if (broadcast) {
    try {
      broadcast.postMessage(message);
    } catch {
      // Ignore BroadcastChannel errors
    }
  }

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(THEME_BROADCAST_STORAGE_KEY, JSON.stringify(message));
    } catch {
      // Ignore storage write errors
    }
  }
};

export const subscribeToThemeUpdates = (
  handler: ThemeChangeListener,
): (() => void) => {
  const win = getWindow();
  if (!win) {
    return () => {};
  }

  const cleanups: Array<() => void> = [];

  const broadcast = ensureChannel();
  if (broadcast) {
    const listener = (event: MessageEvent<ThemeBroadcastMessage>) => {
      deliverMessage(event.data, handler);
    };
    broadcast.addEventListener('message', listener as EventListener);
    cleanups.push(() => broadcast.removeEventListener('message', listener as EventListener));
  }

  const storageListener = (event: StorageEvent) => {
    if (event.key !== THEME_BROADCAST_STORAGE_KEY || !event.newValue) {
      return;
    }
    deliverMessage(event.newValue, handler);
  };
  win.addEventListener('storage', storageListener);
  cleanups.push(() => win.removeEventListener('storage', storageListener));

  return () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {
        // Ignore cleanup failures
      }
    });
  };
};

export const __resetThemeChannelForTests = () => {
  if (channel) {
    try {
      channel.close();
    } catch {
      // Ignore close errors
    }
  }
  channel = null;
  seenMessages.clear();
  seenQueue.length = 0;
};

