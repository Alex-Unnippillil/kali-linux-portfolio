const LOCALE_STORAGE_KEY = 'app:locale';
const LOCALE_CHANNEL_NAME = 'app:locale';

type LocaleListener = (locale: string) => void;

type LocaleMessage = {
  locale?: unknown;
};

const listeners = new Set<LocaleListener>();
let cachedLocale: string | null = null;
let defaultLocale = 'en';
let detachStorageListener: (() => void) | null = null;
let detachChannel: (() => void) | null = null;
let channel: BroadcastChannel | null = null;

const isLocale = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const notify = (locale: string) => {
  listeners.forEach((listener) => {
    try {
      listener(locale);
    } catch {
      // Swallow listener errors to keep other subscribers responsive
    }
  });
};

const resolveLocale = (value: unknown): string => {
  if (isLocale(value)) {
    return value;
  }
  return defaultLocale;
};

const handleIncomingLocale = (value: unknown) => {
  const next = resolveLocale(value);
  cachedLocale = next;
  notify(next);
};

const readStoredLocale = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const ensureBindings = () => {
  if (typeof window === 'undefined') return;

  if (!detachStorageListener) {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY) {
        handleIncomingLocale(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    detachStorageListener = () => {
      window.removeEventListener('storage', handleStorage);
      detachStorageListener = null;
    };
  }

  if (!channel && typeof BroadcastChannel !== 'undefined') {
    const nextChannel = new BroadcastChannel(LOCALE_CHANNEL_NAME);
    const handleMessage = (event: MessageEvent<LocaleMessage>) => {
      if (event?.data && 'locale' in event.data) {
        handleIncomingLocale(event.data.locale);
      }
    };
    nextChannel.addEventListener('message', handleMessage);
    channel = nextChannel;
    detachChannel = () => {
      nextChannel.removeEventListener('message', handleMessage);
      nextChannel.close();
      channel = null;
      detachChannel = null;
    };
  }
};

export const getPersistedLocale = (fallback: string = defaultLocale): string => {
  defaultLocale = fallback;
  ensureBindings();

  if (isLocale(cachedLocale)) {
    return cachedLocale;
  }

  const stored = readStoredLocale();
  if (isLocale(stored)) {
    cachedLocale = stored;
    return stored;
  }

  cachedLocale = defaultLocale;
  return defaultLocale;
};

export const persistLocale = (locale: string): void => {
  const next = resolveLocale(locale);
  cachedLocale = next;
  ensureBindings();

  if (typeof window !== 'undefined') {
    try {
      if (isLocale(locale)) {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } else {
        window.localStorage.removeItem(LOCALE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }

  try {
    channel?.postMessage({ locale: next });
  } catch {
    // Ignore broadcast errors
  }

  notify(next);
};

export const subscribeToLocaleChanges = (
  listener: LocaleListener,
): (() => void) => {
  listeners.add(listener);
  ensureBindings();
  return () => {
    listeners.delete(listener);
  };
};

export const clearPersistedLocale = (): void => {
  cachedLocale = null;
  ensureBindings();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  try {
    channel?.postMessage({ locale: defaultLocale });
  } catch {
    // Ignore broadcast errors
  }
  notify(defaultLocale);
};

export const __resetLocalePersistenceForTests = (): void => {
  listeners.clear();
  cachedLocale = null;
  defaultLocale = 'en';
  if (detachStorageListener) {
    detachStorageListener();
  }
  if (detachChannel) {
    detachChannel();
  }
};

export const LOCALE_PERSISTENCE_KEY = LOCALE_STORAGE_KEY;
export const LOCALE_CHANNEL = LOCALE_CHANNEL_NAME;
