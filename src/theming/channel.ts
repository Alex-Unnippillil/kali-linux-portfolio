/**
 * Theme channel helpers coordinate theme changes between tabs using the BroadcastChannel API.
 *
 * Each update carries the theme name along with the originating timestamp. We keep track of the
 * most recent update we have processed and ignore messages that are older or identical to the one
 * we just published. This prevents a feedback loop where applying a remote update would broadcast
 * a newer timestamp and cause the origin tab to process it again. When two tabs update at roughly
 * the same time we accept the message if it has a newer timestamp or if it shares the timestamp
 * but differs in theme, allowing the latest intent to win deterministically.
 */

const THEME_CHANNEL_NAME = 'app:theme';

export interface ThemeUpdate {
  theme: string;
  timestamp: number;
}

export type ThemeChannelMessage = {
  type: 'theme:update';
  payload: ThemeUpdate;
};

export interface ThemeMessageEvent {
  data: ThemeChannelMessage | undefined;
}

type ThemeSubscriber = (update: ThemeUpdate) => void;

export interface ThemeBroadcastChannel {
  postMessage(message: ThemeChannelMessage): void;
  addEventListener(type: 'message', listener: (event: ThemeMessageEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: ThemeMessageEvent) => void): void;
  close?: () => void;
}

export interface ThemeChannel {
  publish(theme: string, timestamp?: number): ThemeUpdate;
  subscribe(subscriber: ThemeSubscriber): () => void;
  getLastUpdate(): ThemeUpdate | null;
  close(): void;
}

const createDefaultBroadcastChannel = (): ThemeBroadcastChannel | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const globalWindow = window as typeof window & {
    BroadcastChannel?: typeof BroadcastChannel;
  };

  if (typeof globalWindow.BroadcastChannel !== 'function') {
    return null;
  }

  return new globalWindow.BroadcastChannel(THEME_CHANNEL_NAME);
};

const defaultNow = () => Date.now();

export const createThemeChannel = (
  channelFactory: () => ThemeBroadcastChannel | null = createDefaultBroadcastChannel,
  now: () => number = defaultNow,
): ThemeChannel => {
  const subscribers = new Set<ThemeSubscriber>();
  const channel = channelFactory();
  let lastUpdate: ThemeUpdate | null = null;

  const handleMessage = (event: ThemeMessageEvent) => {
    const message = event?.data;
    if (!message || message.type !== 'theme:update') {
      return;
    }

    const update = message.payload;
    if (
      !update ||
      typeof update.theme !== 'string' ||
      typeof update.timestamp !== 'number' ||
      !Number.isFinite(update.timestamp)
    ) {
      return;
    }

    if (lastUpdate) {
      if (update.timestamp < lastUpdate.timestamp) {
        return;
      }

      if (update.timestamp === lastUpdate.timestamp && update.theme === lastUpdate.theme) {
        return;
      }
    }

    lastUpdate = update;
    subscribers.forEach((subscriber) => subscriber(update));
  };

  channel?.addEventListener('message', handleMessage);

  const publish = (theme: string, timestamp?: number): ThemeUpdate => {
    const update: ThemeUpdate = {
      theme,
      timestamp: typeof timestamp === 'number' ? timestamp : now(),
    };

    lastUpdate = update;

    channel?.postMessage({ type: 'theme:update', payload: update });

    return update;
  };

  const subscribe = (subscriber: ThemeSubscriber) => {
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  };

  const close = () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
      channel.close?.();
    }
    subscribers.clear();
  };

  const getLastUpdate = () => lastUpdate;

  return {
    publish,
    subscribe,
    getLastUpdate,
    close,
  };
};

export const themeChannel = createThemeChannel();

export default themeChannel;
